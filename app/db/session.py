from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings


settings = get_settings()

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
    poolclass=NullPool if settings.environment == "testing" else None,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
