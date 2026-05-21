import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { createRouter, createWebHistory } from 'vue-router'
import FolderNode from '../../src/components/explorer/FolderNode.vue'
import type { FolderNode as FolderNodeType } from '@windows-explorer/contracts'

// Minimal router for useSelection composable
const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/', component: { template: '<div/>' } }],
})

function makeNode(id: number, opts: Partial<FolderNodeType> = {}): FolderNodeType {
  return {
    id,
    parentId: null,
    name: `Folder ${id}`,
    depth: 0,
    hasChildren: false,
    childCount: 0,
    ...opts,
  }
}

const queryClient = new QueryClient()

function mountNode(node: FolderNodeType, ancestors?: Set<number>) {
  return mount(FolderNode, {
    props: { node, ancestors },
    global: {
      plugins: [createPinia(), [VueQueryPlugin, { queryClient }], router],
    },
  })
}

describe('FolderNode', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
  })

  it('renders the folder name', () => {
    const wrapper = mountNode(makeNode(1, { name: 'Documents' }))
    expect(wrapper.text()).toContain('Documents')
  })

  it('does not render children when node has no children', () => {
    const node = makeNode(1, { hasChildren: false, childCount: 0 })
    const wrapper = mountNode(node)
    expect(wrapper.find('.children-list').exists()).toBe(false)
  })

  it('skips rendering when node id is in ancestors (cycle detection)', () => {
    const node = makeNode(5)
    const ancestors = new Set([5])  // node 5 is its own ancestor — cycle!
    const wrapper = mountNode(node, ancestors)
    // When cycle detected, the li.folder-item should not be rendered
    expect(wrapper.find('.folder-item').exists()).toBe(false)
  })

  it('shows caret for folder with children', () => {
    const node = makeNode(1, { hasChildren: true, childCount: 2 })
    const wrapper = mountNode(node)
    // Should have a caret icon (ChevronRight when collapsed)
    // We check that the caret span is present and not empty
    const caret = wrapper.find('.caret')
    expect(caret.exists()).toBe(true)
  })

  it('renders children when expanded', async () => {
    const child = makeNode(2, { name: 'Child Folder' })
    const node = makeNode(1, {
      name: 'Parent',
      hasChildren: true,
      childCount: 1,
      children: [child],
    })
    const wrapper = mountNode(node)

    // Click to expand
    await wrapper.find('.folder-row').trigger('click')
    await wrapper.vm.$nextTick()

    // Children list should now be present
    expect(wrapper.find('.children-list').exists()).toBe(true)
    expect(wrapper.text()).toContain('Child Folder')
  })
})
