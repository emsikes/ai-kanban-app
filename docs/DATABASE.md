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

> **Updated (Part 12):** the single-board `boards` table was replaced by a `projects` table so a user can have multiple named boards. The original `boards` design is kept below the line for history.

```sql
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
```

Notes:
- A **project is a board with a name and an ordering**. A user may have many projects (no `UNIQUE(user_id)`).
- `position` orders projects in the nav (0-based, reassigned on reorder).
- `data` holds the board JSON as text (see below), validated against the `BoardData` model on every write.
- New projects start with the 5 default columns and no cards; the seeded first project ("My Board") gets the demo board.

**Migration from the legacy `boards` table:** on startup, if a `boards` table exists, each row is copied into `projects` (name "My Board", position 0, same `data`) for any user that has no projects yet, then `boards` is dropped. This preserves the pre-Part-12 board.

### Legacy (pre-Part 12) single-board table

```sql
CREATE TABLE boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## `projects.data` JSON shape

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

The database file is created automatically if it does not exist (default path `backend/data/kanban.db`, overridable via `DATABASE_PATH`). On startup the backend:

1. Creates the `users` and `projects` tables if absent (`CREATE TABLE IF NOT EXISTS`).
2. Seeds the single MVP user `user` if absent.
3. Migrates a legacy `boards` table into `projects` if present (see above), then drops it.
4. Seeds a default project "My Board" (demo board) for the user if they have no projects.

No migration framework is used; the create-if-absent statements plus the one-time legacy migration are the entire schema lifecycle.

## How the API uses it (project-scoped, Part 12)

The signed-in user resolves to their `users.id`; projects are always filtered by `user_id` (unknown/non-owned id -> 404).

- `GET /api/projects` / `POST /api/projects` / `PATCH|DELETE /api/projects/{id}` / `POST /api/projects/reorder` - manage projects (delete blocked on the last one)
- `GET|PUT /api/projects/{id}/board` - read/write that project's `data` (validated against `BoardData`)
- `POST /api/projects/{id}/chat` - AI chat scoped to that project's board

## Decisions (resolved)

1. **JSON blob vs normalized tables** - JSON blob (rationale above).
2. **Password storage** - the `password_hash` column exists for the future. The MVP login stays hardcoded (`user`/`password`) and does not consult it. The seeded user's `password_hash` is a real PBKDF2 hash computed with the Python standard library (`hashlib.pbkdf2_hmac`, no extra dependency) so the column is genuinely future-ready.
3. **DB file location** - `backend/data/kanban.db`, gitignored, created if absent, overridable via env (`DATABASE_PATH`).
