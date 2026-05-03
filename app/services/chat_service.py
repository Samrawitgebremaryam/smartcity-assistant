import time

from app.rag.citations import build_sources
from app.rag.context_builder import build_context
from app.rag.fallbacks import (
    GREETING_ANSWER,
    MISSING_DATA_FALLBACK,
    OUT_OF_SCOPE_ANSWER,
    UNCLEAR_ANSWER,
    append_citations,
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
from app.schemas.chat import ChatResponse
from app.services.health_check_service import (
    check_backend_health,
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
        response = self.pipeline.chat(question, language, self.settings.retrieval_top_k)
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

    async def ask_streaming(self, question: str, language: str):
        """Stream the response token by token."""
        started = time.perf_counter()
        cleaned_question = question.strip()

        if is_greeting(cleaned_question):
            yield {
                "answer": GREETING_ANSWER,
                "sources": [],
                "search_suggestions": [],
                "suggested_questions": build_suggested_questions(cleaned_question, "greeting"),
                "response_kind": "greeting",
            }
            return

        if is_unclear_question(cleaned_question):
            yield {
                "answer": UNCLEAR_ANSWER,
                "sources": [],
                "search_suggestions": [],
                "suggested_questions": build_suggested_questions(cleaned_question, "unclear"),
                "response_kind": "unclear",
            }
            return

        if not is_in_scope_question(cleaned_question):
            yield {
                "answer": OUT_OF_SCOPE_ANSWER,
                "sources": [],
                "search_suggestions": [],
                "suggested_questions": build_suggested_questions(cleaned_question, "out_of_scope"),
                "response_kind": "out_of_scope",
            }
            return

        # Check backend availability and use fallback if unavailable
        backend_ok = check_backend_health()
        if not backend_ok:
            # Try local fallback search
            local_results, fallback_msg = get_local_search_results(cleaned_question)
            if local_results:
                context = build_context([(doc, doc.get("content", "")) for doc in local_results])
                sources = [SourceItem(title=doc.get("title", ""), url=doc.get("url", ""), content=doc.get("content", "")) for doc in local_results]

                gen_service = self.pipeline.generation_service
                full_answer = ""

                async for token in gen_service.generate_streaming(cleaned_question, context):
                    full_answer += token
                    yield {"token": token}

                full_answer = append_citations(full_answer, sources)
                elapsed_ms = (time.perf_counter() - started) * 1000

                query_log = self.query_logs.create(
                    QueryLog(
                        question=cleaned_question,
                        answer=full_answer,
                        language=language,
                        latency_ms=elapsed_ms,
                        confidence=0.5,
                    )
                )
                yield {
                    "answer": full_answer,
                    "query_id": query_log.id,
                    "sources": [source.model_dump() for source in sources],
                    "search_suggestions": [],
                    "suggested_questions": [],
                    "response_kind": "fallback",
                }
                return
            else:
                yield {
                    "answer": fallback_msg or OUT_OF_SCOPE_ANSWER,
                    "sources": [],
                    "search_suggestions": [],
                    "suggested_questions": build_suggested_questions(cleaned_question, "out_of_scope"),
                    "response_kind": "out_of_scope",
                }
                return

        # Normal path - use backend RAG pipeline
            cleaned_question,
            language,
            self.settings.retrieval_top_k
        )
        context_items = [(doc, chunk) for doc, chunk, _score in retrieved]
        context = build_context(context_items)
        sources: list[SourceItem] = build_sources(context_items)

        gen_service = self.pipeline.generation_service
        full_answer = ""

        async for token in gen_service.generate_streaming(cleaned_question, context):
            full_answer += token
            yield {"token": token}

        normalized_answer = append_citations(normalize_answer(full_answer), sources)
        if is_insufficient_answer(normalized_answer, sources):
            normalized_answer = MISSING_DATA_FALLBACK
            sources = []
            search_suggestions = build_search_suggestions(cleaned_question)
            suggested_questions = build_suggested_questions(cleaned_question, "missing_data")
            response_kind = "missing_data"
        else:
            search_suggestions = []
            suggested_questions = []
            response_kind = "answer"

        if normalized_answer != full_answer and response_kind == "answer":
            suffix = normalized_answer[len(full_answer):]
            if suffix:
                yield {"token": suffix}
            full_answer = normalized_answer
        else:
            full_answer = normalized_answer

        elapsed_ms = (time.perf_counter() - started) * 1000

        query_log_id = None
        if full_answer:
            query_log = self.query_logs.create(
                QueryLog(
                    question=cleaned_question,
                    answer=full_answer,
                    language=language,
                    latency_ms=elapsed_ms,
                    confidence=0.6,
                )
            )
            query_log_id = query_log.id

        yield {
            "answer": full_answer,
            "query_id": query_log_id,
            "sources": [source.model_dump() for source in sources],
            "search_suggestions": [item.model_dump() for item in search_suggestions],
            "suggested_questions": suggested_questions,
            "response_kind": response_kind,
        }
