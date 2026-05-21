import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

export function useSelection() {
  const router = useRouter()
  const route = useRoute()

  const selectedId = computed({
    get: () => {
      const id = route.query.folderId
      return id ? Number(id) : null
    },
    set: (id: number | null) => {
      router.replace({ query: id !== null ? { folderId: String(id) } : {} })
    },
  })

  function select(id: number | null): void {
    selectedId.value = id
  }

  function clear(): void {
    selectedId.value = null
  }

  return { selectedId, select, clear }
}
