import json
import logging
from typing import Any

from redis import Redis

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def get_redis_client() -> Redis:
    settings = get_settings()
    return Redis.from_url(settings.redis_url, decode_responses=True)


def get_redis() -> Redis:
    return get_redis_client()


class CacheService:
    def __init__(self, redis_client: Redis | None = None) -> None:
        self._redis = redis_client
        self._settings = get_settings()

    @property
    def redis(self) -> Redis:
        if self._redis is None:
            self._redis = get_redis_client()
        return self._redis

    def get(self, key: str) -> Any | None:
        try:
            value = self.redis.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.warning("Cache get failed for key %s: %s", key, str(e))
            return None

    def set(self, key: str, value: Any, ttl_seconds: int = 300) -> bool:
        try:
            self.redis.setex(key, ttl_seconds, json.dumps(value))
            return True
        except Exception as e:
            logger.warning("Cache set failed for key %s: %s", key, str(e))
            return False

    def delete(self, key: str) -> bool:
        try:
            self.redis.delete(key)
            return True
        except Exception as e:
            logger.warning("Cache delete failed for key %s: %s", key, str(e))
            return False

    def clear_pattern(self, pattern: str) -> int:
        try:
            keys = self.redis.keys(pattern)
            if keys:
                return self.redis.delete(*keys)
            return 0
        except Exception as e:
            logger.warning("Cache clear pattern failed for %s: %s", pattern, str(e))
            return 0
