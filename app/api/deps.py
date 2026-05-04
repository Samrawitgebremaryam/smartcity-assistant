from collections.abc import Generator

from redis import Redis
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.integrations.qdrant_client import get_qdrant_client
from app.integrations.redis_client import get_redis_client


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_redis() -> Redis:
    return get_redis_client()


def get_qdrant():
    return get_qdrant_client()
