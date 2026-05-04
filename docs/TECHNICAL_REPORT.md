# SmartCity Assistant - Technical Documentation

## Addis Ababa AI-Powered City Services Assistant

---

# Executive Summary

This report documents the development and implementation of the SmartCity Assistant, an AI-powered chatbot system designed to help Addis Ababa residents navigate municipal services. The system provides instant answers about city services including birth certificates, business licenses, bill payments, emergency contacts, transportation, and more.

---

# 1. Introduction

## 1.1 Background

Addis Ababa, the capital city of Ethiopia, serves over 5 million residents who need to interact with various municipal services daily. These services include:
- Civil registration (birth, marriage, death certificates)
- Business licensing and permits
- Utility bill payments (electricity, water)
- Transportation information (bus routes, metro)
- Emergency services
- ID and passport services

The challenge: Residents often struggle to find accurate information, wait in long queues, or don't know which documents they need for specific services.

## 1.2 Project Objective

Build an AI-powered assistant that:
1. Provides instant answers to city service questions 24/7
2. Uses official city documentation for accurate responses
3. Works on web and mobile devices
4. Can handle thousands of concurrent users
5. Maintains production-grade reliability

## 1.3 Scope

This project covers:
- A React-based web frontend
- FastAPI Python backend
- Gemini AI integration for natural language responses
- PostgreSQL database for user data
- Qdrant vector database for document search
- Redis for caching
- Docker deployment

---

# 2. Problem Space Analysis

## 2.1 Current User Pain Points

| Pain Point | Description | Impact |
|------------|-------------|--------|
| Information Scattered | Official info spread across many sources | Users need to visit multiple offices/websites |
| Long Queues | Physical visits required for simple queries | Time wasted, Lost productivity |
| Incomplete Information | Users don't know required documents | Multiple trips to government offices |
| Language Barriers | Limited English documentation | Confusion about processes |
| No Digital Access | Many services not available online | Excluded from digital services |

## 2.2 Technical Challenges

1. **Semantic Search**: Users ask questions in many ways - need to match to correct documents
2. **Accuracy**: Must provide verified information, not hallucinations
3. **Performance**: Handle 10K+ monthly queries
4. **Uptime**: 99.9% availability required
5. **Cost**: Keep usage costs manageable

## 2.3 Requirements Analysis

### Functional Requirements
- User registration/login
- Natural language questions
- Search suggestions
- Source citations
- Feedback collection
- Multi-language support

### Non-Functional Requirements
- Response time < 3 seconds
- 99.9% uptime
- Secure authentication
- Mobile responsive
- Accessible design

---

# 3. Solution Architecture

## 3.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USERS                                   │
│  (Web Browser, Mobile)                                         │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS
┌────────────────────▼───────────────────────────────────────────┐
│                   FRONTEND (React + Vite)                       │
│  - Landing Page                                               │
│  - Auth Pages (Login/Register)                                │
│  - Chat Interface                                            │
│  - User Dashboard                                            │
└─────────────────────┬───────────────────────────────────────────┘
                      │ REST API + SSE
┌────────────────────▼───────────────────────────────────────────┐
│                 BACKEND (FastAPI + Python)                   │
│  - Authentication (JWT)                                     │
│  - Chat Service (RAG Pipeline)                              │
│  - User Management                                          │
│  - Query Logging                                             │
└──────┬──────────────┬──────────────┬───────────────────────┘
       │              │              │
┌──────▼──────┐ ┌─────▼─────┐ ┌────▼─────────┐
│ PostgreSQL  │ │  Redis   │ │ Qdrant      │
│ (Users,    │ │ (Cache) │ │ (Vectors)  │
│ Logs)      │ │         │ │           │
└────────────┘ └─────────┘ └────────────┘
       │              │              │
┌──────▼──────────────▼──────────────────▼─────────────────┐
│                EXTERNAL SERVICES                         │
│  - Gemini AI API                                          │
│  - Email Service (future)                                 │
└───────────────────────────────────────────────────────────┘
```

## 3.2 Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI Framework |
| Vite | 5.x | Build Tool |
| TailwindCSS | 3.x | Styling |
| React Router | 6.x | Navigation |
| Axios | 1.x | HTTP Client |
| Lucide React | Latest | Icons |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.11 | Runtime |
| FastAPI | 0.115+ | Web Framework |
| SQLAlchemy | 2.0+ | ORM |
| Pydantic | 2.x | Validation |
| Uvicorn | 0.30+ | ASGI Server |
| PostgreSQL | 16 | Primary Database |
| Redis | 7 | Cache |
| Qdrant | Latest | Vector Search |

### AI/ML
| Technology | Purpose |
|------------|---------|
| Gemini API | LLM for answer generation |
| Gemini Embeddings | Text vectorization |
| RAG Pipeline | Retrieval-Augmented Generation |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Orchestration |
| GitHub Actions | CI/CD Pipeline |

## 3.3 Data Flow

```
User Question
    │
    ▼
┌─────────────────┐
│  API Gateway    │
│  (FastAPI)      │
└────────┬────────┘
         │
    ┌────▼────────────────┐
    │ Authentication      │
    │ (JWT Token)         │
    └────────┬─────────────┘
             │
    ��────────▼───────────────────┐
    │  RAG Pipeline              │
    │  ┌─────────────────────┐   │
    │  │ Intent Detection   │   │
    │  │ Scope Validation   │   │
    │  └─────────┬───────────┘   │
    │            │               │
    │  ┌────────▼───────────┐    │
    │  │ Retrieval        │    │
    │  │ (Qdrant Search)  │    │
    │  └─────────┬────────┘    │
    │            │               │
    │  ┌────────▼───────────┐    │
    │  │ Local Fallback     │    │
    │  │ (JSON Dataset)    │    │
    │  └─────────┬────────┘    │
    │            │               │
    │  ┌────────▼───────────┐    │
    │  │ Generation         │    │
    │  │ (Gemini AI)         │    │
    │  └─────────┬────────┘    │
    └────────────┼────────────┘
                 │
    ┌────────────▼────────────┐
    │  Response + Sources   │
    └───────────────────────┘
```

---

# 4. Implementation Details

## 4.1 Dataset

### Dataset Structure
- **Location**: `ethiopia_smartcity_dataset.json`
- **Documents**: 54 city service documents
- **Categories**: 12 service areas

### Categories Covered
1. Smart Government
2. Economy (Business, Tax)
3. Environment
4. Living
5. Mobility (Transport)
6. People (Education, Health)
7. Tax and Revenue
8. ID Renewal
9. Education
10. Waste/Environment
11. Housing/Property
12. Tourism/Events

### Sample Documents
```json
{
  "title": "Birth Registration Service",
  "content": "Complete guide to registering birth...",
  "category": "Smart Government",
  "service_area": "Birth certificate"
}
```

## 4.2 Core Components

### Chat Service (`app/services/chat_service.py`)
- Handles all chat requests
- Manages fallback logic
- Logs queries to database

### RAG Pipeline (`app/rag/pipeline.py`)
- Retrieval Service (Qdrant)
- Generation Service (Gemini)
- Context Builder
- Citation Builder

### Local Fallback (`app/services/health_check_service.py`)
- 54-document offline dataset
- Keyword-based search
- No API dependency for basic responses

## 4.3 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/register` | POST | User registration |
| `/api/v1/auth/login` | POST | User login |
| `/api/v1/auth/me` | GET | Current user |
| `/api/v1/chat` | POST | Send message |
| `/api/v1/chat/stream` | POST | Streaming chat |
| `/api/v1/health` | GET | Health check |
| `/api/v1/search` | GET | Document search |

## 4.4 Frontend Pages

### Landing Page (`/`)
- Hero section with video
- Features grid
- Services overview
- Call-to-action

### Auth Pages (`/login`, `/signup`)
- Email/password forms
- JWT token management
- Redirect logic

### Chat Page (`/chat`)
- Message history
- Input area
- Sources display
- Typing indicators

---

# 5. Deployment

## 5.1 Docker Compose

```yaml
# docker-compose.yml
services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - POSTGRES_HOST=postgres
      - QDRANT_URL=http://qdrant:6333
    depends_on:
      - postgres
      - qdrant

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - api

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: smartcity
    ports:
      - "55432:5432"

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

## 5.2 Environment Variables

```env
# .env
GEMINI_API_KEY=your_api_key_here
SECRET_KEY=generate_with_python_secrets
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
QDRANT_URL=http://localhost:6333
REDIS_URL=redis://localhost:6379
LLM_PROVIDER=gemini
```

## 5.3 Running Locally

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

---

# 6. Challenges and Solutions

## Challenges Solved

### Challenge 1: API Quota Limits
**Problem**: Gemini free tier only allows 20 requests/day
**Solution**: 
- Implemented local JSON dataset as fallback
- Pre-extract answers from 54 documents
- Skip LLM when quota exceeded
- Graceful error handling

### Challenge 2: Empty Responses  
**Problem**: Qdrant vector search returning no results
**Solution**:
- Always fall back to local keyword search
- Direct content extraction without LLM
- 54 documents loaded into memory

### Challenge 3: Docker Dataset Missing
**Problem**: Dataset JSON not in container
**Solution**:
- Added COPY command to Dockerfile
- Dataset now bundled in `/app/ethiopia_smartcity_dataset.json`

### Challenge 4: Video Not Displaying
**Problem**: External video URL blocking
**Solution**:
- Use local video in `frontend/public/hero.mp4`
- Added fallback image behind video

---

# 7. Testing

## 7.1 Functional Tests

```bash
# Health check
curl http://localhost:8000/api/v1/health

# Register user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test"}'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Chat (with token)
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"question":"How do I register a birth certificate?"}'
```

## 7.2 Test Questions

| Question | Expected Response |
|----------|-------------------|
| How do I register a birth certificate? | Visit CRRSA office with required documents |
| How do I pay my electricity bill? | Use TeleBirr, CBE Birr, mobile banking |
| What are emergency contacts? | Police 991, Fire 939, Ambulance 907 |
| How do I apply for a business licence? | Get TIN, submit to Trade Bureau |

---

# 8. Future Improvements

## 8.1 Phase 2 Features
- [ ] Amharic language support
- [ ] Voice input/output
- [ ] WhatsApp integration
- [ ] Mobile app (React Native)
- [ ] Offline mode

## 8.2 Scaling
- [ ] Load balancing multiple API instances
- [ ] Redis cluster for caching
- [ ] Qdrant Cloud for vector search
- [ ] CDN for static assets

## 8.3 Analytics
- [ ] User interaction tracking
- [ ] Popular queries dashboard
- [ ] Response quality metrics
- [ ] A/B testing for answers

---

# 9. Appendix

## A. File Structure

```
smartcity-assistant/
├── app/
│   ├── api/v1/routes/      # API endpoints
│   ├── core/               # Config, security
│   ├── db/                # Models, repositories
│   ├── rag/               # AI pipeline
│   ├── services/          # Business logic
│   └── main.py            # App entry
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/        # Page components
│   │   ├── auth/         # Authentication
│   │   └── lib/          # Utilities
│   ├── public/           # Static assets
│   └── package.json
├── ethiopia_smartcity_dataset.json
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## B. API Keys

To get a Gemini API key:
1. Go to https://aistudio.google.com/app/apikey
2. Create new API key
3. Add to `.env` file

## C. Credits

- Addis Ababa City Administration Documentation
- Gemini AI by Google
- Open source communities

---

# 10. Conclusion

This project demonstrates a production-ready AI assistant for municipal services. The architecture handles real-world constraints including API quotas and provides reliable service through local fallbacks.

**Key Achievements:**
- 54 service documents covering 12 categories
- Graceful degradation when AI unavailable
- Docker deployment for consistency
- Full authentication and user management

**Next Steps:**
1. Deploy to production (Render, Railway, etc.)
2. Add more service categories
3. Implement analytics
4. Scale infrastructure as usage grows

---

*Document Version: 1.0*
*Date: May 2026*
*Author: SmartCity Development Team*