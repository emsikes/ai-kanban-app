# Backend

FastAPI backend for the Project Management MVP. Serves the JSON API under `/api` and the statically built frontend at `/`. Managed by `uv`.

## Layout

```
backend/
  pyproject.toml    uv project: deps + dev deps + pytest/coverage config
  uv.lock           Locked dependency versions
  app/
    main.py         FastAPI app: /api/health, SessionMiddleware, auth + projects routers, DB init (lifespan), static mount at /
    auth.py         Hardcoded credential check + session routes; require_user dependency
    projects.py     Project routes: CRUD, reorder, and project-scoped board (GET/PUT) + chat
    db.py           SQLite connect, schema init, seeding, legacy migration, project repository
    ai.py           OpenAI client; ask(prompt) connectivity helper; chat() with Structured Outputs + board <-> AiBoard conversion
    models.py       Card / Column / BoardData (frontend types) + AiBoard / Chat* + Project / ProjectCreate / ProjectRename / ReorderRequest
  data/             SQLite file lives here (gitignored, auto-created)
  static/           Served at /; the built Next.js SPA (produced by scripts/build-frontend.sh / Docker)
  tests/
    test_health.py  GET /api/health -> {"status": "ok"}
    test_root.py    GET / -> built SPA shell is served
    test_auth.py    login / logout / session behavior
    test_projects.py  project CRUD, reorder, ownership, per-project board + chat, legacy migration
    test_ai.py      AI client/key handling + ai.chat (mocked) + gated live connectivity tests
```

## Routes (current)

- `GET /api/health` -> `{"status": "ok"}`
- `POST /api/login` -> `{authenticated: true}` for `user`/`password`, else 401; sets the session cookie
- `POST /api/logout` -> clears the session
- `GET /api/session` -> `{authenticated: bool}`
- `GET /api/projects` -> `[{id, name, position}]`; `POST /api/projects {name}` -> new project (empty board)
- `PATCH /api/projects/{id} {name}` -> rename; `DELETE /api/projects/{id}` -> 204 (400 if last project); `POST /api/projects/reorder {ids}` -> 204
- `GET|PUT /api/projects/{id}/board` -> that project's `BoardData` (422 if malformed); `404` if the project is unknown/not owned
- `POST /api/projects/{id}/chat {message, history}` -> `{reply, board?}`; AI board updates persist to that project (502 if the AI call fails)
- All project routes are 401 if unauthenticated
- `GET /` (and other paths) -> static files from `static/` (`html=True`, serves `index.html`)

`/api/*` routes are registered before the static mount so the API takes precedence. Sessions use Starlette `SessionMiddleware` (signed cookie); the secret comes from `SESSION_SECRET` (defaults to a dev value). MVP credentials are hardcoded in `auth.py`.

## Commands

Run from `backend/`:

```
uv sync                 # install deps into .venv
uv run pytest           # tests + coverage (fails under 80%)
uv run uvicorn app.main:app --reload --port 8000   # local dev
```

## Conventions

- `uv` is the package manager; the project is non-packaged (`tool.uv.package = false`), run from source.
- Unit coverage minimum 80%, enforced via `--cov-fail-under=80` in `pyproject.toml`.
- Tests use FastAPI `TestClient`; board tests set `DATABASE_PATH` to a temp file per test.
- `DATABASE_PATH` overrides the SQLite location (default `backend/data/kanban.db`); the DB is created and seeded on startup if absent.
- `SESSION_SECRET` signs the session cookie (defaults to a dev value).
- `OPENAI_API_KEY` is read from the project-root `.env` (used from Part 8 on); never hardcode or log it.
