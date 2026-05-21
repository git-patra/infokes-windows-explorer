<script setup lang="ts">
import { useFolderTree } from '../../composables/useFolderTree'
import FolderNode from './FolderNode.vue'

const { tree, isLoading, error } = useFolderTree()
</script>

<template>
  <div class="folder-tree">
    <div v-if="isLoading" class="status-message">Loading folders...</div>
    <div v-else-if="error" class="status-message error">Failed to load folders</div>
    <ul v-else class="root-list" role="tree">
      <FolderNode
        v-for="node in tree"
        :key="node.id"
        :node="node"
      />
    </ul>
  </div>
</template>

<style scoped>
.folder-tree {
  height: 100%;
  overflow-y: auto;
}

.root-list {
  list-style: none;
  margin: 0;
  padding: 4px;
}

.status-message {
  padding: 16px;
  font-size: 13px;
  color: #585b70;
}

.status-message.error {
  color: #f38ba8;
}
</style>
