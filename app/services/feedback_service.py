from sqlalchemy.orm import Session

from app.db.models.feedback import Feedback
from app.db.repositories.feedback_repository import FeedbackRepository
from app.schemas.feedback import FeedbackRequest, FeedbackResponse


class FeedbackService:
    def __init__(self, db: Session) -> None:
        self.repository = FeedbackRepository(db)

    def create_feedback(self, payload: FeedbackRequest) -> FeedbackResponse:
        feedback = self.repository.create(
            Feedback(
                query_log_id=payload.query_id,
                rating=payload.rating,
                comment=payload.comment,
            )
        )
        return FeedbackResponse(feedback_id=feedback.id, rating=feedback.rating)
