import { and, asc, gt, isNull, lt, lte, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { folders } from '../db/schema'
import type { FolderRepository, FolderTreeOptions, FolderChildrenOptions } from '../../domain/folder/folder-repository'
import type { Folder } from '../../domain/folder/folder'
import type { FolderId } from '../../domain/folder/folder-id'

type FolderRow = typeof folders.$inferSelect

function toFolder(row: FolderRow): Folder {
  return {
    id: row.id as bigint,
    parentId: row.parentId as bigint | null,
    name: row.name,
    path: row.path,
    depth: row.depth,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export class PostgresFolderRepository implements FolderRepository {
  async findById(id: FolderId): Promise<Folder | null> {
    const rows = await db
      .select()
      .from(folders)
      .where(sql`${folders.id} = ${id}`)
      .limit(1)
    return rows[0] ? toFolder(rows[0]) : null
  }

  async findRoots(options?: FolderChildrenOptions): Promise<Folder[]> {
    const limit = options?.limit ?? 200
    const cursor = options?.cursor

    const conditions = cursor
      ? and(isNull(folders.parentId), gt(folders.id, cursor))
      : isNull(folders.parentId)

    const rows = await db
      .select()
      .from(folders)
      .where(conditions)
      .orderBy(asc(folders.name))
      .limit(limit)

    return rows.map(toFolder)
  }

  async findChildren(parentId: FolderId, options?: FolderChildrenOptions): Promise<Folder[]> {
    const limit = options?.limit ?? 200
    const cursor = options?.cursor

    const conditions = cursor
      ? and(sql`${folders.parentId} = ${parentId}`, gt(folders.id, cursor))
      : sql`${folders.parentId} = ${parentId}`

    const rows = await db
      .select()
      .from(folders)
      .where(conditions)
      .orderBy(asc(folders.name))
      .limit(limit)

    return rows.map(toFolder)
  }

  async countChildren(parentId: FolderId): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(folders)
      .where(sql`${folders.parentId} = ${parentId}`)
    return result[0]?.count ?? 0
  }

  async countChildrenBatch(parentIds: FolderId[]): Promise<Map<string, number>> {
    if (parentIds.length === 0) return new Map()

    const rows = await db
      .select({ parentId: folders.parentId, count: sql<number>`count(*)::int` })
      .from(folders)
      .where(sql`${folders.parentId} = ANY(${parentIds}::bigint[])`)
      .groupBy(folders.parentId)

    const result = new Map<string, number>()
    for (const row of rows) {
      if (row.parentId) result.set(String(row.parentId), row.count)
    }
    return result
  }

  async findSubtree(rootId: FolderId | null, options?: FolderTreeOptions): Promise<Folder[]> {
    const maxD = options?.maxDepth

    if (rootId === null) {
      // Load from root
      if (maxD !== undefined) {
        const rows = await db
          .select()
          .from(folders)
          .where(lte(folders.depth, maxD))
          .orderBy(asc(folders.depth), asc(folders.name))
        return rows.map(toFolder)
      } else {
        const rows = await db
          .select()
          .from(folders)
          .orderBy(asc(folders.depth), asc(folders.name))
        return rows.map(toFolder)
      }
    }

    // Non-null rootId: use ltree @> operator to find subtree
    const root = await this.findById(rootId)
    if (!root) return []

    if (maxD !== undefined) {
      const maxAbsoluteDepth = root.depth + maxD
      const rows = await db
        .select()
        .from(folders)
        .where(
          sql`${folders.path} <@ ${root.path}::ltree AND ${folders.depth} <= ${maxAbsoluteDepth}`,
        )
        .orderBy(asc(folders.depth), asc(folders.name))
      return rows.map(toFolder)
    } else {
      const rows = await db
        .select()
        .from(folders)
        .where(sql`${folders.path} <@ ${root.path}::ltree`)
        .orderBy(asc(folders.depth), asc(folders.name))
      return rows.map(toFolder)
    }
  }

  async countAll(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(folders)
    return result[0]?.count ?? 0
  }

  async findAncestors(id: FolderId): Promise<Folder[]> {
    const target = await this.findById(id)
    if (!target) return []

    const rows = await db
      .select()
      .from(folders)
      .where(sql`${folders.path} @> ${target.path}::ltree AND ${folders.id} != ${id}`)
      .orderBy(asc(folders.depth))

    return rows.map(toFolder)
  }

  async searchByName(query: string, limit = 50): Promise<Folder[]> {
    const rows = await db
      .select()
      .from(folders)
      .where(sql`${folders.name} ILIKE ${'%' + query + '%'}`)
      .limit(limit)

    return rows.map(toFolder)
  }
}
