import type { Folder } from '../../../src/domain/folder/folder'
import type { FolderId } from '../../../src/domain/folder/folder-id'
import type {
  FolderRepository,
  FolderTreeOptions,
  FolderChildrenOptions,
} from '../../../src/domain/folder/folder-repository'

export class FakeFolderRepository implements FolderRepository {
  private folders: Folder[]

  constructor(folders: Folder[] = []) {
    this.folders = folders
  }

  async findById(id: FolderId): Promise<Folder | null> {
    return this.folders.find((f) => f.id === id) ?? null
  }

  async findRoots(options?: FolderChildrenOptions): Promise<Folder[]> {
    let results = this.folders.filter((f) => f.parentId === null)
    results = results.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    if (options?.cursor !== undefined) {
      results = results.filter((f) => f.id > options.cursor!)
    }
    if (options?.limit !== undefined) {
      results = results.slice(0, options.limit)
    }
    return results
  }

  async findChildren(parentId: FolderId, options?: FolderChildrenOptions): Promise<Folder[]> {
    let results = this.folders.filter((f) => f.parentId === parentId)
    results = results.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    if (options?.cursor !== undefined) {
      results = results.filter((f) => f.id > options.cursor!)
    }
    if (options?.limit !== undefined) {
      results = results.slice(0, options.limit)
    }
    return results
  }

  async countChildren(parentId: FolderId): Promise<number> {
    return this.folders.filter((f) => f.parentId === parentId).length
  }

  async countChildrenBatch(parentIds: FolderId[]): Promise<Map<string, number>> {
    const result = new Map<string, number>()
    for (const id of parentIds) {
      result.set(String(id), this.folders.filter((f) => f.parentId === id).length)
    }
    return result
  }

  async findSubtree(rootId: FolderId | null, options?: FolderTreeOptions): Promise<Folder[]> {
    const maxDepth = options?.maxDepth

    if (rootId === null) {
      // Start from root level
      if (maxDepth === undefined) {
        return [...this.folders]
      }
      return this.folders.filter((f) => f.depth < maxDepth)
    }

    // Find the root folder to get its depth
    const rootFolder = this.folders.find((f) => f.id === rootId)
    if (!rootFolder) return []

    const result: Folder[] = []
    const queue: bigint[] = [rootId]

    while (queue.length > 0) {
      const currentId = queue.shift()!
      const current = this.folders.find((f) => f.id === currentId)
      if (!current) continue

      result.push(current)

      const depthFromRoot = current.depth - rootFolder.depth
      if (maxDepth === undefined || depthFromRoot < maxDepth) {
        const children = this.folders.filter((f) => f.parentId === current.id)
        queue.push(...children.map((c) => c.id))
      }
    }

    return result
  }

  async countAll(): Promise<number> {
    return this.folders.length
  }

  async findAncestors(id: FolderId): Promise<Folder[]> {
    const ancestors: Folder[] = []
    let current = this.folders.find((f) => f.id === id)

    if (!current) return ancestors

    while (current.parentId !== null) {
      const parent = this.folders.find((f) => f.id === current!.parentId)
      if (!parent) break
      ancestors.unshift(parent)
      current = parent
    }

    return ancestors
  }

  async searchByName(query: string, limit = 50): Promise<Folder[]> {
    const lower = query.toLowerCase()
    return this.folders
      .filter((f) => f.name.toLowerCase().includes(lower))
      .slice(0, limit)
  }
}
