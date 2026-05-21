import { shallowRef, readonly, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { api } from '../api/client'
import type { FolderNode } from '@windows-explorer/contracts'
import { useExpandedNodes } from './useExpandedNodes'

function findNode(nodes: FolderNode[], id: number): FolderNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return undefined
}

export function useFolderTree() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['folder-tree'],
    queryFn: () => api.getFolderTree(),
    staleTime: 60_000,
  })

  // shallowRef so Vue doesn't recursively proxy the entire tree
  const tree = shallowRef<FolderNode[]>([])

  const { toggle } = useExpandedNodes()

  watch(data, (val) => {
    tree.value = val?.data.children ?? []
  }, { immediate: true })

  async function expandNode(id: number): Promise<void> {
    if (!tree.value?.length) return

    const node = findNode(tree.value, id)
    if (!node) return

    if (node.children === undefined) {
      const response = await api.getFolderChildren(id)
      node.children = response.data
      // Shallow copy to trigger shallowRef reactivity
      tree.value = [...tree.value]
    }

    toggle(id)
  }

  return { tree: readonly(tree), isLoading, error, expandNode }
}
