import { describe, expect, it } from 'bun:test'
import { getFolderChildren } from '../../src/application/get-folder-children'
import { FakeFolderRepository } from './fakes/fake-folder-repository'
import { FolderNotFoundError } from '../../src/domain/errors'
import { toFolderId } from '../../src/domain/folder/folder-id'
import type { Folder } from '../../src/domain/folder/folder'

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

describe('getFolderChildren', () => {
  it('throws FolderNotFoundError when folder does not exist', async () => {
    const repo = new FakeFolderRepository([])
    await expect(getFolderChildren(repo, toFolderId(999n))).rejects.toBeInstanceOf(FolderNotFoundError)
  })

  it('returns direct children only, not grandchildren', async () => {
    const folders = [
      makeFolder({ id: 1n, name: 'Root', depth: 0 }),
      makeFolder({ id: 2n, name: 'Child1', depth: 1, parentId: 1n }),
      makeFolder({ id: 3n, name: 'Child2', depth: 1, parentId: 1n }),
      makeFolder({ id: 4n, name: 'Grandchild', depth: 2, parentId: 2n }),
    ]
    const repo = new FakeFolderRepository(folders)
    const result = await getFolderChildren(repo, toFolderId(1n))
    expect(result.data).toHaveLength(2)
    expect(result.data.map((n) => n.name)).toContain('Child1')
    expect(result.data.map((n) => n.name)).toContain('Child2')
    expect(result.data.map((n) => n.name)).not.toContain('Grandchild')
  })

  it('cursor pagination returns next page', async () => {
    const folders = [
      makeFolder({ id: 1n, name: 'Parent', depth: 0 }),
      makeFolder({ id: 2n, name: 'Child1', depth: 1, parentId: 1n }),
      makeFolder({ id: 3n, name: 'Child2', depth: 1, parentId: 1n }),
      makeFolder({ id: 4n, name: 'Child3', depth: 1, parentId: 1n }),
    ]
    const repo = new FakeFolderRepository(folders)

    // First page: limit=2
    const page1 = await getFolderChildren(repo, toFolderId(1n), undefined, 2)
    expect(page1.data).toHaveLength(2)
    expect(page1.meta.cursor).not.toBeNull()

    // Second page: cursor from previous page
    const cursorId = BigInt(page1.meta.cursor!)
    const page2 = await getFolderChildren(repo, toFolderId(1n), cursorId, 2)
    expect(page2.data).toHaveLength(1)
    expect(page2.meta.cursor).toBeNull()
    expect(page2.data[0].name).toBe('Child3')
  })

  it('sets hasChildren and childCount correctly', async () => {
    const folders = [
      makeFolder({ id: 1n, name: 'Root', depth: 0 }),
      makeFolder({ id: 2n, name: 'WithChildren', depth: 1, parentId: 1n }),
      makeFolder({ id: 3n, name: 'Leaf', depth: 1, parentId: 1n }),
      makeFolder({ id: 4n, name: 'SubChild1', depth: 2, parentId: 2n }),
      makeFolder({ id: 5n, name: 'SubChild2', depth: 2, parentId: 2n }),
    ]
    const repo = new FakeFolderRepository(folders)
    const result = await getFolderChildren(repo, toFolderId(1n))

    const withChildren = result.data.find((n) => n.name === 'WithChildren')!
    const leaf = result.data.find((n) => n.name === 'Leaf')!

    expect(withChildren.hasChildren).toBe(true)
    expect(withChildren.childCount).toBe(2)
    expect(leaf.hasChildren).toBe(false)
    expect(leaf.childCount).toBe(0)
  })
})
