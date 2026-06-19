import hashlib
import json
import os
import sqlite3
from pathlib import Path

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "kanban.db"

DEFAULT_USERNAME = "user"
DEFAULT_PASSWORD = "password"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS boards (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id),
    data       TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""

# Demo board, identical to the frontend initialData shape.
DEFAULT_BOARD = {
    "columns": [
        {"id": "col-backlog", "title": "Backlog", "cardIds": ["card-1", "card-2"]},
        {"id": "col-discovery", "title": "Discovery", "cardIds": ["card-3"]},
        {"id": "col-progress", "title": "In Progress", "cardIds": ["card-4", "card-5"]},
        {"id": "col-review", "title": "Review", "cardIds": ["card-6"]},
        {"id": "col-done", "title": "Done", "cardIds": ["card-7", "card-8"]},
    ],
    "cards": {
        "card-1": {"id": "card-1", "title": "Align roadmap themes", "details": "Draft quarterly themes with impact statements and metrics."},
        "card-2": {"id": "card-2", "title": "Gather customer signals", "details": "Review support tags, sales notes, and churn feedback."},
        "card-3": {"id": "card-3", "title": "Prototype analytics view", "details": "Sketch initial dashboard layout and key drill-downs."},
        "card-4": {"id": "card-4", "title": "Refine status language", "details": "Standardize column labels and tone across the board."},
        "card-5": {"id": "card-5", "title": "Design card layout", "details": "Add hierarchy and spacing for scanning dense lists."},
        "card-6": {"id": "card-6", "title": "QA micro-interactions", "details": "Verify hover, focus, and loading states."},
        "card-7": {"id": "card-7", "title": "Ship marketing page", "details": "Final copy approved and asset pack delivered."},
        "card-8": {"id": "card-8", "title": "Close onboarding sprint", "details": "Document release notes and share internally."},
    },
}


def db_path() -> Path:
    return Path(os.environ.get("DATABASE_PATH", str(DEFAULT_DB_PATH)))


def connect() -> sqlite3.Connection:
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def hash_password(password: str) -> str:
    # Static salt is acceptable for the single seeded MVP user; login does not
    # consult this hash yet (see docs/DATABASE.md).
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode(), b"pm-mvp-salt", 100_000
    ).hex()


def init_db() -> None:
    conn = connect()
    try:
        conn.executescript(SCHEMA)
        user = conn.execute(
            "SELECT id FROM users WHERE username = ?", (DEFAULT_USERNAME,)
        ).fetchone()
        if user is None:
            conn.execute(
                "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                (DEFAULT_USERNAME, hash_password(DEFAULT_PASSWORD)),
            )
            user = conn.execute(
                "SELECT id FROM users WHERE username = ?", (DEFAULT_USERNAME,)
            ).fetchone()
        has_board = conn.execute(
            "SELECT id FROM boards WHERE user_id = ?", (user["id"],)
        ).fetchone()
        if has_board is None:
            conn.execute(
                "INSERT INTO boards (user_id, data) VALUES (?, ?)",
                (user["id"], json.dumps(DEFAULT_BOARD)),
            )
        conn.commit()
    finally:
        conn.close()


def default_user_id() -> int:
    conn = connect()
    try:
        return conn.execute(
            "SELECT id FROM users WHERE username = ?", (DEFAULT_USERNAME,)
        ).fetchone()["id"]
    finally:
        conn.close()


def get_board(user_id: int) -> dict:
    conn = connect()
    try:
        row = conn.execute(
            "SELECT data FROM boards WHERE user_id = ?", (user_id,)
        ).fetchone()
        return json.loads(row["data"])
    finally:
        conn.close()


def save_board(user_id: int, data: dict) -> None:
    conn = connect()
    try:
        conn.execute(
            "UPDATE boards SET data = ?, updated_at = datetime('now') WHERE user_id = ?",
            (json.dumps(data), user_id),
        )
        conn.commit()
    finally:
        conn.close()
