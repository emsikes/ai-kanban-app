import os
from types import SimpleNamespace

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


def test_chat_requires_auth(client):
    response = client.post("/api/chat", json={"message": "hi", "history": []})
    assert response.status_code == 401


def test_chat_reply_only_leaves_board_unchanged(client, monkeypatch):
    authenticate(client)
    monkeypatch.setattr(
        ai, "chat", lambda board, message, history: ChatResult(reply="Hi there", board=None)
    )
    before = client.get("/api/board").json()

    response = client.post("/api/chat", json={"message": "hello", "history": []})
    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "Hi there"
    assert body["board"] is None
    assert client.get("/api/board").json() == before


def test_chat_board_update_persists(client, monkeypatch):
    authenticate(client)
    new_board = AiBoard(
        columns=[Column(id="col-1", title="Todo", cardIds=["card-9"])],
        cards=[Card(id="card-9", title="Buy milk", details="2%")],
    )
    monkeypatch.setattr(
        ai, "chat", lambda *a, **k: ChatResult(reply="Added it", board=new_board)
    )

    response = client.post("/api/chat", json={"message": "add buy milk", "history": []})
    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "Added it"
    assert body["board"]["cards"]["card-9"]["title"] == "Buy milk"
    # Persisted to the DB.
    assert client.get("/api/board").json()["cards"]["card-9"]["title"] == "Buy milk"


def test_chat_ai_failure_returns_502_without_corruption(client, monkeypatch):
    authenticate(client)

    def boom(*a, **k):
        raise RuntimeError("AI down")

    monkeypatch.setattr(ai, "chat", boom)
    before = client.get("/api/board").json()

    response = client.post("/api/chat", json={"message": "hi", "history": []})
    assert response.status_code == 502
    assert client.get("/api/board").json() == before


def test_ai_chat_calls_model_with_structured_format(monkeypatch):
    captured = {}

    class FakeResponses:
        def parse(self, model, instructions, input, text_format):
            captured["model"] = model
            captured["text_format"] = text_format
            captured["input"] = input
            return SimpleNamespace(output_parsed=ChatResult(reply="ok", board=None))

    monkeypatch.setattr(
        ai, "get_client", lambda: SimpleNamespace(responses=FakeResponses())
    )
    result = ai.chat(db.DEFAULT_BOARD, "hello", [{"role": "user", "content": "earlier"}])
    assert result.reply == "ok"
    assert captured["model"] == ai.MODEL
    assert captured["text_format"] is ChatResult


@pytest.mark.skipif(
    not os.environ.get("OPENAI_API_KEY"), reason="no OPENAI_API_KEY set"
)
def test_chat_live_adds_card():
    result = ai.chat(
        db.DEFAULT_BOARD,
        "Add a card titled 'Buy milk' to the Backlog column. Keep everything else unchanged.",
        [],
    )
    assert result.board is not None
    titles = [card.title.lower() for card in result.board.cards]
    assert any("milk" in title for title in titles)
