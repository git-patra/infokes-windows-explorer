import { ref, computed, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { api } from '../api/client'
import type { SearchResult } from '@windows-explorer/contracts'

export function useSearch(query: () => string) {
  // Debounced copy of the query
  const debouncedQuery = ref('')
  let timer: ReturnType<typeof setTimeout> | undefined

  watch(
    query,
    (val) => {
      clearTimeout(timer)
      if (val.trim().length < 2) {
        // Clear immediately so stale results never show
        debouncedQuery.value = ''
      } else {
        timer = setTimeout(() => {
          debouncedQuery.value = val.trim()
        }, 300)
      }
    },
    { immediate: true },
  )

  const enabled = computed(() => debouncedQuery.value.length >= 2)

  const { data, isLoading, error } = useQuery({
    queryKey: computed(() => ['search', debouncedQuery.value]),
    queryFn: () => api.search(debouncedQuery.value),
    enabled,
    staleTime: 15_000,
  })

  const results = computed<SearchResult[]>(() =>
    enabled.value ? (data.value?.data ?? []) : [],
  )

  return { results, isLoading, error }
}
