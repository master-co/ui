<script lang="ts" module>
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes, HTMLButtonAttributes } from 'svelte/elements'
  import type { KanbanMessages, KanbanValue } from '@master/ui/behaviors/kanban.js'

  export type { KanbanValue }

  export interface KanbanColumn {
    /** What the column stands for in the arrangement. */
    value: string
    /** The column's name: its title, and what the status and the mover call it. */
    label: string
  }

  export interface KanbanItem {
    /** What the item stands for in the arrangement. No other item has it. */
    value: string
    /** What the item is called: its handle and its move button are named with it. */
    label: string
    /** The column the item starts in, and stays in while the arrangement does not name it. The first by default. */
    column?: string
  }

  export interface KanbanLabels<T extends KanbanItem> {
    /** The accessible name of an item's handle. `Drag <label>` by default. */
    drag?: (item: T) => string
    /** The accessible name of the button that opens the mover for an item. `Move <label>` by default. */
    move?: (item: T) => string
    /** The mover's two fields and two buttons. */
    column?: string
    position?: string
    confirm?: string
    cancel?: string
  }

  /** What an item's own markup spreads on its two buttons. */
  export interface KanbanControls {
    /** For the grip, an empty `<button>`: it carries the item with the pointer and the keys. */
    handle: HTMLButtonAttributes
    /** For the button that opens the mover, an empty `<button>`: a column and a position are chosen there. */
    move: HTMLButtonAttributes
  }

  export interface KanbanProps<C extends KanbanColumn, T extends KanbanItem> extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    /** The columns, in their order. The order is not the reader's to change. */
    columns: C[]
    items: T[]
    /** The arrangement: each column's value and the values of its items, in order. Bind it, or leave it out. */
    value?: KanbanValue
    onValueChange?: (value: KanbanValue) => void
    /** What an item shows, with the attributes of its handle and of its move button to spread. */
    children: Snippet<[T, KanbanControls]>
    /** What stands beside a column's title, such as the number of items it holds. */
    header?: Snippet<[C, T[]]>
    /** What a column says while it holds no item. */
    empty?: Snippet<[C]>
    /** The names of the controls, in the page's language. */
    labels?: KanbanLabels<T>
    /** What the status region says, in the page's language. */
    messages?: KanbanMessages
  }

  /**
   * The items of each column, in the order an arrangement gives them. An item it does not name keeps the
   * column it names itself, or the first, after the ones it does; a value no item has is passed over.
   */
  function arranged<C extends KanbanColumn, T extends KanbanItem>(columns: C[], items: T[], order: KanbanValue = []): T[][] {
    const named = new Set(order.flatMap(entry => entry.items))
    const own = (item: T) => columns.some(column => column.value === item.column) ? item.column : columns[0]?.value
    return columns.map((column) => {
      const listed = (order.find(entry => entry.value === column.value)?.items ?? []).flatMap(value => items.filter(item => item.value === value))
      return [...listed, ...items.filter(item => !named.has(item.value) && own(item) === column.value)]
    })
  }
</script>

<script lang="ts" generics="C extends KanbanColumn, T extends KanbanItem">
  import { tick, untrack } from 'svelte'
  import { kanban } from '@master/ui/behaviors/kanban.js'
  import { behavior } from './behavior.svelte.js'

  const id = $props.id()
  let { columns, items, value = $bindable(), onValueChange, children, header, empty, labels = {}, messages, class: className, ...root }: KanbanProps<C, T> = $props()
  let kept = $state(untrack(() => value))
  const shown = $derived(arranged(columns, items, value ?? kept))
  const drag = $derived(labels.drag ?? ((item: T) => `Drag ${item.label}`))
  const move = $derived(labels.move ?? ((item: T) => `Move ${item.label}`))

  // A move waits for the render that writes the item in its place, so focus finds its handle there.
  const arrange = async (next: KanbanValue) => {
    kept = next
    value = next
    onValueChange?.(next)
    await tick()
  }
  const attach = behavior(kanban, () => ({ messages, arrange }))
</script>

<!--
  @component
  A board whose items the reader moves between columns. Svelte writes the columns and their items in the
  arrangement it holds; the behavior carries an item with the pointer and the keys, and asks Svelte to arrange
  the board when one is dropped. An item that changes column is rendered again in its new list, so what it
  shows comes from the data, not from state kept inside it.
-->
<div class={['kanban', className]} role="group" {@attach attach} {...root}>
  {#each columns as column, at (column.value)}
    <section class="kanban-column" data-value={column.value} aria-labelledby="{id}-column-{at}">
      <header class="kanban-header">
        <h3 class="kanban-title" id="{id}-column-{at}">{column.label}</h3>
        {@render header?.(column, shown[at]!)}
      </header>
      <ol class="kanban-items">
        {#each shown[at]! as item (item.value)}
          <li class="kanban-item" data-value={item.value}>
            {@render children(item, {
              handle: { 'type': 'button', 'class': 'kanban-handle', 'aria-pressed': 'false', 'aria-label': drag(item) },
              move: { 'type': 'button', 'class': 'kanban-move', 'popovertarget': `${id}-mover`, 'aria-label': move(item) },
            })}
          </li>
        {/each}
      </ol>
      <p class="kanban-empty">{#if empty}{@render empty(column)}{:else}No items{/if}</p>
    </section>
  {/each}
  <div class="popover popover-end" popover="auto" id="{id}-mover">
    <form class="kanban-mover">
      <label class="field">
        {labels.column ?? 'Column'}
        <select class="select" name="column"></select>
      </label>
      <label class="field">
        {labels.position ?? 'Position'}
        <select class="select" name="position"></select>
      </label>
      <div class="kanban-mover-actions">
        <button type="button" class="btn btn-sm" popovertarget="{id}-mover" popovertargetaction="hide">{labels.cancel ?? 'Cancel'}</button>
        <button type="submit" class="btn btn-sm btn-primary">{labels.confirm ?? 'Move'}</button>
      </div>
    </form>
  </div>
  <div class="kanban-preview" popover="manual" aria-hidden="true"></div>
  <p class="kanban-status" role="status"></p>
</div>
