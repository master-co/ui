<script lang="ts" module>
  import type { HTMLAttributes } from 'svelte/elements'

  export interface TreeNode {
    label: string
    /** What selecting the row gives `onValueChange`. A row with neither `href` nor `children` can be selected. */
    value?: string
    /** A row that is a link. `current` marks the page that is open. */
    href?: string
    current?: boolean
    /** The rows under a branch, and whether it starts open. */
    children?: TreeNode[]
    open?: boolean
    disabled?: boolean
  }

  export interface TreeProps extends Omit<HTMLAttributes<HTMLUListElement>, 'role' | 'children'> {
    nodes: TreeNode[]
    /** The value of the selected row, null for none. Bind it, or leave it out. */
    value?: string | null
    onValueChange?: (value: string | null) => void
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { tree } from '@master/ui/behaviors/tree.js'
  import { behavior } from './behavior.svelte.js'

  let { nodes, value = $bindable(), onValueChange, class: className, ...root }: TreeProps = $props()
  const first = untrack(() => value)
  const attach = behavior(tree, undefined, {
    value: () => value,
    change: (next) => { value = next; onValueChange?.(next) },
  })
</script>

{#snippet rows(list: TreeNode[])}
  <!-- The first value's row is selected in the first render; after that the behavior writes `aria-selected`. -->
  <!-- svelte-ignore a11y_role_has_required_aria_props -->
  {#each list as node}
    <li role="none">
      {#if node.children}
        <div class="tree-item tree-toggle" role="treeitem" aria-expanded={node.open ?? false} aria-disabled={node.disabled || undefined}>{node.label}</div>
        <ul class="tree-sub" role="group">{@render rows(node.children)}</ul>
      {:else if node.href}
        <a class="tree-item" role="treeitem" href={node.href} aria-current={node.current ? 'page' : undefined} aria-disabled={node.disabled || undefined}>{node.label}</a>
      {:else}
        <div class="tree-item" role="treeitem" data-value={node.value} aria-selected={(node.value !== undefined && node.value === first) || undefined} aria-disabled={node.disabled || undefined}>{node.label}</div>
      {/if}
    </li>
  {/each}
{/snippet}

<!--
  @component
  A tree walked and folded with the arrow keys. Name it with `aria-label` or `aria-labelledby`.
-->
<ul class={['tree', className]} role="tree" {@attach attach} {...root}>{@render rows(nodes)}</ul>
