from __future__ import annotations

import hashlib
from abc import ABC, abstractmethod

import httpx

from app.core.config import get_settings
from app.core.exceptions import ValidationError


class EmbeddingService(ABC):
    @property
    @abstractmethod
    def vector_size(self) -> int:
        raise NotImplementedError

    @abstractmethod
    def embed_text(self, text: str) -> list[float]:
        raise NotImplementedError

    def embed_many(self, texts: list[str]) -> list[list[float]]:
        return [self.embed_text(text) for text in texts]


class MockEmbeddingService(EmbeddingService):
    def __init__(self, vector_size: int = 16) -> None:
        self._vector_size = vector_size

    @property
    def vector_size(self) -> int:
        return self._vector_size

    def embed_text(self, text: str) -> list[float]:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        return [round(byte / 255, 6) for byte in digest[: self.vector_size]]


class SentenceTransformerEmbeddingService(EmbeddingService):
    def __init__(self, model_name: str) -> None:
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as exc:
            raise ValidationError(
                "sentence-transformers is not installed. Install it to use real embeddings."
            ) from exc

        self.model = SentenceTransformer(model_name)
        sample_vector = self.model.encode(["dimension probe"], normalize_embeddings=True)[0]
        self._vector_size = len(sample_vector)

    @property
    def vector_size(self) -> int:
        return self._vector_size

    def embed_text(self, text: str) -> list[float]:
        vector = self.model.encode([text], normalize_embeddings=True)[0]
        return [float(value) for value in vector.tolist()]

    def embed_many(self, texts: list[str]) -> list[list[float]]:
        vectors = self.model.encode(texts, normalize_embeddings=True)
        return [[float(value) for value in vector.tolist()] for vector in vectors]


class GeminiEmbeddingService(EmbeddingService):
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise ValidationError("GEMINI_API_KEY is required for Gemini embeddings.")
        
        self.api_key = settings.gemini_api_key
        self.model = settings.gemini_embedding_model
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        self._client = httpx.Client(timeout=60.0)
        self._vector_size = 768

    @property
    def vector_size(self) -> int:
        return self._vector_size

    def embed_text(self, text: str) -> list[float]:
        url = f"{self.base_url}/models/{self.model}:embedContent"
        headers = {"Content-Type": "application/json"}
        body = {"content": {"parts": [{"text": text}]}}

        response = self._client.post(
            url,
            headers=headers,
            params={"key": self.api_key},
            json=body
        )

        if response.status_code != 200:
            raise ValidationError(f"Gemini embedding error: {response.status_code} - {response.text}")

        result = response.json()
        embedding_values = result.get("embedding", {}).get("values", [])
        return embedding_values

    def embed_many(self, texts: list[str]) -> list[list[float]]:
        return [self.embed_text(text) for text in texts]


def get_embedding_service() -> EmbeddingService:
    settings = get_settings()
    if settings.embedding_provider == "mock":
        return MockEmbeddingService()
    if settings.embedding_provider == "sentence-transformers":
        return SentenceTransformerEmbeddingService(settings.embedding_model_name)
    if settings.embedding_provider == "gemini":
        return GeminiEmbeddingService()
    raise ValidationError(f"Unsupported embedding provider: {settings.embedding_provider}")
