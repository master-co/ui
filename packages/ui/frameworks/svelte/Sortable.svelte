<script lang="ts" module>
  import type { Snippet } from 'svelte'
  import type { HTMLOlAttributes } from 'svelte/elements'
  import type { SortableMessages } from '@master/ui/behaviors/sortable.js'

  export interface SortableItem {
    /** What the item stands for in the order. */
    value: string
    /** What the item is called: its handle is named "Move <label>", and the status says it. */
    label: string
  }

  export interface SortableProps<T extends SortableItem> extends Omit<HTMLOlAttributes, 'children'> {
    items: T[]
    /** The order, as the items' values. Bind it, or leave it out: the order of `items`. */
    value?: string[]
    onValueChange?: (value: string[]) => void
    /** What an item shows beside its handle. */
    children: Snippet<[T]>
    /** Classes of each item, such as `list-row` in a `list`. */
    itemClass?: string
    /** The accessible name of a handle. `Move <label>` by default. */
    handleLabel?: (item: T) => string
    /** What the status region says, in the page's language. */
    messages?: SortableMessages
  }
</script>

<script lang="ts" generics="T extends SortableItem">
  import { tick, untrack } from 'svelte'
  import { sortable } from '@master/ui/behaviors/sortable.js'
  import { behavior } from './behavior.svelte.js'

  let { items, value = $bindable(), onValueChange, children, itemClass, handleLabel = (item: T) => `Move ${item.label}`, messages, class: className, ...root }: SortableProps<T> = $props()
  let kept = $state(untrack(() => value) ?? untrack(() => items.map(item => item.value)))
  const order = $derived(value ?? kept)
  const rank = (value: string) => {
    const index = order.indexOf(value)
    return index < 0 ? order.length : index
  }
  const shown = $derived([...items].sort((a, b) => rank(a.value) - rank(b.value)))

  // A move waits for the render that puts the item in its place, so a view transition pictures it there.
  const move = async (from: number, to: number) => {
    const next = shown.map(item => item.value)
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved!)
    kept = next
    value = next
    onValueChange?.(next)
    await tick()
  }
  const attach = behavior(sortable, () => ({ messages, move }))
</script>

<!--
  @component
  A list the reader puts in order. Svelte writes the items in the order it holds; the behavior carries them
  with the pointer and the keys, and asks Svelte to move one when it is dropped.
-->
<ol class={['sortable', className]} {@attach attach} {...root}>
  {#each shown as item (item.value)}
    <li class={['sortable-item', itemClass]} data-value={item.value}>
      <button type="button" class="sortable-handle" aria-pressed="false" aria-label={handleLabel(item)}></button>
      {@render children(item)}
    </li>
  {/each}
</ol>
<p class="sortable-status" role="status"></p>
