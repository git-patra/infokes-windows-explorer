import { ref } from 'vue'
// Full implementation in Phase 6
export function useExpandedNodes() {
  const expanded = ref(new Set<number>())
  function toggle(id: number) {
    if (expanded.value.has(id)) expanded.value.delete(id)
    else expanded.value.add(id)
  }
  function isExpanded(id: number) { return expanded.value.has(id) }
  return { expanded, toggle, isExpanded }
}
