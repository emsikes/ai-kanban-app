from fastapi import APIRouter, Depends, HTTPException, Request

from app import db
from app.models import BoardData

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
