import { ref } from 'vue'
// Full implementation in Phase 7
export function useSelection() {
  const selectedId = ref<number | null>(null)
  function select(id: number) { selectedId.value = id }
  function clear() { selectedId.value = null }
  return { selectedId, select, clear }
}
