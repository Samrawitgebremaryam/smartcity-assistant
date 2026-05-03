import logging
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.exceptions import NotFoundError, ValidationError
from app.core.logging import configure_logging
from app.db.base import Base
from app.db.session import SessionLocal
from app.db.session import engine
from app.integrations.qdrant_client import get_qdrant_client
from app.services.dataset_service import DatasetImportService
from app.services.health_check_service import load_dataset_from_disk


configure_logging()
logger = logging.getLogger(__name__)
settings = get_settings()


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests = defaultdict(list)
    
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks
        if "/health" in request.url.path or "/live" in request.url.path or "/ready" in request.url.path:
            return await call_next(request)
        
        client_ip = request.client.host
        current_time = time.time()
        
        # Clean old requests (older than 1 minute)
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if current_time - req_time < 60
        ]
        
        # Check rate limit
        if len(self.requests[client_ip]) >= self.requests_per_minute:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again later."}
            )
        
        # Add current request
        self.requests[client_ip].append(current_time)
        
        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up application: %s", settings.project_name)
    
    if settings.environment.lower() == "development":
        Base.metadata.create_all(bind=engine)

    if not settings.enable_dataset_bootstrap:
        yield
        return

    matches = sorted(Path(".").glob(settings.bootstrap_dataset_glob))
    if not matches:
        logger.info("No bootstrap dataset file found for pattern %s", settings.bootstrap_dataset_glob)
        yield
        return

    dataset_path = matches[0]
    db = SessionLocal()
    try:
        DatasetImportService(db, get_qdrant_client()).import_json_dataset(dataset_path)
        logger.info("Bootstrapped dataset from %s", dataset_path)
    except Exception:
        logger.exception("Failed to bootstrap dataset from %s", dataset_path)
    finally:
        db.close()

    # Also load dataset into memory for local fallback search
    try:
        load_dataset_from_disk()
        logger.info("Loaded dataset into memory for local fallback search")
    except Exception as e:
        logger.warning("Failed to load dataset for local fallback: %s", e)

    yield

    logger.info("Shutting down application: %s", settings.project_name)


app = FastAPI(
    title=settings.project_name,
    version=settings.api_version,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add rate limiting (60 requests per minute)
app.add_middleware(RateLimitMiddleware, requests_per_minute=60)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.exception_handler(NotFoundError)
async def not_found_exception_handler(_: Request, exc: NotFoundError) -> JSONResponse:
    logger.warning(f"Not found: {exc}")
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(ValidationError)
async def validation_exception_handler(_: Request, exc: ValidationError) -> JSONResponse:
    logger.warning(f"Validation error: {exc}")
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def general_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."}
    )
