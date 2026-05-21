import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { api } from '../api/client'

export function useFolderDetail(folderId: () => number | null) {
  const enabled = computed(() => folderId() !== null)

  const { data, isLoading, error } = useQuery({
    queryKey: computed(() => ['folder-detail', folderId()]),
    queryFn: () => api.getFolderById(folderId()!),
    enabled,
    staleTime: 60_000,
    placeholderData: undefined,
  })

  const breadcrumb = computed(() => {
    if (isLoading.value || error.value) return []
    return data.value?.breadcrumb ?? []
  })

  return { breadcrumb, isLoading, error }
}
