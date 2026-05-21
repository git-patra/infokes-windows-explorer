import type { FolderRepository } from '../domain/folder/folder-repository'
import type { FileRepository } from '../domain/file/file-repository'
import { InvalidQueryError } from '../domain/errors'
import type { SearchResult } from '@windows-explorer/contracts'

export async function searchFolders(
  folderRepo: FolderRepository,
  fileRepo: FileRepository,
  query: string,
  limit = 50,
): Promise<{ data: SearchResult[] }> {
  if (!query.trim()) throw new InvalidQueryError('Search query cannot be empty')
  if (query.length > 200) throw new InvalidQueryError('Search query too long')

  const [folders, files] = await Promise.all([
    folderRepo.searchByName(query, limit),
    fileRepo.searchByName(query, limit),
  ])

  const results: SearchResult[] = [
    ...folders.map((f) => ({
      id: Number(f.id),
      name: f.name,
      path: f.path,
      type: 'folder' as const,
      folderId: null,
      parentId: f.parentId ? Number(f.parentId) : null,
    })),
    ...files.map((f) => ({
      id: Number(f.id),
      name: f.name,
      path: '',  // files don't have ltree paths; the parent folder's path would be fetched client-side
      type: 'file' as const,
      folderId: Number(f.folderId),
      parentId: null,
    })),
  ].slice(0, limit)

  return { data: results }
}
