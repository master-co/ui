'use client'
import { useId, useRef, useState, type ComponentProps, type CSSProperties } from 'react'
import { gantt, type GanttChange, type GanttMessages, type GanttRange, type GanttValue } from '@master/ui/behaviors/gantt.js'
import { useBehavior } from './use-behavior'

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

export interface GanttProps extends Omit<ComponentProps<'ol'>, 'children' | 'defaultValue' | 'onChange' | 'ref'> {
  rows: GanttRow[]
  /** Where the scale begins and ends, in any unit: days, weeks, hours. */
  from: number
  to: number
  /** Where the line of now stands on the scale; no line without it. */
  now?: number
  /** The names of the scale's units, one to a unit, drawn over the bars. */
  ticks?: string[]
  /** Each bar's range, `[start, end]`, keyed by its row's id. The rows' own by default. */
  value?: GanttValue
  defaultValue?: GanttValue
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

const plain = (start: number, end: number) => (start === end ? `${start}` : `${start} to ${end}`)

/**
 * A gantt whose bars the reader moves. React writes the rows from its data and each bar's place and text
 * from the value; the behavior drags and resizes the bars, moves them with the keys and asks
 * `onBeforeChange` before a bar takes a range.
 */
export function Gantt({ rows, from, to, now, ticks, value, defaultValue, onValueChange, onValueCommit, onBeforeChange, format = plain, step, messages, className, style, ...root }: GanttProps) {
  const id = useId()
  const [kept, setKept] = useState<GanttValue>(() => value ?? defaultValue ?? {})
  const ranges = value ?? kept
  const rangeOf = (row: GanttRow): GanttRange => ranges[row.id] ?? [row.start, row.end ?? row.start]
  const latest = useRef<GanttValue>({})
  latest.current = Object.fromEntries(rows.map(row => [row.id, rangeOf(row)]))
  const ref = useBehavior(gantt, { format, step, messages, text: false }, {
    value,
    defaultValue,
    onValueChange: (next: GanttValue) => {
      latest.current = next
      setKept(next)
      onValueChange?.(next)
    },
    on: {
      beforechange: event => onBeforeChange?.(event as CustomEvent<GanttChange>),
      change: (event) => { if (event.target === event.currentTarget) onValueCommit?.(latest.current) },
    },
  })
  const stop = rows.find(row => !row.disabled)?.id
  const classes = now === undefined ? 'gantt' : 'gantt gantt-now'

  return (
    <>
      <ol className={className ? `${classes} ${className}` : classes} style={{ '--gantt-from': from, '--gantt-to': to, '--gantt-now': now, ...style } as CSSProperties} ref={ref} {...root}>
        {ticks && (
          <li className="gantt-row gantt-scale" aria-hidden="true">
            <ol className="gantt-ticks">{ticks.map((tick, index) => <li key={index}>{tick}</li>)}</ol>
          </li>
        )}
        {rows.map((row, index) => {
          const [start, end] = rangeOf(row)
          const milestone = row.end === undefined
          const words = format(start, end)
          return (
            <li className="gantt-row" data-value={row.id} key={row.id} aria-current={row.current || undefined} style={{ '--from': start, '--to': milestone ? undefined : end, '--progress': row.progress } as CSSProperties}>
              <span className="gantt-label" id={`${id}label${index}`}>{row.label}</span>
              <span
                className={milestone ? 'gantt-bar gantt-milestone' : 'gantt-bar'}
                role="slider"
                tabIndex={row.id === stop ? 0 : -1}
                aria-labelledby={`${id}label${index}`}
                aria-valuemin={row.min ?? from}
                aria-valuemax={row.max ?? to}
                aria-valuenow={start}
                aria-valuetext={words}
                aria-readonly={row.readOnly || undefined}
                aria-disabled={row.disabled || undefined}
              >
                {words}
              </span>
            </li>
          )
        })}
      </ol>
      <p className="gantt-status" role="status" />
    </>
  )
}
