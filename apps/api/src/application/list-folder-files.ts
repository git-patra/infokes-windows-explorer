import type { FileRepository } from '../domain/file/file-repository'
import type { FolderRepository } from '../domain/folder/folder-repository'
import { FolderNotFoundError } from '../domain/errors'
import { type FolderId } from '../domain/folder/folder-id'
import type { FileListResponse } from '@windows-explorer/contracts'

export async function listFolderFiles(
  folderRepo: FolderRepository,
  fileRepo: FileRepository,
  folderId: FolderId,
  cursor?: bigint,
  limit = 200,
): Promise<FileListResponse> {
  const folder = await folderRepo.findById(folderId)
  if (!folder) throw new FolderNotFoundError(folderId)

  const files = await fileRepo.findByFolder(folderId, { cursor, limit: limit + 1 })
  const hasMore = files.length > limit
  const page = hasMore ? files.slice(0, limit) : files

  return {
    data: page.map((f) => ({
      id: Number(f.id),
      folderId: Number(f.folderId),
      name: f.name,
      sizeBytes: Number(f.sizeBytes),
      mimeType: f.mimeType,
      createdAt: f.createdAt.toISOString(),
    })),
    meta: {
      total: page.length,
      cursor: hasMore ? Number(page[page.length - 1].id) : null,
    },
  }
}
