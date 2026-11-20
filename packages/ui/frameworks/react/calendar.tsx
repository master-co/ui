'use client'
import { Fragment, useId, useMemo, useState, type ComponentProps } from 'react'
import { calendar, calendarMonth, calendarPeriods, type CalendarLabels, type CalendarView } from '@master/ui/behaviors/calendar.js'
import { useBehavior } from './use-behavior'

/** A day as `YYYY-MM-DD`; in a range, its two ends, the second null until it is chosen; with `multiple`, the days chosen, sorted. */
export type CalendarValue = string | [string, string | null] | string[] | null

export interface CalendarProps extends Omit<ComponentProps<'div'>, 'defaultValue' | 'children' | 'ref'> {
  value?: CalendarValue
  defaultValue?: CalendarValue
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

/**
 * A calendar. React writes the months, from the same data the behavior uses, so they are in the first HTML;
 * the behavior marks today, the chosen days and the day in the tab order, and asks for other months, or for
 * the months of a year or the years of a decade when the title jumps.
 */
export function Calendar({ value, defaultValue, onValueChange, range, multiple, months = 1, min, max, month, weekStart, locale, disabled, previousLabel = 'Previous month', nextLabel = 'Next month', jumpLabel = 'Choose a month or a year', labels, className, ...root }: CalendarProps) {
  const id = useId()
  const [first] = useState(value ?? defaultValue)
  const [shown, setShown] = useState(() => calendarMonth(month, { value: first }).month)
  const [view, setView] = useState<CalendarView>('days')
  const count = Math.max(1, Math.floor(months))
  // The first value's days are marked in the first render; after that the behavior marks what is chosen.
  const grids = useMemo(() => Array.from({ length: count }, (_, offset) => calendarMonth(shown, { weekStart, locale, value: first, range, multiple, offset })), [count, shown, weekStart, locale, first, range, multiple])
  const periods = view === 'days' ? null : calendarPeriods(shown, { view, locale })
  const ref = useBehavior(calendar, {
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
    draw: (next: string, nextView: CalendarView) => { setShown(next); setView(nextView) },
  }, { value, onValueChange })
  const several = range || multiple || undefined

  const previous = (
    <button type="button" className="btn btn-quiet btn-square btn-sm" aria-label={previousLabel}>
      <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3.5L10.3586 7.8586A0.2 0.2 0 0 1 10.3586 8.1414L6 12.5" transform="rotate(180 8 8)" /></svg>
    </button>
  )
  const next = (
    <button type="button" className="btn btn-quiet btn-square btn-sm" aria-label={nextLabel}>
      <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3.5L10.3586 7.8586A0.2 0.2 0 0 1 10.3586 8.1414L6 12.5" /></svg>
    </button>
  )
  return (
    <div className={className ? `calendar ${className}` : 'calendar'} ref={ref} {...root}>
      {grids.map((data, index) => {
        const one = count === 1
        const title = `${id}title${index}`
        const header = (
          <div className="calendar-header">
            {index === 0 && previous}
            <h3 className="calendar-title" id={title} aria-live="polite">
              {one ? <button type="button" className="calendar-title-button" aria-description={jumpLabel}>{periods?.title ?? data.title}</button> : data.title}
            </h3>
            {index === count - 1 && next}
          </div>
        )
        const grid = (
          <div className="calendar-grid" role="grid" aria-labelledby={title} aria-multiselectable={several}>
            {one && periods
              ? periods.rows.map(row => (
                  <div className="calendar-week" role="row" key={row[0]!.value}>
                    {row.map(cell => <button type="button" className={cell.outside ? 'calendar-period calendar-period-outside' : 'calendar-period'} role="gridcell" tabIndex={-1} value={cell.value} aria-label={cell.label} key={cell.value}>{cell.text}</button>)}
                  </div>
                ))
              : (
                  <>
                    <div className="calendar-week" role="row">
                      {data.weekdays.map(weekday => <span className="calendar-weekday" role="columnheader" aria-label={weekday.name} key={weekday.name}>{weekday.short}</span>)}
                    </div>
                    {data.weeks.map(week => (
                      <div className="calendar-week" role="row" key={week[0]!.date}>
                        {week.map(day => <button type="button" className={['calendar-day', day.outside && 'calendar-day-outside', day.range].filter(Boolean).join(' ')} role="gridcell" tabIndex={day.tab ? 0 : -1} value={day.date} aria-selected={day.selected || undefined} aria-label={day.label} key={day.date}>{day.text}</button>)}
                      </div>
                    ))}
                  </>
                )}
          </div>
        )
        // One month is a header and a grid. Each of several is a calendar-month, which keeps its place, so the
        // button in its header keeps focus while the months turn.
        return one ? <Fragment key={index}>{header}{grid}</Fragment> : <div className="calendar-month" key={index}>{header}{grid}</div>
      })}
    </div>
  )
}
