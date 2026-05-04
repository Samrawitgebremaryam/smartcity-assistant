from pathlib import Path

from qdrant_client import QdrantClient
from qdrant_client.http import models as qdrant_models
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import NotFoundError
from app.db.models.chunk import Chunk
from app.db.models.document import Document
from app.db.repositories.chunk_repository import ChunkRepository
from app.db.repositories.document_repository import DocumentRepository
from app.rag.chunking import TextChunker
from app.rag.embeddings import get_embedding_service
from app.services.file_parsers import FileParserService


class IngestionService:
    def __init__(self, db: Session, qdrant_client: QdrantClient) -> None:
        self.db = db
        self.document_repository = DocumentRepository(db)
        self.chunk_repository = ChunkRepository(db)
        self.parser = FileParserService()
        self.settings = get_settings()
        self.chunker = TextChunker(
            chunk_size=self.settings.chunk_size,
            chunk_overlap=self.settings.chunk_overlap,
        )
        self.embedding_service = get_embedding_service()
        self.qdrant_client = qdrant_client

    def ingest_document(self, document_id: str, force: bool = False) -> tuple[Document, int, int]:
        document = self.document_repository.get_by_id(document_id)
        if document is None:
            raise NotFoundError("Document not found")

        if document.ingestion_status == "ingested" and not force:
            existing_chunks = self.chunk_repository.list_by_document_id(document.id)
            return document, len(existing_chunks), len(existing_chunks)

        raw_text = self.parser.extract_text(Path(document.file_path))
        chunked = self.chunker.split_text(raw_text)
        chunks = [
            Chunk(
                document_id=document.id,
                chunk_index=item.chunk_index,
                text=item.text,
                section=item.section,
                token_count=item.token_count,
            )
            for item in chunked
        ]
        if not chunks:
            document.ingestion_status = "empty"
            self.db.add(document)
            self.db.commit()
            self.db.refresh(document)
            return document, 0, 0

        self.chunk_repository.bulk_create(chunks)

        self._ensure_collection()
        vectors = self.embedding_service.embed_many([chunk.text for chunk in chunks])
        points = []
        for chunk, vector in zip(chunks, vectors, strict=False):
            chunk.qdrant_point_id = chunk.id
            points.append(
                qdrant_models.PointStruct(
                    id=chunk.id,
                    vector=vector,
                    payload={
                        "chunk_id": chunk.id,
                        "document_id": document.id,
                        "title": document.title,
                        "category": document.category,
                        "source": document.source,
                        "language": document.language,
                        "text": chunk.text,
                    },
                )
            )

        if points:
            self.qdrant_client.upsert(
                collection_name=self.settings.qdrant_collection_name,
                points=points,
            )

        document.ingestion_status = "ingested"
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)
        return document, len(chunks), len(points)

    def _ensure_collection(self) -> None:
        collections = self.qdrant_client.get_collections().collections
        names = {collection.name for collection in collections}
        if self.settings.qdrant_collection_name in names:
            return

        self.qdrant_client.create_collection(
            collection_name=self.settings.qdrant_collection_name,
            vectors_config=qdrant_models.VectorParams(
                size=self.embedding_service.vector_size,
                distance=qdrant_models.Distance.COSINE,
            ),
        )
