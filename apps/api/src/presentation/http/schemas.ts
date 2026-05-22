import { t } from 'elysia'

export const folderIdParam = t.Object({
  id: t.Numeric({ minimum: 1 }),
})

export const paginationQuery = t.Object({
  cursor: t.Optional(t.Numeric({ minimum: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 1000, default: 200 })),
})

export const treeQuery = t.Object({
  depth: t.Optional(t.Numeric({ minimum: 1, maximum: 20 })),
})

export const searchQuery = t.Object({
  q: t.String({ minLength: 1, maxLength: 200 }),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 50 })),
})

// --- Response schemas ---

const folderSummary = t.Object({
  id: t.Number({ examples: [1] }),
  parentId: t.Union([t.Number(), t.Null()], { examples: [null] }),
  name: t.String({ examples: ['Documents'] }),
  depth: t.Number({ examples: [0] }),
  hasChildren: t.Boolean({ examples: [true] }),
  childCount: t.Number({ examples: [4] }),
})

const folderNodeSchema: ReturnType<typeof t.Recursive> = t.Recursive(
  (self) =>
    t.Object({
      id: t.Number({ examples: [1] }),
      parentId: t.Union([t.Number(), t.Null()], { examples: [null] }),
      name: t.String({ examples: ['Documents'] }),
      depth: t.Number({ examples: [0] }),
      hasChildren: t.Boolean({ examples: [true] }),
      childCount: t.Number({ examples: [4] }),
      children: t.Array(self),
    }),
  { $id: 'FolderNode' },
)

export const treeResponse = t.Object({
  data: t.Object({
    children: t.Array(folderNodeSchema),
  }),
  meta: t.Object({
    totalFolders: t.Number({ examples: [105] }),
    depthLoaded: t.Union([t.Number(), t.Null()]),
    mode: t.Union([t.Literal('eager'), t.Literal('lazy')]),
  }),
})

export const folderDetailResponse = t.Object({
  id: t.Number({ examples: [1] }),
  parentId: t.Union([t.Number(), t.Null()], { examples: [null] }),
  name: t.String({ examples: ['Documents'] }),
  depth: t.Number({ examples: [0] }),
  hasChildren: t.Boolean({ examples: [true] }),
  childCount: t.Number({ examples: [4] }),
  breadcrumb: t.Array(
    t.Object({ id: t.Number({ examples: [1] }), name: t.String({ examples: ['Documents'] }) }),
  ),
})

export const folderChildrenResponse = t.Object({
  data: t.Array(folderSummary),
  meta: t.Object({
    total: t.Number({ examples: [4] }),
    cursor: t.Union([t.Number(), t.Null()]),
  }),
})

export const folderFilesResponse = t.Object({
  data: t.Array(
    t.Object({
      id: t.Number({ examples: [1] }),
      folderId: t.Number({ examples: [1] }),
      name: t.String({ examples: ['report.pdf'] }),
      sizeBytes: t.Number({ examples: [102400] }),
      mimeType: t.Union([t.String(), t.Null()], { examples: ['application/pdf'] }),
    }),
  ),
  meta: t.Object({
    total: t.Number({ examples: [3] }),
    cursor: t.Union([t.Number(), t.Null()]),
  }),
})

export const searchResponse = t.Object({
  data: t.Array(
    t.Object({
      id: t.Number({ examples: [1] }),
      name: t.String({ examples: ['Documents'] }),
      path: t.String({ examples: ['1'] }),
      type: t.Union([t.Literal('folder'), t.Literal('file')]),
      folderId: t.Union([t.Number(), t.Null()], { examples: [null] }),
      parentId: t.Union([t.Number(), t.Null()], { examples: [null] }),
    }),
  ),
})
