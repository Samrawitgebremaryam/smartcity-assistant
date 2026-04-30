# SmartCity Assistant

An AI-powered assistant that helps residents of Addis Ababa navigate city services—civil registration, bill payments, permits, transport, emergency contacts, and more.

## Features

- AI-powered chat interface for city services
- Document-backed answers with citations
- User authentication
- Chat history (persists across sessions)
- Document upload and indexing
- Hybrid search (semantic + keyword)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI, Python 3.11+ |
| Frontend | React 18, Vite, TailwindCSS |
| Database | PostgreSQL 16 |
| Vector DB | Qdrant |
| Cache | Redis 7 |
| AI | OpenAI / Gemini (optional) |

## Quick Start

### Windows

```powershell
.\start.bat
```

### macOS / Linux

```bash
bash ./start.bash
```

### Manual

```bash
docker compose up -d --build
```

## Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Qdrant | http://localhost:6333 |

## Setup

### 1. Copy Environment

```bash
cp .env.example .env
```

### 2. Start Services

```bash
docker compose up -d --build
```

### Local Development (No Docker Backend)

```bash
# Backend
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac
pip install -e ".[dev,ai]"
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | - | JWT key (min 32 chars) |
| `LLM_PROVIDER` | mock | mock/openai/gemini |
| `EMBEDDING_PROVIDER` | mock | mock/sentence-transformers |
| `OPENAI_API_KEY` | - | OpenAI key (optional) |
| `GEMINI_API_KEY` | - | Gemini key (optional) |

Default uses mock providers—no API keys needed for testing.

## Data

The app loads data from the `data/` folder:

- `data/sample/` - Sample data files
- `data/raw/uploads/` - Uploaded documents

Supported formats: `.txt`, `.pdf`, `.doc`, `.docx`

## Commands

```bash
# Start all
docker compose up -d

# Stop all
docker compose down

# Run tests
pytest

# Lint
ruff check app/
```

## Project Structure

```
├── app/              # FastAPI backend
├── frontend/         # React frontend
├── data/             # Data files
├── tests/            # Tests
├── docs/             # Documentation
├── docker-compose.yml
└── Dockerfile
```
