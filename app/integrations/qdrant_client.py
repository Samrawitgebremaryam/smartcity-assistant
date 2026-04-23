from qdrant_client import QdrantClient

from app.core.config import get_settings


def get_qdrant_client() -> QdrantClient:
    settings = get_settings()
    return QdrantClient(url=settings.qdrant_url)
