from fastapi import APIRouter, Depends, HTTPException

from app import ai, db
from app.auth import require_user
from app.models import (
    BoardData,
    ChatRequest,
    ChatResponse,
    Project,
    ProjectCreate,
    ProjectRename,
    ReorderRequest,
)

router = APIRouter(prefix="/api/projects")


def owned_project(project_id: int, user_id: int) -> dict:
    project = db.get_project(user_id, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("", response_model=list[Project])
def list_projects(user_id: int = Depends(require_user)):
    return db.list_projects(user_id)


@router.post("", response_model=Project)
def create_project(body: ProjectCreate, user_id: int = Depends(require_user)):
    return db.create_project(user_id, body.name)


@router.post("/reorder", status_code=204)
def reorder_projects(body: ReorderRequest, user_id: int = Depends(require_user)):
    db.reorder_projects(user_id, body.ids)


@router.patch("/{project_id}", response_model=Project)
def rename_project(
    project_id: int, body: ProjectRename, user_id: int = Depends(require_user)
):
    owned_project(project_id, user_id)
    return db.rename_project(user_id, project_id, body.name)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, user_id: int = Depends(require_user)):
    owned_project(project_id, user_id)
    try:
        db.delete_project(user_id, project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Cannot delete the last project")


@router.get("/{project_id}/board", response_model=BoardData)
def read_board(project_id: int, user_id: int = Depends(require_user)):
    owned_project(project_id, user_id)
    return db.get_project_board(project_id)


@router.put("/{project_id}/board", response_model=BoardData)
def write_board(
    project_id: int, board: BoardData, user_id: int = Depends(require_user)
):
    owned_project(project_id, user_id)
    db.save_project_board(project_id, board.model_dump())
    return board


@router.post("/{project_id}/chat", response_model=ChatResponse)
def chat(
    project_id: int, request: ChatRequest, user_id: int = Depends(require_user)
):
    owned_project(project_id, user_id)
    board = db.get_project_board(project_id)
    history = [message.model_dump() for message in request.history]
    try:
        result = ai.chat(board, request.message, history)
    except Exception:
        raise HTTPException(status_code=502, detail="AI request failed")

    if result.board is None:
        return ChatResponse(reply=result.reply, board=None)

    updated = ai.ai_to_board(result.board)
    db.save_project_board(project_id, updated.model_dump())
    return ChatResponse(reply=result.reply, board=updated)
