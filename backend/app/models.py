from pydantic import BaseModel


class Card(BaseModel):
    id: str
    title: str
    details: str


class Column(BaseModel):
    id: str
    title: str
    cardIds: list[str]


class BoardData(BaseModel):
    columns: list[Column]
    cards: dict[str, Card]


# AI-facing board: cards as a list (OpenAI strict Structured Outputs cannot
# represent the open-ended dict[str, Card] map). Converted to/from BoardData.
class AiBoard(BaseModel):
    columns: list[Column]
    cards: list[Card]


class ChatResult(BaseModel):
    reply: str
    board: AiBoard | None = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    board: BoardData | None = None


class Project(BaseModel):
    id: int
    name: str
    position: int


class ProjectCreate(BaseModel):
    name: str


class ProjectRename(BaseModel):
    name: str


class ReorderRequest(BaseModel):
    ids: list[int]
