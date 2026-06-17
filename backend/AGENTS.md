# Backend

FastAPI backend for the Project Management MVP. Serves the JSON API under `/api` and the statically built frontend at `/`. Managed by `uv`.

## Layout

```
backend/
  pyproject.toml    uv project: deps + dev deps + pytest/coverage config
  uv.lock           Locked dependency versions
  app/
    main.py         FastAPI app: /api/health, static mount at /
  static/           Served at /; placeholder index.html for now (real frontend build copied here in Part 3)
  tests/
    test_health.py  GET /api/health -> {"status": "ok"}
    test_root.py    GET / -> placeholder HTML
```

## Routes (current)

- `GET /api/health` -> `{"status": "ok"}`
- `GET /` (and other paths) -> static files from `static/` (`html=True`, serves `index.html`)

`/api/*` routes are registered before the static mount so the API takes precedence.

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
- Tests use FastAPI `TestClient`.
- `OPENAI_API_KEY` is read from the project-root `.env` (used from Part 8 on); never hardcode or log it.
