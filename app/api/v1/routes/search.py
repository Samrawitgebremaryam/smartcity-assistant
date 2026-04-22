from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.v1.routes.auth import get_current_user
from app.db.models import User
from app.schemas.search import SearchRequest, SearchResponse
from app.services.search_service import SearchService


router = APIRouter()


@router.post("", response_model=SearchResponse)
def search(
    payload: SearchRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SearchResponse:
    return SearchService(db).search(
        question=payload.question,
        language=payload.language,
        top_k=payload.top_k,
        category=payload.category,
    )
