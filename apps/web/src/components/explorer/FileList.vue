<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { File } from 'lucide-vue-next'
import { api } from '../../api/client'

const props = defineProps<{
  folderId: number | null
}>()

const { data, isLoading } = useQuery({
  queryKey: computed(() => ['folder-files', props.folderId]),
  queryFn: () => api.getFolderFiles(props.folderId!),
  enabled: computed(() => props.folderId !== null),
  staleTime: 30_000,
})

const files = computed(() => data.value?.data ?? [])
const total = computed(() => data.value?.meta.total ?? 0)

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
</script>

<template>
  <div v-if="folderId !== null" class="px-4 pb-4">
    <!-- Divider -->
    <div class="border-t border-[#313244] mb-3" />

    <!-- Loading -->
    <div v-if="isLoading" class="text-[#585b70] text-sm py-2">Loading files…</div>

    <!-- Empty -->
    <div v-else-if="files.length === 0" class="text-[#585b70] text-sm py-2 italic">
      No files in this folder
    </div>

    <!-- File rows -->
    <div v-else>
      <p class="text-[#585b70] text-xs mb-2">{{ total }} file{{ total !== 1 ? 's' : '' }}</p>
      <ul class="space-y-1">
        <li
          v-for="file in files"
          :key="file.id"
          class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#313244] transition-colors"
        >
          <File :size="16" class="text-[#89b4fa] flex-shrink-0" />
          <span class="text-sm truncate flex-1 text-[#cdd6f4]">{{ file.name }}</span>
          <span
            v-if="file.mimeType"
            class="text-xs px-1.5 py-0.5 rounded bg-[#313244] text-[#a6adc8] flex-shrink-0 font-mono"
          >{{ file.mimeType }}</span>
          <span class="text-xs text-[#585b70] flex-shrink-0 w-16 text-right">
            {{ formatSize(file.sizeBytes) }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>
