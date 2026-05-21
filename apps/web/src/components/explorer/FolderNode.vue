<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-vue-next'
import { useExpandedNodes } from '../../composables/useExpandedNodes'
import { useSelection } from '../../composables/useSelection'
import type { FolderNode as FolderNodeType } from '@windows-explorer/contracts'

// This declaration is CRITICAL for recursive self-reference
defineOptions({ name: 'FolderNode' })

const props = defineProps<{
  node: FolderNodeType
  ancestors?: Set<number>   // cycle detection: IDs of all ancestors
}>()

const { isExpanded, toggle } = useExpandedNodes()
const { selectedId, select } = useSelection()

const isSelected = computed(() => selectedId.value === props.node.id)
const expanded = computed(() => isExpanded(props.node.id))

// Cycle defense — build the ancestor set for children
const childAncestors = computed(() => {
  if (props.ancestors?.has(props.node.id)) {
    console.warn(`[FolderNode] Cycle detected at node ${props.node.id} — skipping render`)
    return null  // null signals the cycle to the template
  }
  const next = new Set(props.ancestors ?? [])
  next.add(props.node.id)
  return next
})

function handleClick() {
  select(props.node.id)
  if (props.node.hasChildren) {
    toggle(props.node.id)
  }
}
</script>

<template>
  <!-- Skip rendering if we're in a cycle -->
  <template v-if="childAncestors !== null">
    <li
      v-memo="[node.id, expanded, isSelected]"
      class="folder-item"
      :class="{ selected: isSelected }"
      :data-id="node.id"
    >
      <div class="folder-row" @click.stop="handleClick">
        <!-- Caret / indent indicator -->
        <span class="caret">
          <ChevronDown v-if="node.hasChildren && expanded" :size="14" />
          <ChevronRight v-else-if="node.hasChildren" :size="14" />
          <span v-else class="caret-spacer" />
        </span>

        <!-- Folder icon -->
        <FolderOpen v-if="expanded && node.hasChildren" :size="14" class="folder-icon" />
        <Folder v-else :size="14" class="folder-icon" />

        <!-- Name -->
        <span class="folder-name">{{ node.name }}</span>

        <!-- Child count badge -->
        <span v-if="node.childCount > 0" class="child-count">{{ node.childCount }}</span>
      </div>

      <!-- Recursive children — only rendered when expanded AND has children -->
      <ul
        v-if="expanded && node.children && node.children.length > 0"
        class="children-list"
      >
        <FolderNode
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :ancestors="childAncestors"
        />
      </ul>
    </li>
  </template>
</template>

<style scoped>
.folder-item {
  list-style: none;
  user-select: none;
}

.folder-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #cdd6f4;
  contain: layout style; /* CSS containment for perf */
}

.folder-row:hover {
  background: #313244;
}

.folder-item.selected > .folder-row {
  background: #45475a;
  color: #cba6f7;
}

.caret {
  width: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  color: #585b70;
}

.caret-spacer {
  display: inline-block;
  width: 14px;
}

.folder-icon {
  flex-shrink: 0;
  color: #f9e2af;
}

.folder-name {
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.child-count {
  font-size: 11px;
  color: #585b70;
  flex-shrink: 0;
}

.children-list {
  padding-left: 18px;
  margin: 0;
  padding-top: 0;
  padding-right: 0;
  padding-bottom: 0;
}
</style>
