import logging
import time
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.api.deps import get_db
from app.schemas.common import HealthResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)) -> HealthResponse:
    """Basic health check."""
    return HealthResponse(status="ok", service="smartcity-assistant")


@router.get("/health/details")
def health_details(db: Session = Depends(get_db)):
    """Detailed health check with all services."""
    status = {"status": "ok", "services": {}, "timestamp": time.time()}
    
    # Check database
    try:
        start = time.time()
        db.execute(text("SELECT 1"))
        status["services"]["database"] = {"status": "healthy", "latency_ms": round((time.time() - start) * 1000, 2)}
    except Exception as e:
        status["services"]["database"] = {"status": "unhealthy", "error": str(e)}
        status["status"] = "degraded"
    
    # Check Qdrant (optional)
    try:
        start = time.time()
        from app.integrations.qdrant_client import get_qdrant_client
        qdrant = get_qdrant_client()
        qdrant.get_collections()
        status["services"]["qdrant"] = {"status": "healthy", "latency_ms": round((time.time() - start) * 1000, 2)}
    except Exception as e:
        status["services"]["qdrant"] = {"status": "unavailable", "error": str(e)}
    
    # Check Redis (optional)
    try:
        start = time.time()
        from app.integrations.redis_client import get_redis_client
        redis = get_redis_client()
        redis.ping()
        status["services"]["redis"] = {"status": "healthy", "latency_ms": round((time.time() - start) * 1000, 2)}
    except Exception as e:
        status["services"]["redis"] = {"status": "unavailable", "error": str(e)}
    
    # Check AI services
    try:
        from app.rag.embeddings import get_embedding_service
        start = time.time()
        emb = get_embedding_service()
        _ = emb.embed_text("health check")
        status["services"]["embeddings"] = {"status": "healthy", "latency_ms": round((time.time() - start) * 1000, 2)}
    except Exception as e:
        status["services"]["embeddings"] = {"status": "unavailable", "error": str(e)}
    
    try:
        from app.rag.generation import get_generation_service
        start = time.time()
        gen = get_generation_service()
        answer, _ = gen.generate_answer("test health", "This is a test context for health check.")
        status["services"]["generation"] = {"status": "healthy", "latency_ms": round((time.time() - start) * 1000, 2), "response_length": len(answer)}
    except Exception as e:
        status["services"]["generation"] = {"status": "unavailable", "error": str(e)}
    
    return JSONResponse(
        status_code=200 if status["status"] == "ok" else 503,
        content=status
    )


@router.get("/ready")
def readiness_check(db: Session = Depends(get_db)):
    """Readiness check for kubernetes."""
    try:
        # Must check DB for readiness
        db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={"status": "not ready", "error": str(e)}
        )


@router.get("/live")
def liveness_check():
    """Liveness check for kubernetes."""
    return {"status": "alive"}