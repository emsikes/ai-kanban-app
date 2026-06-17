from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

# Hardcoded MVP credentials. The schema supports multiple users for the future,
# but only this pair is accepted for now.
USERNAME = "user"
PASSWORD = "password"

router = APIRouter(prefix="/api")


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(credentials: LoginRequest, request: Request):
    if credentials.username != USERNAME or credentials.password != PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    request.session["user"] = credentials.username
    return {"authenticated": True}


@router.post("/logout")
def logout(request: Request):
    request.session.clear()
    return {"authenticated": False}


@router.get("/session")
def session(request: Request):
    return {"authenticated": "user" in request.session}
