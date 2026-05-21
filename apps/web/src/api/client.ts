import type {
  FolderTreeResponse,
  FolderChildrenResponse,
  FolderDetail,
  FileListResponse,
} from '@windows-explorer/contracts'
import type { SearchResult } from '@windows-explorer/contracts'

const BASE = '/api/v1'

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { code: 'UNKNOWN', message: res.statusText } }))
    throw Object.assign(new Error(err.error?.message ?? res.statusText), { code: err.error?.code })
  }
  return res.json() as Promise<T>
}

export const api = {
  getFolderTree(depth?: number): Promise<FolderTreeResponse> {
    const q = depth !== undefined ? `?depth=${depth}` : ''
    return request(`/folders/tree${q}`)
  },

  getFolderChildren(id: number, cursor?: number, limit?: number): Promise<FolderChildrenResponse> {
    const params = new URLSearchParams()
    if (cursor !== undefined) params.set('cursor', String(cursor))
    if (limit !== undefined) params.set('limit', String(limit))
    const q = params.size ? `?${params}` : ''
    return request(`/folders/${id}/children${q}`)
  },

  getFolderById(id: number): Promise<FolderDetail> {
    return request(`/folders/${id}`)
  },

  getFolderFiles(id: number, cursor?: number, limit?: number): Promise<FileListResponse> {
    const params = new URLSearchParams()
    if (cursor !== undefined) params.set('cursor', String(cursor))
    if (limit !== undefined) params.set('limit', String(limit))
    const q = params.size ? `?${params}` : ''
    return request(`/folders/${id}/files${q}`)
  },

  search(q: string, limit = 50): Promise<{ data: SearchResult[] }> {
    const params = new URLSearchParams({ q, limit: String(limit) })
    return request(`/search?${params}`)
  },
}
