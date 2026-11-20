<script lang="ts" module>
  import type { HTMLAttributes } from 'svelte/elements'
  import type { CalendarLabels } from '@master/ui/behaviors/calendar.js'

  /** A day as `YYYY-MM-DD`; in a range, its two ends, the second null until it is chosen; with `multiple`, the days chosen, sorted. */
  export type CalendarValue = string | [string, string | null] | string[] | null

  export interface CalendarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    /** What is chosen. Bind it, or leave it out and the pattern keeps its own. */
    value?: CalendarValue
    onValueChange?: (value: CalendarValue) => void
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
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { calendar, calendarMonth, calendarPeriods, type CalendarMonth, type CalendarView } from '@master/ui/behaviors/calendar.js'
  import { behavior } from './behavior.svelte.js'

  let { value = $bindable(), onValueChange, range, multiple, months = 1, min, max, month, weekStart, locale, disabled, previousLabel = 'Previous month', nextLabel = 'Next month', jumpLabel = 'Choose a month or a year', labels, class: className, ...root }: CalendarProps = $props()
  const id = $props.id()
  const first = untrack(() => value)
  let shown = $state(untrack(() => calendarMonth(month, { value: first }).month))
  let view = $state<CalendarView>('days')
  const count = $derived(Math.max(1, Math.floor(months)))
  // The first value's days are marked in the first render; after that the behavior marks what is chosen.
  const grids = $derived(Array.from({ length: count }, (_, offset) => calendarMonth(shown, { weekStart, locale, value: first, range, multiple, offset })))
  const periods = $derived(view === 'days' ? null : calendarPeriods(shown, { view, locale }))
  const several = $derived(range || multiple || undefined)
  const attach = behavior(calendar, () => ({
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
    draw: (next: string, nextView: CalendarView) => { shown = next; view = nextView },
  }), {
    value: () => value,
    change: (next) => { value = next; onValueChange?.(next) },
  })
</script>

<!--
  @component
  A calendar. Svelte writes the months, from the same data the behavior uses, so they are in the first HTML;
  the behavior marks today, the chosen days and the day in the tab order, and asks for other months, or for
  the months of a year or the years of a decade when the title jumps.
-->
{#snippet previous()}
  <button type="button" class="btn btn-quiet btn-square btn-sm" aria-label={previousLabel}>
    <svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5L10.3586 7.8586A0.2 0.2 0 0 1 10.3586 8.1414L6 12.5" transform="rotate(180 8 8)" /></svg>
  </button>
{/snippet}

{#snippet next()}
  <button type="button" class="btn btn-quiet btn-square btn-sm" aria-label={nextLabel}>
    <svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5L10.3586 7.8586A0.2 0.2 0 0 1 10.3586 8.1414L6 12.5" /></svg>
  </button>
{/snippet}

{#snippet days(data: CalendarMonth)}
  <div class="calendar-week" role="row">
    {#each data.weekdays as weekday (weekday.name)}
      <span class="calendar-weekday" role="columnheader" aria-label={weekday.name}>{weekday.short}</span>
    {/each}
  </div>
  {#each data.weeks as week (week[0]!.date)}
    <div class="calendar-week" role="row">
      {#each week as day (day.date)}
        <button type="button" class={['calendar-day', day.outside && 'calendar-day-outside', day.range]} role="gridcell" tabindex={day.tab ? 0 : -1} value={day.date} aria-selected={day.selected || undefined} aria-label={day.label}>{day.text}</button>
      {/each}
    </div>
  {/each}
{/snippet}

<div class={['calendar', className]} {@attach attach} {...root}>
  {#if count > 1}
    <!-- A month keeps its place, so the button in its header keeps focus while the months turn. -->
    {#each grids as data, index (index)}
      <div class="calendar-month">
        <div class="calendar-header">
          {#if index === 0}{@render previous()}{/if}
          <h3 class="calendar-title" id="{id}title{index}" aria-live="polite">{data.title}</h3>
          {#if index === count - 1}{@render next()}{/if}
        </div>
        <div class="calendar-grid" role="grid" aria-labelledby="{id}title{index}" aria-multiselectable={several}>
          {@render days(data)}
        </div>
      </div>
    {/each}
  {:else}
    <div class="calendar-header">
      {@render previous()}
      <!-- aria-description is an ARIA 1.3 attribute of every role, which Svelte's element types do not know yet. -->
      <h3 class="calendar-title" id="{id}title" aria-live="polite"><button type="button" class="calendar-title-button" {...{ 'aria-description': jumpLabel }}>{periods?.title ?? grids[0]!.title}</button></h3>
      {@render next()}
    </div>
    <div class="calendar-grid" role="grid" aria-labelledby="{id}title" aria-multiselectable={several}>
      {#if periods}
        {#each periods.rows as row (row[0]!.value)}
          <div class="calendar-week" role="row">
            {#each row as cell (cell.value)}
              <button type="button" class={cell.outside ? 'calendar-period calendar-period-outside' : 'calendar-period'} role="gridcell" tabindex={-1} value={cell.value} aria-label={cell.label}>{cell.text}</button>
            {/each}
          </div>
        {/each}
      {:else}
        {@render days(grids[0]!)}
      {/if}
    </div>
  {/if}
</div>
