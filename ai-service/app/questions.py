"""
Assessment question generation utilities powered by OpenAI GPT models.

Responsibilities:
  * Create multiple-choice questions tailored to a graduate's skill set
  * Ensure structured JSON output with validation/sanitisation
  * Support attempt-aware variation to provide fresh question sets
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Final, List, Optional, TypedDict

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

_api_key = os.getenv("OPENAI_API_KEY")
if not _api_key:
    raise RuntimeError(
        "OPENAI_API_KEY environment variable is required for question generation"
    )

client = OpenAI(api_key=_api_key)

ASSESSMENT_MODEL: Final[str] = os.getenv(
    "ASSESSMENT_MODEL", os.getenv("FEEDBACK_MODEL", "gpt-4o-mini")
)
ASSESSMENT_TEMPERATURE: Final[float] = float(os.getenv("ASSESSMENT_TEMPERATURE", "0.3"))
ASSESSMENT_MAX_TOKENS: Final[int] = int(os.getenv("ASSESSMENT_MAX_TOKENS", "1000"))


class QuestionGenerationError(RuntimeError):
    """Raised when assessment question generation fails."""


class AssessmentQuestion(TypedDict):
    question: str
    options: List[str]
    answer: str
    skill: Optional[str]


def _serialise_skills(skills: List[str]) -> str:
    return ", ".join(sorted({skill.strip() for skill in skills if skill.strip()}))


def _build_prompt(
    skills: List[str],
    *,
    attempt: int,
    num_questions: int,
    language: str,
) -> str:
    skill_list = _serialise_skills(skills)
    return f"""
You are an experienced technical interviewer. Draft {num_questions} \
multiple-choice questions in {language.upper()} that assess a graduate's \
proficiency with the following skills: {skill_list or "general web development"}.

Attempt number: {attempt}. Ensure this set differs from earlier attempts \
by varying the focus and wording.

Guidelines:
- Each question must emphasise one primary skill; reflect that in the "skill" field.
- Provide 4 distinct answer options per question.
- Include exactly one correct answer per question, matching one of the options verbatim.
- Avoid trivial definitions; prefer practical, scenario-based questions when possible.

Respond with JSON in the following shape:
{{
  "questions": [
    {{
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Correct option (must match one entry in options)",
      "skill": "Primary skill assessed"
    }},
    ...
  ]
}}
""".strip()


def _parse_questions(payload: str) -> List[AssessmentQuestion]:
    try:
        data = json.loads(payload)
    except json.JSONDecodeError as exc:
        logger.error("Unable to parse question JSON: %s", exc)
        raise QuestionGenerationError(
            "Question generation returned invalid JSON"
        ) from exc

    questions = data.get("questions")
    if not isinstance(questions, list) or not questions:
        raise QuestionGenerationError("Question generation returned no questions")

    normalised: List[AssessmentQuestion] = []
    for item in questions:
        if not isinstance(item, dict):
            continue
        question_text = str(item.get("question", "")).strip()
        options = item.get("options")
        answer = str(item.get("answer", "")).strip()
        skill = item.get("skill")

        if (
            not question_text
            or not isinstance(options, list)
            or len(options) < 2
            or not answer
        ):
            continue

        cleaned_options = []
        for option in options:
            if isinstance(option, str):
                trimmed = option.strip()
                if trimmed:
                    cleaned_options.append(trimmed)

        if len(cleaned_options) < 2:
            continue

        if answer not in cleaned_options:
            # Fallback: if answer differs by case/spacing, try to match.
            matches = [opt for opt in cleaned_options if opt.lower() == answer.lower()]
            if matches:
                answer = matches[0]
            else:
                continue

        normalised.append(
            AssessmentQuestion(
                question=question_text,
                options=cleaned_options,
                answer=answer,
                skill=(
                    str(skill).strip()
                    if isinstance(skill, str) and skill.strip()
                    else None
                ),
            )
        )

    if not normalised:
        raise QuestionGenerationError("No valid questions were generated")

    return normalised


async def _call_openai(prompt: str) -> str:
    try:
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=ASSESSMENT_MODEL,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You generate rigorous technical multiple-choice questions. "
                        "Always respond with valid JSON matching the requested schema."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=ASSESSMENT_TEMPERATURE,
            max_tokens=ASSESSMENT_MAX_TOKENS,
        )
    except (RateLimitError, APITimeoutError) as exc:
        logger.warning("Question generation rate limited or timed out: %s", exc)
        raise QuestionGenerationError(
            "Question service is currently unavailable. Please retry shortly."
        ) from exc
    except (BadRequestError, APIConnectionError, APIError) as exc:
        logger.error("Question generation API error: %s", exc)
        raise QuestionGenerationError(
            "Question service rejected the request payload."
        ) from exc
    except OpenAIError as exc:
        logger.exception("Unexpected OpenAI error during question generation")
        raise QuestionGenerationError(
            "Unexpected error from question service."
        ) from exc
    except Exception as exc:  # pragma: no cover
        logger.exception("Unhandled error during question generation")
        raise QuestionGenerationError(
            "Unable to generate assessment questions."
        ) from exc

    choice = response.choices[0]
    content = (
        choice.message.content if choice.message and choice.message.content else ""
    )
    if not content:
        raise QuestionGenerationError("Question generation returned an empty response.")
    return content


async def generate_assessment_questions(
    skills: List[str],
    *,
    attempt: int = 1,
    num_questions: int = 5,
    language: str = "en",
) -> List[AssessmentQuestion]:
    if not skills:
        raise QuestionGenerationError(
            "At least one skill is required to generate questions."
        )

    prompt = _build_prompt(
        skills,
        attempt=max(attempt, 1),
        num_questions=max(num_questions, 1),
        language=language or "en",
    )
    raw = await _call_openai(prompt)
    return _parse_questions(raw)
