# Setup Guide

## Prerequisites

- Docker Desktop (Windows/Mac/Linux)
- 4GB RAM available for containers
- Python 3.11+ (for local development)

## Quick Setup

### 1. Clone/Setup Project

```bash
# Navigate to project directory
cd smartcity-assistant
```

### 2. Start Services

```bash
# Start all Docker services
docker compose up -d

# Check all services are running
docker compose ps
```

Expected output:
```
NAME                             IMAGE                     COMMAND                  SERVICE    CREATED          STATUS                       PORTS
smartcity-assistant-api-1        smartcity-assistant-api   "uvicorn app.main:ap…"   api        10 minutes ago   Up 10 minutes                 0.0.0.0:8000->8000/tcp
smartcity-assistant-postgres-1   postgres:16               "docker-entrypoint.s…"   postgres   46 minutes ago   Up 46 minutes (healthy)   0.0.0.0:55432->5432/tcp
smartcity-assistant-qdrant-1     qdrant/qdrant:latest      "./entrypoint.sh"        qdrant     52 minutes ago   Up 52 minutes             0.0.0.0:6333-6334->6333-6334/tcp
smartcity-assistant-redis-1      redis:7-alpine            "docker-entrypoint.s…"   redis      52 minutes ago   Up 52 minutes             0.0.0.0:6379->6379
```

### 3. Verify Installation

```bash
# Test health endpoint
curl http://localhost:8000/api/v1/health
# Should return: {"status":"ok","service":"smartcity-assistant"}

# View API docs
# Open http://localhost:8000/docs in browser
```

### 4. Test Chat with Gemini

```bash
# Test the chat endpoint
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "How do I report a broken streetlight?"}'
```

## Configuration

### Environment File (.env.docker)

The project uses `.env.docker` for Docker container configuration:

```env
PROJECT_NAME=SmartCity RAG Assistant
ENVIRONMENT=development
API_VERSION=0.1.0
API_V1_PREFIX=/api/v1
LOG_LEVEL=INFO

POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=smartcity

QDRANT_URL=http://qdrant:6333
REDIS_URL=redis://redis:6379/0

# Gemini Configuration (REQUIRED for LLM generation)
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash
LLM_PROVIDER=gemini

# Embeddings (using mock for now)
EMBEDDING_PROVIDER=mock

# RAG Settings
CHUNK_SIZE=800
CHUNK_OVERLAP=100
RETRIEVAL_TOP_K=5
```

### Getting Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Create a new API key
3. Copy it to `GEMINI_API_KEY` in `.env.docker`

## Common Tasks

### View Logs

```bash
# API logs
docker compose logs api

# All logs
docker compose logs -f

# Specific service
docker compose logs -f postgres
```

### Restart Services

```bash
# Restart API only
docker compose restart api

# Restart all
docker compose restart
```

### Rebuild After Code Changes

```bash
# Rebuild and restart
docker compose build api
docker compose up -d api
```

### Access Database

```bash
# Connect to PostgreSQL
docker exec -it smartcity-assistant-postgres-1 psql -U postgres -d smartcity

# Run migrations
docker exec -it smartcity-assistant-api-1 alembic upgrade head
```

### Access Qdrant Dashboard

Open http://localhost:6333/dashboard in browser

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs api

# Common issues:
# - Port already in use (check ports 8000, 55432, 6333, 6379)
# - Database not ready (wait for "healthy" status)
```

### Gemini Not Working

1. Check API key is set correctly in `.env.docker`
2. Verify API key is valid at https://aistudio.google.com/app/apikey
3. Check logs: `docker compose logs api`

### Database Connection Error

```bash
# Verify PostgreSQL is running
docker compose ps postgres

# Check connection
docker exec -it smartcity-assistant-api-1 python -c "from app.db.session import engine; print(engine.connect())"
```

### Reset Everything

```bash
# Stop and remove all containers and volumes
docker compose down -v

# Rebuild from scratch
docker compose build --no-cache
docker compose up -d
```

## Project Structure

```
smartcity-assistant/
├── app/               # Main application code
│   ├── api/          # API routes
│   ├── core/         # Config, exceptions, logging
│   ├── db/           # Database models
│   ├── integrations/ # External clients
│   ├── rag/          # RAG pipeline
│   ├── schemas/      # Pydantic models
│   └── services/     # Business logic
├── docs/             # Documentation
├── tests/            # Tests
├── data/             # Data files
├── docker-compose.yml
├── Dockerfile
└── README.md
```