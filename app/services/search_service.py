from sqlalchemy.orm import Session

from app.integrations.qdrant_client import get_qdrant_client
from app.rag.embeddings import get_embedding_service
from app.rag.generation import get_generation_service
from app.rag.pipeline import RAGPipeline
from app.rag.retrieval import RetrievalService
from app.schemas.search import SearchResponse


class SearchService:
    def __init__(self, db: Session) -> None:
        self.pipeline = RAGPipeline(
            RetrievalService(db, get_qdrant_client(), get_embedding_service()),
            get_generation_service(),
        )

    def search(self, question: str, language: str, top_k: int, category: str | None) -> SearchResponse:
        return self.pipeline.search(question, language, top_k, category)
