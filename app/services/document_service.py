import hashlib
import re
import shutil
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import ValidationError
from app.db.models.document import Document
from app.db.repositories.document_repository import DocumentRepository
from app.services.file_parsers import FileParserService


class DocumentService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = DocumentRepository(db)
        self.settings = get_settings()
        self.parser = FileParserService()

    def save_upload(
        self,
        file: UploadFile,
        category: str | None,
        service_area: str | None,
        source: str | None,
        language: str,
        document_type: str | None,
    ) -> Document:
        upload_dir = Path(self.settings.upload_dir)
        upload_dir.mkdir(parents=True, exist_ok=True)

        filename = file.filename or "uploaded_document"
        suffix = Path(filename).suffix.lower()
        if suffix not in self.parser.supported_extensions:
            raise ValidationError(f"Unsupported file type: {suffix}")

        destination = upload_dir / filename
        with destination.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        content_hash = hashlib.sha256(destination.read_bytes()).hexdigest()
        existing = self.repository.get_by_hash(content_hash)
        if existing:
            destination.unlink(missing_ok=True)
            return existing

        document = Document(
            title=Path(filename).stem.replace("_", " ").strip() or "Untitled Document",
            filename=filename,
            category=category,
            service_area=service_area,
            source=source,
            language=language,
            document_type=document_type,
            file_path=str(destination),
            content_hash=content_hash,
            ingestion_status="uploaded",
        )
        return self.repository.create(document)

    def list_documents(self) -> list[Document]:
        return self.repository.list_all()

    def save_text_document(
        self,
        *,
        title: str,
        content: str,
        category: str | None,
        service_area: str | None,
        source: str | None,
        language: str,
        document_type: str | None,
    ) -> Document:
        upload_dir = Path(self.settings.upload_dir)
        upload_dir.mkdir(parents=True, exist_ok=True)

        slug = re.sub(r"[^a-z0-9]+", "_", title.lower()).strip("_") or "document"
        content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
        existing = self.repository.get_by_hash(content_hash)
        if existing:
            return existing

        filename = f"{slug}_{content_hash[:8]}.txt"
        destination = upload_dir / filename
        destination.write_text(content, encoding="utf-8")

        document = Document(
            title=title.strip() or "Untitled Document",
            filename=filename,
            category=category,
            service_area=service_area,
            source=source,
            language=language,
            document_type=document_type,
            file_path=str(destination),
            content_hash=content_hash,
            ingestion_status="uploaded",
        )
        return self.repository.create(document)
