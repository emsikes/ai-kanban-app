import os

from dotenv import find_dotenv, load_dotenv
from openai import OpenAI

# Load OPENAI_API_KEY from the nearest .env (project root); does not override
# variables already set in the environment (e.g. injected into the container).
load_dotenv(find_dotenv(usecwd=True))

MODEL = "gpt-5.4-mini"


def get_client() -> OpenAI:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    return OpenAI(api_key=api_key)


def ask(prompt: str) -> str:
    response = get_client().responses.create(model=MODEL, input=prompt)
    return response.output_text
