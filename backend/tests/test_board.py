from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def db_path(tmp_path, monkeypatch):
    path = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_PATH", str(path))
    return path


@pytest.fixture
def client(db_path):
    # Using the context manager triggers startup, which creates and seeds the DB.
    with TestClient(app) as test_client:
        yield test_client


def authenticate(client):
    client.post("/api/login", json={"username": "user", "password": "password"})


def test_db_file_created_and_seeded(client, db_path):
    assert Path(db_path).exists()
    authenticate(client)
    board = client.get("/api/board").json()
    assert len(board["columns"]) == 5
    assert len(board["cards"]) == 8


def test_get_board_requires_auth(client):
    assert client.get("/api/board").status_code == 401


def test_put_board_requires_auth(client):
    response = client.put("/api/board", json={"columns": [], "cards": {}})
    assert response.status_code == 401


def test_put_then_get_persists_board(client):
    authenticate(client)
    new_board = {
        "columns": [{"id": "col-1", "title": "Todo", "cardIds": ["card-1"]}],
        "cards": {"card-1": {"id": "card-1", "title": "Task", "details": "Do it"}},
    }
    put = client.put("/api/board", json=new_board)
    assert put.status_code == 200
    assert put.json() == new_board
    assert client.get("/api/board").json() == new_board


def test_put_malformed_board_rejected(client):
    authenticate(client)
    response = client.put("/api/board", json={"columns": "not-a-list"})
    assert response.status_code == 422
