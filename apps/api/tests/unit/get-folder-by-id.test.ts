import { describe, expect, it } from 'bun:test'
import { getFolderById } from '../../src/application/get-folder-by-id'
import { FakeFolderRepository } from './fakes/fake-folder-repository'
import { FolderNotFoundError } from '../../src/domain/errors'
import { toFolderId } from '../../src/domain/folder/folder-id'
import type { Folder } from '../../src/domain/folder/folder.ts'

describe('getFolderById', () => {
  it('throws FolderNotFoundError when folder does not exist', async () => {
    const repo = new FakeFolderRepository([])
    await expect(getFolderById(repo, toFolderId(999n))).rejects.toBeInstanceOf(FolderNotFoundError)
  })

  it('returns folder with empty breadcrumb for root folder', async () => {
    const root: Folder = { id: 1n, parentId: null, name: 'Root', path: '1', depth: 0, createdAt: new Date(), updatedAt: new Date() }
    const repo = new FakeFolderRepository([root])
    const result = await getFolderById(repo, toFolderId(1n))
    expect(result.id).toBe(1)
    expect(result.name).toBe('Root')
    expect(result.breadcrumb).toEqual([])
  })

  it('returns breadcrumb ordered root to parent', async () => {
    const root: Folder = { id: 1n, parentId: null, name: 'Root', path: '1', depth: 0, createdAt: new Date(), updatedAt: new Date() }
    const child: Folder = { id: 2n, parentId: 1n, name: 'Child', path: '1.2', depth: 1, createdAt: new Date(), updatedAt: new Date() }
    const grandchild: Folder = { id: 3n, parentId: 2n, name: 'GrandChild', path: '1.2.3', depth: 2, createdAt: new Date(), updatedAt: new Date() }
    const repo = new FakeFolderRepository([root, child, grandchild])
    const result = await getFolderById(repo, toFolderId(3n))
    expect(result.breadcrumb.map(b => b.name)).toEqual(['Root', 'Child'])
  })

  it('correctly reports hasChildren and childCount', async () => {
    const root: Folder = { id: 1n, parentId: null, name: 'Root', path: '1', depth: 0, createdAt: new Date(), updatedAt: new Date() }
    const child: Folder = { id: 2n, parentId: 1n, name: 'Child', path: '1.2', depth: 1, createdAt: new Date(), updatedAt: new Date() }
    const repo = new FakeFolderRepository([root, child])
    const result = await getFolderById(repo, toFolderId(1n))
    expect(result.hasChildren).toBe(true)
    expect(result.childCount).toBe(1)
  })
})
