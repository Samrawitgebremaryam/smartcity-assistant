from qdrant_client import QdrantClient
from qdrant_client.http import models as qdrant_models
from sqlalchemy import select
from sqlalchemy.orm import Session
import logging
import re

from app.core.config import get_settings
from app.db.models.chunk import Chunk
from app.db.models.document import Document
from app.rag.embeddings import EmbeddingService

logger = logging.getLogger(__name__)

TOPIC_KEYWORDS: dict[str, set[str]] = {
    "civil_registration": {"birth", "marriage", "death", "certificate", "civil", "registration", "residency", "id", "identity"},
    "utilities": {"electricity", "water", "bill", "payment", "utility", "telebirr", "banking", "meter", "eeu", "cbe"},
    "transport": {"bus", "route", "routes", "transport", "anbessa", "fare", "travel", "mercato"},
    "business": {"business", "licence", "license", "permit", "trade", "tin", "registration", "renewal"},
    "telecom": {"ethiotelecom", "telecom", "ussd", "volte", "apn", "airtime", "data"},
    "emergency": {"emergency", "hospital", "police", "ambulance", "fire", "contact", "hotline"},
    "infrastructure": {"streetlight", "street", "infrastructure", "complaint", "report", "road"},
}


class RetrievalService:
    def __init__(self, db: Session, qdrant_client: QdrantClient, embedding_service: EmbeddingService) -> None:
        self.db = db
        self.qdrant_client = qdrant_client
        self.embedding_service = embedding_service
        self.settings = get_settings()

    def search(self, question: str, language: str, top_k: int, category: str | None = None) -> list[tuple[Document, Chunk, float]]:
        semantic_results = self._semantic_search(question, language, max(top_k * 3, top_k), category)
        lexical_results = self._lexical_search(question, language, max(top_k * 3, top_k), category)
        combined = semantic_results + lexical_results
        if not combined:
            return []
        return self._rerank_and_filter(question, combined, top_k)

    def _semantic_search(self, question: str, language: str, top_k: int, category: str | None) -> list[tuple[Document, Chunk, float]]:
        try:
            query_vector = self.embedding_service.embed_text(question)
            filters = [
                qdrant_models.FieldCondition(
                    key="language",
                    match=qdrant_models.MatchValue(value=language),
                )
            ]
            if category:
                filters.append(
                    qdrant_models.FieldCondition(
                        key="category",
                        match=qdrant_models.MatchValue(value=category),
                    )
                )

            response = self.qdrant_client.query_points(
                collection_name=self.settings.qdrant_collection_name,
                query=query_vector,
                query_filter=qdrant_models.Filter(must=filters),
                limit=top_k,
                with_payload=True,
            )
        except Exception as e:
            logger.warning("Semantic search failed, falling back to lexical search: %s", str(e))
            return []

        results: list[tuple[Document, Chunk, float]] = []
        for point in response.points:
            chunk_id = str(point.id)
            statement = select(Document, Chunk).join(Chunk, Chunk.document_id == Document.id).where(Chunk.id == chunk_id)
            row = self.db.execute(statement).first()
            if row is None:
                continue
            document, chunk = row
            results.append((document, chunk, float(point.score or 0.0)))
        return results

    def _lexical_search(self, question: str, language: str, top_k: int, category: str | None) -> list[tuple[Document, Chunk, float]]:
        tokens = self._tokenize(question)
        if not tokens:
            return []

        statement = select(Document, Chunk).join(Chunk, Chunk.document_id == Document.id).where(Document.language == language)
        if category:
            statement = statement.where(Document.category == category)

        rows = self.db.execute(statement).all()
        scored: list[tuple[Document, Chunk, float]] = []
        for document, chunk in rows:
            haystack = f"{document.title} {document.category or ''} {document.service_area or ''} {chunk.text}".lower()
            score = 0.0
            for token in tokens:
                occurrences = haystack.count(token)
                if occurrences == 0:
                    continue
                weight = 3.0 if token in document.title.lower() else 1.0
                score += occurrences * weight

            if score <= 0:
                continue
            scored.append((document, chunk, score))

        scored.sort(key=lambda item: item[2], reverse=True)
        return scored[:top_k]

    def _rerank_and_filter(
        self,
        question: str,
        results: list[tuple[Document, Chunk, float]],
        top_k: int,
    ) -> list[tuple[Document, Chunk, float]]:
        tokens = self._tokenize(question)
        active_topics = self._detect_topics(tokens)
        deduped: dict[str, tuple[Document, Chunk, float]] = {}

        for document, chunk, base_score in results:
            weighted_score = self._score_result(question, tokens, active_topics, document, chunk, base_score)
            existing = deduped.get(chunk.id)
            if existing is None or weighted_score > existing[2]:
                deduped[chunk.id] = (document, chunk, weighted_score)

        ranked = sorted(deduped.values(), key=lambda item: item[2], reverse=True)
        if not ranked:
            return []

        best_score = ranked[0][2]
        minimum_score = max(6.0, best_score * 0.38)
        filtered: list[tuple[Document, Chunk, float]] = []
        seen_documents: set[str] = set()

        for document, chunk, score in ranked:
            if score < minimum_score:
                continue
            if document.id in seen_documents:
                continue
            seen_documents.add(document.id)
            filtered.append((document, chunk, score))
            if len(filtered) >= top_k:
                break

        return filtered

    def _score_result(
        self,
        question: str,
        tokens: list[str],
        active_topics: set[str],
        document: Document,
        chunk: Chunk,
        base_score: float,
    ) -> float:
        title = (document.title or "").lower()
        category = (document.category or "").lower()
        service_area = (document.service_area or "").lower()
        chunk_text = (chunk.text or "").lower()
        searchable_text = " ".join([title, category, service_area, chunk_text])

        title_hits = sum(1 for token in tokens if token in title)
        category_hits = sum(1 for token in tokens if token in category)
        service_hits = sum(1 for token in tokens if token in service_area)
        body_hits = sum(chunk_text.count(token) for token in tokens)
        overlap_score = (title_hits * 5.0) + (category_hits * 4.0) + (service_hits * 4.0) + min(body_hits, 8)

        phrase_bonus = 0.0
        normalized_question = re.sub(r"\s+", " ", question.lower()).strip()
        if normalized_question and normalized_question in searchable_text:
            phrase_bonus += 6.0

        document_topics = self._detect_topics(self._tokenize(" ".join([title, category, service_area])))
        topic_bonus = 0.0
        if active_topics:
            if active_topics & document_topics:
                topic_bonus += 9.0
            else:
                topic_bonus -= 5.0

        semantic_component = base_score * 8.0 if base_score <= 1.5 else base_score
        return semantic_component + overlap_score + phrase_bonus + topic_bonus

    def _detect_topics(self, tokens: list[str]) -> set[str]:
        topics: set[str] = set()
        token_set = set(tokens)
        for topic, keywords in TOPIC_KEYWORDS.items():
            if token_set & keywords:
                topics.add(topic)
        return topics

    def _tokenize(self, question: str) -> list[str]:
        normalized = "".join(character.lower() if character.isalnum() else " " for character in question)
        tokens = [token for token in normalized.split() if len(token) >= 3]
        stopwords = {
            "the", "and", "for", "with", "what", "where", "when", "how", "can",
            "are", "you", "about", "this", "that", "from", "have", "will",
        }
        return [token for token in tokens if token not in stopwords]
