<script lang="ts" module>
  import type { HTMLAttributes } from 'svelte/elements'

  export interface TreeNode {
    label: string
    /**
     * What the row stands for: what selecting or checking a leaf gives `onValueChange`, and what `onExpand`
     * and `onRename` are called with. A row with neither `href` nor `children` can be selected.
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

  export interface TreeProps extends Omit<HTMLAttributes<HTMLUListElement>, 'role' | 'children'> {
    nodes: TreeNode[]
    /** Any number of rows are selected; the value is then the list of them. */
    multiple?: boolean
    /** Every row has a check, and checking a branch checks the rows under it; the value is the list of checked leaves. */
    checkable?: boolean
    /**
     * The value of the selected row, null for none. With `multiple`, the selected rows; with `checkable`, the
     * checked leaves, branches left out; both in the order of the tree. Bind it, or leave it out.
     */
    value?: string | string[] | null
    onValueChange?: (value: string | string[] | null) => void
    /**
     * Called with a branch's value each time it opens. A branch with `children: []` is busy until its rows
     * arrive: give it its children in `nodes`.
     */
    onExpand?: (value: string) => void
    /** Makes F2 rename the row in focus; called with the row's value and its new label. Keep the label in `nodes`. */
    onRename?: (value: string, label: string) => void
    /** The accessible name of the rename field. "Rename" and the label by default. */
    renameLabel?: (label: string) => string
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { tree } from '@master/ui/behaviors/tree.js'
  import { behavior } from './behavior.svelte.js'

  let { nodes, multiple, checkable, value = $bindable(), onValueChange, onExpand, onRename, renameLabel, class: className, ...root }: TreeProps = $props()
  // The first value's rows are selected or checked in the first render; after that the behavior writes them. A
  // row written later, from new nodes, is drawn with the value as it is then, which is not read as state.
  const chosen = { values: [untrack(() => value) ?? []].flat() as string[] }
  const has = (node: TreeNode) => node.value !== undefined && chosen.values.includes(node.value)
  /** A branch says what the rows under it say: all checked, none, or mixed. */
  const checked = (node: TreeNode): 'true' | 'false' | 'mixed' => {
    if (!node.children?.length) return has(node) ? 'true' : 'false'
    const states = node.children.map(checked)
    return states.every(state => state === 'true') ? 'true' : states.every(state => state === 'false') ? 'false' : 'mixed'
  }
  const attach = behavior(tree, () => ({ rename: Boolean(onRename), renameLabel }), {
    value: () => value,
    change: (next) => { chosen.values = [next ?? []].flat(); value = next; onValueChange?.(next) },
    settled: (held) => { chosen.values = [held ?? []].flat() },
    on: {
      expand: (event) => onExpand?.((event as CustomEvent<{ value: string }>).detail.value),
      rename: (event) => {
        const { value, label } = (event as CustomEvent<{ value: string, label: string }>).detail
        onRename?.(value, label)
      },
    },
  })
</script>

{#snippet inside(node: TreeNode)}
  {#if node.children?.length === 0}<span class="spinner" aria-hidden="true"></span>{/if}
  {#if checkable}<span class="tree-check" aria-hidden="true"></span>{/if}
  <span class="tree-label">{node.label}</span>
{/snippet}

{#snippet rows(list: TreeNode[])}
  <!-- svelte-ignore a11y_role_has_required_aria_props -->
  <!-- A row is the node it stands for, not its place: a branch the reader opened stays open when a row is written above it. -->
  {#each list as node, index (node.value ?? index)}
    <li role="none">
      {#if node.children}
        <div class="tree-item tree-toggle" role="treeitem" data-value={node.value} aria-expanded={node.open ?? false} aria-checked={checkable ? checked(node) : undefined} aria-disabled={node.disabled || undefined}>{@render inside(node)}</div>
        <ul class="tree-sub" role="group">{@render rows(node.children)}</ul>
      {:else if node.href}
        <a class="tree-item" role="treeitem" href={node.href} aria-current={node.current ? 'page' : undefined} aria-checked={checkable ? checked(node) : undefined} aria-disabled={node.disabled || undefined}>{@render inside(node)}</a>
      {:else}
        <div class="tree-item" role="treeitem" data-value={node.value} aria-selected={checkable ? undefined : multiple ? has(node) : has(node) || undefined} aria-checked={checkable ? checked(node) : undefined} aria-disabled={node.disabled || undefined}>{@render inside(node)}</div>
      {/if}
    </li>
  {/each}
{/snippet}

<!--
  @component
  A tree walked and folded with the arrow keys. Name it with `aria-label` or `aria-labelledby`.
-->
<ul class={['tree', className]} role="tree" aria-multiselectable={multiple || checkable || undefined} {@attach attach} {...root}>{@render rows(nodes)}</ul>
