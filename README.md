# Kanban Studio

A local, Dockerized project-management app: a multi-project Kanban board with drag-and-drop, inline editing, and an AI assistant that can read and edit your board through chat.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.13x-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-gpt--5.4--mini-412991?logo=openai&logoColor=white)](https://platform.openai.com/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/tests-pytest%20%7C%20Vitest%20%7C%20Playwright-brightgreen)](#testing)
[![Coverage](https://img.shields.io/badge/coverage-%E2%89%A580%25%20enforced-success)](#testing)

## Overview

Kanban Studio is a single-container web app. A FastAPI backend serves a statically exported Next.js frontend at `/` and a JSON API under `/api`. Each user's projects are stored in a local SQLite database, and the AI assistant talks to the OpenAI API using Structured Outputs so its board edits are validated before they persist.

This is an MVP: authentication is a single hardcoded credential pair, it runs locally, and it is designed to be simple rather than feature-exhaustive.

## Features

- Fake sign-in gate (hardcoded `user` / `password`) with sessions and logout.
- Multiple projects per user: create, rename, delete, reorder, and switch from a top bar.
- Kanban board with five fixed (renameable) columns: drag-and-drop cards, add and remove cards, and edit card titles and details inline.
- AI chat sidebar (scoped per project) that can create, edit, and move cards. When the assistant changes the board, the UI refreshes automatically.
- Durable storage in SQLite; the database is created and seeded on first run.

## Architecture

```
Browser
  |
  v
FastAPI (port 8000)
  |-- /                      static Next.js build (SPA)
  |-- /api/login,/logout,/session     session auth
  |-- /api/projects/...               project CRUD + reorder
  |-- /api/projects/{id}/board        read / write a project's board
  |-- /api/projects/{id}/chat         AI chat (OpenAI Structured Outputs)
  |
  v
SQLite (data/kanban.db)        OpenAI API (gpt-5.4-mini)
```

The frontend is built to static files and copied into the backend image, so production runs as one process with no Node runtime.

## Tech stack

| Area     | Choices                                                        |
| -------- | ------------------------------------------------------------- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, dnd-kit     |
| Backend  | FastAPI, Uvicorn, Pydantic, SQLite (stdlib `sqlite3`)         |
| AI       | OpenAI API (`gpt-5.4-mini`) via the Responses API             |
| Tooling  | uv (Python), npm (Node), Docker                              |
| Tests    | pytest + coverage, Vitest + Testing Library, Playwright       |

## Getting started

### Prerequisites

- Docker
- An OpenAI API key for the AI features (optional for everything else)
- For local development without Docker: Node 20+ and [uv](https://docs.astral.sh/uv/)

### Run with Docker (recommended)

```bash
# Optional: enable the AI assistant (forwarded into the container)
export OPENAI_API_KEY=sk-...

./scripts/start.sh           # build the image and run on http://localhost:8000
./scripts/stop.sh            # stop and remove the container
```

If port 8000 is taken, choose another host port:

```bash
PORT=8080 ./scripts/start.sh   # http://localhost:8080
```

On Windows, use `scripts/start.ps1` and `scripts/stop.ps1`.

Open the app, sign in with `user` / `password`, and you are on your first board.

### Run locally for development

The app is served by the backend, so build the frontend into the backend's static directory first, then start the API:

```bash
./scripts/build-frontend.sh                         # build the SPA into backend/static
cd backend && uv run uvicorn app.main:app --port 8000
```

Then open http://localhost:8000.

Note: `npm run dev` (Next dev server on port 3000) serves only the UI with no backend, so API calls will fail. Always run the integrated app on port 8000.

## Configuration

| Variable          | Default                 | Purpose                                              |
| ----------------- | ----------------------- | ---------------------------------------------------- |
| `OPENAI_API_KEY`  | (none)                  | Enables the AI assistant. Read from the environment. |
| `DATABASE_PATH`   | `backend/data/kanban.db`| SQLite file location; created if absent.             |
| `SESSION_SECRET`  | dev default             | Signs the session cookie. Set a real value to use.   |

The start scripts forward `OPENAI_API_KEY` from your shell into the container. Without a key, the app runs normally but chat requests return an error.

## Usage

- Sign in with `user` / `password`.
- Use the top bar to switch projects, or create, rename, reorder, and delete them. New projects start empty.
- On the board: drag cards between columns, click "Add a card", click a card's title or details to edit it inline, and rename columns by editing their titles.
- Open the assistant on the right and ask it to make changes, for example "Add a card to Backlog for the launch checklist" or "Move the QA card to Done". The board updates on its own when the assistant edits it.

## Testing

```bash
# Backend unit + integration (pytest, coverage gate enforced)
cd backend && uv run pytest

# Frontend unit + component (Vitest)
cd frontend && npm run test:unit

# End-to-end (Playwright). Build the SPA first so the backend serves it.
./scripts/build-frontend.sh
cd frontend && npm run test:e2e
```

Coverage minimums of 80% are enforced on both the backend (`pytest-cov`) and the frontend (Vitest thresholds). Some live AI tests are skipped automatically when `OPENAI_API_KEY` is not set.

## Project structure

```
.
|-- backend/        FastAPI app, SQLite layer, OpenAI integration, tests
|-- frontend/       Next.js app (board, chat, project bar), unit + e2e tests
|-- scripts/        start/stop (Mac/Linux/Windows) and build-frontend helpers
|-- docs/           PLAN.md, DATABASE.md, and design specs
|-- Dockerfile      Multi-stage: build the frontend, assemble the backend
```

See `backend/AGENTS.md` and `frontend/AGENTS.md` for component-level details, `docs/PLAN.md` for the build history, and `docs/DATABASE.md` for the data model.

## Limitations

This MVP intentionally keeps scope small:

- A single hardcoded credential pair; the schema supports multiple users but only one is seeded.
- Runs locally in one container; not hardened for production.
- The AI assistant requires a valid OpenAI API key.

## License

No license is currently specified for this project.
