# Database Design

Proposed SQLite schema for the Project Management MVP. This document is for sign-off before any database code is written (Part 6).

## Approach

Store each user's Kanban board as a single JSON blob in SQLite. The JSON matches the frontend `BoardData` shape exactly, so the backend reads it, hands it to the frontend and the AI unchanged, and writes back whatever it receives (after validation). A relational `users` table is kept so multiple users are possible in the future, even though the MVP seeds and uses only one.

Rationale:
- The board is always read and written as a whole (load on sign-in, save on each change). A JSON blob matches that access pattern with the least code.
- One source of truth for the board shape: the frontend `BoardData` type, the API model, and the stored JSON are identical. No object-relational mapping to keep in sync.
- The AI exchanges the whole board as JSON (Parts 9-10), so the stored form is already the form the AI consumes and produces.
- A normalized schema (separate column and card tables) would add joins, ordering columns, and write transactions for no MVP benefit. It can be revisited if per-card querying is ever needed.

## Tables

```sql
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
```

Notes:
- `boards.user_id` is `UNIQUE`, enforcing one board per user for the MVP. Dropping that constraint is the only change needed to allow multiple boards later.
- `data` holds the board JSON as text (see below). Application code validates it against the `BoardData` model on every write.
- Timestamps are stored as ISO-8601 text via SQLite's `datetime('now')`, which is simple and human-readable.

## `boards.data` JSON shape

Identical to the frontend `BoardData` (`frontend/src/lib/kanban.ts`): an ordered list of columns plus a map of cards by id. Column order is the array order; card order within a column is its `cardIds` array.

```json
{
  "columns": [
    { "id": "col-backlog", "title": "Backlog", "cardIds": ["card-1", "card-2"] },
    { "id": "col-progress", "title": "In Progress", "cardIds": [] }
  ],
  "cards": {
    "card-1": { "id": "card-1", "title": "Align roadmap themes", "details": "Draft quarterly themes." },
    "card-2": { "id": "card-2", "title": "Gather customer signals", "details": "Review support tags." }
  }
}
```

Types (mirroring the frontend):
- `Card`: `{ id: string, title: string, details: string }`
- `Column`: `{ id: string, title: string, cardIds: string[] }`
- `BoardData`: `{ columns: Column[], cards: Record<string, Card> }`

## Creation and seeding

The database file is created automatically if it does not exist (default path `backend/data/kanban.db`, overridable via env). On startup the backend:

1. Creates the `users` and `boards` tables if absent (`CREATE TABLE IF NOT EXISTS`).
2. Seeds the single MVP user `user` if absent.
3. Seeds that user's board with the demo board (the same five columns and cards as the current frontend `initialData`) if absent.

No migration framework is used; the create-if-absent statements are the entire schema lifecycle for the MVP.

## How the API uses it (Part 6 preview)

- `GET /api/board` resolves the signed-in user to their `users.id`, returns `boards.data` parsed as JSON.
- `PUT /api/board` validates the incoming body against `BoardData`, writes it to `boards.data`, and updates `updated_at`.

The session established in Part 4 identifies the user; the MVP always resolves to the seeded `user`.

## Decisions (resolved)

1. **JSON blob vs normalized tables** - JSON blob (rationale above).
2. **Password storage** - the `password_hash` column exists for the future. The MVP login stays hardcoded (`user`/`password`) and does not consult it. The seeded user's `password_hash` is a real PBKDF2 hash computed with the Python standard library (`hashlib.pbkdf2_hmac`, no extra dependency) so the column is genuinely future-ready.
3. **DB file location** - `backend/data/kanban.db`, gitignored, created if absent, overridable via env (`DATABASE_PATH`).
