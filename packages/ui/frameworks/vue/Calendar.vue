<script lang="ts">
/** A day as `YYYY-MM-DD`; in a range, its two ends, the second null until it is chosen; with `multiple`, the days chosen, sorted. */
export type CalendarValue = string | [string, string | null] | string[] | null
</script>

<script setup lang="ts">
import { computed, shallowRef, useId, useTemplateRef } from 'vue'
import { calendar, calendarMonth, calendarPeriods, type CalendarLabels, type CalendarView } from '@master/ui/behaviors/calendar.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const { range, multiple, months = 1, min, max, month, weekStart, locale, disabled, previousLabel = 'Previous month', nextLabel = 'Next month', jumpLabel = 'Choose a month or a year', labels } = defineProps<{
  /** Choose two days and every day between them. */
  range?: boolean
  /** Choose any number of separate days; the value is their list. `range` wins over it. */
  multiple?: boolean
  /** How many months to show side by side, 1 by default. A calendar of one month has a title that jumps to the months and the years. */
  months?: number
  /** The first and the last day that can be chosen, as `YYYY-MM-DD`. */
  min?: string
  max?: string
  /** The month to show first, as `YYYY-MM`. The month of the value, or this month, by default. */
  month?: string
  /** The day in the first column, 0 for Sunday to 6 for Saturday. The locale's own by default. */
  weekStart?: number
  /** A BCP 47 tag for the names. Give it when the calendar is rendered on a server, so both sides agree. */
  locale?: string
  /** Says whether a day cannot be chosen. */
  disabled?: (date: Date) => boolean
  previousLabel?: string
  nextLabel?: string
  /** What the title button does, said to assistive technology. */
  jumpLabel?: string
  /** The names of the month buttons while the grid shows months or years. */
  labels?: CalendarLabels
}>()
/** The chosen day, the two ends of a range, or the days chosen with `multiple`: `v-model`. */
const model = defineModel<CalendarValue>()

/*
 * A calendar. Vue writes the months, from the same data the behavior uses, so they are in the first HTML;
 * the behavior marks today, the chosen days and the day in the tab order, and asks for other months, or for
 * the months of a year or the years of a decade when the title jumps.
 */
const id = useId()
const first = model.value
const shown = shallowRef(calendarMonth(month, { value: first }).month)
const view = shallowRef<CalendarView>('days')
const count = computed(() => Math.max(1, Math.floor(months)))
// The first value's days are marked in the first render; after that the behavior marks what is chosen.
const grids = computed(() => Array.from({ length: count.value }, (_, offset) => calendarMonth(shown.value, { weekStart, locale, value: first, range, multiple, offset })))
const periods = computed(() => (view.value === 'days' ? null : calendarPeriods(shown.value, { view: view.value, locale })))
const several = computed(() => range || multiple || undefined)
const root = useTemplateRef<HTMLDivElement>('root')
useBehavior(root, calendar, () => ({
  value: (first ?? undefined) as string | string[] | undefined,
  range,
  multiple,
  min,
  max,
  month,
  weekStart,
  locale,
  disabled,
  labels,
  draw: (next: string, nextView: CalendarView) => {
    shown.value = next
    view.value = nextView
  },
}), model)
</script>

<template>
  <div ref="root" class="calendar" v-bind="$attrs">
    <template v-if="count > 1">
      <div v-for="(data, index) in grids" :key="index" class="calendar-month">
        <div class="calendar-header">
          <button v-if="index === 0" type="button" class="btn btn-quiet btn-square btn-sm" :aria-label="previousLabel">
            <svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5L10.3586 7.8586A0.2 0.2 0 0 1 10.3586 8.1414L6 12.5" transform="rotate(180 8 8)" /></svg>
          </button>
          <h3 :id="`${id}-title-${index}`" class="calendar-title" aria-live="polite">{{ data.title }}</h3>
          <button v-if="index === count - 1" type="button" class="btn btn-quiet btn-square btn-sm" :aria-label="nextLabel">
            <svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5L10.3586 7.8586A0.2 0.2 0 0 1 10.3586 8.1414L6 12.5" /></svg>
          </button>
        </div>
        <div class="calendar-grid" role="grid" :aria-labelledby="`${id}-title-${index}`" :aria-multiselectable="several">
          <div class="calendar-week" role="row">
            <span v-for="weekday in data.weekdays" :key="weekday.name" class="calendar-weekday" role="columnheader" :aria-label="weekday.name">{{ weekday.short }}</span>
          </div>
          <div v-for="week in data.weeks" :key="week[0]!.date" class="calendar-week" role="row">
            <button v-for="day in week" :key="day.date" type="button" class="calendar-day" :class="[{ 'calendar-day-outside': day.outside }, day.range]" role="gridcell" :tabindex="day.tab ? 0 : -1" :value="day.date" :aria-selected="day.selected || undefined" :aria-label="day.label">{{ day.text }}</button>
          </div>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="calendar-header">
        <button type="button" class="btn btn-quiet btn-square btn-sm" :aria-label="previousLabel">
          <svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5L10.3586 7.8586A0.2 0.2 0 0 1 10.3586 8.1414L6 12.5" transform="rotate(180 8 8)" /></svg>
        </button>
        <h3 :id="`${id}-title`" class="calendar-title" aria-live="polite"><button type="button" class="calendar-title-button" :aria-description="jumpLabel">{{ periods?.title ?? grids[0]!.title }}</button></h3>
        <button type="button" class="btn btn-quiet btn-square btn-sm" :aria-label="nextLabel">
          <svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5L10.3586 7.8586A0.2 0.2 0 0 1 10.3586 8.1414L6 12.5" /></svg>
        </button>
      </div>
      <div class="calendar-grid" role="grid" :aria-labelledby="`${id}-title`" :aria-multiselectable="several">
        <template v-if="periods">
          <div v-for="row in periods.rows" :key="row[0]!.value" class="calendar-week" role="row">
            <button v-for="cell in row" :key="cell.value" type="button" class="calendar-period" :class="{ 'calendar-period-outside': cell.outside }" role="gridcell" :tabindex="-1" :value="cell.value" :aria-label="cell.label">{{ cell.text }}</button>
          </div>
        </template>
        <template v-else>
          <div class="calendar-week" role="row">
            <span v-for="weekday in grids[0]!.weekdays" :key="weekday.name" class="calendar-weekday" role="columnheader" :aria-label="weekday.name">{{ weekday.short }}</span>
          </div>
          <div v-for="week in grids[0]!.weeks" :key="week[0]!.date" class="calendar-week" role="row">
            <button v-for="day in week" :key="day.date" type="button" class="calendar-day" :class="[{ 'calendar-day-outside': day.outside }, day.range]" role="gridcell" :tabindex="day.tab ? 0 : -1" :value="day.date" :aria-selected="day.selected || undefined" :aria-label="day.label">{{ day.text }}</button>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>
