import { describe, expect, it, beforeEach } from 'bun:test'
import { getFolderTree } from '../../src/application/get-folder-tree'
import { FakeFolderRepository } from './fakes/fake-folder-repository'
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

describe('getFolderTree', () => {
  it('returns empty tree when no folders', async () => {
    const repo = new FakeFolderRepository([])
    const result = await getFolderTree(repo)
    expect(result.data.children).toEqual([])
    expect(result.meta.totalFolders).toBe(0)
    expect(result.meta.mode).toBe('eager')
  })

  it('returns flat root list when only root folders', async () => {
    const folders = [
      makeFolder({ id: 1n, name: 'Documents', path: '1' }),
      makeFolder({ id: 2n, name: 'Pictures', path: '2' }),
    ]
    const repo = new FakeFolderRepository(folders)
    const result = await getFolderTree(repo)
    expect(result.data.children).toHaveLength(2)
    expect(result.data.children[0].name).toBe('Documents')
    expect(result.data.children[1].name).toBe('Pictures')
    expect(result.meta.mode).toBe('eager')
  })

  it('builds nested children correctly', async () => {
    const folders = [
      makeFolder({ id: 1n, name: 'Root', path: '1', depth: 0 }),
      makeFolder({ id: 2n, name: 'Child1', path: '1.2', depth: 1, parentId: 1n }),
      makeFolder({ id: 3n, name: 'Child2', path: '1.3', depth: 1, parentId: 1n }),
      makeFolder({ id: 4n, name: 'Grandchild', path: '1.2.4', depth: 2, parentId: 2n }),
    ]
    const repo = new FakeFolderRepository(folders)
    const result = await getFolderTree(repo)

    expect(result.data.children).toHaveLength(1)
    const root = result.data.children[0]
    expect(root.name).toBe('Root')
    expect(root.hasChildren).toBe(true)
    expect(root.childCount).toBe(2)
    expect(root.children).toHaveLength(2)

    const child1 = root.children!.find((c) => c.name === 'Child1')!
    expect(child1.hasChildren).toBe(true)
    expect(child1.childCount).toBe(1)
    expect(child1.children).toHaveLength(1)
    expect(child1.children![0].name).toBe('Grandchild')
  })

  it('uses eager mode when total folders < 10000', async () => {
    const folders = [makeFolder({ id: 1n, name: 'Root' })]
    const repo = new FakeFolderRepository(folders)
    const result = await getFolderTree(repo)
    expect(result.meta.mode).toBe('eager')
    expect(result.meta.depthLoaded).toBe(20)
  })

  it('uses lazy mode when total folders > 10000', async () => {
    // Create 10001 folders
    const folders: Folder[] = []
    for (let i = 1; i <= 10001; i++) {
      folders.push(makeFolder({ id: BigInt(i), name: `Folder${i}`, depth: 0 }))
    }
    const repo = new FakeFolderRepository(folders)
    const result = await getFolderTree(repo)
    expect(result.meta.mode).toBe('lazy')
    expect(result.meta.totalFolders).toBe(10001)
    expect(result.meta.depthLoaded).toBe(2)
  })

  it('respects requestedDepth in lazy mode', async () => {
    const folders: Folder[] = [
      makeFolder({ id: 1n, name: 'Root', depth: 0, path: '1' }),
      makeFolder({ id: 2n, name: 'Child', depth: 1, parentId: 1n, path: '1.2' }),
      makeFolder({ id: 3n, name: 'Grandchild', depth: 2, parentId: 2n, path: '1.2.3' }),
    ]
    const repo = new FakeFolderRepository(folders)
    // Request only depth 1
    const result = await getFolderTree(repo, 1)
    expect(result.meta.mode).toBe('lazy')
    expect(result.meta.depthLoaded).toBe(1)
    // Only depth 0 folders should be loaded (depth < 1)
    expect(result.data.children).toHaveLength(1)
    expect(result.data.children[0].children).toHaveLength(0)
  })
})
