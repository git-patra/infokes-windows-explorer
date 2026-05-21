import { shallowRef, readonly, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { api } from '../api/client'
import type { FolderNode } from '@windows-explorer/contracts'

export function useFolderTree() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['folder-tree'],
    queryFn: () => api.getFolderTree(),
    staleTime: 60_000,
  })

  // shallowRef so Vue doesn't recursively proxy the entire tree
  const tree = shallowRef<FolderNode[]>([])

  watch(data, (val) => {
    tree.value = val?.data.children ?? []
  }, { immediate: true })

  return { tree: readonly(tree), isLoading, error }
}
