from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    question: str = Field(min_length=3, max_length=4000)
    language: str = Field(default="en", min_length=2, max_length=8)
    top_k: int = Field(default=5, ge=1, le=20)
    category: str | None = None


class SearchResultItem(BaseModel):
    chunk_id: str
    document_id: str
    title: str
    source: str | None = None
    category: str | None = None
    score: float
    text: str


class SearchResponse(BaseModel):
    results: list[SearchResultItem]
