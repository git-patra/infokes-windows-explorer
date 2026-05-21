import { ref } from 'vue'
import type { FolderNode } from '@windows-explorer/contracts'
// Full implementation in Phase 7
export function useFolderChildren(_folderId: number | null) {
  const children = ref<FolderNode[]>([])
  const isLoading = ref(false)
  return { children, isLoading }
}
