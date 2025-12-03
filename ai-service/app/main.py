"""
AI Microservice - FastAPI application
Handles embeddings, matching, and feedback generation using OpenAI API
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
import os
from dotenv import load_dotenv

from app.embeddings import EmbeddingError, generate_embedding, generate_embeddings_batch
from app.matcher import compute_matches
from app.models import GraduateProfile, JobRequirements
from app.feedback import generate_feedback_text, FeedbackGenerationError
from app.questions import (
    QuestionGenerationError,
    generate_assessment_questions,
)

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Talent Hub AI Service",
    description="AI microservice for job matching and candidate evaluation",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Configure specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response models
class EmbedRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    embedding: List[float]


class EmbedBatchRequest(BaseModel):
    texts: List[str]


class EmbedBatchResponse(BaseModel):
    embeddings: List[List[float]]


class MatchFactors(BaseModel):
    embedding: float
    skills: float
    education: float
    experience: float
    freshness: float


class MatchWeights(BaseModel):
    embedding: Optional[float] = None
    skills: Optional[float] = None
    education: Optional[float] = None
    experience: Optional[float] = None
    freshness: Optional[float] = None


class MatchOptions(BaseModel):
    min_score: Optional[float] = None
    limit: Optional[int] = None
    weights: Optional[MatchWeights] = None


class GraduateMetadata(BaseModel):
    skills: Optional[List[str]] = None
    education: Optional[str] = None
    experience_years: Optional[float] = None
    latest_experience_year: Optional[int] = None


class JobMetadata(BaseModel):
    skills: Optional[List[str]] = None
    education: Optional[str] = None
    experience_years: Optional[float] = None
    updated_at: Optional[str] = None


class JobEmbedding(BaseModel):
    id: str
    embedding: List[float]
    metadata: Optional[JobMetadata] = None


class MatchRequest(BaseModel):
    graduate_embedding: List[float]
    job_embeddings: List[JobEmbedding]
    graduate_metadata: Optional[GraduateMetadata] = None
    options: Optional[MatchOptions] = None


class MatchItem(BaseModel):
    id: str
    score: float
    factors: Optional[MatchFactors] = None


class MatchResponse(BaseModel):
    matches: List[MatchItem]


class GraduateMatchPayload(BaseModel):
    id: Optional[str] = None
    embedding: List[float]
    metadata: Optional[GraduateMetadata] = None


class MatchBatchRequest(BaseModel):
    graduates: List[GraduateMatchPayload]
    job_embeddings: List[JobEmbedding]
    options: Optional[MatchOptions] = None


class MatchBatchItem(BaseModel):
    graduate_id: Optional[str] = None
    matches: List[MatchItem]


class MatchBatchResponse(BaseModel):
    results: List[MatchBatchItem]


class AssessmentQuestion(BaseModel):
    question: str
    options: List[str]
    answer: str
    skill: Optional[str] = None


class AssessmentQuestionRequest(BaseModel):
    skills: List[str]
    attempt: Optional[int] = 1
    num_questions: Optional[int] = 5
    language: Optional[str] = "en"


class AssessmentQuestionResponse(BaseModel):
    questions: List[AssessmentQuestion]


class FeedbackRequest(BaseModel):
    graduate_profile: GraduateProfile
    job_requirements: JobRequirements
    language: Optional[str] = "en"
    additional_context: Optional[str] = None
    template_overrides: Optional[Dict[str, str]] = None


class FeedbackResponse(BaseModel):
    feedback: str
    skillGaps: List[str]
    recommendations: List[str]


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Talent Hub AI Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "embed": "/embed",
            "embed_batch": "/embed/batch",
            "match": "/match",
            "match_batch": "/match/batch",
            "feedback": "/feedback",
            "assessment_questions": "/assessment/questions"
        }
    }


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    api_key_set = bool(os.getenv("OPENAI_API_KEY"))
    return {
        "status": "ok",
        "message": "AI Service is running",
        "openai_configured": api_key_set
    }


@app.post("/embed", response_model=EmbedResponse)
async def embed_text(request: EmbedRequest):
    """
    Generate embedding for a given text using OpenAI text-embedding-3-large
    
    Args:
        request: Contains text to embed
        
    Returns:
        Embedding vector (list of floats)
    """
    try:
        if not request.text or not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        embedding = await generate_embedding(request.text)
        return EmbedResponse(embedding=embedding)
    
    except EmbeddingError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=f"Error generating embedding: {str(exc)}")


@app.post("/embed/batch", response_model=EmbedBatchResponse)
async def embed_texts_batch(request: EmbedBatchRequest):
    """
    Generate embeddings for a batch of texts.
    """
    try:
        if not request.texts:
            raise HTTPException(status_code=400, detail="Texts list cannot be empty")

        embeddings = await generate_embeddings_batch(request.texts)
        return EmbedBatchResponse(embeddings=embeddings)

    except EmbeddingError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=f"Error generating embeddings: {str(exc)}")


@app.post("/match", response_model=MatchResponse)
async def match_candidate(request: MatchRequest):
    """
    Compute similarity between graduate embedding and job embeddings
    
    Args:
        request: Contains graduate embedding and list of job embeddings
        
    Returns:
        Ranked list of matches with scores
    """
    try:
        if not request.graduate_embedding:
            raise HTTPException(status_code=400, detail="Graduate embedding is required")
        
        if not request.job_embeddings:
            raise HTTPException(status_code=400, detail="Job embeddings are required")
        
        matches = await compute_matches(
            request.graduate_embedding,
            [job.model_dump(exclude_none=True) for job in request.job_embeddings],
            request.graduate_metadata.model_dump(exclude_none=True)
            if request.graduate_metadata
            else None,
            request.options.model_dump(exclude_none=True) if request.options else None,
        )
        
        return MatchResponse(matches=[MatchItem(**match) for match in matches])
    
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error computing matches: {str(exc)}")


@app.post("/match/batch", response_model=MatchBatchResponse)
async def match_candidates_batch(request: MatchBatchRequest):
    """
    Compute similarity scores for multiple graduates against shared job embeddings.
    """
    try:
        if not request.graduates:
            raise HTTPException(status_code=400, detail="Graduates list cannot be empty")
        if not request.job_embeddings:
            raise HTTPException(status_code=400, detail="Job embeddings are required")

        job_payload = [job.model_dump(exclude_none=True) for job in request.job_embeddings]
        options_payload = (
            request.options.model_dump(exclude_none=True) if request.options else None
        )

        results: List[MatchBatchItem] = []
        for graduate in request.graduates:
            metadata_payload = (
                graduate.metadata.model_dump(exclude_none=True)
                if graduate.metadata
                else None
            )
            matches = await compute_matches(
                graduate.embedding,
                job_payload,
                metadata_payload,
                options_payload,
            )
            results.append(
                MatchBatchItem(
                    graduate_id=graduate.id,
                    matches=[MatchItem(**match) for match in matches],
                )
            )

        return MatchBatchResponse(results=results)

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error computing batch matches: {str(exc)}")


@app.post("/feedback", response_model=FeedbackResponse)
async def generate_feedback(request: FeedbackRequest):
    """
    Generate skill gap analysis and improvement tips using GPT-4
    
    Args:
        request: Contains graduate profile and job requirements
        
    Returns:
        Feedback, skill gaps, and recommendations
    """
    try:
        feedback_data = await generate_feedback_text(
            request.graduate_profile,
            request.job_requirements,
            language=request.language,
            additional_context=request.additional_context,
            template_overrides=request.template_overrides,
        )
        
        return FeedbackResponse(
            feedback=feedback_data["feedback"],
            skillGaps=feedback_data["skill_gaps"],
            recommendations=feedback_data["recommendations"]
        )
    
    except FeedbackGenerationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error generating feedback: {str(exc)}")


@app.post("/assessment/questions", response_model=AssessmentQuestionResponse)
async def assessment_questions(request: AssessmentQuestionRequest):
    """
    Generate multiple-choice assessment questions tailored to provided skills.
    """
    try:
        if not request.skills:
            raise HTTPException(status_code=400, detail="At least one skill is required")

        questions = await generate_assessment_questions(
            request.skills,
            attempt=request.attempt or 1,
            num_questions=request.num_questions or 5,
            language=request.language or "en",
        )
        return AssessmentQuestionResponse(questions=questions)

    except QuestionGenerationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error generating assessment questions: {str(exc)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

