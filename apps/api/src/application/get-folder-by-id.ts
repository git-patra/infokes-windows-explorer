import type { FolderRepository } from '../domain/folder/folder-repository'
import { FolderNotFoundError } from '../domain/errors'
import { type FolderId } from '../domain/folder/folder-id'
import type { FolderNode } from '@windows-explorer/contracts'

export interface FolderDetail extends FolderNode {
  breadcrumb: { id: number; name: string }[]
}

export async function getFolderById(
  repo: FolderRepository,
  folderId: FolderId,
): Promise<FolderDetail> {
  const [folder, ancestors, childCount] = await Promise.all([
    repo.findById(folderId),
    repo.findAncestors(folderId),
    repo.countChildren(folderId),
  ])

  if (!folder) throw new FolderNotFoundError(folderId)

  return {
    id: Number(folder.id),
    parentId: folder.parentId ? Number(folder.parentId) : null,
    name: folder.name,
    depth: folder.depth,
    hasChildren: childCount > 0,
    childCount,
    breadcrumb: ancestors.map((a) => ({ id: Number(a.id), name: a.name })),
  }
}
