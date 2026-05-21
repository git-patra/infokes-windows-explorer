<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, Folder, File } from 'lucide-vue-next'
import { useSearch } from '../../composables/useSearch'
import { useSelection } from '../../composables/useSelection'

const { select } = useSelection()

const searchQuery = ref('')
const showDropdown = ref(false)

const { results, isLoading } = useSearch(() => searchQuery.value)

const hasQuery = computed(() => searchQuery.value.trim().length >= 2)

function onFocus() {
  showDropdown.value = true
}

function onBlur() {
  // Small delay so click on a result fires before the dropdown closes
  setTimeout(() => {
    showDropdown.value = false
  }, 150)
}

function handleResultClick(result: { id: number; type: 'folder' | 'file'; folderId: number | null }) {
  const targetId = result.type === 'folder' ? result.id : result.folderId
  if (targetId !== null) {
    select(targetId)
  }
  searchQuery.value = ''
  showDropdown.value = false
}
</script>

<template>
  <div class="flex items-center px-4 py-2 border-b border-[#313244] bg-[#181825] relative z-40">
    <div class="relative w-full max-w-xl">
      <!-- Input -->
      <div class="flex items-center gap-2 bg-[#313244] rounded-lg px-3 py-1.5">
        <Search :size="14" class="text-[#585b70] flex-shrink-0" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search folders and files…"
          class="bg-transparent text-sm text-[#cdd6f4] placeholder-[#585b70] outline-none w-full"
          @focus="onFocus"
          @blur="onBlur"
        />
      </div>

      <!-- Dropdown -->
      <div
        v-if="showDropdown && hasQuery"
        class="absolute top-full left-0 right-0 mt-1 bg-[#1e1e2e] border border-[#313244] rounded-lg shadow-xl overflow-hidden"
        style="z-index: 50"
      >
        <!-- Loading -->
        <div v-if="isLoading" class="px-4 py-3 text-sm text-[#585b70]">Searching…</div>

        <!-- No results -->
        <div
          v-else-if="results.length === 0"
          class="px-4 py-3 text-sm text-[#585b70]"
        >No results for "{{ searchQuery.trim() }}"</div>

        <!-- Results list -->
        <ul v-else class="max-h-72 overflow-y-auto">
          <li
            v-for="result in results"
            :key="`${result.type}-${result.id}`"
          >
            <button
              class="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-[#313244] transition-colors"
              @mousedown.prevent="handleResultClick(result)"
            >
              <Folder
                v-if="result.type === 'folder'"
                :size="15"
                class="text-[#f9e2af] flex-shrink-0"
              />
              <File
                v-else
                :size="15"
                class="text-[#89b4fa] flex-shrink-0"
              />
              <div class="min-w-0">
                <p class="text-sm text-[#cdd6f4] truncate">{{ result.name }}</p>
                <p class="text-xs text-[#585b70] truncate">{{ result.path }}</p>
              </div>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
