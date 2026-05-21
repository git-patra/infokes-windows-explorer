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
