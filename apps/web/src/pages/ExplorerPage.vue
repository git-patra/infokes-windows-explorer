<script setup lang="ts">
import { useFolderTree } from '../composables/useFolderTree'
import ExplorerLayout from '../components/explorer/ExplorerLayout.vue'

const { isLoading, error } = useFolderTree()
</script>

<template>
  <!-- Full-page loading spinner while tree loads -->
  <div
    v-if="isLoading"
    class="flex items-center justify-center h-full bg-[#1e1e2e]"
  >
    <div class="flex flex-col items-center gap-3">
      <div class="w-8 h-8 border-2 border-[#89b4fa] border-t-transparent rounded-full animate-spin" />
      <p class="text-[#585b70] text-sm">Loading file system…</p>
    </div>
  </div>

  <!-- Error state -->
  <div
    v-else-if="error"
    class="flex items-center justify-center h-full bg-[#1e1e2e]"
  >
    <div class="text-center">
      <p class="text-[#f38ba8] text-sm font-medium">Failed to load folder tree</p>
      <p class="text-[#585b70] text-xs mt-1">{{ (error as Error).message }}</p>
    </div>
  </div>

  <!-- Main explorer layout -->
  <ExplorerLayout v-else class="h-full" />
</template>
