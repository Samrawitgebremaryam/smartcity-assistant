from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.chunk import Chunk


class ChunkRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def bulk_create(self, chunks: list[Chunk]) -> list[Chunk]:
        self.db.add_all(chunks)
        self.db.commit()
        return chunks

    def list_by_document_id(self, document_id: str) -> list[Chunk]:
        statement = select(Chunk).where(Chunk.document_id == document_id).order_by(Chunk.chunk_index.asc())
        return list(self.db.scalars(statement).all())
