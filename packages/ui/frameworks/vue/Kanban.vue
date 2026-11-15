<script setup lang="ts" generic="C extends { value: string, label: string }, T extends { value: string, label: string, column?: string }">
import { computed, nextTick, ref, useId, useTemplateRef } from 'vue'
import { kanban, type KanbanMessages, type KanbanValue } from '@master/ui/behaviors/kanban.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const { columns, items, labels = {}, messages } = defineProps<{
  /** The columns, in their order, each with the value it stands for and its name. The order is not the reader's to change. */
  columns: C[]
  /**
   * Each with the value it stands for, which no other item has, the label its controls are named with, and
   * the column it starts in: the first by default.
   */
  items: T[]
  /**
   * The names of the controls, in the page's language: `drag` and `move` name an item's handle and the
   * button that opens the mover, `Drag <label>` and `Move <label>` by default; the others are the mover's
   * two fields and two buttons.
   */
  labels?: { drag?: (item: T) => string, move?: (item: T) => string, column?: string, position?: string, confirm?: string, cancel?: string }
  /** What the status region says, in the page's language. */
  messages?: KanbanMessages
}>()
/** The arrangement, each column's value and the values of its items in order: `v-model`. */
const model = defineModel<KanbanValue>()
defineSlots<{
  /**
   * What an item shows. Bind `handle` on the grip, an empty button that carries the item with the pointer and
   * the keys, and `move` on another, which opens the mover.
   */
  default?: (props: { item: T, handle: { 'type': 'button', 'class': string, 'aria-pressed': 'false', 'aria-label': string }, move: { 'type': 'button', 'class': string, 'popovertarget': string, 'aria-label': string } }) => unknown
  /** What stands beside a column's title, such as the number of items it holds. */
  header?: (props: { column: C, items: T[] }) => unknown
  /** What a column says while it holds no item. */
  empty?: (props: { column: C }) => unknown
}>()

/*
 * A board whose items the reader moves between columns. Vue writes the columns and their items in the
 * arrangement it holds; the behavior carries an item with the pointer and the keys, and asks Vue to arrange
 * the board when one is dropped. An item that changes column is rendered again in its new list, so what it
 * shows comes from the data, not from state kept inside it.
 */
const id = useId()
const kept = ref<KanbanValue | undefined>(model.value)
const order = computed(() => model.value ?? kept.value ?? [])
/**
 * The items of each column, in the order the arrangement gives them. An item it does not name keeps the
 * column it names itself, or the first, after the ones it does; a value no item has is passed over.
 */
const shown = computed(() => {
  const named = new Set(order.value.flatMap(entry => entry.items))
  const own = (item: T) => columns.some(column => column.value === item.column) ? item.column : columns[0]?.value
  return columns.map((column) => {
    const listed = (order.value.find(entry => entry.value === column.value)?.items ?? []).flatMap(value => items.filter(item => item.value === value))
    return [...listed, ...items.filter(item => !named.has(item.value) && own(item) === column.value)]
  })
})
const drag = (item: T) => labels.drag?.(item) ?? `Drag ${item.label}`
const move = (item: T) => labels.move?.(item) ?? `Move ${item.label}`

// A move waits for the render that writes the item in its place, so focus finds its handle there.
const arrange = async (next: KanbanValue) => {
  kept.value = next
  model.value = next
  await nextTick()
}
const root = useTemplateRef<HTMLDivElement>('root')
useBehavior(root, kanban, () => ({ messages, arrange }))
</script>

<template>
  <div class="kanban" role="group" ref="root" v-bind="$attrs">
    <section v-for="(column, at) in columns" :key="column.value" class="kanban-column" :data-value="column.value" :aria-labelledby="`${id}-column-${at}`">
      <header class="kanban-header">
        <h3 class="kanban-title" :id="`${id}-column-${at}`">{{ column.label }}</h3>
        <slot name="header" :column="column" :items="shown[at]!" />
      </header>
      <ol class="kanban-items">
        <li v-for="item in shown[at]" :key="item.value" class="kanban-item" :data-value="item.value">
          <slot
            :item="item"
            :handle="{ 'type': 'button', 'class': 'kanban-handle', 'aria-pressed': 'false', 'aria-label': drag(item) }"
            :move="{ 'type': 'button', 'class': 'kanban-move', 'popovertarget': `${id}-mover`, 'aria-label': move(item) }"
          />
        </li>
      </ol>
      <p class="kanban-empty"><slot name="empty" :column="column">No items</slot></p>
    </section>
    <div class="popover popover-end" popover="auto" :id="`${id}-mover`">
      <form class="kanban-mover">
        <label class="field">
          {{ labels.column ?? 'Column' }}
          <select class="select" name="column" />
        </label>
        <label class="field">
          {{ labels.position ?? 'Position' }}
          <select class="select" name="position" />
        </label>
        <div class="kanban-mover-actions">
          <button type="button" class="btn btn-sm" :popovertarget="`${id}-mover`" popovertargetaction="hide">{{ labels.cancel ?? 'Cancel' }}</button>
          <button type="submit" class="btn btn-sm btn-primary">{{ labels.confirm ?? 'Move' }}</button>
        </div>
      </form>
    </div>
    <div class="kanban-preview" popover="manual" aria-hidden="true" />
    <p class="kanban-status" role="status" />
  </div>
</template>
