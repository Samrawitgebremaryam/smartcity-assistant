import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.v1.routes.auth import get_current_user
from app.db.models import User
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import ChatService

router = APIRouter()


@router.post("", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ChatResponse:
    return ChatService(db).ask(payload.question, payload.language)


@router.post("/stream")
async def chat_stream(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Streaming chat endpoint using SSE."""
    service = ChatService(db)
    
    async def event_generator():
        yield "data: " + json.dumps({"type": "loading"}) + "\n\n"
        
        try:
            async for event in service.ask_streaming(payload.question, payload.language):
                if "token" in event:
                    data = json.dumps({"type": "content", "content": event["token"]})
                    yield "data: " + data + "\n\n"
                else:
                    data = json.dumps({"type": "meta", **event})
                    yield "data: " + data + "\n\n"
        except Exception as e:
            error_data = json.dumps({"type": "error", "error": str(e)})
            yield "data: " + error_data + "\n\n"
        
        yield "data: " + json.dumps({"type": "done"}) + "\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
