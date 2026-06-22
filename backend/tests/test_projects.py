import json
import sqlite3

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app import ai, db
from app.models import AiBoard, Card, ChatResult, Column


@pytest.fixture
def db_path(tmp_path, monkeypatch):
    path = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_PATH", str(path))
    return path


@pytest.fixture
def client(db_path):
    with TestClient(app) as test_client:
        yield test_client


def authenticate(client):
    client.post("/api/login", json={"username": "user", "password": "password"})


def first_project_id(client):
    return client.get("/api/projects").json()[0]["id"]


def test_projects_require_auth(client):
    assert client.get("/api/projects").status_code == 401


def test_seeds_default_project_with_demo_board(client):
    authenticate(client)
    projects = client.get("/api/projects").json()
    assert len(projects) == 1
    assert projects[0]["name"] == "My Board"
    board = client.get(f"/api/projects/{projects[0]['id']}/board").json()
    assert len(board["columns"]) == 5
    assert len(board["cards"]) == 8


def test_create_project_starts_empty(client):
    authenticate(client)
    created = client.post("/api/projects", json={"name": "Roadmap"}).json()
    assert created["name"] == "Roadmap"
    board = client.get(f"/api/projects/{created['id']}/board").json()
    assert len(board["columns"]) == 5
    assert board["cards"] == {}
    names = [p["name"] for p in client.get("/api/projects").json()]
    assert names == ["My Board", "Roadmap"]


def test_rename_project(client):
    authenticate(client)
    pid = first_project_id(client)
    response = client.patch(f"/api/projects/{pid}", json={"name": "Renamed"})
    assert response.status_code == 200
    assert response.json()["name"] == "Renamed"
    assert client.get("/api/projects").json()[0]["name"] == "Renamed"


def test_delete_project(client):
    authenticate(client)
    created = client.post("/api/projects", json={"name": "Temp"}).json()
    assert client.delete(f"/api/projects/{created['id']}").status_code == 204
    assert len(client.get("/api/projects").json()) == 1


def test_cannot_delete_last_project(client):
    authenticate(client)
    pid = first_project_id(client)
    assert client.delete(f"/api/projects/{pid}").status_code == 400
    assert len(client.get("/api/projects").json()) == 1


def test_unknown_project_returns_404(client):
    authenticate(client)
    assert client.get("/api/projects/9999/board").status_code == 404


def test_reorder_projects(client):
    authenticate(client)
    a = first_project_id(client)
    b = client.post("/api/projects", json={"name": "B"}).json()["id"]
    assert client.post("/api/projects/reorder", json={"ids": [b, a]}).status_code == 204
    order = [p["id"] for p in client.get("/api/projects").json()]
    assert order == [b, a]


def test_board_write_is_per_project(client):
    authenticate(client)
    a = first_project_id(client)
    b = client.post("/api/projects", json={"name": "B"}).json()["id"]
    new_board = {
        "columns": [{"id": "col-1", "title": "X", "cardIds": ["c1"]}],
        "cards": {"c1": {"id": "c1", "title": "T", "details": "D"}},
    }
    client.put(f"/api/projects/{b}/board", json=new_board)
    assert client.get(f"/api/projects/{b}/board").json() == new_board
    # Project A is untouched.
    assert len(client.get(f"/api/projects/{a}/board").json()["cards"]) == 8


def test_board_put_malformed_rejected(client):
    authenticate(client)
    pid = first_project_id(client)
    response = client.put(f"/api/projects/{pid}/board", json={"columns": "nope"})
    assert response.status_code == 422


def test_chat_persists_board_update(client, monkeypatch):
    authenticate(client)
    pid = first_project_id(client)
    new_board = AiBoard(
        columns=[Column(id="col-1", title="Todo", cardIds=["card-9"])],
        cards=[Card(id="card-9", title="Buy milk", details="2%")],
    )
    monkeypatch.setattr(
        ai, "chat", lambda *a, **k: ChatResult(reply="Done", board=new_board)
    )
    response = client.post(
        f"/api/projects/{pid}/chat", json={"message": "add", "history": []}
    )
    assert response.status_code == 200
    assert response.json()["board"]["cards"]["card-9"]["title"] == "Buy milk"
    persisted = client.get(f"/api/projects/{pid}/board").json()
    assert persisted["cards"]["card-9"]["title"] == "Buy milk"


def test_chat_reply_only_leaves_board_unchanged(client, monkeypatch):
    authenticate(client)
    pid = first_project_id(client)
    before = client.get(f"/api/projects/{pid}/board").json()
    monkeypatch.setattr(
        ai, "chat", lambda *a, **k: ChatResult(reply="Just chatting", board=None)
    )
    response = client.post(
        f"/api/projects/{pid}/chat", json={"message": "hi", "history": []}
    )
    assert response.status_code == 200
    assert response.json() == {"reply": "Just chatting", "board": None}
    assert client.get(f"/api/projects/{pid}/board").json() == before


def test_chat_ai_failure_returns_502_without_corruption(client, monkeypatch):
    authenticate(client)
    pid = first_project_id(client)
    before = client.get(f"/api/projects/{pid}/board").json()

    def boom(*a, **k):
        raise RuntimeError("AI down")

    monkeypatch.setattr(ai, "chat", boom)
    response = client.post(
        f"/api/projects/{pid}/chat", json={"message": "hi", "history": []}
    )
    assert response.status_code == 502
    assert client.get(f"/api/projects/{pid}/board").json() == before


def test_migrates_legacy_board(db_path):
    legacy_board = {
        "columns": [{"id": "col-legacy", "title": "Legacy", "cardIds": ["lc"]}],
        "cards": {"lc": {"id": "lc", "title": "Legacy card", "details": "d"}},
    }
    conn = sqlite3.connect(db_path)
    conn.executescript(
        """
        CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE,
            password_hash TEXT, created_at TEXT DEFAULT (datetime('now')));
        CREATE TABLE boards (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER,
            data TEXT, updated_at TEXT DEFAULT (datetime('now')));
        """
    )
    conn.execute("INSERT INTO users (username, password_hash) VALUES ('user', 'x')")
    conn.execute(
        "INSERT INTO boards (user_id, data) VALUES (1, ?)", (json.dumps(legacy_board),)
    )
    conn.commit()
    conn.close()

    # Entering the TestClient triggers startup, which runs the migration.
    with TestClient(app) as client:
        authenticate(client)
        projects = client.get("/api/projects").json()
        assert len(projects) == 1
        assert projects[0]["name"] == "My Board"
        board = client.get(f"/api/projects/{projects[0]['id']}/board").json()
        assert board["cards"]["lc"]["title"] == "Legacy card"
    # The legacy table is gone after migration.
    conn = sqlite3.connect(db_path)
    assert not db._table_exists(conn, "boards")
    conn.close()
