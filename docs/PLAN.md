# Project Management MVP - Implementation Plan

> **For agentic workers:** Each part below is a checklist (`- [ ]`) to be checked off as it is completed. Parts are sequential; finish and verify one before starting the next. Every part lists its substeps, tests, and success criteria. The Global Constraints apply to every part.

**Goal:** A local, Dockerized single-board Kanban app with fake login and an AI chat sidebar that can read and edit the board.

**Architecture:** A Python FastAPI backend serves a statically exported Next.js frontend at `/` and a JSON API under `/api`. State persists in a local SQLite database, storing each user's board as a single JSON blob. The AI chat calls the OpenAI API with the current board plus the conversation, and returns Structured Outputs containing a reply and an optional board update.

**Tech Stack:** Next.js 16 / React 19 / Tailwind v4 (frontend), FastAPI + Uvicorn (backend), SQLite (stdlib `sqlite3`), `uv` (Python package manager), OpenAI Python SDK, Docker.

---

## Global Constraints

- **Frontend serving:** Next.js static export (`output: "export"`); no Node runtime in the container. FastAPI serves the built static files at `/`.
- **Database:** SQLite, created automatically if absent. One row per board; the board is stored as a JSON blob matching the frontend `BoardData` shape. Schema supports multiple users for the future, but the MVP seeds one.
- **Auth (MVP):** Single hardcoded credential pair `user` / `password`. The schema still models users generally.
- **AI:** OpenAI API, model `gpt-5.4-mini`, via the Responses API with Structured Outputs. `OPENAI_API_KEY` is read from the environment (never hardcoded, never logged); `ai.py` also loads a project-root `.env` if present without overriding real env vars. Note: the actual project `.env` is malformed, so the working key comes from the shell environment and is forwarded into the container via `docker run -e OPENAI_API_KEY`.
- **One board per user** in the MVP.
- **Runs locally** in a single Docker container.
- **Unit test coverage:** minimum 80% on both frontend (Vitest) and backend (pytest-cov); builds fail below this.
- **Integration testing:** robust full-stack coverage - backend API integration via FastAPI `TestClient` against a real temporary SQLite DB, and end-to-end via Playwright against the FastAPI-served static build.
- **Coding standards (from CLAUDE.md):** latest idiomatic libraries; keep it simple, never over-engineer, no unnecessary defensive programming, no extra features; concise docs; no emojis ever; find root cause before fixing.
- **Color scheme:** accent yellow `#ecad0a`, primary blue `#209dd7`, secondary purple `#753991`, navy `#032147`, gray text `#888888`.

## Target repository layout

As built (the original plan's single `api.py` was split into `auth.py` and `board.py`):

```
pm-main/
  frontend/                 Next.js app (see frontend/AGENTS.md)
  backend/
    pyproject.toml          uv-managed project + deps
    app/
      main.py               FastAPI app, SessionMiddleware, routers, lifespan DB init, static mount
      auth.py               Session/cookie + credential check (login/logout/session)
      board.py              /api/board (GET/PUT) and /api/chat routes + require_user dependency
      db.py                 SQLite connection + schema init + seeding + board repository
      ai.py                 OpenAI client; ask() connectivity helper; chat() Structured Outputs + board<->AiBoard
      models.py             Pydantic models (Card, Column, BoardData, AiBoard, Chat* I/O)
    data/                   SQLite file (gitignored, auto-created)
    static/                 Built frontend (copied from frontend/out at build)
    tests/                  pytest suite
  scripts/
    start.sh  stop.sh       Mac/Linux (start forwards OPENAI_API_KEY into the container)
    start.ps1 stop.ps1      Windows
    build-frontend.sh       Build the static export and sync it into backend/static
  docs/
    PLAN.md                 This document
    DATABASE.md             DB design (Part 5)
  Dockerfile                Multi-stage: Node build of frontend, assemble backend
  .dockerignore
```

## Testing strategy (applies throughout)

- **Frontend unit/integration:** Vitest + Testing Library. Add coverage thresholds (lines, functions, statements, branches >= 80) to `vitest.config.ts` so `npm run test:unit` fails below target. API calls are mocked in unit tests.
- **Frontend e2e:** Playwright in `frontend/tests/`. From Part 3 on, e2e runs against the FastAPI-served static build (not `next dev`).
- **Backend unit/integration:** pytest + pytest-cov with `--cov-fail-under=80`. Integration tests use `TestClient` with a temp SQLite file per test, asserting real persistence and auth enforcement.
- **Run order:** unit/coverage first, then integration/e2e. A part is done only when its tests pass and coverage holds.

---

## Part 1: Plan - COMPLETE

**Objective:** Enrich this document into a detailed, testable checklist and document the existing frontend, then get user approval.

- [x] Reconcile technical decisions (DB-as-JSON-in-SQLite, static export, model `gpt-5.4-mini`) with the user
- [x] Enrich `docs/PLAN.md` with substeps, tests, and success criteria per part
- [x] Create `frontend/AGENTS.md` describing the existing frontend code
- [x] User reviews and approves this plan before any scaffolding begins

**Tests / verification:** N/A (planning artifact). Verification is user review.

**Success criteria:** User explicitly approves `docs/PLAN.md`. `frontend/AGENTS.md` accurately reflects the current frontend (stack, data model, state, test hooks).

---

## Part 2: Scaffolding (Docker + FastAPI + scripts) - COMPLETE

**Objective:** Stand up the backend, container, and scripts. Serve placeholder static HTML at `/` and prove an API call works.

**Verified:** `uv run pytest` 2 passed / 100% coverage; `./scripts/start.sh` built and ran the container, `curl /` served the placeholder HTML, `curl /api/health` returned `{"status":"ok"}`, `./scripts/stop.sh` removed it.

- [x] Create `backend/pyproject.toml` managed by `uv`; deps: `fastapi`, `uvicorn[standard]`; dev deps: `pytest`, `pytest-cov`, `httpx`
- [x] Create `backend/app/main.py` with a FastAPI app
- [x] Add `GET /api/health` returning `{"status": "ok"}`
- [x] Serve a placeholder `backend/static/index.html` ("hello world") at `/`
- [x] Create `Dockerfile`: install `uv`, sync backend deps, run `uvicorn app.main:app --host 0.0.0.0 --port 8000` (frontend build stage added in Part 3)
- [x] Create `.dockerignore` (exclude `node_modules`, `.next`, `out`, `__pycache__`, `.venv`)
- [x] Write `scripts/start.sh` / `stop.sh` (Mac/Linux) and `scripts/start.ps1` / `stop.ps1` (Windows) to build and run/stop the container on port 8000
- [x] Write `backend/tests/test_health.py` and `backend/tests/test_root.py`

**Tests:**
- `test_health`: `TestClient` GET `/api/health` -> 200, body `{"status": "ok"}`
- `test_root`: GET `/` -> 200, content-type HTML, body contains the hello-world marker
- Run: `cd backend && uv run pytest --cov=app --cov-fail-under=80`

**Success criteria:** `docker build` succeeds; starting the container via the start script and running `curl localhost:8000/` returns the placeholder HTML and `curl localhost:8000/api/health` returns `{"status":"ok"}`; stop script stops the container; backend tests pass with coverage >= 80%.

---

## Part 3: Serve the real frontend statically - COMPLETE

**Objective:** Statically build the existing Next.js app and serve the demo Kanban board at `/`.

- [x] Set `output: "export"` and `images: { unoptimized: true }` in `frontend/next.config.ts`
- [x] Confirm `npm run build` emits `frontend/out/` with the board page
- [x] Update `Dockerfile` to a multi-stage build: Node stage runs `npm ci && npm run build`, backend stage copies the build into `static`
- [x] Mount `backend/static` at `/` in FastAPI (`html=True`), keeping `/api/*` precedence (done in Part 2; now serves the real build)
- [x] Add coverage thresholds (>= 80) to `frontend/vitest.config.ts`; scope coverage to `src/**`
- [x] Keep existing Vitest unit/component tests green; add tests for `KanbanCardPreview`, `page.tsx`, and `moveCard` guards
- [x] Point Playwright at the FastAPI-served build: `baseURL` `http://127.0.0.1:8000`, `webServer` runs `uvicorn` instead of `next dev`
- [x] Add e2e covering: board renders five columns; add a card; remove a card; drag a card to another column
- [x] Add `scripts/build-frontend.sh` to build and sync the export into `backend/static` for local dev/tests

**Tests:**
- `npm run test:unit` -> pass, coverage >= 80%
- `npm run test:e2e` against the served static build -> board interactions pass
- Backend `test_root` updated to assert the real board markup is served

**Success criteria:** Visiting `/` shows the demo Kanban board with working drag/drop, add, remove, and rename; all unit and e2e tests pass; frontend coverage >= 80%.

**Verified:** frontend unit `11 passed`, coverage 93.8% stmts / 87% branches (gate 80% met); Playwright `4 passed` against the FastAPI-served build; backend `2 passed` / 100% coverage with `test_root` asserting the board markup; multi-stage `docker build` succeeded and the container served the board, `_next` JS assets (200), and `/api/health`.

---

## Part 4: Fake user sign-in - COMPLETE

**Objective:** Gate `/` behind a login with `user` / `password`, with logout.

- [x] Backend `auth.py`: validate hardcoded credentials; signed session cookie via Starlette `SessionMiddleware` (`itsdangerous`, secret from `SESSION_SECRET` env); cleared on logout
- [x] `POST /api/login` (valid -> set cookie + 200; invalid -> 401); `POST /api/logout` (clears session); `GET /api/session` (returns `{authenticated: bool}`)
- [x] Frontend `AuthGate`: on load checks `/api/session`, shows `LoginForm` when unauthenticated and the board (with a Log out control) when authenticated; shows an error on bad credentials
- [x] Style login per the color scheme (purple submit button, navy headings)

**Tests:**
- Backend unit: login success authenticates the session; wrong password -> 401; logout clears session; `/api/session` reflects state
- Frontend unit: `LoginForm` submit/validation/error; `AuthGate` gate, login, error, and logout flows (fetch mocked)
- e2e: visit `/` -> login form, board gated; wrong creds -> error, no board; correct creds -> board; logout -> back to login

**Note:** The board now renders client-side behind the gate, so it is no longer pre-rendered into the static HTML. `test_root` therefore asserts the built SPA shell is served (`_next/static` + app title); the board itself is asserted by the e2e suite.

**Success criteria:** Unauthenticated users cannot see the board; correct credentials reveal it; logout works; all tests pass; coverage >= 80% on both sides.

**Verified:** backend `6 passed` / 100% coverage; frontend unit `19 passed`, coverage 95% stmts / 89.7% branches (`AuthGate` + `LoginForm` 100%); Playwright `7 passed` (auth gate, reject, login/logout, plus board add/remove/drag after login); Docker container served the SPA and the session endpoints behaved correctly (session false -> login true -> session true; bad creds 401).

---

## Part 5: Database modeling (design + sign-off) - COMPLETE

**Objective:** Propose and document the SQLite schema storing the board as JSON; get user sign-off.

- [x] Create `docs/DATABASE.md` documenting:
  - `users(id INTEGER PK, username TEXT UNIQUE, password_hash TEXT, created_at TEXT)`
  - `boards(id INTEGER PK, user_id INTEGER FK -> users.id UNIQUE, data TEXT JSON, updated_at TEXT)` with one board per user (MVP)
  - `data` JSON matches frontend `BoardData` (`{columns: [...], cards: {...}}`) - includes a concrete example
  - Auto-creation on startup if the DB/tables are absent; seeding of the hardcoded `user` and a default board from the demo data
  - Rationale: JSON blob keeps the API simple and mirrors the frontend model; relational user table preserves the multi-user future
- [x] User reviews and signs off on `docs/DATABASE.md`

**Resolved decisions:** JSON blob storage; `password_hash` seeded with a real stdlib PBKDF2 hash (MVP login stays hardcoded and does not consult it); DB file at `backend/data/kanban.db` (gitignored, overridable via `DATABASE_PATH`).

**Tests / verification:** N/A (design artifact). Verification is user sign-off.

**Success criteria:** User approves `docs/DATABASE.md`; the documented schema is sufficient for Part 6 (read/write board per user, auto-create, seed).

---

## Part 6: Backend board API + persistence - COMPLETE

**Objective:** Implement DB layer and routes to read/change a user's board; auto-create the DB; thorough backend tests.

- [x] `db.py`: connect to a SQLite file (path from env `DATABASE_PATH`, default `backend/data/kanban.db`); create tables if absent; seed hardcoded user (PBKDF2 hash) + default board; repository `default_user_id()` / `get_board(user_id)` / `save_board(user_id, data)`
- [x] `models.py`: Pydantic `Card`, `Column`, `BoardData` mirroring the frontend types; validate on write
- [x] Initialize the DB on FastAPI startup (lifespan)
- [x] `GET /api/board` -> current user's board (401 if unauthenticated)
- [x] `PUT /api/board` -> validate and replace the board, update `updated_at` (401 if unauthenticated)

**Tests (pytest, temp DB per test):**
- DB file/tables auto-created when absent; default user + board seeded
- `GET /api/board` returns the seeded board; `PUT` then `GET` returns the saved board (persistence)
- `PUT` with malformed body -> 422
- Both routes require auth -> 401 when not logged in
- Run: `uv run pytest --cov=app --cov-fail-under=80`

**Success criteria:** Board reads/writes persist across requests and process restarts; DB self-creates; invalid payloads rejected; auth enforced; coverage >= 80%.

**Verified:** backend `11 passed` / 100% coverage; a live uvicorn run auto-created `backend/data/kanban.db`, served the seeded 5-column board, and after a PUT + full server restart returned the persisted board (proving cross-restart persistence).

---

## Part 7: Wire frontend to backend - COMPLETE

**Objective:** Replace in-memory state with backend persistence so the board is durable.

- [x] On load, fetch `GET /api/board` and initialize `KanbanBoard` from it (replaced `useState(initialData)`)
- [x] Persist via `PUT /api/board` after mutations (rename, add, delete, move); debounced (400ms) so rapid edits save once; timer cleared on unmount
- [x] Show a lightweight loading/error state while fetching

**Tests:**
- Frontend unit: board renders from mocked `GET /api/board`; a mutation triggers `PUT` with the expected payload; error state on failed load (mocked fetch)
- e2e: make a change, reload the page, change persists (rename + add); plus add, remove, and move against the real backend, with the board reset to a known seed before each test (dedicated e2e DB)

**Success criteria:** The board loads from and saves to the backend; reloading preserves all changes; tests pass; coverage >= 80%.

**Verified:** frontend unit `21 passed`, coverage 94.3% stmts / 89.4% branches; Playwright `8 passed` including "persists edits across a reload"; Docker container served the SPA and the board API (seeded 5 columns, PUT persisted in-container). Fixed a real bug found by the persist test: the debounce timer was not cleared on unmount, leaking a stale PUT.

---

## Part 8: AI connectivity - COMPLETE

**Objective:** Make a basic OpenAI call from the backend and verify it works.

- [x] Add `openai` (+ `python-dotenv`) to backend deps
- [x] `ai.py`: `get_client()` reads `OPENAI_API_KEY` (loads `.env` without overriding real env); `ask(prompt)` calls model `gpt-5.4-mini` via the Responses API and returns `output_text`
- [x] `ask("what is 2+2")` used as the connectivity check (no endpoint added yet)
- [x] Start scripts forward `OPENAI_API_KEY` into the container (`-e OPENAI_API_KEY`)

**Tests:**
- Unit: missing key raises; `get_client` passes the env key to the SDK (mocked); `ask` returns the model text (mocked)
- Live connectivity test (gated on `OPENAI_API_KEY` presence; skipped if absent): "what is 2+2" response contains `4`

**Success criteria:** The live test returns `4`, confirming the key, model id, and SDK usage are correct; unit tests pass; the key is never logged.

**Verified:** backend `15 passed` / 100% coverage; the live test ran (not skipped) and `ask("What is 2+2?")` returned exactly `"4"` from `gpt-5.4-mini`. Note: the working key is a real `sk-proj` key in the shell environment; the project-root `.env` is malformed (see note to user) and is not the source.

---

## Part 9: AI board reasoning with Structured Outputs - COMPLETE

**Objective:** Send the board JSON + user question + conversation history; receive a Structured Output with a reply and optional board update; persist updates.

- [x] Structured Output schema in `models.py`: `ChatResult { reply: str, board: AiBoard | null }`. `AiBoard` uses `cards` as a list (strict Structured Outputs cannot represent the open-ended `dict[str, Card]`); converted to/from `BoardData` via `ai.board_to_ai` / `ai.ai_to_board`
- [x] `POST /api/chat` with `{ message: str, history: [{role, content}] }`: loads the current board, calls `ai.chat` (board + history + message) using `responses.parse(text_format=ChatResult)`, returns `{reply, board?}`; if a board is returned it is converted to `BoardData` and persisted
- [x] System prompt instructs the model to only return a board when changes are warranted, preserve ids, keep all columns, and maintain cardIds/cards referential integrity
- [x] AI/transport failures return 502 without touching the stored board

**Tests:**
- Unit (`ai.chat` mocked): reply-only leaves board unchanged; board update persists; AI failure -> 502 with no corruption; `ai.chat` calls the model with `text_format=ChatResult`
- Gated live test: "add a card titled Buy milk" round-trip produces a valid board with that card

**Success criteria:** Chat replies are returned; AI-driven board updates validate against `BoardData` and persist; malformed AI output never corrupts the stored board; coverage >= 80%.

**Verified:** backend `21 passed` / 100% coverage; the live test produced a real structured board update from `gpt-5.4-mini`; a live end-to-end `/api/chat` call ("add Demo Task") replied, returned the updated board, and persisted it to the DB.

---

## Part 10: AI chat sidebar UI

**Objective:** Add a polished chat sidebar; let the AI update the board; auto-refresh the UI when it does.

- [ ] `ChatSidebar` component: message list, input, send; maintains conversation history; calls `POST /api/chat`
- [ ] On a response containing a board update, refresh the board UI automatically (apply the returned board or refetch `GET /api/board`)
- [ ] Style per the color scheme (navy headings, blue accents, purple send button, yellow highlights); responsive sidebar layout
- [ ] Handle pending/sending and error states minimally

**Tests:**
- Frontend unit (mocked fetch): sending a message renders the reply; a response with a board update refreshes the rendered board; error state shown on failure
- e2e: open the sidebar, send a message that adds/moves a card, board updates without a manual reload

**Success criteria:** A working chat sidebar; AI board edits appear in the UI automatically; conversation history is sent with each turn; all unit and e2e tests pass; frontend coverage >= 80%.

---

## Final acceptance

- [ ] Single `docker build` produces a container serving the full app at `/`
- [ ] Login -> persistent Kanban board (drag/drop, edit, rename) -> AI chat that creates/edits/moves cards with auto-refresh
- [ ] Frontend and backend unit coverage both >= 80%; backend integration (TestClient) and full-stack e2e (Playwright) green
- [ ] Start/stop scripts work on Mac/Linux/Windows; SQLite DB self-creates; no emojis anywhere in code or docs
