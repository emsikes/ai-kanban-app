# Design: Inline Card Editing + Multiple Projects

Status: approved (2026-06-20). Enhancements to the existing Project Management MVP.

## Scope

Two features, implemented in order:

- **A. Inline card editing** - edit a card's title and details in place. Small, self-contained.
- **B. Projects** - multiple boards per user, switched from a top bar, with create / rename / delete / reorder.

## A. Inline card editing

- `KanbanCard` renders the title and details as click-to-edit text. Clicking the title turns it into a single-line input; clicking the details turns it into a textarea.
- **Enter or blur saves; Escape cancels.** Empty title is rejected (revert to previous value).
- A new handler `onEditCard(cardId, { title, details })` in `KanbanBoard` updates `board.cards[cardId]` immutably and persists via the existing debounced `PUT`.
- Drag-and-drop is unaffected: the editable text is a distinct click target and editing does not start a drag. The card remains draggable by its non-text area.

## B. Projects

### Data model

A project is a board with a name and an ordering. Replace the single-board `boards` table with a `projects` table:

```sql
CREATE TABLE IF NOT EXISTS projects (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    name       TEXT NOT NULL,
    position   INTEGER NOT NULL,
    data       TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

- `data` is unchanged: the same `{columns, cards}` `BoardData` JSON.
- `position` orders projects in the nav (0-based).
- The old `UNIQUE(user_id)` constraint is gone; a user may have many projects.

### Migration and seeding (on startup)

- If a legacy `boards` table exists, move each row into `projects` as a project named **"My Board"**, `position = 0`, preserving its `data`. Then the `boards` table is no longer used.
- New installs (no projects for the seeded user) get one project **"My Board"** with the demo board (the current `DEFAULT_BOARD`).
- **New projects** created by the user start with the 5 default columns (Backlog, Discovery, In Progress, Review, Done) and **no cards**.

### Backend API

All routes are auth-gated and verify the project belongs to the signed-in user.

- `GET /api/projects` -> `[{id, name, position}]` (ordered by position)
- `POST /api/projects {name}` -> `{id, name, position}` (creates a default empty board)
- `PATCH /api/projects/{id} {name}` -> renamed project
- `DELETE /api/projects/{id}` -> 204; **400 if it is the user's last project** (cannot delete the last one)
- `POST /api/projects/reorder {ids: [...]}` -> persists the new order (positions reassigned from the list order)
- `GET /api/projects/{id}/board` -> `BoardData`
- `PUT /api/projects/{id}/board {board}` -> validated `BoardData`, persisted
- `POST /api/projects/{id}/chat {message, history}` -> `{reply, board?}`, scoped to that project's board

The previous `/api/board` and `/api/chat` routes are replaced by these project-scoped versions. `404` is returned for an unknown or non-owned project id.

### Frontend

- A **top bar** above the board contains: the current project name as a **dropdown switcher**, a **"+ New"** button, and the **Log out** button (moved here from its floating position).
- The switcher dropdown lists all projects (click to switch), with **inline rename**, **delete** (with a confirm step), and **drag-to-reorder** (reusing dnd-kit, consistent with the board). Reordering persists via `POST /api/projects/reorder`.
- **Active project** id is tracked in React state and remembered across reloads in `localStorage`; if absent or invalid, it falls back to the first project.
- `KanbanBoard` loads and saves the active project's board (`/api/projects/{id}/board`). Switching the active project reloads the board for that project.
- **Chat is per-project:** `ChatSidebar` posts to `/api/projects/{id}/chat` and its conversation **resets when the active project changes** (the board context differs).
- Creating a project switches to it; deleting the active project switches to the first remaining project.

### Component structure

- `ProjectBar` (new) - top bar: switcher dropdown, new/rename/delete/reorder, logout. Owns the project list and active-project state; exposes the active project id and a board-refresh signal to its children.
- `Workspace` - composes `ProjectBar` + `KanbanBoard` + `ChatSidebar`, passing the active project id down. Keeps the fixed chat-panel layout.
- `KanbanCard` - gains inline editing.
- `KanbanBoard` - gains `onEditCard`; takes the active project id (for the API path) and reloads when it changes.
- `ChatSidebar` - takes the active project id; resets conversation when it changes.

## Testing

- **Backend:** project CRUD, reorder, ownership and last-project guards, board + chat scoped to a project, and a migration test (legacy `boards` row becomes the first project). Coverage stays >= 80%.
- **Frontend unit:** card inline edit (save, cancel, empty-title revert); `ProjectBar` switch / create / rename / delete / reorder; chat reset on project switch.
- **e2e:** edit a card's text and reload (persists); create a project, switch to it, add a card, switch back (isolation between projects); rename and delete a project.
- `docs/DATABASE.md` updated for the `projects` table, migration, and route changes.

## Defaults (confirmed)

- Legacy board migrates to a project named "My Board".
- New projects start empty (5 default columns, no cards).
- The last remaining project cannot be deleted.
- Chat conversation resets when switching projects.
- Active project remembered in `localStorage`, falling back to the first project.
