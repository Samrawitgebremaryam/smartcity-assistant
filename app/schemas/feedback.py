from pydantic import BaseModel, Field


class FeedbackRequest(BaseModel):
    query_id: str
    rating: str = Field(min_length=3, max_length=32)
    comment: str | None = Field(default=None, max_length=2000)


class FeedbackResponse(BaseModel):
    feedback_id: str
    rating: str
