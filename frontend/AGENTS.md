# Frontend

A single-board Kanban app built with Next.js (App Router), statically exported and served by the FastAPI backend at `/`. Access is gated by a fake login (`AuthGate` checks `/api/session`); the board still holds its state in memory once shown. Later plan parts add backend persistence and an AI chat sidebar.

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
      AuthGate.tsx          Client component; checks /api/session, shows login vs board + logout
      LoginForm.tsx         Username/password form (calls back to AuthGate)
      KanbanBoard.tsx       Client component; owns all board state and DnD context
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

All mutations are immutable `setBoard` updates. There is no save/load — refreshing the page resets to `initialData`.

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
