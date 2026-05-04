import time
from typing import AsyncGenerator

from app.rag.citations import build_sources
from app.rag.context_builder import build_context
from app.rag.fallbacks import (
    GREETING_ANSWER,
    MISSING_DATA_FALLBACK,
    OUT_OF_SCOPE_ANSWER,
    UNCLEAR_ANSWER,
    build_search_suggestions,
    build_suggested_questions,
    is_greeting,
    is_in_scope_question,
    is_insufficient_answer,
    is_unclear_question,
    normalize_answer,
)
from app.schemas.chat import SourceItem

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models.query_log import QueryLog
from app.db.repositories.query_log_repository import QueryLogRepository
from app.integrations.qdrant_client import get_qdrant_client
from app.rag.embeddings import get_embedding_service
from app.rag.generation import get_generation_service
from app.rag.pipeline import RAGPipeline
from app.rag.retrieval import RetrievalService
from app.schemas.chat import ChatResponse, SourceItem
from app.services.health_check_service import (
    get_local_search_results,
)


class ChatService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.pipeline = RAGPipeline(
            RetrievalService(db, get_qdrant_client(), get_embedding_service()),
            get_generation_service(),
        )
        self.query_logs = QueryLogRepository(db)
        self.settings = get_settings()

    def ask(self, question: str, language: str) -> ChatResponse:
        started = time.perf_counter()
        response = self._build_response(question, language)
        elapsed_ms = (time.perf_counter() - started) * 1000

        query_log = self.query_logs.create(
            QueryLog(
                question=question,
                answer=response.answer,
                language=language,
                latency_ms=elapsed_ms,
                confidence=response.confidence,
            )
        )
        response.query_id = query_log.id
        return response

    def _build_response(self, question: str, language: str) -> ChatResponse:
        cleaned_question = question.strip()

        if is_greeting(cleaned_question):
            return ChatResponse(
                answer=GREETING_ANSWER,
                sources=[],
                confidence=1.0,
                query_id=None,
                search_suggestions=[],
                suggested_questions=build_suggested_questions(cleaned_question, "greeting"),
                response_kind="greeting",
            )

        if is_unclear_question(cleaned_question):
            return ChatResponse(
                answer=UNCLEAR_ANSWER,
                sources=[],
                confidence=0.95,
                query_id=None,
                search_suggestions=[],
                suggested_questions=build_suggested_questions(cleaned_question, "unclear"),
                response_kind="unclear",
            )

        if not is_in_scope_question(cleaned_question):
            return ChatResponse(
                answer=OUT_OF_SCOPE_ANSWER,
                sources=[],
                confidence=0.98,
                query_id=None,
                search_suggestions=[],
                suggested_questions=build_suggested_questions(cleaned_question, "out_of_scope"),
                response_kind="out_of_scope",
            )

        retrieved = self.pipeline.retrieval_service.search(cleaned_question, language, self.settings.retrieval_top_k)
        if not retrieved:
            return self._build_local_fallback_response(cleaned_question)

        context_items = [(doc, chunk) for doc, chunk, _score in retrieved]
        context = build_context(context_items)
        
        # Try to generate answer but catch quota errors in response
        try:
            answer, confidence = self.pipeline.generation_service.generate_answer(cleaned_question, context)
        except Exception as e:
            # If LLM throws exception, use local fallback
            return self._build_local_fallback_response(cleaned_question)
        
        # Check if answer contains error (quota exceeded)
        if isinstance(answer, str) and ("429" in answer or "quota" in answer.lower() or "exceeded" in answer.lower()):
            return self._build_local_fallback_response(cleaned_question)
        
        sources = build_sources(context_items)
        normalized_answer = normalize_answer(answer)

        if is_insufficient_answer(normalized_answer, sources):
            return self._build_local_fallback_response(cleaned_question, use_missing_data_message=True)

        return ChatResponse(
            answer=normalized_answer,
            sources=sources,
            confidence=confidence,
            query_id=None,
            search_suggestions=[],
            suggested_questions=[],
            response_kind="answer",
        )

    def _build_local_fallback_response(self, question: str, use_missing_data_message: bool = False) -> ChatResponse:
        local_results, fallback_message = get_local_search_results(question)
        if not local_results:
            response_kind = "missing_data" if use_missing_data_message else "out_of_scope"
            answer = MISSING_DATA_FALLBACK if use_missing_data_message else (fallback_message or OUT_OF_SCOPE_ANSWER)
            return ChatResponse(
                answer=answer,
                sources=[],
                confidence=0.2 if use_missing_data_message else 0.9,
                query_id=None,
                search_suggestions=build_search_suggestions(question) if use_missing_data_message else [],
                suggested_questions=build_suggested_questions(question, response_kind),
                response_kind=response_kind,
            )

        sources = [
            SourceItem(
                title=document.get("title", "Untitled document"),
                category=document.get("category") or None,
                source=document.get("source_url") or None,
                document_id=None,
                chunk_id=None,
            )
            for document in local_results
        ]
        answer = self._compose_local_answer(question, local_results)
        return ChatResponse(
            answer=normalize_answer(answer),
            sources=sources,
            confidence=0.55,
            query_id=None,
            search_suggestions=[],
            suggested_questions=[],
            response_kind="fallback",
        )

    def _compose_local_answer(self, question: str, local_results: list[dict[str, str]]) -> str:
        """Compose answer directly from local results WITHOUT calling LLM - skip if quota exceeded."""
        if not local_results:
            return MISSING_DATA_FALLBACK

        # Get the best matching document
        best_doc = local_results[0]
        title = best_doc.get("title", "Untitled")
        content = best_doc.get("content", "").strip()

        if not content:
            return MISSING_DATA_FALLBACK

        # Return content directly without calling LLM
        # Clean up markdown headers
        lines = content.split("\n")
        clean_lines = [l for l in lines if l.strip() and not l.strip().startswith("#")]
        
        if clean_lines:
            summary = "\n".join(clean_lines[:10])
            if len(summary) > 400:
                summary = summary[:500] + "..."
            return summary

        return content[:500] + "..." if len(content) > 500 else content

    async def ask_streaming(self, question: str, language: str) -> AsyncGenerator[dict[str, object], None]:
        """Stream the response token by token."""
        started = time.perf_counter()
        response = self._build_response(question, language)

        async for token in self._stream_answer_tokens(response.answer):
            yield {"token": token}

        elapsed_ms = (time.perf_counter() - started) * 1000
        query_log = self.query_logs.create(
            QueryLog(
                question=question.strip(),
                answer=response.answer,
                language=language,
                latency_ms=elapsed_ms,
                confidence=response.confidence,
            )
        )

        yield {
            "answer": response.answer,
            "query_id": query_log.id,
            "sources": [source.model_dump() for source in response.sources],
            "search_suggestions": [item.model_dump() for item in response.search_suggestions],
            "suggested_questions": response.suggested_questions,
            "response_kind": response.response_kind,
        }

    async def _stream_answer_tokens(self, answer: str) -> AsyncGenerator[str, None]:
        words = answer.split()
        for index, word in enumerate(words):
            suffix = " " if index < len(words) - 1 else ""
            yield word + suffix
