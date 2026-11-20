<script lang="ts">
export interface TreeNode {
  label: string
  /**
   * What the row stands for: what selecting or checking a leaf gives the model, and what `expand` and
   * `rename` say. A row with neither `href` nor `children` can be selected.
   */
  value?: string
  /** A row that is a link. `current` marks the page that is open. */
  href?: string
  current?: boolean
  /** The rows under a branch, and whether it starts open. `[]` is a branch whose rows are loaded when it opens. */
  children?: TreeNode[]
  open?: boolean
  disabled?: boolean
}
</script>

<script setup lang="ts">
import { h, useTemplateRef, type FunctionalComponent, type VNode } from 'vue'
import { tree } from '@master/ui/behaviors/tree.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const { multiple, checkable, onRename, renameLabel } = defineProps<{
  nodes: TreeNode[]
  /** Any number of rows are selected; the model is then the list of them. */
  multiple?: boolean
  /** Every row has a check, and checking a branch checks the rows under it; the model is the list of checked leaves. */
  checkable?: boolean
  /**
   * `@rename`: makes F2 rename the row in focus, and hears the row's value and its new label. Keep the label
   * in `nodes`. It is a prop, not an emit, so the tree offers renaming only when it is listened to.
   */
  onRename?: (value: string, label: string) => void
  /** The accessible name of the rename field. "Rename" and the label by default. */
  renameLabel?: (label: string) => string
}>()
/**
 * The value of the selected row, null for none. With `multiple`, the selected rows; with `checkable`, the
 * checked leaves, branches left out; both in the order of the tree: `v-model`.
 */
const model = defineModel<string | string[] | null>()
const emit = defineEmits<{
  /** A branch opened. One with `children: []` is busy until its rows arrive: give it its children in `nodes`. */
  expand: [value: string]
}>()

/* A tree walked and folded with the arrow keys. Name it with `aria-label` or `aria-labelledby`. */
const root = useTemplateRef<HTMLUListElement>('root')
useBehavior(root, tree, () => ({ rename: Boolean(onRename), renameLabel }), model, {
  expand: (event) => emit('expand', (event as CustomEvent<{ value: string }>).detail.value),
  rename: (event) => {
    const { value, label } = (event as CustomEvent<{ value: string, label: string }>).detail
    onRename?.(value, label)
  },
})
/** The first value's rows are selected or checked in the first render; after that the behavior writes them. */
const first = model.value
const chosen = [first ?? []].flat() as string[]
const has = (node: TreeNode) => node.value !== undefined && chosen.includes(node.value)
/** A branch says what the rows under it say: all checked, none, or mixed. */
const checked = (node: TreeNode): 'true' | 'false' | 'mixed' => {
  if (!node.children?.length) return has(node) ? 'true' : 'false'
  const states = node.children.map(checked)
  return states.every(state => state === 'true') ? 'true' : states.every(state => state === 'false') ? 'false' : 'mixed'
}

/** The chevron a branch's row holds in its column: Master Icons' chevron-right at 16, turned by the stylesheet when the branch is open. */
const chevron = () => h('svg', { 'class': 'icon tree-chevron', 'viewBox': '0 0 16 16', 'fill': 'none', 'stroke': 'currentColor', 'stroke-width': '1', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, [h('path', { d: 'M6 3.5L10.3586 7.8586A0.2 0.2 0 0 1 10.3586 8.1414L6 12.5' })])
/** What a row holds: a spinner while its rows are on their way, its check, and its label. */
const inside = (node: TreeNode): VNode[] => [
  ...(node.children?.length === 0 ? [h('span', { 'class': 'spinner', 'aria-hidden': 'true' })] : []),
  ...(checkable ? [h('span', { 'class': 'tree-check', 'aria-hidden': 'true' })] : []),
  h('span', { class: 'tree-label' }, node.label),
]
/** The rows of one level, and under each branch the rows of the next. */
const Rows: FunctionalComponent<{ nodes: TreeNode[] }> = ({ nodes }) => nodes.map((node, index) => {
  const state = { 'aria-checked': checkable ? checked(node) : undefined, 'aria-disabled': node.disabled || undefined }
  // A row is the node it stands for, not its place: a branch the reader opened stays open when a row is written above it.
  return h('li', { role: 'none', key: node.value ?? index }, node.children
    ? [
        h('div', { 'class': 'tree-item tree-toggle', 'role': 'treeitem', 'data-value': node.value, 'aria-expanded': node.open ?? false, ...state }, [chevron(), ...inside(node)]),
        h('ul', { class: 'tree-sub', role: 'group' }, h(Rows, { nodes: node.children })),
      ]
    : node.href
      ? h('a', { 'class': 'tree-item', 'role': 'treeitem', 'href': node.href, 'aria-current': node.current ? 'page' : undefined, ...state }, inside(node))
      : h('div', { 'class': 'tree-item', 'role': 'treeitem', 'data-value': node.value, 'aria-selected': checkable ? undefined : multiple ? has(node) : (node.value !== undefined && node.value === first) || undefined, ...state }, inside(node)))
})
Rows.props = ['nodes']
</script>

<template>
  <ul class="tree" role="tree" :aria-multiselectable="multiple || checkable || undefined" ref="root" v-bind="$attrs"><Rows :nodes="nodes" /></ul>
</template>
