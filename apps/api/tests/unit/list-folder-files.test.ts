import { describe, expect, it } from 'bun:test'
import { listFolderFiles } from '../../src/application/list-folder-files'
import { FakeFolderRepository } from './fakes/fake-folder-repository'
import { FakeFileRepository } from './fakes/fake-file-repository'
import { FolderNotFoundError } from '../../src/domain/errors'
import { toFolderId } from '../../src/domain/folder/folder-id'
import type { Folder } from '../../src/domain/folder/folder.ts'
import type { File } from '../../src/domain/file/file.ts'

const makeFolder = (id: bigint): Folder => ({
  id, parentId: null, name: `Folder${id}`, path: String(id), depth: 0,
  createdAt: new Date(), updatedAt: new Date(),
})

const makeFile = (id: bigint, folderId: bigint): File => ({
  id, folderId, name: `file${id}.txt`, sizeBytes: 1024n, mimeType: 'text/plain', createdAt: new Date(),
})

describe('listFolderFiles', () => {
  it('throws FolderNotFoundError when folder does not exist', async () => {
    const folderRepo = new FakeFolderRepository([])
    const fileRepo = new FakeFileRepository([])
    await expect(listFolderFiles(folderRepo, fileRepo, toFolderId(1n))).rejects.toBeInstanceOf(FolderNotFoundError)
  })

  it('returns files for an existing folder', async () => {
    const folder = makeFolder(1n)
    const file = makeFile(1n, 1n)
    const folderRepo = new FakeFolderRepository([folder])
    const fileRepo = new FakeFileRepository([file])
    const result = await listFolderFiles(folderRepo, fileRepo, toFolderId(1n))
    expect(result.data).toHaveLength(1)
    expect(result.data[0].name).toBe('file1.txt')
  })

  it('cursor pagination returns next page', async () => {
    const folder = makeFolder(1n)
    const files = [1n, 2n, 3n, 4n, 5n].map(id => makeFile(id, 1n))
    const folderRepo = new FakeFolderRepository([folder])
    const fileRepo = new FakeFileRepository(files)
    const page1 = await listFolderFiles(folderRepo, fileRepo, toFolderId(1n), undefined, 3)
    expect(page1.data).toHaveLength(3)
    expect(page1.meta.cursor).not.toBeNull()
    const page2 = await listFolderFiles(folderRepo, fileRepo, toFolderId(1n), BigInt(page1.meta.cursor!), 3)
    expect(page2.data).toHaveLength(2)
    expect(page2.meta.cursor).toBeNull()
  })
})
