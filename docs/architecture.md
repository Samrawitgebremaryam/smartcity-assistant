# Architecture Documentation

## Overview

The SmartCity RAG Assistant is a production-style backend system that provides intelligent Q&A capabilities for city services using Retrieval-Augmented Generation (RAG).

## System Components

### 1. FastAPI Backend (`app/main.py`)
- RESTful API built with FastAPI
- OpenAPI documentation at `/docs`
- Exception handlers for validation and not found errors
- CORS middleware enabled

### 2. Database Layer

#### PostgreSQL
- **Host**: localhost:55432 (Docker), localhost:5432 (local)
- **Database**: smartcity
- **Tables**:
  - `documents` - Stores uploaded document metadata
  - `chunks` - Stores document chunks with embeddings
  - `query_logs` - Stores chat interactions
  - `feedback` - Stores user feedback

#### SQLAlchemy
- ORM for database operations
- Async-friendly session management
- Repository pattern for data access

### 3. Vector Store

#### Qdrant
- **URL**: http://localhost:6333
- **Collection**: smartcity_documents
- Stores vector embeddings for semantic search
- Supports metadata filtering
- Distance metric: Cosine

### 4. Cache Layer

#### Redis
- **URL**: redis://localhost:6379
- Used for caching and session management

### 5. AI Services

#### Generation (LLM)
- **Provider**: Gemini (configured via `LLM_PROVIDER=gemini`)
- **Model**: gemini-2.5-flash
- **API**: Google Generative Language API
- Falls back to Mock generation for testing

#### Embeddings
- **Provider**: Mock (configured via `EMBEDDING_PROVIDER=mock`)
- **Vector Size**: 16 dimensions
- Upgradable to sentence-transformers for production

## RAG Pipeline

```
User Question
     │
     ▼
┌─────────────────┐
│  Query Rewrite  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Embed Query    │ ──▶ Mock Embeddings
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Qdrant Search  │
│  (top_k=5)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Context Build │
│  (retrieve     │
│   chunks)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Gemini Generate│
│  (answer with   │
│   citations)    │
└────────┬────────┘
         │
         ▼
    Final Answer
    + Sources
    + Confidence
```

## Data Flow

### 1. Document Upload Flow
```
Upload Request
     │
     ▼
File Parser (txt)
     │
     ▼
Extract Metadata
     │
     ▼
Save to PostgreSQL
     │
     ▼
Ingest Request
     │
     ▼
Chunk Text
     │
     ▼
Generate Embeddings
     │
     ▼
Store in Qdrant
     │
     ▼
Update Status
```

### 2. Chat Flow
```
Chat Request
     │
     ▼
Validate Input
     │
     ▼
Get Embedding
     │
     ▼
Search Qdrant
     │
     ▼
Build Context
     │
     ▼
Call Gemini
     │
     ▼
Format Response
     │
     ▼
Log Query
     │
     ▼
Return Answer
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_HOST` | Database host | localhost |
| `POSTGRES_PORT` | Database port | 5432 |
| `QDRANT_URL` | Qdrant URL | http://localhost:6333 |
| `REDIS_URL` | Redis URL | redis://localhost:6379 |
| `LLM_PROVIDER` | LLM provider (mock/openai/gemini) | mock |
| `GEMINI_API_KEY` | Google API key | - |
| `GEMINI_MODEL` | Gemini model name | gemini-2.5-flash |
| `EMBEDDING_PROVIDER` | Embedding provider (mock/sentence-transformers) | mock |
| `CHUNK_SIZE` | Text chunk size | 800 |
| `CHUNK_OVERLAP` | Chunk overlap | 100 |
| `RETRIEVAL_TOP_K` | Number of chunks to retrieve | 5 |

## Security

- API key validation for LLM providers
- Input validation on all endpoints
- SQL injection prevention via SQLAlchemy
- CORS configured for allowed origins

## Performance

- Connection pooling for PostgreSQL
- Qdrant connection reuse
- Redis connection pooling
- Async-ready architecture

## Testing

- Unit tests for services
- Integration tests for API endpoints
- End-to-end tests for RAG pipeline

