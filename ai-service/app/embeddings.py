"""
Embedding generation utilities for the AI microservice.

Responsibilities:
  * Input sanitisation and validation
  * Batch-aware calls to OpenAI Embeddings API
  * In-memory caching with TTL to minimise duplicate requests
  * Embedding dimension verification and storage optimisation
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Sequence

import numpy as np
from openai import (
    APIConnectionError,
    APIError,
    APITimeoutError,
    BadRequestError,
    OpenAI,
    OpenAIError,
    RateLimitError,
)
from dotenv import load_dotenv

# Load environment variables before accessing them
load_dotenv()

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_DIMENSION = 3072  # Dimension for text-embedding-3-large
MAX_BATCH_SIZE = int(os.getenv("EMBEDDING_MAX_BATCH", "32"))
CACHE_TTL_SECONDS = int(os.getenv("EMBEDDING_CACHE_TTL_SECONDS", str(15 * 60)))
CACHE_MAX_ENTRIES = int(os.getenv("EMBEDDING_CACHE_MAX_ENTRIES", "512"))
MAX_INPUT_CHAR_LENGTH = int(os.getenv("EMBEDDING_MAX_INPUT_CHARS", "16000"))

_api_key = os.getenv("OPENAI_API_KEY")
if not _api_key:
    raise RuntimeError("OPENAI_API_KEY environment variable is required for embeddings")

_client = OpenAI(api_key=_api_key)


class EmbeddingError(RuntimeError):
    """Raised when embedding generation fails."""


@dataclass
class _CacheEntry:
    value: List[float]
    expires_at: float


_cache: "OrderedDict[str, _CacheEntry]" = OrderedDict()
_cache_lock = asyncio.Lock()


def _normalise_text(text: str) -> str:
    """
    Basic text preprocessing:
      * strip leading/trailing whitespace
      * collapse internal whitespace to single spaces
      * ensure newline consistency
    """
    collapsed = " ".join(text.replace("\r\n", "\n").replace("\r", "\n").split())
    return collapsed.strip()


def _hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


async def _get_from_cache(key: str) -> Optional[List[float]]:
    async with _cache_lock:
        entry = _cache.get(key)
        now = time.monotonic()
        if not entry:
            return None

        if entry.expires_at < now:
            _cache.pop(key, None)
            return None

        _cache.move_to_end(key)
        return entry.value


async def _set_cache(key: str, value: List[float]) -> None:
    async with _cache_lock:
        if key in _cache:
            _cache.move_to_end(key)
        _cache[key] = _CacheEntry(
            value=value, expires_at=time.monotonic() + CACHE_TTL_SECONDS
        )

        while len(_cache) > CACHE_MAX_ENTRIES:
            _cache.popitem(last=False)


def _optimise_embedding_storage(embedding: Sequence[float]) -> List[float]:
    """
    Convert embedding to float32 to halve storage requirements while keeping precision.
    """
    array = np.asarray(embedding, dtype=np.float32)
    return array.tolist()


def _validate_embedding_dimensions(embedding: Sequence[float]) -> None:
    length = len(embedding)
    if length != EMBEDDING_DIMENSION:
        raise EmbeddingError(
            f"Embedding dimension mismatch: expected {EMBEDDING_DIMENSION}, "
            f"got {length}"
        )


def _prepare_text(text: str) -> str:
    if not isinstance(text, str):
        raise EmbeddingError("Text must be a string")

    if not text.strip():
        raise EmbeddingError("Text cannot be empty")

    normalised = _normalise_text(text)
    if len(normalised) == 0:
        raise EmbeddingError("Text cannot be empty after preprocessing")

    if len(normalised) > MAX_INPUT_CHAR_LENGTH:
        raise EmbeddingError(
            f"Text exceeds maximum allowed length of {MAX_INPUT_CHAR_LENGTH} characters"
        )

    return normalised


async def _fetch_embeddings_from_openai(texts: Sequence[str]) -> List[List[float]]:
    try:
        response = await asyncio.to_thread(
            _client.embeddings.create,
            model=EMBEDDING_MODEL,
            input=list(texts),
        )

        data = response.data
        if len(data) != len(texts):
            raise EmbeddingError(
                f"OpenAI response mismatch: expected {len(texts)} embeddings, "
                f"got {len(data)}"
            )

        embeddings: List[List[float]] = []
        for item in data:
            embedding = item.embedding
            _validate_embedding_dimensions(embedding)
            embeddings.append(_optimise_embedding_storage(embedding))

        return embeddings

    except RateLimitError as exc:
        logger.warning("OpenAI embedding request throttled: %s", exc)
        # Check if this is actually a quota error
        # (429 can mean either rate limit or quota)
        error_msg = str(exc)

        # Try to access error details from the exception
        error_body = None
        if hasattr(exc, "response"):
            error_body = exc.response
        elif hasattr(exc, "body"):
            error_body = exc.body

        error_data = None
        if error_body:
            if hasattr(error_body, "body"):
                error_data = error_body.body
            elif isinstance(error_body, dict):
                error_data = error_body

        # Check for quota error indicators in multiple places
        is_quota_error = (
            "quota" in error_msg.lower()
            or "insufficient_quota" in error_msg.lower()
            or "exceeded your current quota" in error_msg.lower()
            or (
                isinstance(error_data, dict)
                and (
                    error_data.get("error", {}).get("code") == "insufficient_quota"
                    or error_data.get("error", {}).get("type") == "insufficient_quota"
                    or "quota" in str(error_data).lower()
                )
            )
            or (error_data and "quota" in str(error_data).lower())
        )

        if is_quota_error:
            # Extract the full error message if available
            full_error = error_msg
            if isinstance(error_data, dict) and error_data.get("error", {}).get(
                "message"
            ):
                full_error = error_data["error"]["message"]
            raise EmbeddingError(f"OpenAI API quota exceeded: {full_error}") from exc
        raise EmbeddingError("Embedding service is currently rate limited") from exc
    except APITimeoutError as exc:
        logger.warning("OpenAI embedding request timeout: %s", exc)
        raise EmbeddingError("Embedding service request timed out") from exc
    except BadRequestError as exc:
        logger.error("OpenAI embedding API error: %s", exc)
        # Preserve the original error message, especially for quota errors
        error_msg = str(exc)
        if "quota" in error_msg.lower() or "insufficient_quota" in error_msg.lower():
            raise EmbeddingError(f"OpenAI API quota exceeded: {error_msg}") from exc
        raise EmbeddingError(
            f"Embedding service rejected the request: {error_msg}"
        ) from exc
    except (APIConnectionError, APIError) as exc:
        logger.error("OpenAI embedding API error: %s", exc)
        raise EmbeddingError(f"Embedding service error: {str(exc)}") from exc
    except OpenAIError as exc:
        logger.exception("Unexpected OpenAI error while generating embeddings")
        raise EmbeddingError("Unexpected OpenAI error") from exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Unhandled embedding generation error")
        raise EmbeddingError("Failed to generate embeddings") from exc


def _chunked(iterable: Sequence[str], size: int) -> Iterable[Sequence[str]]:
    for index in range(0, len(iterable), size):
        yield iterable[index : index + size]


async def generate_embeddings_batch(texts: Sequence[str]) -> List[List[float]]:
    """
    Generate embeddings for a batch of texts while leveraging caching to minimise
    duplicate OpenAI calls.
    """
    if not texts:
        return []

    prepared_texts = [_prepare_text(text) for text in texts]
    results: List[Optional[List[float]]] = [None] * len(prepared_texts)
    pending_map: Dict[str, List[int]] = {}

    # Attempt to hydrate from cache
    for idx, text in enumerate(prepared_texts):
        cache_key = _hash_text(text)
        cached_embedding = await _get_from_cache(cache_key)
        if cached_embedding is not None:
            results[idx] = cached_embedding
            continue
        pending_map.setdefault(text, []).append(idx)

    if pending_map:
        pending_texts = list(pending_map.keys())
        for chunk in _chunked(pending_texts, MAX_BATCH_SIZE):
            embeddings = await _fetch_embeddings_from_openai(chunk)
            for text_value, embedding in zip(chunk, embeddings):
                cache_key = _hash_text(text_value)
                await _set_cache(cache_key, embedding)
                for original_index in pending_map[text_value]:
                    results[original_index] = embedding

    # All slots should now be filled; if not, raise an error
    if any(embedding is None for embedding in results):
        raise EmbeddingError("Failed to resolve embeddings for all texts")

    return [embedding for embedding in results if embedding is not None]


async def generate_embedding(text: str) -> List[float]:
    """
    Convenience wrapper around batch generation for a single text.
    """
    embeddings = await generate_embeddings_batch([text])
    return embeddings[0]
