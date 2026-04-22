from functools import lru_cache

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    project_name: str = "SmartCity RAG Assistant"
    environment: str = Field(default="development")
    api_version: str = "0.1.0"
    api_v1_prefix: str = "/api/v1"
    log_level: str = "INFO"
    cors_origins: list[str] = Field(default=["http://localhost:3000", "http://localhost:8080"])

    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "postgres"
    postgres_password: str = "postgres"
    postgres_db: str = "smartcity"

    qdrant_url: str = "http://localhost:6333"
    redis_url: str = "redis://localhost:6379/0"

    openai_api_key: str | None = None
    gemini_api_key: str | None = None
    gemini_base_url: str | None = None
    gemini_embedding_model: str = "models/gemini-embedding-001"

    secret_key: str = Field(default="")
    secret_key_required: bool = Field(default=True)

    upload_dir: str = "data/raw/uploads"
    processed_dir: str = "data/processed"
    sample_data_dir: str = "data/sample"
    qdrant_collection_name: str = "smartcity_documents"
    embedding_model_name: str = "BAAI/bge-m3"
    retrieval_top_k: int = 5
    chunk_size: int = 800
    chunk_overlap: int = 100
    llm_provider: str = "mock"
    embedding_provider: str = "mock"
    openai_model: str = "gpt-4.1-mini"
    gemini_model: str = "gemini-2.5-flash"
    bootstrap_dataset_glob: str = "ethiopia_smartcity_dataset*.json"
    enable_dataset_bootstrap: bool = True
    fallback_search_base_url: str = "https://www.google.com/search"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str] | None) -> list[str]:
        if value is None:
            return ["http://localhost:3000", "http://localhost:8080"]
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return ["http://localhost:3000", "http://localhost:8080"]

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.environment.lower() == "production":
            if self.secret_key_required and not self.secret_key:
                raise ValueError("SECRET_KEY is required in production environment")
            if len(self.secret_key) < 32:
                raise ValueError("SECRET_KEY must be at least 32 characters in production")
            if self.cors_origins == ["*"] or "*" in self.cors_origins:
                raise ValueError("CORS_ORIGINS must not contain '*' in production")
        if isinstance(self.cors_origins, str):
            self.cors_origins = [self.cors_origins]
        return self

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def database_url_masked(self) -> str:
        masked_password = "*" * len(self.postgres_password) if self.postgres_password else ""
        return (
            f"postgresql+psycopg://{self.postgres_user}:{masked_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
