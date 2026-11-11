<script lang="ts" module>
  import type { HTMLAttributes } from 'svelte/elements'

  /** A day as `YYYY-MM-DD`; in a range, its two ends, the second null until it is chosen. */
  export type CalendarValue = string | [string, string | null] | null

  export interface CalendarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    /** What is chosen. Bind it, or leave it out and the pattern keeps its own. */
    value?: CalendarValue
    onValueChange?: (value: CalendarValue) => void
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
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { calendar, calendarMonth } from '@master/ui/behaviors/calendar.js'
  import { behavior } from './behavior.svelte.js'

  let { value = $bindable(), onValueChange, range, min, max, month, weekStart, locale, disabled, previousLabel = 'Previous month', nextLabel = 'Next month', class: className, ...root }: CalendarProps = $props()
  const id = $props.id()
  const first = untrack(() => value)
  let shown = $state(untrack(() => calendarMonth(month ?? [first].flat()[0] ?? undefined).month))
  // The first value's days are marked in the first render; after that the behavior marks what is chosen.
  const view = $derived(calendarMonth(shown, { weekStart, locale, value: first, range }))
  const attach = behavior(calendar, () => ({ value: (first ?? undefined) as string | string[] | undefined, range, min, max, month, weekStart, locale, disabled, draw: (next: string) => { shown = next } }), {
    value: () => value,
    change: (next) => { value = next; onValueChange?.(next) },
  })
</script>

<!--
  @component
  A calendar. Svelte writes the month, from the same data the behavior uses, so it is in the first HTML;
  the behavior marks today, the chosen days and the day in the tab order, and asks for another month.
-->
<div class={['calendar', className]} {@attach attach} {...root}>
  <div class="calendar-header">
    <button type="button" class="btn btn-quiet btn-square btn-sm" aria-label={previousLabel}>
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
    </button>
    <h3 class="calendar-title" id="{id}title" aria-live="polite">{view.title}</h3>
    <button type="button" class="btn btn-quiet btn-square btn-sm" aria-label={nextLabel}>
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
    </button>
  </div>
  <div class="calendar-grid" role="grid" aria-labelledby="{id}title">
    <div class="calendar-week" role="row">
      {#each view.weekdays as weekday (weekday.name)}
        <span class="calendar-weekday" role="columnheader" aria-label={weekday.name}>{weekday.short}</span>
      {/each}
    </div>
    {#each view.weeks as week (week[0]!.date)}
      <div class="calendar-week" role="row">
        {#each week as day (day.date)}
          <button type="button" class={['calendar-day', day.outside && 'calendar-day-outside', day.range]} role="gridcell" tabindex={day.tab ? 0 : -1} value={day.date} aria-selected={day.selected || undefined} aria-label={day.label}>{day.text}</button>
        {/each}
      </div>
    {/each}
  </div>
</div>
