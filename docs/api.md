# API Documentation

## Base URL
```
http://localhost:8000/api/v1
```

## Endpoints

---

## 1. Health Check

### GET /health

Check if the service is running.

**Response:**
```json
{
  "status": "ok",
  "service": "smartcity-assistant"
}
```

---

## 2. Documents

### GET /documents

List all uploaded documents.

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "broken streetlight guide",
    "filename": "broken_streetlight_guide.txt",
    "category": "Citizen Complaints",
    "service_area": "Infrastructure",
    "source": "City Administration Portal",
    "language": "en",
    "document_type": "guide",
    "ingestion_status": "ingested",
    "created_at": "2026-05-01T12:19:35.640972"
  }
]
```

### POST /documents/upload

Upload a document file.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (the document file)

**Response:**
```json
{
  "id": "uuid",
  "title": "broken streetlight guide",
  "filename": "broken_streetlight_guide.txt",
  "category": "Citizen Complaints",
  "service_area": "Infrastructure",
  "source": "City Administration Portal",
  "language": "en",
  "document_type": "guide",
  "ingestion_status": "uploaded",
  "created_at": "2026-05-01T12:19:35.640972"
}
```

### POST /documents/ingest

Process and index a document.

**Request:**
```json
{
  "document_id": "uuid"
}
```

**Response:**
```json
{
  "document_id": "uuid",
  "chunks_created": 5,
  "status": "completed"
}
```

---

## 3. Search

### POST /search

Semantic search across document chunks.

**Request:**
```json
{
  "question": "How to report broken streetlight?",
  "top_k": 5
}
```

**Response:**
```json
{
  "results": [
    {
      "chunk_id": "uuid",
      "content": "Broken Streetlight Reporting Guide...",
      "document_title": "broken streetlight guide",
      "score": 0.85,
      "metadata": {
        "category": "Citizen Complaints"
      }
    }
  ]
}
```

---

## 4. Chat

### POST /chat

Ask a question and get an answer from the RAG system with Gemini.

**Request:**
```json
{
  "question": "How do I report a broken streetlight?",
  "language": "en"
}
```

**Response:**
```json
{
  "answer": "You can report a broken streetlight through the municipal infrastructure complaint desk...",
  "sources": [
    {
      "title": "broken streetlight guide",
      "category": "Citizen Complaints",
      "source": "City Administration Portal",
      "document_id": "uuid",
      "chunk_id": "uuid"
    }
  ],
  "confidence": 0.9,
  "query_id": "uuid"
}
```

---

## 5. Feedback

### POST /feedback

Submit feedback for a chat response.

**Request:**
```json
{
  "query_id": "uuid",
  "rating": "positive",
  "feedback": "Great answer!"
}
```

**Response:**
```json
{
  "feedback_id": "uuid",
  "rating": "positive"
}
```

---

## Error Responses

### 400 - Validation Error
```json
{
  "detail": "Error message"
}
```

### 404 - Not Found
```json
{
  "detail": "Resource not found"
}
```

### 500 - Internal Server Error
```json
{
  "detail": "Internal server error"
}
```