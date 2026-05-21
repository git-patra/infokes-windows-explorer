<script setup lang="ts">
import { useSelection } from '../../composables/useSelection'
import { useFolderDetail } from '../../composables/useFolderDetail'
import FolderTree from './FolderTree.vue'
import SubfolderList from './SubfolderList.vue'
import Breadcrumb from './Breadcrumb.vue'

const { selectedId, select } = useSelection()
const { breadcrumb } = useFolderDetail(() => selectedId.value)

function handleSelect(id: number) {
  select(id)
}
</script>

<template>
  <div class="flex h-full overflow-hidden bg-[#1e1e2e] text-[#cdd6f4] font-sans">
    <!-- Left panel: folder tree -->
    <aside class="w-[280px] flex-shrink-0 border-r border-[#313244] overflow-y-auto">
      <FolderTree />
    </aside>

    <!-- Right panel: breadcrumb + subfolder grid -->
    <main class="flex flex-col flex-1 min-w-0 overflow-hidden">
      <Breadcrumb
        :items="breadcrumb"
        @select="handleSelect"
      />
      <SubfolderList
        :folder-id="selectedId"
        @select="handleSelect"
      />
    </main>
  </div>
</template>
