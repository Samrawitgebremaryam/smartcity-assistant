from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    language: str = Field(default="en", min_length=2, max_length=8)


class SourceItem(BaseModel):
    title: str
    category: str | None = None
    source: str | None = None
    document_id: str | None = None
    chunk_id: str | None = None


class SearchSuggestionItem(BaseModel):
    label: str
    url: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceItem]
    confidence: float
    query_id: str | None = None
    search_suggestions: list[SearchSuggestionItem] = []
    suggested_questions: list[str] = []
    response_kind: str = "answer"
