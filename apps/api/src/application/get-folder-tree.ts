import type { FolderRepository } from '../domain/folder/folder-repository'
import type { FolderTreeResponse, FolderNode } from '@windows-explorer/contracts'

const LAZY_MODE_THRESHOLD = 10_000
const EAGER_DEPTH_LIMIT = 20   // safety cap on recursive tree depth

export async function getFolderTree(
  repo: FolderRepository,
  requestedDepth?: number,
): Promise<FolderTreeResponse> {
  const totalFolders = await repo.countAll()
  const isLazy = requestedDepth !== undefined || totalFolders > LAZY_MODE_THRESHOLD
  const depthToLoad = isLazy ? (requestedDepth ?? 2) : EAGER_DEPTH_LIMIT

  const folders = await repo.findSubtree(null, { maxDepth: depthToLoad })

  // Build nested tree from flat list
  const nodeMap = new Map<string, FolderNode>()
  const roots: FolderNode[] = []

  for (const f of folders) {
    const node: FolderNode = {
      id: Number(f.id),
      parentId: f.parentId ? Number(f.parentId) : null,
      name: f.name,
      depth: f.depth,
      hasChildren: false,  // will be updated below
      childCount: 0,       // will be updated below
      children: [],
    }
    nodeMap.set(String(f.id), node)
  }

  // Wire parent-child relationships
  for (const node of nodeMap.values()) {
    if (node.parentId === null) {
      roots.push(node)
    } else {
      const parent = nodeMap.get(String(node.parentId))
      if (parent) {
        parent.children!.push(node)
        parent.hasChildren = true
        parent.childCount++
      }
    }
  }

  return {
    data: { children: roots },
    meta: {
      totalFolders,
      depthLoaded: depthToLoad,
      mode: isLazy ? 'lazy' : 'eager',
    },
  }
}
