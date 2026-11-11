<script lang="ts">
export interface TreeNode {
  label: string
  /** What selecting the row gives the model. A row with neither `href` nor `children` can be selected. */
  value?: string
  /** A row that is a link. `current` marks the page that is open. */
  href?: string
  current?: boolean
  /** The rows under a branch, and whether it starts open. */
  children?: TreeNode[]
  open?: boolean
  disabled?: boolean
}
</script>

<script setup lang="ts">
import { h, useTemplateRef, type FunctionalComponent } from 'vue'
import { tree } from '@master/ui/behaviors/tree.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

defineProps<{
  nodes: TreeNode[]
}>()
/** The value of the selected row, null for none: `v-model`. */
const model = defineModel<string | null>()

/* A tree walked and folded with the arrow keys. Name it with `aria-label` or `aria-labelledby`. */
const root = useTemplateRef<HTMLUListElement>('root')
useBehavior(root, tree, undefined, model)
/** The first value's row is selected in the first render; after that the behavior writes `aria-selected`. */
const first = model.value

/** The rows of one level, and under each branch the rows of the next. */
const Rows: FunctionalComponent<{ nodes: TreeNode[] }> = ({ nodes }) => nodes.map((node, index) => h('li', { role: 'none', key: index }, node.children
  ? [
      h('div', { 'class': 'tree-item tree-toggle', 'role': 'treeitem', 'aria-expanded': node.open ?? false, 'aria-disabled': node.disabled || undefined }, node.label),
      h('ul', { class: 'tree-sub', role: 'group' }, h(Rows, { nodes: node.children })),
    ]
  : node.href
    ? h('a', { 'class': 'tree-item', 'role': 'treeitem', 'href': node.href, 'aria-current': node.current ? 'page' : undefined, 'aria-disabled': node.disabled || undefined }, node.label)
    : h('div', { 'class': 'tree-item', 'role': 'treeitem', 'data-value': node.value, 'aria-selected': (node.value !== undefined && node.value === first) || undefined, 'aria-disabled': node.disabled || undefined }, node.label)))
Rows.props = ['nodes']
</script>

<template>
  <ul class="tree" role="tree" ref="root" v-bind="$attrs"><Rows :nodes="nodes" /></ul>
</template>
