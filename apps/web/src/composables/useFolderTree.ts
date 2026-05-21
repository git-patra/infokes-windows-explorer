import { shallowRef } from 'vue'
import type { FolderNode } from '@windows-explorer/contracts'
// Full implementation in Phase 6
export function useFolderTree() {
  const tree = shallowRef<FolderNode[]>([])
  const isLoading = shallowRef(false)
  const error = shallowRef<Error | null>(null)
  return { tree, isLoading, error }
}
