import type { File } from './file'
import type { FolderId } from '../folder/folder-id'

export interface FileChildrenOptions {
  cursor?: bigint
  limit?: number
}

export interface FileRepository {
  findByFolder(folderId: FolderId, options?: FileChildrenOptions): Promise<File[]>
  countByFolder(folderId: FolderId): Promise<number>
  searchByName(query: string, limit?: number): Promise<File[]>
}
