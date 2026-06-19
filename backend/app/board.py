from fastapi import APIRouter, Depends, HTTPException, Request

from app import ai, db
from app.models import BoardData, ChatRequest, ChatResponse

router = APIRouter(prefix="/api")


def require_user(request: Request) -> int:
    if "user" not in request.session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return db.default_user_id()


@router.get("/board", response_model=BoardData)
def read_board(user_id: int = Depends(require_user)):
    return db.get_board(user_id)


@router.put("/board", response_model=BoardData)
def write_board(board: BoardData, user_id: int = Depends(require_user)):
    db.save_board(user_id, board.model_dump())
    return board


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, user_id: int = Depends(require_user)):
    board = db.get_board(user_id)
    history = [message.model_dump() for message in request.history]
    try:
        result = ai.chat(board, request.message, history)
    except Exception:
        raise HTTPException(status_code=502, detail="AI request failed")

    if result.board is None:
        return ChatResponse(reply=result.reply, board=None)

    updated = ai.ai_to_board(result.board)
    db.save_board(user_id, updated.model_dump())
    return ChatResponse(reply=result.reply, board=updated)
