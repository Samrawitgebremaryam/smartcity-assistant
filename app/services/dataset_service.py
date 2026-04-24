from __future__ import annotations

import json
from pathlib import Path

from qdrant_client import QdrantClient
from sqlalchemy.orm import Session

from app.services.document_service import DocumentService
from app.services.ingestion_service import IngestionService


MOJIBAKE_REPLACEMENTS = {
    "â€“": "-",
    "â€”": "-",
    "â€‘": "-",
    "â€™": "'",
    "â€œ": '"',
    "â€": '"',
    "â€¢": "-",
    "â†’": "->",
    "Â ": " ",
    "Ã—": "x",
    "â€¯": " ",
    "ã€": "",
    "ã€‘": "",
}


class DatasetImportService:
    def __init__(self, db: Session, qdrant_client: QdrantClient) -> None:
        self.db = db
        self.document_service = DocumentService(db)
        self.ingestion_service = IngestionService(db, qdrant_client)

    def import_json_dataset(
        self,
        dataset_path: Path,
        *,
        default_category: str = "municipal-service",
        default_service_area: str = "Addis Ababa",
        default_source: str = "ethiopia_smartcity_dataset",
        language: str = "en",
        force: bool = False,
    ) -> list[str]:
        records = json.loads(dataset_path.read_text(encoding="utf-8"))
        if not isinstance(records, list):
            raise ValueError("Dataset JSON must contain a list of records.")

        imported_ids: list[str] = []
        for record in records:
            if not isinstance(record, dict):
                continue

            title = str(record.get("title", "")).strip()
            content = str(record.get("content", "")).strip()
            if not title or not content:
                continue

            normalized_content = self._normalize_text(content)
            document = self.document_service.save_text_document(
                title=title,
                content=normalized_content,
                category=default_category,
                service_area=default_service_area,
                source=default_source,
                language=language,
                document_type="dataset_record",
            )
            self.ingestion_service.ingest_document(document.id, force=force)
            imported_ids.append(document.id)

        return imported_ids

    def _normalize_text(self, text: str) -> str:
        normalized = text
        for old, new in MOJIBAKE_REPLACEMENTS.items():
            normalized = normalized.replace(old, new)
        return normalized
