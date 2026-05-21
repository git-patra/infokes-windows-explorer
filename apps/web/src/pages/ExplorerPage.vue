<script setup lang="ts">
// Placeholder — wired up in Phase 6 and 7
</script>

<template>
  <div class="explorer-layout">
    <div class="left-panel">
      <p class="placeholder-text">Folder tree — coming in Phase 6</p>
    </div>
    <div class="resizer" />
    <div class="right-panel">
      <p class="placeholder-text">Subfolder list — coming in Phase 7</p>
    </div>
  </div>
</template>

<style scoped>
.explorer-layout {
  display: flex;
  height: 100%;
  background: #1e1e2e;
  color: #cdd6f4;
  font-family: system-ui, sans-serif;
  overflow: hidden;
}

.left-panel {
  width: 280px;
  min-width: 150px;
  max-width: 600px;
  border-right: 1px solid #313244;
  overflow-y: auto;
  padding: 8px;
  flex-shrink: 0;
}

.resizer {
  width: 4px;
  background: #313244;
  cursor: col-resize;
  flex-shrink: 0;
}

.right-panel {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.placeholder-text {
  color: #585b70;
  font-size: 13px;
}
</style>
