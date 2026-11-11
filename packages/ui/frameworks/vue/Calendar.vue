<script lang="ts">
/** A day as `YYYY-MM-DD`; in a range, its two ends, the second null until it is chosen. */
export type CalendarValue = string | [string, string | null] | null
</script>

<script setup lang="ts">
import { computed, shallowRef, useId, useTemplateRef } from 'vue'
import { calendar, calendarMonth } from '@master/ui/behaviors/calendar.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const { range, min, max, month, weekStart, locale, disabled, previousLabel = 'Previous month', nextLabel = 'Next month' } = defineProps<{
  /** Choose two days and every day between them. */
  range?: boolean
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
}>()
/** The chosen day, or the two ends of a range: `v-model`. */
const model = defineModel<CalendarValue>()

/*
 * A calendar. Vue writes the month, from the same data the behavior uses, so it is in the first HTML;
 * the behavior marks today, the chosen days and the day in the tab order, and asks for another month.
 */
const id = useId()
const first = model.value
const shown = shallowRef(calendarMonth(month ?? [first].flat()[0] ?? undefined).month)
const view = computed(() => calendarMonth(shown.value, { weekStart, locale }))
const root = useTemplateRef<HTMLDivElement>('root')
useBehavior(root, calendar, () => ({
  value: (first ?? undefined) as string | string[] | undefined,
  range,
  min,
  max,
  month,
  weekStart,
  locale,
  disabled,
  draw: (next: string) => { shown.value = next },
}), model)
</script>

<template>
  <div class="calendar" ref="root" v-bind="$attrs">
    <div class="calendar-header">
      <button type="button" class="btn btn-quiet btn-square btn-sm" :aria-label="previousLabel">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
      </button>
      <h3 class="calendar-title" :id="`${id}-title`" aria-live="polite">{{ view.title }}</h3>
      <button type="button" class="btn btn-quiet btn-square btn-sm" :aria-label="nextLabel">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
      </button>
    </div>
    <div class="calendar-grid" role="grid" :aria-labelledby="`${id}-title`">
      <div class="calendar-week" role="row">
        <span v-for="weekday in view.weekdays" :key="weekday.name" class="calendar-weekday" role="columnheader" :aria-label="weekday.name">{{ weekday.short }}</span>
      </div>
      <div v-for="week in view.weeks" :key="week[0].date" class="calendar-week" role="row">
        <button v-for="day in week" :key="day.date" type="button" class="calendar-day" :class="{ 'calendar-day-outside': day.outside }" role="gridcell" tabindex="-1" :value="day.date" :aria-label="day.label">{{ day.text }}</button>
      </div>
    </div>
  </div>
</template>
