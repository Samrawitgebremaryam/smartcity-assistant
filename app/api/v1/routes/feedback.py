from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.v1.routes.auth import get_current_user
from app.db.models import User
from app.schemas.feedback import FeedbackRequest, FeedbackResponse
from app.services.feedback_service import FeedbackService


router = APIRouter()


@router.post("", response_model=FeedbackResponse)
def create_feedback(
    payload: FeedbackRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> FeedbackResponse:
    return FeedbackService(db).create_feedback(payload)
