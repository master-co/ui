'use client'
import { useId, useMemo, useState, type ComponentProps } from 'react'
import { calendar, calendarMonth } from '@master/ui/behaviors/calendar.js'
import { useBehavior } from './use-behavior'

/** A day as `YYYY-MM-DD`; in a range, its two ends, the second null until it is chosen. */
export type CalendarValue = string | [string, string | null] | null

export interface CalendarProps extends Omit<ComponentProps<'div'>, 'defaultValue'> {
  value?: CalendarValue
  defaultValue?: CalendarValue
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

/**
 * A calendar. React writes the month, from the same data the behavior uses, so it is in the first HTML;
 * the behavior marks today, the chosen days and the day in the tab order, and asks for another month.
 */
export function Calendar({ value, defaultValue, onValueChange, range, min, max, month, weekStart, locale, disabled, previousLabel = 'Previous month', nextLabel = 'Next month', className, ...root }: CalendarProps) {
  const id = useId()
  const [first] = useState(value ?? defaultValue)
  const [shown, setShown] = useState(() => calendarMonth(month ?? [first].flat()[0] ?? undefined).month)
  const view = useMemo(() => calendarMonth(shown, { weekStart, locale }), [shown, weekStart, locale])
  const ref = useBehavior(calendar, { value: (first ?? undefined) as string | string[] | undefined, range, min, max, month, weekStart, locale, disabled, draw: setShown }, { value, onValueChange })
  return (
    <div className={`calendar ${className ?? ''}`} ref={ref} {...root}>
      <div className="calendar-header">
        <button type="button" className="btn btn-quiet btn-square btn-sm" aria-label={previousLabel}>
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
        </button>
        <h3 className="calendar-title" id={`${id}title`} aria-live="polite">{view.title}</h3>
        <button type="button" className="btn btn-quiet btn-square btn-sm" aria-label={nextLabel}>
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
        </button>
      </div>
      <div className="calendar-grid" role="grid" aria-labelledby={`${id}title`}>
        <div className="calendar-week" role="row">
          {view.weekdays.map(weekday => <span className="calendar-weekday" role="columnheader" aria-label={weekday.name} key={weekday.name}>{weekday.short}</span>)}
        </div>
        {view.weeks.map(week => (
          <div className="calendar-week" role="row" key={week[0].date}>
            {week.map(day => <button type="button" className={day.outside ? 'calendar-day calendar-day-outside' : 'calendar-day'} role="gridcell" tabIndex={-1} value={day.date} aria-label={day.label} key={day.date}>{day.text}</button>)}
          </div>
        ))}
      </div>
    </div>
  )
}
