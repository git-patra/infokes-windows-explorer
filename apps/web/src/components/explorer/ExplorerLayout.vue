<script setup lang="ts">
import { useSelection } from '../../composables/useSelection'
import { useFolderDetail } from '../../composables/useFolderDetail'
import FolderTree from './FolderTree.vue'
import SubfolderList from './SubfolderList.vue'
import FileList from './FileList.vue'
import Breadcrumb from './Breadcrumb.vue'
import ExplorerToolbar from './ExplorerToolbar.vue'

const { selectedId, select } = useSelection()
const { breadcrumb } = useFolderDetail(() => selectedId.value)

function handleSelect(id: number | null) {
  select(id)
}
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden bg-[#1e1e2e] text-[#cdd6f4] font-sans">
    <!-- Toolbar: search bar -->
    <ExplorerToolbar />

    <!-- Two-pane body -->
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <!-- Left panel: folder tree -->
      <aside class="w-[280px] flex-shrink-0 border-r border-[#313244] overflow-y-auto">
        <FolderTree />
      </aside>

      <!-- Right panel: breadcrumb + subfolder grid + file list -->
      <main class="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Breadcrumb
          :items="breadcrumb"
          @select="handleSelect"
        />
        <div class="flex-1 overflow-y-auto">
          <SubfolderList
            :folder-id="selectedId"
            @select="handleSelect"
          />
          <FileList :folder-id="selectedId" />
        </div>
      </main>
    </div>
  </div>
</template>
