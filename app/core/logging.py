import json
import logging
import sys
from logging.config import dictConfig
from typing import Any

from app.core.config import get_settings


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_data: dict[str, Any] = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        
        return json.dumps(log_data)


def configure_logging() -> None:
    settings = get_settings()
    is_production = settings.environment.lower() == "production"
    
    # In production, use simple format for compatibility
    log_format = "%(asctime)s %(levelname)s [%(name)s] %(message)s"
    
    dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": log_format,
                },
            },
            "handlers": {
                "default": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                    "stream": sys.stdout,
                }
            },
            "root": {
                "level": settings.log_level.upper(),
                "handlers": ["default"],
            },
            "loggers": {
                "uvicorn": {"level": "INFO"},
                "sqlalchemy.engine": {"level": "WARNING"},
                "app": {"level": settings.log_level.upper()},
            },
        }
    )
    logging.getLogger(__name__).debug("Logging configured")
