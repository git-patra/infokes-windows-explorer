# Feature Guide

What's built, what you can try, and what's intentionally out of scope.

---

## What's Running

| Service | URL | Notes |
|---------|-----|-------|
| Web UI | http://localhost:5173 | Vue 3 SPA |
| API | http://localhost:3000 | Elysia + Bun |
| API Docs | http://localhost:3000/api/v1/swagger | Scalar/OpenAPI |
| Production stack | http://localhost:8080 | `make prod` only |

---

## Features You Can Try

### Left Panel — Folder Tree

- **Click any folder** to select it. The right panel immediately shows its direct subfolders.
- **Expand/collapse** folders using the caret (▶) next to any folder that has children.
- Expanded state is persisted in `sessionStorage` — refreshing keeps your open folders.
- Selected folder is persisted in the URL (`?folderId=1`) — you can share/bookmark the URL.

### Right Panel — Subfolder List + Files

- Click a folder in the tree → right panel shows its direct children as cards.
- Below the folder cards, a **file list** shows files inside the selected folder (name, size, MIME type).
- Click any subfolder card in the right panel to navigate into it (selection updates, tree highlights).

### Breadcrumb

- Shows the full path from root to the selected folder: `Root / Downloads / Software / macOS`.
- Click any ancestor segment to jump directly to that folder.
- Click **Root** to clear the selection and return to the top level.

### Search

- Type in the search bar (top of the page) to search folders and files by name.
- Search activates after **2 characters** with a 300ms debounce.
- Results show folder and file matches with their full path.
- Click a result to navigate to that folder (files navigate to their parent folder).

### API Endpoints

All endpoints are read-only (`GET` only).

| Endpoint | What it returns |
|----------|----------------|
| `GET /api/v1/folders/tree` | Full folder tree (eager) or depth-limited (lazy for >10k folders) |
| `GET /api/v1/folders/tree?depth=2` | Top 2 levels only, with `hasChildren` flags for lazy expansion |
| `GET /api/v1/folders/:id` | Folder metadata + breadcrumb path |
| `GET /api/v1/folders/:id/children` | Direct child folders, cursor-paginated |
| `GET /api/v1/folders/:id/files` | Files inside a folder, cursor-paginated |
| `GET /api/v1/search?q=text` | Search folders + files by name (trigram, case-insensitive) |

Pagination uses cursor-based pagination: `?cursor=<last_id>&limit=<n>`.

---

## Seed Data (Demo Dataset)

The database is seeded with **105 folders** and **357 files** across 5 root folders:

```
Documents/
  Work/, Projects/, Reports/, Invoices/
Downloads/
  Software/, Installers/, Drivers/, Updates/
Music/
  Rock/, Classic Rock/, Alternative/, Indie/
Pictures/
  Photos/, 2022/, 2023/
Videos/
  Movies/, Action/, Drama/
```

Files are realistic: `.pdf`, `.docx`, `.mp3`, `.jpg`, `.mp4`, `.zip` with varied sizes.

---

## What's NOT Available (Intentionally Out of Scope)

These features were deliberately excluded to keep the take-home focused. Each has a "why" below.

| Feature | Why not built |
|---------|--------------|
| **Create / rename / delete folders** | The brief asks for a *browser*, not a file manager. CRUD adds significant scope (validation, conflict handling, cascade deletes) without demonstrating the core challenge of tree rendering and hierarchical queries. |
| **Upload / download files** | File storage (S3, local disk) is an infrastructure concern orthogonal to the tree problem. Adding it would triple the scope without revealing anything about data structure design. |
| **Move folders (drag-and-drop)** | Moving a subtree requires rewriting the `path` column for all descendants — a non-trivial write operation. Mentioning it in architecture docs is more valuable than half-implementing it. |
| **Authentication / user accounts** | No multi-tenancy is needed for a local demo. Adding auth (JWT, sessions) would add boilerplate that obscures the interesting parts. |
| **Real-time updates (WebSocket)** | The tree doesn't change during a demo session. Real-time would add complexity (pub/sub, connection management) without visible benefit to a reviewer. |
| **Soft delete / recycle bin** | Requires schema changes (deleted_at column, filtered queries everywhere). Out of scope for a read-focused demo. |
| **Multi-select / bulk operations** | Depends on CRUD being available first. |
| **Permissions / ACL** | No users → no permissions needed. |
| **Infinite scroll / virtual list** | The dataset is 105 folders — well within the eager load threshold (10k). Virtual scrolling is implemented in the architecture notes as the "next step" if the dataset grows. |
| **Redis cache** | Caching would improve latency at scale but adds operational complexity (another service). The ltree + GIN indexes are fast enough for the demo dataset. Architecture doc calls it out as the next step. |

---

## Known Limitations

- **Port 5433** is used for Postgres (not the default 5432) because the development machine has an SSH tunnel on 5432. If you don't have this conflict, you can change `5433:5432` back to `5432:5432` in `docker-compose.yml` and update `apps/api/.env`.
- **Seed required** — `make dev` runs migrations but not seed. Run `make seed` once after first `make dev` to populate demo data.
- **E2E tests** require the dev stack to already be running: `make dev` in one terminal, then `make test-e2e` in another.
