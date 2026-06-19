import json
import os

from dotenv import find_dotenv, load_dotenv
from openai import OpenAI

from app.models import AiBoard, BoardData, ChatResult

# Load OPENAI_API_KEY from the nearest .env (project root); does not override
# variables already set in the environment (e.g. injected into the container).
load_dotenv(find_dotenv(usecwd=True))

MODEL = "gpt-5.4-mini"

SYSTEM_PROMPT = (
    "You are a project management assistant for a single Kanban board. "
    "You are given the current board as JSON and the user's message. Reply helpfully and concisely. "
    "Only if the user's request warrants changing the board (adding, editing, moving, or removing "
    "cards, or renaming columns) return the FULL updated board; otherwise return board as null. "
    "When you return a board: keep every column, preserve existing ids, give new cards ids like "
    "'card-<unique>', and ensure every id listed in a column's cardIds has a matching card in cards "
    "and vice versa. Never drop data the user did not ask to change."
)


def get_client() -> OpenAI:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    return OpenAI(api_key=api_key)


def ask(prompt: str) -> str:
    response = get_client().responses.create(model=MODEL, input=prompt)
    return response.output_text


def board_to_ai(board: dict) -> dict:
    return {"columns": board["columns"], "cards": list(board["cards"].values())}


def ai_to_board(board: AiBoard) -> BoardData:
    return BoardData(
        columns=board.columns, cards={card.id: card for card in board.cards}
    )


def chat(board: dict, message: str, history: list[dict]) -> ChatResult:
    messages = list(history)
    messages.append(
        {
            "role": "user",
            "content": (
                f"Current board JSON:\n{json.dumps(board_to_ai(board))}\n\n"
                f"User message: {message}"
            ),
        }
    )
    response = get_client().responses.parse(
        model=MODEL,
        instructions=SYSTEM_PROMPT,
        input=messages,
        text_format=ChatResult,
    )
    return response.output_parsed
