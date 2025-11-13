# AI Microservice

Python FastAPI microservice for AI-powered job matching.

## Setup

1. Create virtual environment: `python -m venv venv`
2. Activate virtual environment: `source venv/bin/activate` (or `venv\Scripts\activate` on Windows)
3. Install dependencies: `pip install -r requirements.txt`
4. Copy `.env.example` to `.env` and add your OpenAI API key
5. Run server: `uvicorn app.main:app --reload`

## Endpoints

- `POST /embed` - Generate an embedding for a single text input
- `POST /embed/batch` - Generate embeddings for a batch of text inputs with caching
- `POST /match` - Compute weighted similarity scores using embeddings and profile metadata
- `POST /match/batch` - Compute matches for multiple graduates against shared job embeddings
- `POST /feedback` - Generate structured skill gap feedback using GPT-4 with localisation support
- `POST /assessment/questions` - Generate assessment question sets tailored to provided skills

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `EMBEDDING_CACHE_TTL_SECONDS`: TTL for in-memory embedding cache (default: 900)
- `EMBEDDING_CACHE_MAX_ENTRIES`: Maximum entries retained in cache (default: 512)
- `EMBEDDING_MAX_BATCH`: Maximum batch size per OpenAI embedding request (default: 32)
- `EMBEDDING_MAX_INPUT_CHARS`: Maximum allowed characters after preprocessing (default: 16000)
- `MATCH_CACHE_TTL_SECONDS`: TTL for cached match responses (default: 300)
- `MATCH_CACHE_MAX_ENTRIES`: Maximum cached match responses retained (default: 1024)
- `MATCH_MIN_SCORE`: Minimum overall score threshold for matches (default: 0.3)
- `MATCH_MAX_RESULTS`: Maximum number of matches returned (default: 20)
- `MATCH_WEIGHT_EMBEDDING`, `MATCH_WEIGHT_SKILLS`, `MATCH_WEIGHT_EDUCATION`, `MATCH_WEIGHT_EXPERIENCE`, `MATCH_WEIGHT_FRESHNESS`: Optional weighting overrides for multi-factor scoring
- `MATCH_FRESHNESS_HALF_LIFE_DAYS`: Half-life (in days) used to compute recency score (default: 30)
- `FEEDBACK_MODEL`: OpenAI model identifier for feedback generation (default: gpt-4.1-mini)
- `FEEDBACK_TEMPERATURE`: Sampling temperature for feedback responses (default: 0.4)
- `FEEDBACK_MAX_TOKENS`: Maximum tokens for feedback responses (default: 900)
- `FEEDBACK_DEFAULT_LANGUAGE`: Language code used when none is provided (default: en)
- `ASSESSMENT_MODEL`: OpenAI model identifier for assessment question generation (default: gpt-4.1-mini)
- `ASSESSMENT_TEMPERATURE`: Sampling temperature for question generation (default: 0.3)
- `ASSESSMENT_MAX_TOKENS`: Maximum tokens for assessment generation responses (default: 1000)

## Testing

`source venv/bin/activate && python -m unittest discover -s tests -p 'test_*.py'`
