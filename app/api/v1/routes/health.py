import logging
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
    status = {"status": "ok", "services": {}}
    
    # Check database
    try:
        db.execute(text("SELECT 1"))
        status["services"]["database"] = "healthy"
    except Exception as e:
        status["services"]["database"] = f"unhealthy: {str(e)}"
        status["status"] = "degraded"
    
    # Check Qdrant (optional)
    try:
        from app.integrations.qdrant_client import get_qdrant_client
        qdrant = get_qdrant_client()
        qdrant.get_collections()
        status["services"]["qdrant"] = "healthy"
    except Exception as e:
        status["services"]["qdrant"] = f"unavailable: {str(e)}"
    
    # Check Redis (optional)
    try:
        from app.integrations.redis_client import get_redis_client
        redis = get_redis_client()
        redis.ping()
        status["services"]["redis"] = "healthy"
    except Exception as e:
        status["services"]["redis"] = f"unavailable: {str(e)}"
    
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