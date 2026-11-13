<script setup lang="ts" generic="T extends { value: string, label: string }">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import { sortable, type SortableMessages } from '@master/ui/behaviors/sortable.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const { items, itemClass, handleLabel = (item: T) => `Move ${item.label}`, messages } = defineProps<{
  /** Each with the value it stands for in the order and the label its handle and the status say. */
  items: T[]
  /** Classes of each item, such as `list-row` in a `list`. */
  itemClass?: string
  /** The accessible name of a handle. `Move <label>` by default. */
  handleLabel?: (item: T) => string
  /** What the status region says, in the page's language. */
  messages?: SortableMessages
}>()
/** The order, as the items' values: `v-model`. The order of `items` by default. */
const model = defineModel<string[]>()
defineSlots<{
  /** What an item shows beside its handle. */
  default?: (props: { item: T }) => unknown
}>()

/*
 * A list the reader puts in order. Vue writes the items in the order it holds; the behavior carries them
 * with the pointer and the keys, and asks Vue to move one when it is dropped.
 */
const kept = ref<string[]>(model.value ?? items.map(item => item.value))
const order = computed(() => model.value ?? kept.value)
const rank = (value: string) => {
  const index = order.value.indexOf(value)
  return index < 0 ? order.value.length : index
}
const shown = computed(() => [...items].sort((a, b) => rank(a.value) - rank(b.value)))

// A move waits for the render that puts the item in its place, so a view transition pictures it there.
const move = async (from: number, to: number) => {
  const next = shown.value.map(item => item.value)
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved!)
  kept.value = next
  model.value = next
  await nextTick()
}
const root = useTemplateRef<HTMLOListElement>('root')
useBehavior(root, sortable, () => ({ messages, move }))
</script>

<template>
  <ol class="sortable" ref="root" v-bind="$attrs">
    <li v-for="item in shown" :key="item.value" class="sortable-item" :class="itemClass" :data-value="item.value">
      <button type="button" class="sortable-handle" aria-pressed="false" :aria-label="handleLabel(item)" />
      <slot :item="item" />
    </li>
  </ol>
  <p class="sortable-status" role="status" />
</template>
