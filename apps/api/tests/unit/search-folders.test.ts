import { describe, expect, it } from 'bun:test'
import { searchFolders } from '../../src/application/search-folders'
import { FakeFolderRepository } from './fakes/fake-folder-repository'
import { FakeFileRepository } from './fakes/fake-file-repository'
import { InvalidQueryError } from '../../src/domain/errors'
import type { Folder } from '../../src/domain/folder/folder'
import type { File } from '../../src/domain/file/file'

function makeFolder(overrides: Partial<Folder> & { id: bigint }): Folder {
  return {
    parentId: null,
    name: `Folder ${overrides.id}`,
    path: String(overrides.id),
    depth: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeFile(overrides: Partial<File> & { id: bigint; folderId: bigint }): File {
  return {
    name: `File ${overrides.id}`,
    sizeBytes: 0n,
    mimeType: null,
    createdAt: new Date(),
    ...overrides,
  }
}

describe('searchFolders', () => {
  it('throws InvalidQueryError on empty query', async () => {
    const folderRepo = new FakeFolderRepository([])
    const fileRepo = new FakeFileRepository([])
    await expect(searchFolders(folderRepo, fileRepo, '')).rejects.toBeInstanceOf(InvalidQueryError)
    await expect(searchFolders(folderRepo, fileRepo, '   ')).rejects.toBeInstanceOf(InvalidQueryError)
  })

  it('throws InvalidQueryError on very long query', async () => {
    const folderRepo = new FakeFolderRepository([])
    const fileRepo = new FakeFileRepository([])
    const longQuery = 'a'.repeat(201)
    await expect(searchFolders(folderRepo, fileRepo, longQuery)).rejects.toBeInstanceOf(InvalidQueryError)
  })

  it('returns matching folders case-insensitively', async () => {
    const folders = [
      makeFolder({ id: 1n, name: 'Documents' }),
      makeFolder({ id: 2n, name: 'Pictures' }),
      makeFolder({ id: 3n, name: 'My Documents' }),
    ]
    const folderRepo = new FakeFolderRepository(folders)
    const fileRepo = new FakeFileRepository([])

    const result = await searchFolders(folderRepo, fileRepo, 'documents')
    expect(result.data).toHaveLength(2)
    expect(result.data.every((r) => r.type === 'folder')).toBe(true)
    const names = result.data.map((r) => r.name)
    expect(names).toContain('Documents')
    expect(names).toContain('My Documents')
  })

  it('returns both folders and files in results', async () => {
    const folders = [makeFolder({ id: 1n, name: 'report-folder' })]
    const files = [makeFile({ id: 10n, folderId: 1n, name: 'report.pdf' })]
    const folderRepo = new FakeFolderRepository(folders)
    const fileRepo = new FakeFileRepository(files)

    const result = await searchFolders(folderRepo, fileRepo, 'report')
    expect(result.data).toHaveLength(2)
    const types = result.data.map((r) => r.type)
    expect(types).toContain('folder')
    expect(types).toContain('file')
  })

  it('caps results at the specified limit', async () => {
    const folders: Folder[] = []
    for (let i = 1; i <= 40; i++) {
      folders.push(makeFolder({ id: BigInt(i), name: `search-target-${i}` }))
    }
    const folderRepo = new FakeFolderRepository(folders)
    const fileRepo = new FakeFileRepository([])

    const result = await searchFolders(folderRepo, fileRepo, 'search-target', 10)
    expect(result.data.length).toBeLessThanOrEqual(10)
  })
})
