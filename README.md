# Windows Explorer

A Windows-Explorer-style two-pane file browser built as a take-home assessment.

**Stack:** Bun · Elysia · PostgreSQL · Vue 3 · TypeScript · Drizzle ORM

## Quick Start

```bash
# 1. Install dependencies
make install

# 2. Start the full dev stack (DB + API + Web)
make dev
```

Open http://localhost:5173 in your browser.

API available at http://localhost:3000
OpenAPI docs at http://localhost:3000/api/v1/swagger

## Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start everything (DB + API + Web) |
| `make up` | Start Postgres via Docker |
| `make down` | Stop Docker services |
| `make seed` | Seed demo data |
| `make test` | Run all tests |
| `make test-int` | Run integration tests (requires DB) |
| `make test-e2e` | Run E2E tests |
| `make lint` | Lint & format check |
| `make build` | Production build |
| `make clean` | Clean everything |

## Architecture

See [docs/architecture.md](docs/architecture.md) for detailed design decisions.

### Key Design Choices

- **Monorepo** (Bun workspaces): `apps/api`, `apps/web`, `packages/contracts`
- **Clean architecture** on the backend: domain → application → infrastructure → presentation
- **Adjacency list + `ltree`** for the folder tree in Postgres
- **Lazy-loading** for large trees (>10k nodes), eager mode for small datasets
- **Recursive Vue component** (`FolderNode.vue`) — built from scratch, no library
- **Shared DTO types** via `@windows-explorer/contracts`

## Environment Variables

Create `.env` in `apps/api/`:

```env
DATABASE_URL=postgres://explorer:explorer@localhost:5432/explorer
PORT=3000
```

## Scalability Notes

See [docs/architecture.md#7-scalability-strategy](docs/architecture.md) for the full strategy including lazy loading, `ltree` indexes, cursor-based pagination, and what would be added next (Redis cache, connection pooling, multiple Bun processes).
