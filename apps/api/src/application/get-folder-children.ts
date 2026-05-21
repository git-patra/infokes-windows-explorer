import type { FolderRepository } from '../domain/folder/folder-repository'
import type { FolderChildrenResponse, FolderNode } from '@windows-explorer/contracts'
import { FolderNotFoundError } from '../domain/errors'
import { type FolderId } from '../domain/folder/folder-id'

export async function getFolderChildren(
  repo: FolderRepository,
  folderId: FolderId,
  cursor?: bigint,
  limit = 200,
): Promise<FolderChildrenResponse> {
  const folder = await repo.findById(folderId)
  if (!folder) throw new FolderNotFoundError(folderId)

  const children = await repo.findChildren(folderId, { cursor, limit: limit + 1 })
  const hasMore = children.length > limit
  const page = hasMore ? children.slice(0, limit) : children

  // Count children for hasChildren/childCount on each returned node (batched)
  const childIds = page.map((f) => f.id as FolderId)
  const countMap = await repo.countChildrenBatch(childIds)

  const nodes: FolderNode[] = page.map((f) => {
    const count = countMap.get(String(f.id)) ?? 0
    return {
      id: Number(f.id),
      parentId: f.parentId ? Number(f.parentId) : null,
      name: f.name,
      depth: f.depth,
      hasChildren: count > 0,
      childCount: count,
    }
  })

  return {
    data: nodes,
    meta: {
      total: nodes.length,
      cursor: hasMore ? Number(page[page.length - 1].id) : null,
    },
  }
}
