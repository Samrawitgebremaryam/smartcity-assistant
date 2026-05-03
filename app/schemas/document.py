from datetime import datetime

from pydantic import BaseModel, Field


class DocumentUploadResponse(BaseModel):
    document_id: str
    title: str
    filename: str
    ingestion_status: str


class DocumentListItem(BaseModel):
    id: str
    title: str
    filename: str
    category: str | None = None
    service_area: str | None = None
    source: str | None = None
    language: str
    document_type: str | None = None
    ingestion_status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentIngestRequest(BaseModel):
    document_id: str | None = None
    force: bool = False


class DocumentIngestResponse(BaseModel):
    document_id: str
    chunks_created: int = Field(ge=0)
    indexed_chunks: int = Field(ge=0)
    ingestion_status: str


class DatasetImportRequest(BaseModel):
    dataset_path: str
    force: bool = False


class DatasetImportResponse(BaseModel):
    imported_documents: int = Field(ge=0)
