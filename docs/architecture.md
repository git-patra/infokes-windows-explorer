# Windows Explorer — Architectural Plan & Execution Strategy

> Take-home assessment: a Windows-Explorer-style two-pane file browser.
> Stack: **Bun + Elysia + TypeScript** on the backend, **Vue 3 (Composition API)** on the frontend, **PostgreSQL** as the store.
> This is a planning document. **No code has been written yet** — read this first, then we execute.

---

## Context

The repository is currently a near-empty Bun/TS scaffold (`src/index.ts` just logs a greeting, `package.json` has only a `tsc` build script). We are designing a green-field solution against the requirements in `17122024 - Web Developer's take home test.docx`. The user is backend-strong (Go background), familiar with clean architecture and REST, but new to Vue 3 — so the plan calls out Vue-specific patterns from a React mental model and explains the Elysia/Bun ecosystem briefly.

The goal of this document is to think like a senior engineer building a **production-shaped** system, while keeping the actual deliverable **realistic for a take-home** (≈ 2–3 evenings of work). Every decision is annotated with **WHY**.

---

## 1. Requirement Analysis

### 1.1 The literal brief
- Two-panel UI:
  - **Left panel** → the entire folder structure as a tree.
  - **Right panel** → direct sub-folders of whatever is selected on the left.
- On initial load, the FE fetches data from the BE and renders the tree; right panel is empty until a click happens.
- A folder can have **unlimited subfolders, unlimited depth**.
- Data lives in PostgreSQL / MySQL / MariaDB.
- TypeScript backend (Elysia preferred), Vue 3 Composition API frontend.
- **No third-party tree component** — must build it from scratch.
- Assessed on: code clarity, data structure, algorithm, best practices.

### 1.2 The actual problem being solved
Underneath the "two-panel UI" framing, this test evaluates four things at once:
1. **Hierarchical data modelling** — can you represent and query an arbitrarily deep tree in a relational DB?
2. **Tree-rendering algorithm** — can you build a recursive component without using a library?
3. **Layered architecture discipline** — does the codebase show clean separation (domain / application / infrastructure / presentation)?
4. **Scalability awareness** — can your design survive at millions of rows without rewriting everything?

The brief says "displays the complete folder structure" — taken naively that means **send every row to the browser**. That is the trap. A senior answer **acknowledges the literal reading, then proposes a lazy-loaded variant** and lets the reviewer see the tradeoff explicitly.

### 1.3 Hidden complexities to call out
- **"Unlimited depth"** rules out anything that hard-codes JOINs per level. You need recursive CTEs, a closure table, or a path column.
- **"Build the tree from scratch"** — most candidates will reach for `<tree-view>` libraries. The recursive-self-rendering Vue component is the centrepiece.
- **Path / breadcrumb queries** are deceptively expensive in an adjacency-list-only model (one query per ancestor → O(depth) round-trips).
- **Selection state across lazy-loaded subtrees** — clicking a node that hasn't been expanded yet must work.
- **Reactive performance** — Vue's deep reactivity will choke on a 100k-node tree if you naively wrap it in `ref()`. Use `shallowRef` / `markRaw` / `v-memo`.
- **Search** (bonus) crosses subtrees; it can't rely on the same tree traversal — needs a separate index.
- **Cycles** — folder graphs should be acyclic. Validate on insert; never trust the data on render (defensive `visited` set).

---

## 2. System Design

### 2.1 High-level shape

```
┌─────────────────────────┐     HTTPS/JSON      ┌─────────────────────────┐
│  Vue 3 SPA (apps/web)   │  ◀──────────────▶   │  Elysia API (apps/api)  │
│  - explorer page        │                     │  - presentation         │
│  - tree component       │                     │  - application (use     │
│  - composables          │                     │    cases)               │
│  - api client           │                     │  - domain               │
└─────────────────────────┘                     │  - infrastructure       │
                                                │    (Postgres repo)      │
                                                └────────────┬────────────┘
                                                             │ SQL
                                                             ▼
                                                ┌─────────────────────────┐
                                                │  PostgreSQL              │
                                                │  folders, files          │
                                                │  (+ optional ltree /     │
                                                │   closure table)         │
                                                └─────────────────────────┘
```

### 2.2 Backend — Clean / Hexagonal layout

Coming from Go, you'll recognise this as the standard `cmd/`-`internal/{domain,application,adapter}` shape. Mapped to TS:

| Layer | Responsibility | Depends on |
|------|----------------|------------|
| **Domain** | Entities (`Folder`, `File`), value objects (`FolderId`, `Path`), repository **interfaces**, domain errors | nothing |
| **Application** | Use cases: `GetFolderRoots`, `GetFolderChildren`, `GetFolderTree`, `SearchFolders`, `ListFolderFiles` | Domain only |
| **Infrastructure** | `PostgresFolderRepository` (implements the domain interface), DB pool, migrations, query builders | Domain (interfaces) |
| **Presentation** | Elysia routes, request/response DTOs, validation schemas (`t.Object(...)`), HTTP error mapping | Application |

Dependency direction is **inward only**. This is the same Ports-&-Adapters principle you already use in Go; the only difference is that TS interfaces replace Go interfaces, and we wire them up explicitly at the composition root (`apps/api/src/main.ts`) rather than via a DI container — keeping it lightweight and explicit (the take-home reviewer will appreciate this over inversify/tsyringe).

### 2.3 Why this split for a take-home
Full hexagonal can be ceremonial. A pragmatic version:
- **Domain** stays pure — easy to unit test with no mocks.
- **Application** = thin orchestrators (often one method).
- **Infrastructure** holds the only SQL in the codebase.
- **Presentation** is dumb — parse, call use case, serialise.

This keeps the structure visible without adding 17 files for a 5-row table.

---

## 3. Database Design

### 3.1 Choosing the tree representation

There are four canonical options. The relevant trade-offs:

| Model | Read child | Read subtree | Read ancestors | Insert | Move subtree | Disk |
|-------|-----------|-------------|----------------|--------|--------------|------|
| Adjacency list (`parent_id`) | O(1) | recursive CTE | O(depth) queries | O(1) | O(1) | small |
| Materialized path (`/1/4/7/`) | LIKE prefix | LIKE prefix (fast w/ index) | O(1) parse | O(1) | update prefixes | small |
| `ltree` (PG-only) | label query | `<@` operator (GIST index) | `@>` operator | O(1) | rewrite labels | small |
| Closure table | join | join | join | N inserts (depth) | rewrite | O(N·depth) |
| Nested sets | range | range | range | rewrite half the tree | bad | small |

**Recommendation: Adjacency list as the source of truth, plus a denormalized `path` (or `ltree`) column for fast subtree / ancestor queries.**

**Why:**
- `parent_id` is the cleanest, most familiar, smallest schema — and what most code will operate on.
- Recursive CTEs in Postgres are fast enough for thousands of rows but degrade beyond that.
- Adding a `path` column (e.g. `ltree`) gives O(log n) subtree and ancestor queries via GIST index, with no schema gymnastics.
- This composes well: writes update `parent_id`; a trigger or app-layer hook keeps `path` consistent.
- Closure tables are technically the most flexible at scale, but the storage and write amplification cost is rarely worth it for a take-home. We **call it out** as the next step if scale grows.

### 3.2 Schema

```sql
-- folders
CREATE TABLE folders (
    id           BIGSERIAL PRIMARY KEY,
    parent_id    BIGINT REFERENCES folders(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    path         LTREE NOT NULL,           -- e.g. '1.4.7'
    depth        INT  NOT NULL,            -- denormalized, == nlevel(path) - 1
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT folders_name_unique_per_parent UNIQUE (parent_id, name)
);

CREATE INDEX folders_parent_id_idx ON folders (parent_id);
CREATE INDEX folders_path_gist_idx  ON folders USING GIST (path);
CREATE INDEX folders_name_trgm_idx  ON folders USING GIN  (name gin_trgm_ops);  -- search

-- files (bonus)
CREATE TABLE files (
    id           BIGSERIAL PRIMARY KEY,
    folder_id    BIGINT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    size_bytes   BIGINT NOT NULL DEFAULT 0,
    mime_type    TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT files_name_unique_per_folder UNIQUE (folder_id, name)
);
CREATE INDEX files_folder_id_idx ON files (folder_id);
CREATE INDEX files_name_trgm_idx ON files USING GIN (name gin_trgm_ops);
```

**Why each column / index:**
- `parent_id` nullable → root folders have `NULL`.
- `path LTREE` → enables `path <@ '1.4'` ("everything under folder 1.4") with index hit.
- `depth` denormalized → lets the FE limit eager loads (`WHERE depth <= 2`) without recomputing.
- `UNIQUE (parent_id, name)` → mirrors filesystem semantics; prevents duplicates.
- `pg_trgm` GIN index → fuzzy name search for the bonus "search" feature.
- `ON DELETE CASCADE` → deleting a folder removes its descendants.

### 3.3 Seed strategy
- A small script that inserts a **realistic but bounded** demo dataset (~100 folders, depth 5, some files) for reviewers running the project locally.
- A second optional script to bulk-insert **1M synthetic folders** for the scalability demo (only if time permits) — used to prove lazy-loading works and naive eager-loading would die.

---

## 4. API Design

### 4.1 Versioning & conventions
- Prefix all routes with `/api/v1`.
- Plural nouns, kebab-case nowhere — just lowercased resource names.
- Pagination via `?cursor=<id>&limit=<n>` (cursor-based, not offset — handles millions correctly).
- Error envelope: `{ "error": { "code": "FOLDER_NOT_FOUND", "message": "...", "details": {...} } }` with appropriate HTTP status.
- All responses have a stable JSON shape — never inline raw DB rows.

### 4.2 Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/folders` | List root folders (with `?cursor`, `?limit`). Default page size 200. |
| `GET` | `/api/v1/folders/:id` | Folder metadata (name, parent, breadcrumb). |
| `GET` | `/api/v1/folders/:id/children` | **Right-panel feed** — direct child folders, paginated. |
| `GET` | `/api/v1/folders/:id/files` | (Bonus) files inside the folder, paginated. |
| `GET` | `/api/v1/folders/:id/subtree?depth=N` | Bounded recursive subtree, used for left-panel eager mode. |
| `GET` | `/api/v1/folders/tree?depth=2` | Initial left-panel payload — top N levels only. |
| `GET` | `/api/v1/search?q=...&limit=50` | (Bonus) trigram search across folders/files. |

### 4.3 Two operating modes for the left panel
The brief says "display the complete folder structure", but at millions of rows that's impossible. I'll support **both**:
- **Eager mode**: `GET /api/v1/folders/tree` returns the full tree as a nested JSON. Used by default for small datasets — matches the literal spec.
- **Lazy mode**: `GET /api/v1/folders/tree?depth=2` returns only top two levels with a `hasChildren` flag; subsequent levels fetched via `/folders/:id/children` on expand. Used automatically when total row count exceeds a threshold (e.g. 10k).

A `Server-Timing` header on `/tree` carries the row count so the FE can decide modes without a separate request.

### 4.4 Response shape (tree endpoint)

```jsonc
{
  "data": {
    "id": null,
    "children": [
      { "id": 1, "name": "Documents", "parentId": null, "hasChildren": true, "childCount": 12, "children": [...] },
      { "id": 2, "name": "Downloads", "parentId": null, "hasChildren": false, "childCount": 0 }
    ]
  },
  "meta": { "totalFolders": 87, "depthLoaded": 5, "mode": "eager" }
}
```

**Why this shape:**
- `hasChildren` and `childCount` let the UI render the disclosure caret without an extra fetch.
- `mode` tells the FE whether to expect lazy loading.
- `meta.totalFolders` is the signal for the "show me everything" reviewer.

### 4.5 Validation
Use Elysia's built-in `t.Object` (TypeBox under the hood) for schema validation. The schema **doubles as the OpenAPI/Swagger source**, which Elysia exposes for free via `@elysiajs/swagger`. Reviewer-friendly bonus.

---

## 5. Frontend Architecture

### 5.1 Stack
- **Vue 3 + `<script setup>` + Composition API** (required).
- **Vite** — Vue's de-facto dev server / bundler. Bun can run Vite directly (`bun run dev`).
- **Pinia** for state management (Vue's official Redux-equivalent; simpler than Redux, more like Zustand).
- **Vue Router** (only if we add a deep-linkable selected folder via `?folderId=`).
- **TanStack Query for Vue** (`@tanstack/vue-query`) — handles caching, request deduping, stale-while-revalidate. This is genuinely worth the dependency because lazy-tree loading lives or dies on cache behaviour.
- **No tree library** (forbidden).
- **TailwindCSS** — fast styling, low ceremony.
- **vue-tsc** for type checking.

### 5.2 Vue mental model for a React developer

| React concept | Vue 3 Composition API equivalent |
|---------------|----------------------------------|
| `useState` | `ref()` / `reactive()` |
| `useEffect` | `watchEffect()` / `watch()` / `onMounted()` |
| `useMemo` | `computed()` |
| `useCallback` | (rarely needed — Vue tracks deps automatically) |
| `useContext` | `provide()` / `inject()` |
| Custom hooks | **Composables** — plain functions starting with `use*` |
| JSX | `<template>` (or JSX/TSX if you opt in) |
| Children prop | `<slot>` |
| Function component | `<script setup>` SFC |
| Re-render on state change | Vue's reactivity is granular — only DOM bound to changed refs updates |

**One gotcha:** Vue's reactivity is **proxy-based and deep by default**. Wrapping a 1M-node tree in `ref()` will recursively make every node reactive — slow and memory-heavy. Use **`shallowRef`** for the tree root; mutate by reassignment (`tree.value = newTree`) rather than in-place. Use **`markRaw()`** on nodes you never mutate.

### 5.3 Composables we'll build

- `useFolderTree()` — fetches root-level tree, exposes `tree`, `isLoading`, `error`, `expandNode(id)`.
- `useFolderChildren(folderId)` — feeds the right panel.
- `useSelection()` — current selected folder, breadcrumb, persisted to URL.
- `useExpandedNodes()` — `Set<number>` of expanded node IDs (persisted to `sessionStorage`).
- `useSearch()` — debounced search composable.

Composables are **just functions**. They are Vue's answer to React custom hooks but without the rules-of-hooks footgun (no call-order requirement — they're closures, not relying on call-site indexing).

### 5.4 Component tree
```
<ExplorerPage>
  <ExplorerToolbar>            // search input, breadcrumb
  <ExplorerLayout>             // split pane
    <LeftPanel>
      <FolderTree>
        <FolderNode />         // recursive — see Section 6
        <FolderNode />
        ...
    <RightPanel>
      <SubfolderList>          // direct children grid/list
      <FileList>               // bonus
```

---

## 6. Recursive Tree Strategy (Vue specifics)

This is the centrepiece of the assessment, so it gets its own section.

### 6.1 How recursive components work in Vue

A Vue component **can render itself by name**. Vue auto-registers the component under the name declared in `defineOptions({ name: 'FolderNode' })` (or the filename via Vite's plugin-vue). So:

```vue
<!-- FolderNode.vue (illustrative — no code written yet) -->
<script setup lang="ts">
defineOptions({ name: 'FolderNode' })
defineProps<{ node: FolderTreeNode }>()
</script>

<template>
  <li>
    <div @click="select(node)">{{ node.name }}</div>
    <ul v-if="isExpanded(node.id) && node.children?.length">
      <FolderNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
      />
    </ul>
  </li>
</template>
```

In React terms: this is exactly `<FolderNode node={child} />` inside `FolderNode.tsx`. Vue just needs `defineOptions({ name })` so the template compiler knows the self-reference.

### 6.2 Three strategies, recommendation

1. **Recursive SFC (above)** — clean, idiomatic, easy to reason about.
2. **Flattened-list virtualization** — keep the tree in a flat array of visible nodes, render with `vue-virtual-scroller` (allowed; it's a virtualizer, not a tree library). Best for very large expanded trees.
3. **Hybrid** — recursive SFC for structure, but each level uses `v-memo` to skip re-renders, and virtualize the root list if root count is huge.

**Recommendation for the take-home: start with (1), add (3) only if I have time to demonstrate it.** A reviewer scoring "clean code" rewards readability over premature virtualization.

### 6.3 Performance defenses

- **Cycle defense**: pass an inherited `Set<number>` of ancestor IDs; refuse to render a child whose ID is in the set. Logs a warning. Cheap and bulletproof.
- **`v-memo`** on the recursive `<li>` keyed on `[node.id, isExpanded, isSelected]` — skips reconciliation when nothing relevant changed.
- **`shallowRef`** for the tree root (Section 5.2).
- **Stable `:key`** — always `node.id`, never index. This is the equivalent of React's `key` prop and same pitfalls.
- **Event delegation**: one click handler on the tree root, read `data-id` from the closest matching ancestor — avoids attaching N handlers.
- **CSS containment**: `contain: layout style` on each node — limits browser re-layout cost.

---

## 7. Scalability Strategy (millions of folders, thousands of concurrent users)

### 7.1 Reads
- **Never** ship the full tree on initial load past ~10k nodes. Switch to lazy mode automatically.
- Index `parent_id`, `path` (GIST), `name` (trigram).
- **HTTP caching**: `Cache-Control: private, max-age=60` on `/folders/:id/children`; ETag on `/folders/tree`.
- **Add a Redis cache** in front of `GetFolderChildren` keyed by `parent_id` — high hit rate because the same folders are expanded by many users. (Mention in the plan; only implement if time allows.)
- **Pagination** at every list endpoint, cursor-based.

### 7.2 Writes
Not in scope of the take-home, but mentioned in the README:
- On insert, populate `path` from parent's `path` (one extra `SELECT`, one `INSERT`).
- On move, update `path` for the moved node and its descendants in a single `UPDATE ... WHERE path <@ ?`.

### 7.3 Backend concurrency
- Bun's HTTP server is already non-blocking and benchmarks ~3× faster than Node's `http` module on simple JSON.
- Use a single `pg.Pool` (via `postgres` or `pg`) sized to `max_connections / instance_count`.
- For thousands of concurrent users, run multiple Bun processes behind a reverse proxy (nginx / Caddy) — Bun supports `reusePort: true` for SO_REUSEPORT load-balancing across processes.

### 7.4 Frontend performance budget
| Metric | Target |
|--------|--------|
| Initial JS payload | < 200 KB gzipped |
| Time to first folder render | < 300 ms on a warm cache |
| Re-render cost when expanding a node with 1k children | < 50 ms |
| Memory ceiling with 100k visible nodes (virtualized) | < 100 MB |

### 7.5 What to defer (and call out in README)
- Distributed cache (Redis): mention, don't build.
- WebSocket for real-time changes: not in scope.
- Multi-tenant / permissions: not in scope.
- Soft delete / versioning: not in scope.
- The plan **names** these so the reviewer sees you considered them.

---

## 8. Testing Strategy

The bonus points list calls out unit / integration / E2E / component tests. Aim for **a representative sample of each**, not full coverage:

| Layer | Tool | Examples |
|------|------|----------|
| Domain unit | `bun test` (or Vitest) | `Folder` invariants, path-builder pure functions |
| Application unit | `bun test` | `GetFolderChildren` with an in-memory fake repository |
| Infrastructure integration | `bun test` + Testcontainers Postgres (or a disposable docker-compose) | `PostgresFolderRepository` end-to-end against a real DB |
| HTTP integration | `bun test` against Elysia's `app.handle(request)` — no need to listen on a port | route validation, error envelopes |
| FE component | Vitest + `@vue/test-utils` | `FolderNode` recursion, expansion, cycle defense |
| E2E | Playwright | "load page → click Documents → see subfolders → search" golden path |

**Why this mix:** It demonstrates competence across the testing pyramid without the test suite outgrowing the production code. For a take-home, **one good example of each type** beats "80% coverage on one layer".

---

## 9. Step-by-Step Execution Plan

Sized to roughly 2–3 evenings. Each phase ends in a runnable, committable state.

### Phase 0 — Repo setup (≈ 30 min)
- Bun workspaces monorepo: `apps/api`, `apps/web`, `packages/contracts`.
- Root `tsconfig.base.json`; per-package `tsconfig.json` extending it.
- ESLint + Prettier shared config.
- `.gitignore`, `.editorconfig`, sensible commit hooks (lefthook or simple-git-hooks).
- README skeleton with "How to run".

### Phase 1 — Database & seed (≈ 1 hr)
- `docker-compose.yml` with Postgres + a `pg_trgm` and `ltree` enabling init script.
- Migration tool: **`drizzle-kit`** (or `node-pg-migrate`).
- Create `folders`, `files`, indexes.
- Seed script: 100-folder demo + optional 1M synthetic generator.

### Phase 2 — Backend domain + application (≈ 1.5 hrs)
- `domain/`: entities, value objects, repository interfaces, errors.
- `application/`: use cases as plain classes/functions.
- Unit tests for use cases with an in-memory fake repo.

### Phase 3 — Backend infrastructure + HTTP (≈ 2 hrs)
- Drizzle schema mirroring the SQL.
- `PostgresFolderRepository` implementing the interface.
- Elysia app: routes, TypeBox schemas, error mapping, swagger plugin.
- Integration test for one endpoint with real DB (testcontainer).

### Phase 4 — Shared contracts (≈ 30 min)
- `packages/contracts`: exported DTO types derived from the Elysia schemas (`typeof app` trick — Elysia's killer feature).
- Web client imports these for free end-to-end types.

### Phase 5 — Frontend skeleton (≈ 1 hr)
- Vite + Vue 3 + Tailwind + TanStack Query setup.
- App shell, layout, routing (optional).
- API client wrapper using `fetch`.

### Phase 6 — Tree component + composables (≈ 2 hrs)
- `useFolderTree`, `useFolderChildren`, `useSelection`, `useExpandedNodes`.
- `FolderNode.vue` recursive component with `v-memo` and cycle defense.
- Component test for `FolderNode`.

### Phase 7 — Right panel + selection (≈ 1 hr)
- `SubfolderList`, click → fetch direct children → render.
- Breadcrumb.

### Phase 8 — Bonus: open/close + files + search (≈ 2 hrs)
- Expand/collapse with caret icons.
- File listing inside `RightPanel`.
- Search bar wired to `/api/v1/search`.

### Phase 9 — Polish & E2E (≈ 1 hr)
- One Playwright golden-path test.
- README: architecture diagram, how to run, design decisions, what was deferred.

**Total**: ~12 hours of focused work. Leave 25–30% buffer.

---

## 10. Recommended Folder Structure

```
windows-explorer/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── domain/
│   │   │   │   ├── folder/
│   │   │   │   │   ├── folder.ts              # entity
│   │   │   │   │   ├── folder-id.ts           # value object
│   │   │   │   │   ├── folder-repository.ts   # interface (port)
│   │   │   │   │   └── errors.ts
│   │   │   │   └── file/
│   │   │   ├── application/
│   │   │   │   ├── get-folder-tree.ts
│   │   │   │   ├── get-folder-children.ts
│   │   │   │   ├── search-folders.ts
│   │   │   │   └── list-folder-files.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── db/
│   │   │   │   │   ├── client.ts              # drizzle client
│   │   │   │   │   ├── schema.ts              # drizzle schema
│   │   │   │   │   └── migrations/
│   │   │   │   └── repositories/
│   │   │   │       └── postgres-folder-repository.ts
│   │   │   ├── presentation/
│   │   │   │   ├── http/
│   │   │   │   │   ├── routes/
│   │   │   │   │   │   ├── folders.ts
│   │   │   │   │   │   ├── files.ts
│   │   │   │   │   │   └── search.ts
│   │   │   │   │   ├── error-handler.ts
│   │   │   │   │   └── schemas.ts             # TypeBox / shared with contracts
│   │   │   │   └── openapi/
│   │   │   ├── composition-root.ts            # wires deps
│   │   │   └── main.ts                        # entry point
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── fixtures/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/
│       ├── src/
│       │   ├── api/
│       │   │   └── client.ts
│       │   ├── components/
│       │   │   ├── explorer/
│       │   │   │   ├── ExplorerPage.vue
│       │   │   │   ├── LeftPanel.vue
│       │   │   │   ├── RightPanel.vue
│       │   │   │   ├── FolderTree.vue
│       │   │   │   ├── FolderNode.vue         # recursive
│       │   │   │   ├── SubfolderList.vue
│       │   │   │   ├── FileList.vue
│       │   │   │   └── Breadcrumb.vue
│       │   │   └── ui/                        # small primitive components
│       │   ├── composables/
│       │   │   ├── useFolderTree.ts
│       │   │   ├── useFolderChildren.ts
│       │   │   ├── useSelection.ts
│       │   │   ├── useExpandedNodes.ts
│       │   │   └── useSearch.ts
│       │   ├── stores/                        # pinia
│       │   ├── pages/
│       │   ├── app.vue
│       │   ├── main.ts
│       │   └── styles.css
│       ├── tests/
│       │   ├── components/
│       │   └── e2e/                           # playwright
│       ├── index.html
│       ├── vite.config.ts
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── contracts/                             # shared DTOs / types
│   │   ├── src/
│   │   │   ├── folder.ts
│   │   │   ├── file.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── tsconfig/
│       └── base.json
├── docs/                                      # this document and friends
├── docker-compose.yml
├── package.json                               # bun workspaces
├── README.md
└── bunfig.toml
```

**Why monorepo:**
- The brief lists "monorepo" as a bonus.
- Shared `contracts` package eliminates DTO drift between FE and BE without any runtime overhead.
- Single `bun install` at the root sets up everything.

---

## 11. Risks & Pitfalls

| # | Risk | Mitigation |
|---|------|------------|
| 1 | Sending full tree blows up memory for "millions" datasets | Lazy mode by default past 10k folders; document tradeoff in README |
| 2 | N+1 queries fetching ancestors / children per node | Use `ltree` subtree query; cache children in TanStack Query on FE |
| 3 | Vue reactivity wrapping a huge tree → slowness | `shallowRef` + `markRaw`; document why |
| 4 | Recursive component infinite loop on cyclic data | Inherited `ancestors: Set<number>`, refuse to render cycles, log warning |
| 5 | Drizzle / ORM "magic" hiding bad queries | Log all SQL in dev mode; check explain plans for `/children` and `/tree` |
| 6 | Bun + native modules (e.g. `pg`) compatibility issues | Use Bun-native `postgres` (porsager/postgres) instead of `pg`; or use Drizzle's neon-http driver |
| 7 | Take-home scope creep — building all bonuses | Strict phase plan; bonuses only after the must-haves are green |
| 8 | Search across millions of rows hits trigram index correctness | Test with a 1M seed; cap result set; prefix-bias the query |
| 9 | Type drift between BE schema and FE DTO | Single source of truth in `packages/contracts`; or use Elysia's `Eden` client for true end-to-end types |
| 10 | Reviewer can't run the project locally | One-command setup: `bun install && docker compose up -d && bun run dev:all`; documented in README |
| 11 | Tests slow to run because of DB integration | Split: unit (`bun test`) runs in ms; integration only in CI or explicit `bun run test:int` |
| 12 | Frontend selection state lost across lazy expansions | Selection identified by `id`, not tree node reference; restored on expand |

---

## 12. Final Recommended Stack

### Backend
| Concern | Choice | Why |
|---------|--------|-----|
| Runtime | **Bun** | Fast startup, native TS, built-in test runner, monorepo workspaces, preferred by brief |
| HTTP framework | **Elysia** | Preferred by brief; end-to-end types via Eden; swagger plugin for free |
| Language | **TypeScript** | Required |
| DB | **PostgreSQL 16** + `ltree`, `pg_trgm` | Best tree-data support of the three allowed engines |
| Driver | **`postgres` (porsager/postgres)** | Bun-friendly, no native deps, fast |
| ORM/query builder | **Drizzle ORM** | Lightweight, schema-as-TS, generates migrations; doesn't hide SQL |
| Validation | **TypeBox (via Elysia `t`)** | Built into Elysia; doubles as OpenAPI schema |
| Tests | **`bun test`** (unit/integration), Testcontainers (DB) | Native, fast |
| API docs | **`@elysiajs/swagger`** | Free OpenAPI from route schemas |

### Frontend
| Concern | Choice | Why |
|---------|--------|-----|
| Framework | **Vue 3 + Composition API** | Required |
| Build tool | **Vite** | De facto for Vue |
| State | **Pinia** + **TanStack Query for Vue** | Local state + server cache, separated cleanly |
| Styling | **TailwindCSS** | Low ceremony |
| Icons | **Lucide-vue** | Tiny, tree-shakeable |
| Tests | **Vitest + @vue/test-utils**, **Playwright** | Industry standard |
| Type checking | **vue-tsc** | Required for SFC TS |

### Repo-level
| Concern | Choice |
|---------|--------|
| Workspaces | Bun workspaces |
| Linting | ESLint flat config + Prettier |
| Git hooks | lefthook |
| CI (mentioned, not built) | GitHub Actions: lint → typecheck → test → build |
| Container (for reviewer) | docker-compose for Postgres only |

---

## Appendix A — Elysia for a Go developer

Coming from Go (likely Fiber, Echo, or chi):

- **Elysia is the closest equivalent to Fiber** in spirit: an HTTP framework focused on speed and ergonomic chaining.
- Routes are registered via method chaining: `app.get('/x', handler).post('/y', handler)`.
- **The killer feature** that has no Go equivalent: route schemas (TypeBox) are used both for **runtime validation** and **compile-time type inference** of the request and response. The Elysia "Eden" client then **infers the entire API surface** as a typed client — like generating an OpenAPI client, but at compile time with zero codegen step.
- Middleware-equivalents are called `derive` (per-request derived values), `onBeforeHandle`, `onAfterHandle`, `onError`. Same lifecycle hooks as Echo/Gin.
- Plugins are how you compose behaviour — e.g. `@elysiajs/swagger`, `@elysiajs/cors`. Equivalent to Fiber middleware packages.
- It runs on Bun natively; works on Node via a compatibility layer but Bun is the home turf.

A Go-style "interfaces + small functions" architecture maps cleanly: keep Elysia confined to the presentation layer; use cases stay framework-free.

## Appendix B — Bun ecosystem brief

- **Bun is a JavaScript runtime** built on Apple's JavaScriptCore (Safari's engine), not V8. Cold start is ~3× faster than Node.
- It bundles a **package manager** (`bun install` — replaces npm/yarn/pnpm), a **bundler** (replaces webpack/esbuild), a **test runner** (`bun test` — Jest-compatible API), and a **TS transpiler** (no `ts-node` needed; run `.ts` files directly).
- **Workspaces** work like npm/yarn — define `"workspaces": ["apps/*", "packages/*"]` in root `package.json`.
- **`bun.lockb`** is the binary lockfile (faster to read/write than `package-lock.json`).
- Most Node-targeted packages "just work" because Bun implements the Node API. Native modules (anything with a `.node` binary) can be hit-or-miss — for our DB driver we'll use a pure-JS option (`postgres`).
- **Caveat**: Bun is younger than Node. For a take-home it's perfect; for production at scale we'd weigh ecosystem maturity. The brief explicitly prefers Bun, so we lean in.

---

## 13. Verification (how to know the plan is right when implemented)

When the project is built, these should all be true:

- `bun install && docker compose up -d && bun run dev` brings up the full stack with one terminal each for API and web.
- `curl http://localhost:3000/api/v1/folders/tree` returns a populated tree from seed data.
- Visiting `http://localhost:5173` shows the two-panel UI; clicking a folder populates the right panel.
- `bun test` passes unit + integration tests (Testcontainers required for integration).
- `bun run e2e` runs the Playwright golden-path test against a real stack.
- Loading the app with the 1M-row seed does **not** freeze the browser (proves lazy mode works).
- OpenAPI docs are reachable at `/api/v1/swagger`.

---

## 14. Out of Scope — and Why We Don't Need It *Now*

This section is deliberate. A senior engineer is judged as much on **what they didn't build** as on what they did. Each item below is something a reviewer **could** ask "why didn't you do this?" — and each has a concrete reason it would have hurt more than it helped for this take-home.

### 14.1 Authentication & authorization
**Status:** Not implemented.
**Why not now:**
- The brief makes no mention of users, sessions, tenants, or permissions.
- Adding auth means introducing identity, password hashing, session/JWT plumbing, login UI, and per-request scoping — easily a day of work that **does not contribute to the four things actually being assessed** (data structure, algorithm, code clarity, best practices).
- It would also entangle every use case with an `actor`/`tenant` parameter for no demonstrable gain.
**When it would be needed:** the moment the product becomes multi-user or multi-tenant. The clean-architecture layout makes inserting an `AuthorizationPort` later a localized change.

### 14.2 Folder & file CRUD (create / rename / move / delete)
**Status:** Read-only API only.
**Why not now:**
- The brief is explicit: the API serves data **upon request**, the UI **displays** the structure. Writes are not part of the requirements.
- Writes introduce a new layer of correctness concerns: transactional `path` rewrites, cycle prevention on move, validation, optimistic UI. Each is interesting but **none** demonstrate anything that the read path doesn't already prove.
- The DB schema (`UNIQUE (parent_id, name)`, `ON DELETE CASCADE`, `ltree` path) is **already designed to support writes** — Section 7.2 documents the exact UPDATE pattern — so we've shown forethought without implementing.
**When it would be needed:** if the brief evolves to "editable explorer". Adding a new use case + repository method + Elysia route is mechanical.

### 14.3 Drag-and-drop, multi-select, context menus
**Status:** Not implemented.
**Why not now:**
- These are **interaction-design** features, not architectural ones. They wouldn't reveal anything new about data modelling, recursion, or scalability.
- Each is several hours of niche UI work (HTML5 DnD API quirks, keyboard accessibility for multi-select, portal-positioned context menus) — time better spent on the recursive tree and tests.
- The brief lists none of them, even in bonuses.
**When it would be needed:** when the product becomes a real file manager users live in daily. Until then, single-click selection + right-panel navigation is sufficient.

### 14.4 Real-time updates (WebSocket / SSE)
**Status:** Not implemented.
**Why not now:**
- A reviewer running the project locally is the only "user" — there are no concurrent writers to push updates from.
- Real-time would require a pub/sub bus (Redis, NATS), a WebSocket server, FE reconnection logic, and conflict resolution between optimistic local state and server pushes. **All cost, no signal** for this assessment.
- TanStack Query's stale-while-revalidate already gives a "feels live" UX with polling if ever needed.
**When it would be needed:** in a true collaborative explorer (think Dropbox web). Then we'd add SSE on the BE and `useEventSource` composables on the FE.

### 14.5 Internationalization (i18n) & deep accessibility (a11y) polish
**Status:** English-only; semantic HTML + keyboard basics only.
**Why not now:**
- i18n adds a translation pipeline (vue-i18n, message files, locale switching) for **zero observable change** to the reviewer running locally.
- Deep a11y (full ARIA tree pattern with roving tabindex, screen-reader announcements for lazy loads, focus management on collapse) is non-trivial and not on the bonus list.
- We **will** use semantic `<ul>`/`<li>`, `aria-expanded` on the caret, and visible focus rings — that's the minimum that doesn't actively exclude users, and costs nothing.
**When it would be needed:** if the product has a target market beyond English / has accessibility compliance requirements (Section 508, EN 301 549).

### 14.6 CDN, production deployment, observability stack
**Status:** Local-only (docker-compose + `bun run dev`).
**Why not now:**
- The reviewer needs to **run** the project, not **deploy** it. A Dockerfile that builds a production image is ~30 lines and we'd add it if asked, but a full CDN/k8s/CI deploy is a different exercise.
- Observability (OpenTelemetry traces, Prometheus metrics, structured logs to Loki) is a portfolio piece on its own. We will leave **hooks** (a `Logger` port, request-id middleware) so it's easy to wire in.
**When it would be needed:** the moment this is shipped behind a real domain with real users.

### 14.7 Distributed caching (Redis) and per-process in-memory cache
**Status:** Not implemented; documented as the next scalability step.
**Why not now:**
- For the local demo dataset (~100 folders) the DB is faster than the cache round-trip.
- A premature cache hides incorrect queries — we want the reviewer to see clean SQL hitting clean indexes first.
- TanStack Query on the FE gives us a free L1 cache per browser tab, which is the highest-value cache for read-heavy explore patterns.
**When it would be needed:** once `/folders/:id/children` traffic for popular nodes exceeds DB headroom. The use-case layer is the natural insertion point (decorator pattern).

### 14.8 Closure table / nested sets as the primary tree model
**Status:** Not used; `ltree` + adjacency list chosen instead (Section 3.1).
**Why not now:**
- Closure tables explode write cost and storage. For a read-mostly explorer with the dataset described, it's overkill.
- `ltree` gives us subtree and ancestor queries with a single GIST index — same query characteristics as a closure table, without the secondary table to maintain.
**When it would be needed:** if folder moves become so frequent that updating the `path` column on subtree moves becomes a bottleneck (closure table makes moves cheap at the cost of inserts).

### 14.9 Soft delete & versioning / audit history
**Status:** Hard delete with `ON DELETE CASCADE`.
**Why not now:**
- Audit history is a feature of products that need compliance or "undo" UX — explicit out of brief.
- Soft delete (`deleted_at TIMESTAMPTZ`) is a global concern (every query must filter); adding it mid-project is invasive. **Don't add it speculatively.**
**When it would be needed:** if the explorer becomes the system of record for something a regulator cares about.

### 14.10 Rate limiting, CSRF, security hardening beyond defaults
**Status:** Not implemented.
**Why not now:**
- No authenticated session = no CSRF surface worth defending; CORS will be configured for localhost only.
- Rate limiting matters for a public API; a take-home reviewer running locally has no abuse scenario.
- We will add **basic** security headers (`Helmet`-equivalent via Elysia) because they're one-liners and good hygiene.
**When it would be needed:** the moment the API is publicly reachable.

### 14.11 Frontend virtual scrolling library (`vue-virtual-scroller`)
**Status:** Not used initially; called out as the upgrade path for very large expanded trees (Section 6.2).
**Why not now:**
- For the demo dataset, virtualization is overkill and obscures the recursive-rendering code, which is what the brief actually wants to see.
- We pay the perf cost only **after expansion**, and `v-memo` already eliminates most of it.
**When it would be needed:** when a single expanded subtree pushes past a few thousand visible DOM nodes.

### 14.12 GraphQL / tRPC instead of REST
**Status:** REST chosen.
**Why not now:**
- The brief explicitly lists "REST API standards" as a bonus — REST is the **expected** answer.
- GraphQL's main win (multiple resources per request, client-shaped responses) doesn't apply: an explorer has a small, fixed set of queries.
- Elysia + Eden gives us tRPC-style end-to-end typing **on top of REST**, which is the best of both worlds.
**When it would be needed:** if multiple unrelated clients (mobile, embeds) needed different shapes of the same data.

### 14.13 Server-side rendering (SSR) / Nuxt
**Status:** SPA only (Vite + Vue).
**Why not now:**
- This is an authenticated-feeling internal tool — SEO and first-paint metrics don't matter.
- SSR adds a Node/Bun rendering layer, hydration debugging, and CORS complexity. Pure SPA is faster to build and faster to assess.
**When it would be needed:** if the explorer became a public-facing, link-shareable page where first paint matters.

---

**The throughline:** every "no" above is a deliberate tradeoff to keep the take-home **focused on what is actually being graded**: clean architecture, sound data structures, a hand-rolled recursive component, and a scalability story that holds up under questioning. Building any of the items above would push the project past the time budget without changing the assessment score.
