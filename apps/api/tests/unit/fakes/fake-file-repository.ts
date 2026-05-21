import type { File } from '../../../src/domain/file/file'
import type { FolderId } from '../../../src/domain/folder/folder-id'
import type { FileRepository, FileChildrenOptions } from '../../../src/domain/file/file-repository'

export class FakeFileRepository implements FileRepository {
  private files: File[]

  constructor(files: File[] = []) {
    this.files = files
  }

  async findByFolder(folderId: FolderId, options?: FileChildrenOptions): Promise<File[]> {
    let results = this.files.filter((f) => f.folderId === folderId)
    results = results.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    if (options?.cursor !== undefined) {
      results = results.filter((f) => f.id > options.cursor!)
    }
    if (options?.limit !== undefined) {
      results = results.slice(0, options.limit)
    }
    return results
  }

  async countByFolder(folderId: FolderId): Promise<number> {
    return this.files.filter((f) => f.folderId === folderId).length
  }

  async searchByName(query: string, limit = 50): Promise<File[]> {
    const lower = query.toLowerCase()
    return this.files
      .filter((f) => f.name.toLowerCase().includes(lower))
      .slice(0, limit)
  }
}
