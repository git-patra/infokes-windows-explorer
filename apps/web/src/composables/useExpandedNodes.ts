import { ref } from 'vue'

const STORAGE_KEY = 'expanded-nodes'

function loadFromStorage(): Set<number> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) return new Set(JSON.parse(raw) as number[])
  } catch { /* ignore */ }
  return new Set()
}

function saveToStorage(set: Set<number>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
  } catch { /* ignore */ }
}

// Module-level singleton so all components share the same expansion state
const _expanded = ref<Set<number>>(loadFromStorage())

export function useExpandedNodes() {
  function isExpanded(id: number): boolean {
    return _expanded.value.has(id)
  }

  function toggle(id: number): void {
    const next = new Set(_expanded.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    _expanded.value = next  // reassign to trigger reactivity
    saveToStorage(next)
  }

  function expand(id: number): void {
    if (!_expanded.value.has(id)) {
      const next = new Set(_expanded.value)
      next.add(id)
      _expanded.value = next
      saveToStorage(next)
    }
  }

  function collapseAll(): void {
    _expanded.value = new Set()
    saveToStorage(new Set())
  }

  return { expanded: _expanded, isExpanded, toggle, expand, collapseAll }
}
