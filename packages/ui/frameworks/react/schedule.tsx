'use client'
import { useId, useMemo, useState, type ComponentProps, type CSSProperties } from 'react'
import { schedule, scheduleLayout, type ScheduleEvent, type ScheduleItem, type ScheduleMessages, type ScheduleValue } from '@master/ui/behaviors/schedule.js'
import { useBehavior } from './use-behavior'

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

export interface ScheduleProps extends Omit<ComponentProps<'section'>, 'defaultValue' | 'children' | 'ref'> {
  events: ScheduleEvent[]
  /** The day and the view on show. Today's month by default. */
  value?: ScheduleValue
  defaultValue?: ScheduleValue
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

const chevron = (turn?: number) => (
  <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3.5L10.3586 7.8586A0.2 0.2 0 0 1 10.3586 8.1414L6 12.5" transform={turn ? `rotate(${turn} 8 8)` : undefined} /></svg>
)

const style = (properties: Record<string, string | number>) => properties as CSSProperties

/**
 * A schedule the reader moves through by the day, the week, the month or as an agenda. React writes the
 * period from `scheduleLayout()`, the same layout the behavior writes, so it is in the first HTML; the behavior
 * answers the header and the day numbers and asks for the period to show.
 */
export function Schedule({ events, value, defaultValue, onValueChange, onEventClick, today, locale, weekStart, lanes, from, to, messages, labels = {}, className, ...root }: ScheduleProps) {
  const id = useId()
  const settings = { today, locale, weekStart, lanes, from, to, messages }
  const [first] = useState(() => scheduleLayout(value ?? defaultValue, settings).value)
  const [shown, setShown] = useState(first)
  const layout = useMemo(() => scheduleLayout(shown, { ...settings, events }), [shown, events, today, locale, weekStart, lanes, from, to, messages])
  const ref = useBehavior(schedule, { ...settings, value: first, draw: setShown }, { value, defaultValue, onValueChange })
  const more = messages?.more ?? ((count: number) => `+${count} more`)
  const moreLabel = messages?.moreLabel ?? ((count: number, day: string) => `${count} more ${count === 1 ? 'event' : 'events'}, ${day}`)
  const words = { today: 'Today', previous: 'Previous', next: 'Next', view: 'View', day: 'Day', week: 'Week', month: 'Month', agenda: 'Agenda', ...labels }

  const event = (item: ScheduleItem, place?: Record<string, number>) => {
    const content = <><span className="schedule-title">{item.title}</span>{item.time && !item.allDay ? <span className="schedule-time">{item.time}</span> : null}</>
    const shared = { className: `schedule-event ${item.classes}`.trim(), style: place && style(Object.fromEntries(Object.entries(place).map(([name, number]) => [`--${name}`, number]))), 'aria-label': item.label }
    return item.event.href
      ? <a {...shared} href={item.event.href} key={`${item.id}${item.column}`}>{content}</a>
      : <button type="button" {...shared} value={item.id} onClick={() => onEventClick?.(item.event)} key={`${item.id}${item.column}`}>{content}</button>
  }
  const list = (items: ScheduleItem[]) => <ol className="schedule-list">{items.map(item => <li key={item.id}>{event(item)}</li>)}</ol>

  let body
  if (layout.value.view === 'month') {
    body = (
      <div className="schedule-month">
        <div className="schedule-weekdays" aria-hidden="true">{layout.weekdays.map(weekday => <span className="schedule-weekday" key={weekday.name}>{weekday.short}</span>)}</div>
        <ol className="schedule-weeks">
          {layout.weeks.map(week => (
            <li className="schedule-week" style={style({ '--lanes': week.lanes })} key={week.days[0]!.date}>
              {week.days.map((day, index) => [
                <div className={day.outside ? 'schedule-date schedule-date-outside' : 'schedule-date'} style={style({ '--column': index + 1, '--count': day.count })} aria-current={day.today ? 'date' : undefined} key={day.date}>
                  <button type="button" className="schedule-date-number" value={day.date} aria-label={day.summary}>{day.text}</button>
                </div>,
                ...day.items.map(item => event(item, { column: item.column, span: item.span, lane: item.lane })),
                ...(day.hidden ? [
                  <button type="button" className="schedule-more" style={style({ '--column': index + 1 })} popoverTarget={`${id}more${day.date}`} aria-label={moreLabel(day.hidden, day.label)} key={`${day.date}more`}>{more(day.hidden)}</button>,
                  <div id={`${id}more${day.date}`} popover="" className="popover" key={`${day.date}list`}><p className="schedule-agenda-date">{day.label}</p>{list(day.all)}</div>,
                ] : []),
              ])}
            </li>
          ))}
        </ol>
      </div>
    )
  } else if (layout.value.view === 'agenda') {
    body = layout.agenda.length
      ? <ol className="schedule-agenda">{layout.agenda.map(day => <li className="schedule-agenda-day" aria-current={day.today ? 'date' : undefined} key={day.date}><h3 className="schedule-agenda-date">{day.heading}</h3>{list(day.items)}</li>)}</ol>
      : <div className="empty"><p className="empty-title">{layout.words.empty}</p></div>
  } else {
    body = (
      <div className="schedule" style={style({ '--schedule-from': layout.from, '--schedule-to': layout.to, '--schedule-days': layout.days.length })}>
        <ol className="schedule-rail" aria-hidden="true">{layout.rail.map((label, index) => <li key={index}>{label}</li>)}</ol>
        {layout.days.map((day, index) => (
          <div className="schedule-day" style={style({ '--column': index + 1 })} aria-current={day.today ? 'date' : undefined} key={day.date}>
            <h3 className="schedule-heading" aria-label={day.label}>{layout.days.length > 1 ? day.heading : day.label}</h3>
            <ol className="schedule-events" aria-label={day.label}>{day.items.map(item => <li key={item.id}>{event(item, { start: item.start, end: item.end, lane: item.lane, lanes: item.lanes })}</li>)}</ol>
          </div>
        ))}
        {layout.allDay.length ? (
          <div className="schedule-allday" role="group" aria-label={layout.words.allDay}>
            <span className="schedule-allday-label" aria-hidden="true">{layout.words.allDay}</span>
            {layout.allDay.map(item => event(item, { column: item.column, span: item.span, lane: item.lane }))}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <section className={className ? `schedule-view ${className}` : 'schedule-view'} aria-labelledby={`${id}title`} ref={ref} {...root}>
      <div className="schedule-view-header">
        <button type="button" className="btn btn-sm schedule-view-today">{words.today}</button>
        <button type="button" className="btn btn-sm btn-square btn-quiet schedule-view-previous" aria-label={words.previous}>{chevron(180)}</button>
        <button type="button" className="btn btn-sm btn-square btn-quiet schedule-view-next" aria-label={words.next}>{chevron()}</button>
        <h2 className="schedule-view-title" id={`${id}title`} aria-live="polite">{layout.title}</h2>
        <div className="segmented segmented-sm schedule-view-switch" role="radiogroup" aria-label={words.view}>
          {(['day', 'week', 'month', 'agenda'] as const).map(name => (
            <label className="segmented-item" key={name}><input type="radio" className="segmented-input" name={`${id}view`} value={name} defaultChecked={first.view === name} />{words[name]}</label>
          ))}
        </div>
      </div>
      <div className="schedule-view-body">{body}</div>
    </section>
  )
}
