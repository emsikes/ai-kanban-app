# Frontend

A single-board Kanban app built with Next.js (App Router), statically exported and served by the FastAPI backend at `/`. Access is gated by a fake login (`AuthGate` checks `/api/session`). The board loads from `GET /api/board` and persists every change via a debounced `PUT /api/board`. An AI chat sidebar (`ChatSidebar`) posts to `/api/chat`; when the AI returns a board update, `Workspace` bumps a refresh signal so `KanbanBoard` refetches and the UI updates without a reload.

The build is produced by `scripts/build-frontend.sh` (runs `npm run build`, copies `out/` into `backend/static/`). In Docker the equivalent happens in the Dockerfile's Node build stage. `backend/static/` is generated output, not source.

## Stack

- Next.js 16 (App Router) + React 19, TypeScript (strict)
- Tailwind CSS v4 (via `@tailwindcss/postcss`, imported in `globals.css`)
- `@dnd-kit/core` + `@dnd-kit/sortable` for drag and drop
- `clsx` for conditional class names
- Vitest + Testing Library (unit/integration), Playwright (e2e)

## Layout

```
frontend/
  src/
    app/
      layout.tsx        Root layout; loads Space Grotesk (display) + Manrope (body) fonts
      page.tsx          Home route; renders <AuthGate />
      globals.css       Tailwind import + CSS variables for the color scheme
    components/
      AuthGate.tsx          Client component; checks /api/session, shows login vs Workspace
      LoginForm.tsx         Username/password form (calls back to AuthGate)
      Workspace.tsx         Authed layout: board + chat sidebar + logout; owns the board refresh signal
      ChatSidebar.tsx       AI chat panel; POSTs /api/chat with history; triggers board refresh on board updates
      KanbanBoard.tsx       Client component; loads board from API (reloads on refreshSignal), owns state + DnD, persists (debounced PUT)
      KanbanColumn.tsx      A droppable column with editable title and a SortableContext
      KanbanCard.tsx        A sortable/draggable card with a Remove button
      KanbanCardPreview.tsx Static card used inside the DragOverlay
      NewCardForm.tsx       Collapsible "add a card" form (title + details)
      KanbanBoard.test.tsx  Component/integration tests for the board
    lib/
      kanban.ts         Data model + pure helpers (initialData, moveCard, createId)
      kanban.test.ts    Unit tests for moveCard
    test/
      setup.ts          Imports @testing-library/jest-dom
      vitest.d.ts       Vitest type augmentation
  tests/
    kanban.spec.ts      Playwright e2e
  next.config.ts        Static export: output "export", images unoptimized
  vitest.config.ts      jsdom env, globals on, "@" -> src alias, coverage scoped to src/** with 80% thresholds
  playwright.config.ts  testDir ./tests, baseURL http://127.0.0.1:8000, webServer runs backend uvicorn
```

## Data model (`src/lib/kanban.ts`)

```ts
type Card = { id: string; title: string; details: string };
type Column = { id: string; title: string; cardIds: string[] };
type BoardData = { columns: Column[]; cards: Record<string, Card> };
```

- `initialData` seeds five columns (Backlog, Discovery, In Progress, Review, Done) and eight cards. This is the shape the backend must store and the AI must read/return.
- `moveCard(columns, activeId, overId)` is a pure reducer covering reorder-within-column, move-across-columns, and drop-on-empty-column. Card lookups are by id; `cardIds` arrays hold ordering.
- `createId(prefix)` returns `"${prefix}-${random}${time}"` using `Math.random()` + `Date.now()`.

## State

`KanbanBoard` is the only stateful component. It holds `board: BoardData` in `useState(() => initialData)` and exposes handlers passed down as props:

- `handleDragStart` / `handleDragEnd` — track active card, apply `moveCard` on drop
- `handleRenameColumn(columnId, title)`
- `handleAddCard(columnId, title, details)` — empty details default to `"No details yet."`
- `handleDeleteCard(columnId, cardId)`

All mutations are immutable `setBoard` updates routed through `applyChange`, which also schedules a debounced `PUT /api/board`. The board is loaded from `GET /api/board` on mount (with `loading`/`error` states); `initialData` is now only the demo seed (mirrored by the backend) and is used in tests as the mock API response. Refreshing reloads the persisted board.

## Styling

Colors are CSS variables in `globals.css`, matching the project color scheme: `--accent-yellow #ecad0a`, `--primary-blue #209dd7`, `--secondary-purple #753991`, `--navy-dark #032147`, `--gray-text #888888`, plus surface/stroke/shadow tokens. Use these variables rather than hardcoding hex values.

## Test hooks

- Columns render `data-testid="column-<columnId>"`
- Cards render `data-testid="card-<cardId>"`
- Column title input has `aria-label="Column title"`
- Delete button has `aria-label="Delete <card title>"`

## Commands

```
npm run dev          # next dev
npm run build        # next build
npm run lint         # eslint
npm run test:unit    # vitest run (unit + component/integration)
npm run test:e2e     # playwright test
npm run test:all     # unit then e2e
```
