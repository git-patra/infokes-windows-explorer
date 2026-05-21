<script setup lang="ts">
import { Folder } from 'lucide-vue-next'
import { useFolderChildren } from '../../composables/useFolderChildren'

const props = defineProps<{
  folderId: number | null
}>()

const emit = defineEmits<{
  select: [id: number]
}>()

const { children, total, isLoading } = useFolderChildren(() => props.folderId)
</script>

<template>
  <div class="flex-1 overflow-y-auto p-4">
    <!-- No selection -->
    <div
      v-if="folderId === null"
      class="flex items-center justify-center h-full"
    >
      <p class="text-[#585b70] text-sm">Select a folder to see its contents</p>
    </div>

    <!-- Loading -->
    <div
      v-else-if="isLoading"
      class="flex items-center justify-center h-full"
    >
      <p class="text-[#585b70] text-sm">Loading...</p>
    </div>

    <!-- Empty -->
    <div
      v-else-if="children.length === 0"
      class="flex items-center justify-center h-full"
    >
      <p class="text-[#585b70] text-sm">This folder has no subfolders</p>
    </div>

    <!-- Grid of folder cards -->
    <div v-else>
      <p class="text-[#585b70] text-xs mb-3">{{ total }} subfolder{{ total !== 1 ? 's' : '' }}</p>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
        <button
          v-for="child in children"
          :key="child.id"
          class="flex items-center gap-2 p-3 rounded-lg text-left text-[#cdd6f4] hover:bg-[#313244] cursor-pointer transition-colors w-full"
          @click="emit('select', child.id)"
        >
          <Folder :size="18" class="text-[#f9e2af] flex-shrink-0" />
          <span class="text-sm truncate">{{ child.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
