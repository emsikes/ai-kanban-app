import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app import db
from app.auth import router as auth_router
from app.projects import router as projects_router

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
SESSION_SECRET = os.environ.get("SESSION_SECRET", "dev-secret-change-me")


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield


app = FastAPI(title="Project Management MVP", lifespan=lifespan)
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET)


@app.get("/api/health")
def health():
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(projects_router)

app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
