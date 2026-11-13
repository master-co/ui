<script setup lang="ts">
import { computed, ref, useId, useTemplateRef } from 'vue'
import { gantt, type GanttChange, type GanttMessages, type GanttRange, type GanttValue } from '@master/ui/behaviors/gantt.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

export interface GanttRow {
  /** What the bar stands for in the value. */
  id: string
  /** What the row is called; the bar is named by it. */
  label: string
  /** Where the bar begins, in the scale's unit. */
  start: number
  /** Where it ends. A row without an end is a milestone, a point at its start. */
  end?: number
  /** How much of the bar is done, from 0 to 100. */
  progress?: number
  /** The row that matters now: its bar is ink. */
  current?: boolean
  /** The bar takes focus and is read, and does not move. */
  readOnly?: boolean
  /** The bar does not move and the keys pass over it. */
  disabled?: boolean
  /** The earliest start and the latest end the bar may take. The scale's by default. */
  min?: number
  max?: number
}

const { rows, from, to, now, ticks, format = (start: number, end: number) => (start === end ? `${start}` : `${start} to ${end}`), step, messages } = defineProps<{
  rows: GanttRow[]
  /** Where the scale begins and ends, in any unit: days, weeks, hours. */
  from: number
  to: number
  /** Where the line of now stands on the scale; no line without it. */
  now?: number
  /** The names of the scale's units, one to a unit, drawn over the bars. */
  ticks?: string[]
  /** What a bar says for a range, as its text and to assistive technology. */
  format?: (start: number, end: number) => string
  /** How far a key moves a bar, and what the pointer snaps to, in the scale's unit. */
  step?: number
  /** What the status region says, in the page's language. */
  messages?: GanttMessages
}>()
/** Each bar's range, `[start, end]`, keyed by its row's id: `v-model`. The rows' own by default. */
const model = defineModel<GanttValue>()
const emit = defineEmits<{
  /** The ranges, once a drop or a key has changed a bar. */
  valueCommit: [value: GanttValue]
  /** Asked before a bar takes a range: call `event.preventDefault()` to refuse it. */
  beforeChange: [event: CustomEvent<GanttChange>]
}>()

/*
 * A gantt whose bars the reader moves. Vue writes the rows from its data and each bar's place and text from
 * the value; the behavior drags and resizes the bars, moves them with the keys and asks `beforeChange`
 * before a bar takes a range.
 */
const id = useId()
const kept = ref<GanttValue>(model.value ?? {})
const ranges = computed(() => model.value ?? kept.value)
const rangeOf = (row: GanttRow): GanttRange => ranges.value[row.id] ?? [row.start, row.end ?? row.start]
const stop = computed(() => rows.find(row => !row.disabled)?.id)
// The ranges the reader leaves: what the model is told, kept here too for an owner that binds no model.
const left = computed({
  get: () => model.value,
  set: (next) => {
    kept.value = next ?? {}
    model.value = next
  },
})
const root = useTemplateRef<HTMLOListElement>('root')
useBehavior(root, gantt, () => ({ format, step, messages, text: false }), left, {
  beforechange: event => emit('beforeChange', event as CustomEvent<GanttChange>),
  change: (event) => { if (event.target === event.currentTarget) emit('valueCommit', Object.fromEntries(rows.map(row => [row.id, rangeOf(row)]))) },
})
</script>

<template>
  <ol class="gantt" :class="{ 'gantt-now': now !== undefined }" :style="{ '--gantt-from': from, '--gantt-to': to, '--gantt-now': now }" ref="root" v-bind="$attrs">
    <li v-if="ticks" class="gantt-row gantt-scale" aria-hidden="true">
      <ol class="gantt-ticks">
        <li v-for="(tick, index) in ticks" :key="index">{{ tick }}</li>
      </ol>
    </li>
    <li v-for="(row, index) in rows" :key="row.id" class="gantt-row" :data-value="row.id" :aria-current="row.current || undefined" :style="{ '--from': rangeOf(row)[0], '--to': row.end === undefined ? undefined : rangeOf(row)[1], '--progress': row.progress }">
      <span :id="`${id}-label-${index}`" class="gantt-label">{{ row.label }}</span>
      <span
        class="gantt-bar"
        :class="{ 'gantt-milestone': row.end === undefined }"
        role="slider"
        :tabindex="row.id === stop ? 0 : -1"
        :aria-labelledby="`${id}-label-${index}`"
        :aria-valuemin="row.min ?? from"
        :aria-valuemax="row.max ?? to"
        :aria-valuenow="rangeOf(row)[0]"
        :aria-valuetext="format(...rangeOf(row))"
        :aria-readonly="row.readOnly || undefined"
        :aria-disabled="row.disabled || undefined"
      >{{ format(...rangeOf(row)) }}</span>
    </li>
  </ol>
  <p class="gantt-status" role="status" />
</template>
