// Populated in Phase 4 — stubs only
export interface FolderNode {
  id: number
  parentId: number | null
  name: string
  depth: number
  hasChildren: boolean
  childCount: number
  children?: FolderNode[]
}

export interface FolderTreeResponse {
  data: { children: FolderNode[] }
  meta: { totalFolders: number; depthLoaded: number; mode: 'eager' | 'lazy' }
}

export interface FolderChildrenResponse {
  data: FolderNode[]
  meta: { total: number; cursor: number | null }
}

export interface FileItem {
  id: number
  folderId: number
  name: string
  sizeBytes: number
  mimeType: string | null
  createdAt: string
}

export interface SearchResult {
  id: number
  name: string
  path: string
  type: 'folder' | 'file'
}
