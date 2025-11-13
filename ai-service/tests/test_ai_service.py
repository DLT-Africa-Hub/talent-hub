import asyncio
import json
import os
import types
import unittest
from typing import List
from unittest.mock import AsyncMock, patch

# Ensure the OpenAI client initialises successfully during imports
os.environ.setdefault("OPENAI_API_KEY", "test-key")


class _ImportOpenAIStub:
    def __init__(self, *args, **kwargs):
        placeholder_embedding = types.SimpleNamespace(data=[])
        placeholder_completion = types.SimpleNamespace(choices=[])
        self.embeddings = types.SimpleNamespace(create=lambda *a, **k: placeholder_embedding)
        self.chat = types.SimpleNamespace(
            completions=types.SimpleNamespace(create=lambda *a, **k: placeholder_completion)
        )


main_stub = types.ModuleType("app.main")
main_stub.GraduateProfile = object  # type: ignore[attr-defined]
main_stub.JobRequirements = object  # type: ignore[attr-defined]
import sys

sys.modules.setdefault("app.main", main_stub)

with patch("openai.OpenAI", _ImportOpenAIStub):
    import importlib

    embeddings = importlib.import_module("app.embeddings")
    matcher = importlib.import_module("app.matcher")
    feedback = importlib.import_module("app.feedback")
    questions = importlib.import_module("app.questions")


class DummyEmbeddingsClient:
    """Simple client stub that mimics the OpenAI embeddings API."""

    def __init__(self):
        self.calls: List[List[str]] = []
        self.embeddings = types.SimpleNamespace(create=self._create)

    def _create(self, model: str, input: List[str]):
        self.calls.append(list(input))
        return types.SimpleNamespace(
            data=[
                types.SimpleNamespace(embedding=[0.1] * embeddings.EMBEDDING_DIMENSION)
                for _ in input
            ]
        )


class EmbeddingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = DummyEmbeddingsClient()
        embeddings._client = self.client  # type: ignore[attr-defined]
        embeddings._cache.clear()  # type: ignore[attr-defined]

    def test_generate_embeddings_batch_caches_requests(self) -> None:
        result = asyncio.run(embeddings.generate_embeddings_batch([" hello ", "hello"]))
        self.assertEqual(len(result), 2)
        self.assertEqual(self.client.calls, [["hello"]])

        second = asyncio.run(embeddings.generate_embeddings_batch(["hello"]))
        self.assertEqual(second[0], result[0])
        self.assertEqual(len(self.client.calls), 1, "Expected cached result for duplicate text")

    def test_generate_profile_embedding_rejects_empty_text(self) -> None:
        with self.assertRaises(embeddings.EmbeddingError):
            asyncio.run(embeddings.generate_embeddings_batch(["   "]))


class MatcherTests(unittest.TestCase):
    def setUp(self) -> None:
        matcher._cache.clear()  # type: ignore[attr-defined]

    def test_compute_matches_combines_factors(self) -> None:
        graduate_embedding = [0.1] * embeddings.EMBEDDING_DIMENSION
        job_embedding = [0.1] * embeddings.EMBEDDING_DIMENSION

        jobs = [
            {
                "id": "job-1",
                "embedding": job_embedding,
                "metadata": {
                    "skills": ["react", "typescript"],
                    "education": "BSc Computer Science",
                    "experience_years": 3,
                    "updated_at": "2025-01-01T00:00:00Z",
                },
            },
            {
                "id": "job-2",
                "embedding": [0.0] * embeddings.EMBEDDING_DIMENSION,
                "metadata": {
                    "skills": ["go"],
                },
            },
        ]

        graduate_metadata = {
            "skills": ["React", "TypeScript"],
            "education": "BSc Computer Science",
            "experience_years": 2,
        }

        result = asyncio.run(
            matcher.compute_matches(
                graduate_embedding,
                jobs,
                graduate_metadata,
                {"min_score": 0.0, "limit": 5},
            )
        )

        self.assertEqual(len(result), 2)
        self.assertGreater(result[0]["score"], result[1]["score"], "Expected better match ranked first")
        self.assertIn("factors", result[0])


class FeedbackTests(unittest.TestCase):
    def setUp(self) -> None:
        self.feedback_patch = patch("app.feedback._call_openai", new_callable=AsyncMock)
        self.mock_call = self.feedback_patch.start()

    def tearDown(self) -> None:
        self.feedback_patch.stop()

    def test_generate_feedback_parses_response(self) -> None:
        payload = {
            "feedback": "Focus on broadening your toolset.",
            "skill_gaps": ["GraphQL"],
            "recommendations": ["Complete a GraphQL tutorial"],
        }
        self.mock_call.return_value = json.dumps(payload)

        result = asyncio.run(
            feedback.generate_feedback_text(
                types.SimpleNamespace(skills=["React"], education="BSc CS", experience="2 years"),
                types.SimpleNamespace(skills=["React", "GraphQL"], education="BSc CS", experience="3 years"),
            )
        )

        self.assertEqual(result["feedback"], payload["feedback"])
        self.assertEqual(result["skill_gaps"], payload["skill_gaps"])
        self.assertEqual(result["recommendations"], payload["recommendations"])

    def test_generate_feedback_fills_missing_lists(self) -> None:
        payload = {
            "feedback": "Great work.",
            "skill_gaps": [],
            "recommendations": [],
        }
        self.mock_call.return_value = json.dumps(payload)

        result = asyncio.run(
            feedback.generate_feedback_text(
                types.SimpleNamespace(skills=["React"], education="BSc CS", experience=None),
                types.SimpleNamespace(skills=["React"], education=None, experience=None),
            )
        )

        self.assertTrue(result["skill_gaps"], "Expected fallback skill gap")
        self.assertTrue(result["recommendations"], "Expected fallback recommendation")


class QuestionGenerationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.questions_patch = patch("app.questions._call_openai", new_callable=AsyncMock)
        self.mock_call = self.questions_patch.start()

    def tearDown(self) -> None:
        self.questions_patch.stop()

    def test_generate_assessment_questions(self) -> None:
        payload = {
            "questions": [
                {
                    "question": "Which lifecycle hook is replaced by useEffect?",
                    "options": ["componentDidMount", "render"],
                    "answer": "componentDidMount",
                    "skill": "React",
                }
            ]
        }
        self.mock_call.return_value = json.dumps(payload)

        questions_result = asyncio.run(
            questions.generate_assessment_questions(["React"], attempt=2, num_questions=1, language="en")
        )

        self.mock_call.assert_awaited()
        self.assertEqual(len(questions_result), 1)
        self.assertEqual(questions_result[0]["skill"], "React")

    def test_generate_assessment_questions_requires_skills(self) -> None:
        with self.assertRaises(questions.QuestionGenerationError):
            asyncio.run(questions.generate_assessment_questions([]))


if __name__ == "__main__":  # pragma: no cover
    unittest.main()

