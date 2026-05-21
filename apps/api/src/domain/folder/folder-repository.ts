import type { Folder } from './folder'
import type { FolderId } from './folder-id'

export interface FolderTreeOptions {
  maxDepth?: number      // if set, only load tree up to this depth (lazy mode)
  totalCountOnly?: boolean  // if true, just return total count for mode detection
}

export interface FolderChildrenOptions {
  cursor?: bigint    // cursor-based pagination (last seen id)
  limit?: number     // default 200
}

export interface FolderRepository {
  findById(id: FolderId): Promise<Folder | null>
  findRoots(options?: FolderChildrenOptions): Promise<Folder[]>
  findChildren(parentId: FolderId, options?: FolderChildrenOptions): Promise<Folder[]>
  countChildren(parentId: FolderId): Promise<number>
  findSubtree(rootId: FolderId | null, options?: FolderTreeOptions): Promise<Folder[]>
  countAll(): Promise<number>
  findAncestors(id: FolderId): Promise<Folder[]>  // ordered root → parent
  searchByName(query: string, limit?: number): Promise<Folder[]>
}
