from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.document import Document


class DocumentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, document: Document) -> Document:
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)
        return document

    def list_all(self) -> list[Document]:
        return list(self.db.scalars(select(Document).order_by(Document.created_at.desc())).all())

    def get_by_id(self, document_id: str) -> Document | None:
        return self.db.get(Document, document_id)

    def get_by_hash(self, content_hash: str) -> Document | None:
        statement = select(Document).where(Document.content_hash == content_hash)
        return self.db.scalar(statement)
