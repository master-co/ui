<script lang="ts" module>
  import type { HTMLAttributes } from 'svelte/elements'
  import type { ScheduleEvent, ScheduleMessages, ScheduleValue } from '@master/ui/behaviors/schedule.js'

  export type { ScheduleEvent, ScheduleValue }

  /** The words of the header, in the page's language. */
  export interface ScheduleLabels {
    today?: string
    previous?: string
    next?: string
    /** The name of the view switch. */
    view?: string
    day?: string
    week?: string
    month?: string
    agenda?: string
  }

  export interface ScheduleProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
    events: ScheduleEvent[]
    /** The day and the view on show. Bind it, or leave it out: today's month. */
    value?: ScheduleValue
    onValueChange?: (value: ScheduleValue) => void
    /** An event without an `href` is a button: this hears it pressed. */
    onEventClick?: (event: ScheduleEvent) => void
    /** Today, as `YYYY-MM-DD`. Give it when the schedule is rendered on a server, so both sides agree. */
    today?: string
    /** A BCP 47 tag for the names. Give it when the schedule is rendered on a server. */
    locale?: string
    /** The first day of a week, 0 for Sunday to 6 for Saturday. The locale's own by default. */
    weekStart?: number
    /** How many events a day of a month shows before the rest go behind its more button. */
    lanes?: number
    /** The hours a day or a week shows at least. */
    from?: number
    to?: number
    messages?: ScheduleMessages
    labels?: ScheduleLabels
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { schedule, scheduleLayout, type ScheduleItem } from '@master/ui/behaviors/schedule.js'
  import { behavior } from './behavior.svelte.js'

  let { events, value = $bindable(), onValueChange, onEventClick, today, locale, weekStart, lanes, from, to, messages, labels = {}, class: className, ...root }: ScheduleProps = $props()
  const id = $props.id()
  const settings = () => ({ today, locale, weekStart, lanes, from, to, messages })
  const first = untrack(() => scheduleLayout(value, settings()).value)
  let shown = $state(first)
  const layout = $derived(scheduleLayout(shown, { ...settings(), events }))
  const attach = behavior(schedule, () => ({ ...settings(), value: first, draw: (next: ScheduleValue) => { shown = next } }), {
    value: () => value,
    change: (next) => { value = next; onValueChange?.(next) },
  })
  const more = $derived(messages?.more ?? ((count: number) => `+${count} more`))
  const moreLabel = $derived(messages?.moreLabel ?? ((count: number, day: string) => `${count} more ${count === 1 ? 'event' : 'events'}, ${day}`))
  const words = $derived({ today: 'Today', previous: 'Previous', next: 'Next', view: 'View', day: 'Day', week: 'Week', month: 'Month', agenda: 'Agenda', ...labels })
  const views = ['day', 'week', 'month', 'agenda'] as const
  const lane = (item: ScheduleItem) => `--column: ${item.column}; --span: ${item.span}; --lane: ${item.lane}`
</script>

<!--
  @component
  A schedule the reader moves through by the day, the week, the month or as an agenda. Svelte writes the
  period from `scheduleLayout()`, the same layout the behavior writes, so it is in the first HTML; the behavior
  answers the header and the day numbers and asks for the period to show.
-->
{#snippet event(item: ScheduleItem, style?: string)}
  {#if item.event.href}
    <a class={['schedule-event', item.classes]} {style} href={item.event.href} aria-label={item.label}><span class="schedule-title">{item.title}</span>{#if item.time && !item.allDay}<span class="schedule-time">{item.time}</span>{/if}</a>
  {:else}
    <button type="button" class={['schedule-event', item.classes]} {style} value={item.id} aria-label={item.label} onclick={() => onEventClick?.(item.event)}><span class="schedule-title">{item.title}</span>{#if item.time && !item.allDay}<span class="schedule-time">{item.time}</span>{/if}</button>
  {/if}
{/snippet}

{#snippet list(items: ScheduleItem[])}
  <ol class="schedule-list">
    {#each items as item (item.id)}<li>{@render event(item)}</li>{/each}
  </ol>
{/snippet}

<section class={['schedule-view', className]} aria-labelledby="{id}title" {@attach attach} {...root}>
  <div class="schedule-view-header">
    <button type="button" class="btn btn-sm schedule-view-today">{words.today}</button>
    <button type="button" class="btn btn-sm btn-square btn-quiet schedule-view-previous" aria-label={words.previous}>
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
    </button>
    <button type="button" class="btn btn-sm btn-square btn-quiet schedule-view-next" aria-label={words.next}>
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
    </button>
    <h2 class="schedule-view-title" id="{id}title" aria-live="polite">{layout.title}</h2>
    <div class="segmented segmented-sm schedule-view-switch" role="radiogroup" aria-label={words.view}>
      {#each views as name (name)}
        <label class="segmented-item"><input type="radio" class="segmented-input" name="{id}view" value={name} checked={first.view === name} />{words[name]}</label>
      {/each}
    </div>
  </div>
  <div class="schedule-view-body">
    {#if layout.value.view === 'month'}
      <div class="schedule-month">
        <div class="schedule-weekdays" aria-hidden="true">
          {#each layout.weekdays as weekday (weekday.name)}<span class="schedule-weekday">{weekday.short}</span>{/each}
        </div>
        <ol class="schedule-weeks">
          {#each layout.weeks as week (week.days[0]!.date)}
            <li class="schedule-week" style="--lanes: {week.lanes}">
              {#each week.days as day, index (day.date)}
                <div class={['schedule-date', day.outside && 'schedule-date-outside']} style="--column: {index + 1}; --count: {day.count}" aria-current={day.today ? 'date' : undefined}>
                  <button type="button" class="schedule-date-number" value={day.date} aria-label={day.summary}>{day.text}</button>
                </div>
                {#each day.items as item (item.id)}{@render event(item, lane(item))}{/each}
                {#if day.hidden}
                  <button type="button" class="schedule-more" style="--column: {index + 1}" popovertarget="{id}more{day.date}" aria-label={moreLabel(day.hidden, day.label)}>{more(day.hidden)}</button>
                  <div id="{id}more{day.date}" popover="" class="popover"><p class="schedule-agenda-date">{day.label}</p>{@render list(day.all)}</div>
                {/if}
              {/each}
            </li>
          {/each}
        </ol>
      </div>
    {:else if layout.value.view === 'agenda'}
      {#if layout.agenda.length}
        <ol class="schedule-agenda">
          {#each layout.agenda as day (day.date)}
            <li class="schedule-agenda-day" aria-current={day.today ? 'date' : undefined}><h3 class="schedule-agenda-date">{day.heading}</h3>{@render list(day.items)}</li>
          {/each}
        </ol>
      {:else}
        <div class="empty"><p class="empty-title">{layout.words.empty}</p></div>
      {/if}
    {:else}
      <div class="schedule" style="--schedule-from: {layout.from}; --schedule-to: {layout.to}; --schedule-days: {layout.days.length}">
        <ol class="schedule-rail" aria-hidden="true">
          {#each layout.rail as label, index (index)}<li>{label}</li>{/each}
        </ol>
        {#each layout.days as day, index (day.date)}
          <div class="schedule-day" style="--column: {index + 1}" aria-current={day.today ? 'date' : undefined}>
            <h3 class="schedule-heading" aria-label={day.label}>{layout.days.length > 1 ? day.heading : day.label}</h3>
            <ol class="schedule-events" aria-label={day.label}>
              {#each day.items as item (item.id)}<li>{@render event(item, `--start: ${item.start}; --end: ${item.end}; --lane: ${item.lane}; --lanes: ${item.lanes}`)}</li>{/each}
            </ol>
          </div>
        {/each}
        {#if layout.allDay.length}
          <div class="schedule-allday" role="group" aria-label={layout.words.allDay}>
            <span class="schedule-allday-label" aria-hidden="true">{layout.words.allDay}</span>
            {#each layout.allDay as item (item.id)}{@render event(item, lane(item))}{/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</section>
