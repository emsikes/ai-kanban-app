import os
from types import SimpleNamespace

import pytest

from app import ai, db
from app.models import ChatResult


def test_get_client_missing_key_raises(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with pytest.raises(RuntimeError):
        ai.get_client()


def test_get_client_uses_env_key(monkeypatch):
    captured = {}

    class FakeOpenAI:
        def __init__(self, api_key):
            captured["api_key"] = api_key

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(ai, "OpenAI", FakeOpenAI)
    ai.get_client()
    assert captured["api_key"] == "test-key"


def test_ask_returns_model_text(monkeypatch):
    class FakeResponses:
        def create(self, model, input):
            assert model == ai.MODEL
            return SimpleNamespace(output_text="4")

    monkeypatch.setattr(
        ai, "get_client", lambda: SimpleNamespace(responses=FakeResponses())
    )
    assert ai.ask("What is 2+2?") == "4"


@pytest.mark.skipif(
    not os.environ.get("OPENAI_API_KEY"), reason="no OPENAI_API_KEY set"
)
def test_ask_live_two_plus_two():
    answer = ai.ask("What is 2+2? Reply with just the number.")
    assert "4" in answer


def test_chat_calls_model_with_structured_format(monkeypatch):
    captured = {}

    class FakeResponses:
        def parse(self, model, instructions, input, text_format):
            captured["model"] = model
            captured["text_format"] = text_format
            return SimpleNamespace(output_parsed=ChatResult(reply="ok", board=None))

    monkeypatch.setattr(
        ai, "get_client", lambda: SimpleNamespace(responses=FakeResponses())
    )
    result = ai.chat(db.DEFAULT_BOARD, "hello", [{"role": "user", "content": "x"}])
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
    assert any("milk" in card.title.lower() for card in result.board.cards)
