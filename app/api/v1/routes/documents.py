from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile
from qdrant_client import QdrantClient
from sqlalchemy.orm import Session

from app.core.exceptions import ValidationError
from app.api.deps import get_db, get_qdrant
from app.api.v1.routes.auth import get_current_user
from app.db.models import User
from app.schemas.document import (
    DatasetImportRequest,
    DatasetImportResponse,
    DocumentIngestRequest,
    DocumentIngestResponse,
    DocumentListItem,
    DocumentUploadResponse,
)
from app.services.dataset_service import DatasetImportService
from app.services.document_service import DocumentService
from app.services.ingestion_service import IngestionService


router = APIRouter()


@router.get("", response_model=list[DocumentListItem])
def list_documents(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[DocumentListItem]:
    documents = DocumentService(db).list_documents()
    return [DocumentListItem.model_validate(document, from_attributes=True) for document in documents]


@router.post("/upload", response_model=DocumentUploadResponse)
def upload_document(
    file: UploadFile = File(...),
    category: str | None = Form(default=None),
    service_area: str | None = Form(default=None),
    source: str | None = Form(default=None),
    language: str = Form(default="en"),
    document_type: str | None = Form(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DocumentUploadResponse:
    document = DocumentService(db).save_upload(
        file=file,
        category=category,
        service_area=service_area,
        source=source,
        language=language,
        document_type=document_type,
    )
    return DocumentUploadResponse(
        document_id=document.id,
        title=document.title,
        filename=document.filename,
        ingestion_status=document.ingestion_status,
    )


@router.post("/ingest", response_model=DocumentIngestResponse)
def ingest_documents(
    payload: DocumentIngestRequest,
    db: Session = Depends(get_db),
    qdrant_client: QdrantClient = Depends(get_qdrant),
    _: User = Depends(get_current_user),
) -> DocumentIngestResponse:
    if payload.document_id is None:
        raise ValidationError("document_id is required")

    document, chunks_created, indexed_chunks = IngestionService(db, qdrant_client).ingest_document(
        document_id=payload.document_id,
        force=payload.force,
    )
    return DocumentIngestResponse(
        document_id=document.id,
        chunks_created=chunks_created,
        indexed_chunks=indexed_chunks,
        ingestion_status=document.ingestion_status,
    )


@router.post("/import-dataset", response_model=DatasetImportResponse)
def import_dataset(
    payload: DatasetImportRequest,
    db: Session = Depends(get_db),
    qdrant_client: QdrantClient = Depends(get_qdrant),
    _: User = Depends(get_current_user),
) -> DatasetImportResponse:
    dataset_path = Path(payload.dataset_path)
    if not dataset_path.exists():
        raise ValidationError("Dataset file not found")

    imported = DatasetImportService(db, qdrant_client).import_json_dataset(
        dataset_path,
        force=payload.force,
    )
    return DatasetImportResponse(imported_documents=len(imported))
