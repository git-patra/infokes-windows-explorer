import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { api } from '../api/client'

export function useFolderChildren(folderId: () => number | null) {
  const enabled = computed(() => folderId() !== null)

  const { data, isLoading, error } = useQuery({
    queryKey: computed(() => ['folder-children', folderId()]),
    queryFn: () => api.getFolderChildren(folderId()!),
    enabled,
    staleTime: 60_000,
  })

  const children = computed(() => data.value?.data ?? [])
  const total = computed(() => data.value?.meta.total ?? 0)

  return { children, total, isLoading, error }
}
