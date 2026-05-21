<script setup lang="ts">
import { Home } from 'lucide-vue-next'

const props = defineProps<{
  items: { id: number; name: string }[]
}>()

const emit = defineEmits<{
  select: [id: number]
}>()
</script>

<template>
  <nav class="flex items-center gap-1 px-4 py-2 text-sm text-[#cdd6f4] border-b border-[#313244] overflow-x-auto whitespace-nowrap">
    <!-- Root / Home -->
    <button
      class="flex items-center gap-1 text-[#89b4fa] hover:text-[#cdd6f4] transition-colors"
      :class="{ 'text-[#585b70] pointer-events-none': items.length === 0 }"
      @click="items.length > 0 && emit('select', 0)"
    >
      <Home :size="14" />
      <span>Root</span>
    </button>

    <!-- Breadcrumb segments -->
    <template v-for="(item, index) in items" :key="item.id">
      <span class="text-[#585b70]">/</span>
      <span
        v-if="index === items.length - 1"
        class="text-[#cdd6f4] font-medium"
      >
        {{ item.name }}
      </span>
      <button
        v-else
        class="text-[#89b4fa] hover:text-[#cdd6f4] transition-colors"
        @click="emit('select', item.id)"
      >
        {{ item.name }}
      </button>
    </template>
  </nav>
</template>
