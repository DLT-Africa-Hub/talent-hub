"""
Feedback generation utilities powered by OpenAI GPT-4.

Responsibilities:
  * Produce structured skill-gap analysis and recommendations
  * Enforce JSON response contract with robust validation/parsing
  * Support language localisation and optional template overrides
  * Gracefully handle and classify API errors for upstream callers
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from typing import Any, Dict, Final, Optional

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

from app.models import GraduateProfile, JobRequirements

# Load environment variables before accessing them
load_dotenv()

logger = logging.getLogger(__name__)

_api_key = os.getenv("OPENAI_API_KEY")
if not _api_key:
    raise RuntimeError(
        "OPENAI_API_KEY environment variable is required for feedback generation"
    )

client = OpenAI(api_key=_api_key)

FEEDBACK_MODEL: Final[str] = os.getenv("FEEDBACK_MODEL", "gpt-4o-mini")
FEEDBACK_TEMPERATURE: Final[float] = float(os.getenv("FEEDBACK_TEMPERATURE", "0.4"))
FEEDBACK_MAX_TOKENS: Final[int] = int(os.getenv("FEEDBACK_MAX_TOKENS", "900"))

DEFAULT_LANGUAGE: Final[str] = os.getenv("FEEDBACK_DEFAULT_LANGUAGE", "en")
DEFAULT_TEMPLATE: Dict[str, str] = {
    "introduction": (
        "Offer encouragement and summarise the graduate's current readiness."
    ),
    "skill_gaps": (
        "Identify the most impactful skill gaps preventing success in "
        "the target role."
    ),
    "recommendations": (
        "Provide specific, actionable steps the graduate can complete "
        "within the next 30-60 days."
    ),
    "formatting": (
        "Respond with concise paragraphs and bullet lists where appropriate."
    ),
}


class FeedbackGenerationError(RuntimeError):
    """Raised when feedback generation fails."""


def _merge_templates(overrides: Optional[Dict[str, str]]) -> Dict[str, str]:
    if not overrides:
        return DEFAULT_TEMPLATE.copy()
    merged = DEFAULT_TEMPLATE.copy()
    for key, value in overrides.items():
        if isinstance(value, str) and value.strip():
            merged[key] = value.strip()
    return merged


def _serialise_list(values: Optional[Any]) -> str:
    if not values:
        return "Not specified"
    if isinstance(values, (list, tuple, set)):
        return (
            ", ".join(
                sorted({str(item).strip() for item in values if str(item).strip()})
            )
            or "Not specified"
        )
    return str(values)


def _build_prompt(
    graduate_profile: GraduateProfile,
    job_requirements: JobRequirements,
    language: str,
    additional_context: Optional[str],
    template: Dict[str, str],
) -> str:
    context_block = (
        f"\nAdditional Context:\n{additional_context.strip()}\n"
        if additional_context and additional_context.strip()
        else ""
    )  # noqa: E501
    prompt = f"""
You are an expert career counsellor who communicates in {language.upper()}.
Compare the graduate's background with the job requirements and produce an honest yet constructive review.

Graduate Profile:
- Skills: {_serialise_list(graduate_profile.skills)}
- Education: {graduate_profile.education.strip() if graduate_profile.education else 'Not specified'}
- Experience: {(graduate_profile.experience or 'Not specified').strip()}

Job Requirements:
- Required Skills: {_serialise_list(job_requirements.skills)}
- Education: {(job_requirements.education or 'Not specified').strip()}
- Experience: {(job_requirements.experience or 'Not specified').strip()}
{context_block}

Follow these guidelines:
- Introduction: {template['introduction']}
- Skill Gaps: {template['skill_gaps']}
- Recommendations: {template['recommendations']}
- Formatting: {template['formatting']}  # noqa: E501

Respond **only** with valid JSON using this schema:
{{
  "feedback": "A concise narrative (max 3 paragraphs) written in {language.upper()}",
  "skill_gaps": ["Skill gap summary in {language.upper()} (sentence case)", "..."],
  "recommendations": ["Actionable recommendation in {language.upper()} (sentence case)", "..."]
}}

Ensure that each list contains between 2 and 5 items. Do not include Markdown code fences or extra commentary.
"""
    return prompt.strip()


def _extract_json_block(text: str) -> str:
    fenced = re.search(r"```(?:json)?\s*(.+?)\s*```", text, re.IGNORECASE | re.DOTALL)
    if fenced:
        return fenced.group(1)
    return text.strip()


def _parse_response(content: str, language: str) -> Dict[str, Any]:
    cleaned = _extract_json_block(content)
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error("Unable to parse feedback JSON: %s", exc)
        raise FeedbackGenerationError(
            "Feedback generation returned invalid JSON"
        ) from exc

    feedback = str(parsed.get("feedback", "")).strip()
    if not feedback:
        raise FeedbackGenerationError("Feedback response is missing narrative content")

    def normalise_list(key: str) -> list[str]:
        values = parsed.get(key)
        if not isinstance(values, list):
            return []
        result: list[str] = []
        for item in values:
            if not isinstance(item, str):
                continue
            normalised = item.strip()
            if normalised:
                result.append(normalised)
        return result

    skill_gaps = normalise_list("skill_gaps")
    recommendations = normalise_list("recommendations")

    if not skill_gaps:
        logger.info("Feedback response missing skill gaps; synthesising placeholder.")
        skill_gaps = [
            f"No explicit skill gaps identified. "
            f"Consider verifying requirements in {language.upper()}."
        ]

    if not recommendations:
        logger.info(
            "Feedback response missing recommendations; synthesising placeholder."
        )
        recommendations = [
            f"Schedule a follow-up coaching session to determine "
            f"concrete next steps ({language.upper()})."
        ]

    return {
        "feedback": feedback,
        "skill_gaps": skill_gaps,
        "recommendations": recommendations,
    }


async def _call_openai(prompt: str) -> str:
    try:
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=FEEDBACK_MODEL,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert career counsellor. Always respond "
                        "with JSON that matches the requested schema."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=FEEDBACK_TEMPERATURE,
            max_tokens=FEEDBACK_MAX_TOKENS,
        )
    except (RateLimitError, APITimeoutError) as exc:
        logger.warning("Feedback generation rate limited or timed out: %s", exc)
        raise FeedbackGenerationError(
            "Feedback service is currently unavailable, please retry shortly."
        ) from exc
    except (BadRequestError, APIConnectionError, APIError) as exc:
        logger.error("Feedback generation API error: %s", exc)
        raise FeedbackGenerationError(
            "Feedback service rejected the request payload."
        ) from exc
    except OpenAIError as exc:
        logger.exception("Unexpected OpenAI error during feedback generation")
        raise FeedbackGenerationError(
            "Unexpected error from feedback service."
        ) from exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Unhandled error during feedback generation")
        raise FeedbackGenerationError("Unable to generate feedback.") from exc

    choice = response.choices[0]
    content = (
        choice.message.content if choice.message and choice.message.content else ""
    )
    if not content:
        raise FeedbackGenerationError("Feedback generation returned an empty response.")
    return content


async def generate_feedback_text(
    graduate_profile: GraduateProfile,
    job_requirements: JobRequirements,
    *,
    language: Optional[str] = None,
    additional_context: Optional[str] = None,
    template_overrides: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """
    Generate skill gap analysis and improvement recommendations using GPT-4.
    """
    if not graduate_profile.skills:
        logger.warning(
            "Graduate profile contains no skills; feedback quality may be limited."
        )
    if not job_requirements.skills:
        logger.warning(
            "Job requirements contain no skills; feedback quality may be limited."
        )

    target_language = (language or DEFAULT_LANGUAGE).strip() or DEFAULT_LANGUAGE
    template = _merge_templates(template_overrides)

    prompt = _build_prompt(
        graduate_profile=graduate_profile,
        job_requirements=job_requirements,
        language=target_language,
        additional_context=additional_context,
        template=template,
    )

    raw_response = await _call_openai(prompt)
    return _parse_response(raw_response, target_language)
