from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings


settings = get_settings()

use_null_pool = settings.environment.lower() in ["testing", "test"]

if use_null_pool:
    engine = create_engine(settings.database_url, poolclass=NullPool)
else:
    engine = create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=3600,
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
