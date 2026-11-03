# Notes

Personal Notion-style notes + todos. Next.js 16 · MongoDB (local) · BlockNote editor.

## Run

```bash
# MongoDB must be running locally (brew services start mongodb-community)
npm install
npm run dev        # http://localhost:3737
```

Connection string lives in `.env.local` (`MONGODB_URI=mongodb://127.0.0.1:27017/notes`).

## Features

- **Pages** — block editor (slash menu, drag handles, tables, code, checklists, images), nested pages, emoji icons, gradient/image covers, favorites, breadcrumbs, autosave.
- **Sidebar** — page tree with drag & drop (drop on a page to nest, on its top/bottom edge to reorder, on "Pages" to move to top level), duplicate, trash.
- **Todos** — Today / Upcoming / All / Completed views, quick-add parsing (`pay rent tomorrow !1`, `fri`, `next week`), priorities, due dates, notes, undo delete.
- **Search** — ⌘K searches page titles, page content and todos; also creates pages/todos.
- **Trash** — restore or permanently delete (sub-pages go with their parent).
- **Uploads** — images/files stored in MongoDB (max 12MB each).
- Light/dark/system theme.

## Shortcuts

| Key | Action |
| --- | --- |
| ⌘K | Search / command palette |
| ⌘\ | Toggle sidebar |
| ⌘⌥N | New page |
| N | Focus quick-add (Todos page) |
| ⌘S | Force save |
| / | Block menu in the editor |

## Layout

- `src/app/api/*` — REST route handlers (pages, todos, search, files)
- `src/lib/models.ts` — Mongoose models
- `src/lib/client.ts` — SWR hooks + optimistic mutations
- `src/components/*` — UI (sidebar, page view/editor, todos, command menu)
