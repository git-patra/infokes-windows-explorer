import { asc, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { files } from '../db/schema'
import type { FileRepository, FileChildrenOptions } from '../../domain/file/file-repository'
import type { File } from '../../domain/file/file'
import type { FolderId } from '../../domain/folder/folder-id'

type FileRow = typeof files.$inferSelect

function toFile(row: FileRow): File {
  return {
    id: row.id as bigint,
    folderId: row.folderId as bigint,
    name: row.name,
    sizeBytes: row.sizeBytes as bigint,
    mimeType: row.mimeType,
    createdAt: row.createdAt,
  }
}

export class PostgresFileRepository implements FileRepository {
  async findByFolder(folderId: FolderId, options?: FileChildrenOptions): Promise<File[]> {
    const limit = options?.limit ?? 200
    const cursor = options?.cursor

    const condition = cursor
      ? sql`${files.folderId} = ${folderId} AND ${files.id} > ${cursor}`
      : sql`${files.folderId} = ${folderId}`

    // Sort by id for consistent cursor-based pagination; frontend sorts alphabetically for display
    const rows = await db
      .select()
      .from(files)
      .where(condition)
      .orderBy(asc(files.id))
      .limit(limit)

    return rows.map(toFile)
  }

  async countByFolder(folderId: FolderId): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(files)
      .where(sql`${files.folderId} = ${folderId}`)
    return result[0]?.count ?? 0
  }

  async searchByName(query: string, limit = 50): Promise<File[]> {
    const rows = await db
      .select()
      .from(files)
      .where(sql`${files.name} ILIKE ${'%' + query + '%'}`)
      .limit(limit)

    return rows.map(toFile)
  }
}
