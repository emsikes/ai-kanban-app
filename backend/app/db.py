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

CREATE TABLE IF NOT EXISTS projects (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    name       TEXT NOT NULL,
    position   INTEGER NOT NULL,
    data       TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""

# The five stage columns shared by every board.
DEFAULT_COLUMNS = [
    {"id": "col-backlog", "title": "Backlog", "cardIds": []},
    {"id": "col-discovery", "title": "Discovery", "cardIds": []},
    {"id": "col-progress", "title": "In Progress", "cardIds": []},
    {"id": "col-review", "title": "Review", "cardIds": []},
    {"id": "col-done", "title": "Done", "cardIds": []},
]

# New projects start with the columns and no cards.
EMPTY_BOARD = {"columns": DEFAULT_COLUMNS, "cards": {}}

# The seeded first project's demo board, identical to the frontend initialData.
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


def _table_exists(conn: sqlite3.Connection, name: str) -> bool:
    return (
        conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)
        ).fetchone()
        is not None
    )


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
        user_id = user["id"]

        # Migrate the legacy single-board table into projects, once.
        if _table_exists(conn, "boards"):
            for row in conn.execute("SELECT user_id, data FROM boards").fetchall():
                has_projects = conn.execute(
                    "SELECT COUNT(*) AS c FROM projects WHERE user_id = ?",
                    (row["user_id"],),
                ).fetchone()["c"]
                if has_projects == 0:
                    conn.execute(
                        "INSERT INTO projects (user_id, name, position, data) VALUES (?, 'My Board', 0, ?)",
                        (row["user_id"], row["data"]),
                    )
            conn.execute("DROP TABLE boards")

        # Seed a default project for the seeded user if they have none.
        has_projects = conn.execute(
            "SELECT COUNT(*) AS c FROM projects WHERE user_id = ?", (user_id,)
        ).fetchone()["c"]
        if has_projects == 0:
            conn.execute(
                "INSERT INTO projects (user_id, name, position, data) VALUES (?, 'My Board', 0, ?)",
                (user_id, json.dumps(DEFAULT_BOARD)),
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


def _project_row(row: sqlite3.Row) -> dict:
    return {"id": row["id"], "name": row["name"], "position": row["position"]}


def list_projects(user_id: int) -> list[dict]:
    conn = connect()
    try:
        rows = conn.execute(
            "SELECT id, name, position FROM projects WHERE user_id = ? ORDER BY position",
            (user_id,),
        ).fetchall()
        return [_project_row(row) for row in rows]
    finally:
        conn.close()


def get_project(user_id: int, project_id: int) -> dict | None:
    conn = connect()
    try:
        row = conn.execute(
            "SELECT id, name, position FROM projects WHERE id = ? AND user_id = ?",
            (project_id, user_id),
        ).fetchone()
        return _project_row(row) if row else None
    finally:
        conn.close()


def create_project(user_id: int, name: str) -> dict:
    conn = connect()
    try:
        position = conn.execute(
            "SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM projects WHERE user_id = ?",
            (user_id,),
        ).fetchone()["pos"]
        cursor = conn.execute(
            "INSERT INTO projects (user_id, name, position, data) VALUES (?, ?, ?, ?)",
            (user_id, name, position, json.dumps(EMPTY_BOARD)),
        )
        conn.commit()
        return {"id": cursor.lastrowid, "name": name, "position": position}
    finally:
        conn.close()


def rename_project(user_id: int, project_id: int, name: str) -> dict:
    conn = connect()
    try:
        conn.execute(
            "UPDATE projects SET name = ? WHERE id = ? AND user_id = ?",
            (name, project_id, user_id),
        )
        conn.commit()
        row = conn.execute(
            "SELECT id, name, position FROM projects WHERE id = ?", (project_id,)
        ).fetchone()
        return _project_row(row)
    finally:
        conn.close()


def delete_project(user_id: int, project_id: int) -> None:
    conn = connect()
    try:
        count = conn.execute(
            "SELECT COUNT(*) AS c FROM projects WHERE user_id = ?", (user_id,)
        ).fetchone()["c"]
        if count <= 1:
            raise ValueError("Cannot delete the last project")
        conn.execute(
            "DELETE FROM projects WHERE id = ? AND user_id = ?", (project_id, user_id)
        )
        conn.commit()
    finally:
        conn.close()


def reorder_projects(user_id: int, ids: list[int]) -> None:
    conn = connect()
    try:
        for position, project_id in enumerate(ids):
            conn.execute(
                "UPDATE projects SET position = ? WHERE id = ? AND user_id = ?",
                (position, project_id, user_id),
            )
        conn.commit()
    finally:
        conn.close()


def get_project_board(project_id: int) -> dict:
    conn = connect()
    try:
        row = conn.execute(
            "SELECT data FROM projects WHERE id = ?", (project_id,)
        ).fetchone()
        return json.loads(row["data"])
    finally:
        conn.close()


def save_project_board(project_id: int, data: dict) -> None:
    conn = connect()
    try:
        conn.execute(
            "UPDATE projects SET data = ?, updated_at = datetime('now') WHERE id = ?",
            (json.dumps(data), project_id),
        )
        conn.commit()
    finally:
        conn.close()
