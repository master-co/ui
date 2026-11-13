<script lang="ts" module>
  import type { HTMLOlAttributes } from 'svelte/elements'
  import type { GanttChange, GanttMessages, GanttValue } from '@master/ui/behaviors/gantt.js'

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

  export interface GanttProps extends Omit<HTMLOlAttributes, 'children'> {
    rows: GanttRow[]
    /** Where the scale begins and ends, in any unit: days, weeks, hours. */
    from: number
    to: number
    /** Where the line of now stands on the scale; no line without it. */
    now?: number
    /** The names of the scale's units, one to a unit, drawn over the bars. */
    ticks?: string[]
    /** Each bar's range, `[start, end]`, keyed by its row's id. Bind it, or leave it out: the rows' own. */
    value?: GanttValue
    /** Called as a bar moves, while it is dragged too. */
    onValueChange?: (value: GanttValue) => void
    /** Called once a drop or a key has changed a bar. */
    onValueCommit?: (value: GanttValue) => void
    /** Asked before a bar takes a range: call `event.preventDefault()` to refuse it. */
    onBeforeChange?: (event: CustomEvent<GanttChange>) => void
    /** What a bar says for a range, as its text and to assistive technology. */
    format?: (start: number, end: number) => string
    /** How far a key moves a bar, and what the pointer snaps to, in the scale's unit. */
    step?: number
    /** What the status region says, in the page's language. */
    messages?: GanttMessages
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { gantt } from '@master/ui/behaviors/gantt.js'
  import { behavior } from './behavior.svelte.js'

  let { rows, from, to, now, ticks, value = $bindable(), onValueChange, onValueCommit, onBeforeChange, format = (start: number, end: number) => (start === end ? `${start}` : `${start} to ${end}`), step, messages, class: className, ...root }: GanttProps = $props()
  const id = $props.id()
  // The ranges the bars are drawn at: the value given, or the one the reader left them at.
  let kept = $state<GanttValue>(untrack(() => value) ?? {})
  const ranges = $derived(value ?? kept)
  const rangeOf = (row: GanttRow): [number, number] => ranges[row.id] ?? [row.start, row.end ?? row.start]
  const stop = $derived(rows.find(row => !row.disabled)?.id)

  const attach = behavior(gantt, () => ({ format, step, messages, text: false }), {
    value: () => value,
    change: (next) => { kept = next; value = next; onValueChange?.(next) },
    settled: (held) => { kept = held },
    on: {
      beforechange: (event) => onBeforeChange?.(event as CustomEvent<GanttChange>),
      change: (event) => { if (event.target === event.currentTarget) onValueCommit?.(Object.fromEntries(rows.map(row => [row.id, rangeOf(row)]))) },
    },
  })
</script>

<!--
  @component
  A gantt whose bars the reader moves. Svelte writes the rows from its data and each bar's place and text
  from the value; the behavior drags and resizes the bars, moves them with the keys and asks
  `onBeforeChange` before a bar takes a range.
-->
<ol class={['gantt', now !== undefined && 'gantt-now', className]} style:--gantt-from={from} style:--gantt-to={to} style:--gantt-now={now} {@attach attach} {...root}>
  {#if ticks}
    <li class="gantt-row gantt-scale" aria-hidden="true">
      <ol class="gantt-ticks">
        {#each ticks as tick, index (index)}<li>{tick}</li>{/each}
      </ol>
    </li>
  {/if}
  {#each rows as row, index (row.id)}
    {@const [start, end] = rangeOf(row)}
    {@const words = format(start, end)}
    <li class="gantt-row" data-value={row.id} aria-current={row.current || undefined} style:--from={start} style:--to={row.end === undefined ? undefined : end} style:--progress={row.progress}>
      <span class="gantt-label" id="{id}-label-{index}">{row.label}</span>
      <span
        class={['gantt-bar', row.end === undefined && 'gantt-milestone']}
        role="slider"
        tabindex={row.id === stop ? 0 : -1}
        aria-labelledby="{id}-label-{index}"
        aria-valuemin={row.min ?? from}
        aria-valuemax={row.max ?? to}
        aria-valuenow={start}
        aria-valuetext={words}
        aria-readonly={row.readOnly || undefined}
        aria-disabled={row.disabled || undefined}
      >{words}</span>
    </li>
  {/each}
</ol>
<p class="gantt-status" role="status"></p>
