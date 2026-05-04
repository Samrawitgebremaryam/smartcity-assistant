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
from app.rag.generation import GenerationService
from app.rag.retrieval import RetrievalService
from app.schemas.chat import ChatResponse
from app.schemas.search import SearchResponse, SearchResultItem


class RAGPipeline:
    def __init__(self, retrieval_service: RetrievalService, generation_service: GenerationService) -> None:
        self.retrieval_service = retrieval_service
        self.generation_service = generation_service
        self.context_builder = build_context

    def search(self, question: str, language: str, top_k: int, category: str | None = None) -> SearchResponse:
        results = self.retrieval_service.search(question, language, top_k, category)
        return SearchResponse(
            results=[
                SearchResultItem(
                    chunk_id=chunk.id,
                    document_id=document.id,
                    title=document.title,
                    source=document.source,
                    category=document.category,
                    score=score,
                    text=chunk.text,
                )
                for document, chunk, score in results
            ]
        )

    def chat(self, question: str, language: str, top_k: int) -> ChatResponse:
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

        retrieved = self.retrieval_service.search(cleaned_question, language, top_k)
        context_items = [(document, chunk) for document, chunk, _score in retrieved]
        context = build_context(context_items)
        answer, confidence = self.generation_service.generate_answer(cleaned_question, context)
        sources = build_sources(context_items)
        normalized_answer = normalize_answer(answer)
        if is_insufficient_answer(normalized_answer, sources):
            return ChatResponse(
                answer=MISSING_DATA_FALLBACK,
                sources=[],
                confidence=0.2,
                query_id=None,
                search_suggestions=build_search_suggestions(cleaned_question),
                suggested_questions=build_suggested_questions(cleaned_question, "missing_data"),
                response_kind="missing_data",
            )
        return ChatResponse(
            answer=normalized_answer,
            sources=sources,
            confidence=confidence,
            query_id=None,
            search_suggestions=[],
            suggested_questions=[],
            response_kind="answer",
        )
