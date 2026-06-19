# Backend

FastAPI backend for the Project Management MVP. Serves the JSON API under `/api` and the statically built frontend at `/`. Managed by `uv`.

## Layout

```
backend/
  pyproject.toml    uv project: deps + dev deps + pytest/coverage config
  uv.lock           Locked dependency versions
  app/
    main.py         FastAPI app: /api/health, SessionMiddleware, auth + board routers, DB init (lifespan), static mount at /
    auth.py         Hardcoded credential check + session routes (login/logout/session)
    board.py        Board routes (GET/PUT /api/board) + require_user auth dependency
    db.py           SQLite connect, schema init, seeding, board repository
    ai.py           OpenAI client + ask(prompt) helper (model gpt-5.4-mini, Responses API)
    models.py       Pydantic Card / Column / BoardData (mirror the frontend types)
  data/             SQLite file lives here (gitignored, auto-created)
  static/           Served at /; the built Next.js SPA (produced by scripts/build-frontend.sh / Docker)
  tests/
    test_health.py  GET /api/health -> {"status": "ok"}
    test_root.py    GET / -> built SPA shell is served
    test_auth.py    login / logout / session behavior
    test_board.py   board read/write, persistence, auth, validation (temp DB per test)
    test_ai.py      AI client/key handling (mocked) + gated live "2+2" connectivity test
```

## Routes (current)

- `GET /api/health` -> `{"status": "ok"}`
- `POST /api/login` -> `{authenticated: true}` for `user`/`password`, else 401; sets the session cookie
- `POST /api/logout` -> clears the session
- `GET /api/session` -> `{authenticated: bool}`
- `GET /api/board` -> the signed-in user's board as `BoardData` (401 if unauthenticated)
- `PUT /api/board` -> validate `BoardData` and persist it (401 if unauthenticated, 422 if malformed)
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
