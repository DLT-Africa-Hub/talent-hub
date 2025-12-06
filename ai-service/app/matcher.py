"""
Matching algorithms and utilities for graduate-to-job ranking.

Features:
  * Cosine similarity for embedding comparisons
  * Weighted multi-factor scoring (skills, education, experience, freshness)
  * Threshold-based filtering and deterministic ranking
  * Match result caching with TTL
  * Batch-friendly execution with deduplication safeguards
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import time
from collections import OrderedDict
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import (
    Dict,
    List,
    MutableMapping,
    Optional,
    Sequence,
    Tuple,
    TypedDict,
)

import numpy as np

from app.embeddings import EMBEDDING_DIMENSION

logger = logging.getLogger(__name__)

DEFAULT_MIN_SCORE = float(os.getenv("MATCH_MIN_SCORE", "0.3"))
DEFAULT_MAX_RESULTS = int(os.getenv("MATCH_MAX_RESULTS", "50"))
MATCH_CACHE_TTL_SECONDS = int(os.getenv("MATCH_CACHE_TTL_SECONDS", "300"))
MATCH_CACHE_MAX_ENTRIES = int(os.getenv("MATCH_CACHE_MAX_ENTRIES", "1024"))
FRESHNESS_HALF_LIFE_DAYS = float(os.getenv("MATCH_FRESHNESS_HALF_LIFE_DAYS", "30"))

DEFAULT_WEIGHTS = {
    "embedding": float(os.getenv("MATCH_WEIGHT_EMBEDDING", "0.6")),
    "skills": float(os.getenv("MATCH_WEIGHT_SKILLS", "0.2")),
    "education": float(os.getenv("MATCH_WEIGHT_EDUCATION", "0.1")),
    "experience": float(os.getenv("MATCH_WEIGHT_EXPERIENCE", "0.05")),
    "freshness": float(os.getenv("MATCH_WEIGHT_FRESHNESS", "0.05")),
}


class GraduateMetadata(TypedDict, total=False):
    skills: List[str]
    education: str
    experience_years: float
    latest_experience_year: int


class JobMetadata(TypedDict, total=False):
    skills: List[str]
    education: str
    experience_years: float
    updated_at: str


class MatchWeights(TypedDict, total=False):
    embedding: float
    skills: float
    education: float
    experience: float
    freshness: float


class MatchOptions(TypedDict, total=False):
    min_score: float
    limit: int
    weights: MatchWeights


class JobEmbeddingPayload(TypedDict, total=False):
    id: str
    embedding: List[float]
    metadata: JobMetadata


class MatchFactors(TypedDict, total=False):
    embedding: float
    skills: float
    education: float
    experience: float
    freshness: float


class MatchResult(TypedDict, total=False):
    id: str
    score: float
    factors: MatchFactors


@dataclass
class _CacheEntry:
    value: List[MatchResult]
    expires_at: float


_cache: "OrderedDict[str, _CacheEntry]" = OrderedDict()
_cache_lock = asyncio.Lock()


def _validate_vector(vector: Sequence[float]) -> np.ndarray:
    array = np.asarray(vector, dtype=np.float32)
    if array.ndim != 1:
        raise ValueError("Embedding vector must be one-dimensional")
    if array.size != EMBEDDING_DIMENSION:
        raise ValueError(
            f"Embedding dimension mismatch: expected {EMBEDDING_DIMENSION}, "
            f"got {array.size}"
        )
    return array


def _normalise_weights(weights: MutableMapping[str, float]) -> Dict[str, float]:
    positive_weights = {key: max(value, 0.0) for key, value in weights.items()}
    total = sum(positive_weights.values())
    if total == 0:
        return {key: (1.0 if key == "embedding" else 0.0) for key in weights}
    return {key: value / total for key, value in positive_weights.items()}


def _hash_vector(vector: Sequence[float]) -> str:
    array = np.asarray(vector, dtype=np.float32)
    return hashlib.sha1(array.tobytes()).hexdigest()


def _hash_metadata(metadata: Optional[dict]) -> str:
    if not metadata:
        return "0"
    serialized = json.dumps(metadata, sort_keys=True, default=str)
    return hashlib.sha1(serialized.encode("utf-8")).hexdigest()


def _build_cache_key(
    graduate_embedding: Sequence[float],
    job_embeddings: Sequence[JobEmbeddingPayload],
    graduate_metadata: Optional[GraduateMetadata],
    options: Optional[MatchOptions],
) -> str:
    components = [
        _hash_vector(graduate_embedding),
        _hash_metadata(graduate_metadata),
        json.dumps(options or {}, sort_keys=True, default=str),
    ]
    for job in job_embeddings:
        job_id = job.get("id", "")
        job_embedding = job.get("embedding", [])
        job_meta = job.get("metadata")
        components.append(
            "|".join([job_id, _hash_vector(job_embedding), _hash_metadata(job_meta)])
        )
    return hashlib.sha1("::".join(components).encode("utf-8")).hexdigest()


async def _get_from_cache(key: str) -> Optional[List[MatchResult]]:
    async with _cache_lock:
        entry = _cache.get(key)
        if not entry:
            return None

        now = time.monotonic()
        if entry.expires_at < now:
            _cache.pop(key, None)
            return None

        _cache.move_to_end(key)
        return entry.value


async def _set_cache(key: str, value: List[MatchResult]) -> None:
    async with _cache_lock:
        if key in _cache:
            _cache.move_to_end(key)
        _cache[key] = _CacheEntry(
            value=value, expires_at=time.monotonic() + MATCH_CACHE_TTL_SECONDS
        )

        while len(_cache) > MATCH_CACHE_MAX_ENTRIES:
            _cache.popitem(last=False)


def cosine_similarity(vec1: Sequence[float], vec2: Sequence[float]) -> float:
    vec1_array = _validate_vector(vec1)
    vec2_array = _validate_vector(vec2)
    dot_product = float(np.dot(vec1_array, vec2_array))
    norm1 = float(np.linalg.norm(vec1_array))
    norm2 = float(np.linalg.norm(vec2_array))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot_product / (norm1 * norm2)


def _skills_similarity(
    graduate: Optional[List[str]], job: Optional[List[str]]
) -> float:
    if not graduate:
        return 0.0
    if not job:
        return 0.5
    grad_set = {skill.strip().lower() for skill in graduate if skill}
    job_set = {skill.strip().lower() for skill in job if skill}
    if not grad_set or not job_set:
        return 0.0
    intersection = grad_set.intersection(job_set)
    union = grad_set.union(job_set)
    return float(len(intersection) / len(union))


def _education_similarity(
    graduate: Optional[str],
    job: Optional[str],
) -> float:
    if not job:
        return 0.5
    if not graduate:
        return 0.0
    grad_norm = graduate.strip().lower()
    job_norm = job.strip().lower()
    if not grad_norm or not job_norm:
        return 0.0
    if grad_norm == job_norm:
        return 1.0
    if grad_norm in job_norm or job_norm in grad_norm:
        return 0.7
    return 0.0


def _experience_similarity(
    graduate_years: Optional[float],
    job_years: Optional[float],
) -> float:
    if job_years is None:
        return 0.6
    if graduate_years is None:
        return 0.0
    diff = abs(graduate_years - job_years)
    if diff >= job_years:
        return 0.0
    return float(max(0.0, 1.0 - (diff / max(job_years, 1.0))))


def _freshness_score(updated_at: Optional[str]) -> float:
    if not updated_at:
        return 0.5
    try:
        timestamp = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
    except ValueError:
        return 0.4
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    age_days = (now - timestamp).total_seconds() / 86400
    if age_days <= 0:
        return 1.0
    if FRESHNESS_HALF_LIFE_DAYS <= 0:
        return 0.5
    decay = 0.5 ** (age_days / FRESHNESS_HALF_LIFE_DAYS)
    return float(min(max(decay, 0.0), 1.0))


def _deduplicate_jobs(
    job_embeddings: Sequence[JobEmbeddingPayload],
) -> List[JobEmbeddingPayload]:
    deduped: Dict[str, JobEmbeddingPayload] = {}
    for job in job_embeddings:
        job_id = job.get("id")
        embedding = job.get("embedding")
        if not job_id or embedding is None:
            continue
        if job_id in deduped:
            continue
        deduped[job_id] = job
    return list(deduped.values())


def _prepare_options(
    options: Optional[MatchOptions],
) -> Tuple[float, int, Dict[str, float]]:
    min_score = (
        options.get("min_score", DEFAULT_MIN_SCORE) if options else DEFAULT_MIN_SCORE
    )
    limit = (
        options.get("limit", DEFAULT_MAX_RESULTS) if options else DEFAULT_MAX_RESULTS
    )
    weights_input = DEFAULT_WEIGHTS.copy()
    if options and "weights" in options and options["weights"]:
        weights_input.update({k: float(v) for k, v in options["weights"].items()})
    weights = _normalise_weights(weights_input)
    return float(max(0.0, min(min_score, 1.0))), int(max(1, limit)), weights


async def compute_matches(
    graduate_embedding: Sequence[float],
    job_embeddings: Sequence[JobEmbeddingPayload],
    graduate_metadata: Optional[GraduateMetadata] = None,
    options: Optional[MatchOptions] = None,
) -> List[MatchResult]:
    """
    Compute weighted match scores for a graduate against multiple job embeddings.
    """
    try:
        _validate_vector(graduate_embedding)
        jobs = _deduplicate_jobs(job_embeddings)
        if not jobs:
            return []

        cache_key = _build_cache_key(
            graduate_embedding, jobs, graduate_metadata, options
        )
        cached = await _get_from_cache(cache_key)
        if cached is not None:
            return cached

        min_score, limit, weights = _prepare_options(options)

        grad_skills = graduate_metadata.get("skills") if graduate_metadata else None
        grad_education = (
            graduate_metadata.get("education") if graduate_metadata else None
        )
        grad_experience_years = (
            float(graduate_metadata["experience_years"])
            if graduate_metadata and "experience_years" in graduate_metadata
            else None
        )

        results: List[MatchResult] = []

        for job in jobs:
            job_id = job.get("id")
            embedding = job.get("embedding")
            metadata = job.get("metadata", {})
            if not job_id or embedding is None:
                continue

            embedding_score = float(
                np.clip(cosine_similarity(graduate_embedding, embedding), 0.0, 1.0)
            )
            skills_score = _skills_similarity(grad_skills, metadata.get("skills"))
            education_score = _education_similarity(
                grad_education, metadata.get("education")
            )
            experience_score = _experience_similarity(
                grad_experience_years,
                metadata.get("experience_years"),
            )
            freshness = _freshness_score(metadata.get("updated_at"))

            combined_score = (
                embedding_score * weights["embedding"]
                + skills_score * weights["skills"]
                + education_score * weights["education"]
                + experience_score * weights["experience"]
                + freshness * weights["freshness"]
            )

            if combined_score < min_score:
                continue

            match_result: MatchResult = {
                "id": job_id,
                "score": round(combined_score, 4),
                "factors": {
                    "embedding": round(embedding_score, 4),
                    "skills": round(skills_score, 4),
                    "education": round(education_score, 4),
                    "experience": round(experience_score, 4),
                    "freshness": round(freshness, 4),
                },
            }
            results.append(match_result)

        results.sort(key=lambda item: item["score"], reverse=True)
        if results:
            results = results[:limit]

        await _set_cache(cache_key, results)
        return results
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Failed to compute matches")
        raise Exception(f"Failed to compute matches: {str(exc)}") from exc
