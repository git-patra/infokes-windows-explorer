import { sql } from 'drizzle-orm'
import {
  bigint,
  bigserial,
  customType,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'

// Custom ltree type (Postgres-specific, not in drizzle-orm built-ins)
const ltree = customType<{ data: string }>({
  dataType() {
    return 'ltree'
  },
})

export const folders = pgTable(
  'folders',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    parentId: bigint('parent_id', { mode: 'bigint' }).references(
      (): ReturnType<typeof folders.id.notNull> => folders.id,
      { onDelete: 'cascade' },
    ),
    name: text('name').notNull(),
    path: ltree('path').notNull(),
    depth: integer('depth').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('folders_parent_id_idx').on(table.parentId),
    unique('folders_name_unique_per_parent').on(table.parentId, table.name),
  ],
)

export const files = pgTable(
  'files',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    folderId: bigint('folder_id', { mode: 'bigint' })
      .notNull()
      .references(() => folders.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'bigint' }).notNull().default(sql`0`),
    mimeType: text('mime_type'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('files_folder_id_idx').on(table.folderId),
    unique('files_name_unique_per_folder').on(table.folderId, table.name),
  ],
)
