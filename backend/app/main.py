import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.auth import router as auth_router

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
SESSION_SECRET = os.environ.get("SESSION_SECRET", "dev-secret-change-me")

app = FastAPI(title="Project Management MVP")
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET)


@app.get("/api/health")
def health():
    return {"status": "ok"}


app.include_router(auth_router)

app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
