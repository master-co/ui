/**
 * Schedule: a schedule a reader works, by the day, the week, the month or as an agenda.
 *
 * `scheduleLayout()` turns events into what each view shows, as data: the weeks of a month with each event's
 * lane and the days that hold more than the lanes do, the hours of a few days with each event's place among the
 * events it overlaps, the all-day band, and the agenda's days. It reads no element and measures nothing, so a
 * server, a framework and this script lay out the same events the same way.
 *
 * `schedule()` drives a `schedule-view`: previous, today and next (`schedule-view-previous`,
 * `schedule-view-today`, `schedule-view-next`) move by the view's period, the radios in `schedule-view-switch`
 * choose the view, and a day's number (`schedule-date-number`) opens that day. It names the period in
 * `schedule-view-title`, which the page marks `aria-live="polite"`, and writes the period into
 * `schedule-view-body` with the contract's classes. Give `draw`, and it writes neither: it calls `draw` with the
 * value and a renderer writes the same from `scheduleLayout()`. An event is the page's: a link when it has an
 * `href`, otherwise a button whose `value` is its id, which the page listens to.
 *
 * The value is `{ date, view }`: the day the view is about, as `YYYY-MM-DD`, and which view. The reader's moves
 * dispatch a bubbling `input` and `change` from the root; setting the returned function's `value` dispatches
 * nothing.
 *
 * Days are local and Gregorian, kept at noon so no daylight-saving change moves one, and days are counted with
 * the calendar, never by adding hours. An all-day event's `start` and `end` are days (`YYYY-MM-DD`); another's
 * are local times (`YYYY-MM-DDTHH:mm`), already in the zone the schedule is shown in. `end` is exclusive: an
 * all-day event on the 13th alone ends on the 14th. Time zones and repeating events are the application's to
 * resolve before the events arrive here.
 */

/**
 * @typedef {object} ScheduleEvent
 * @property {string} id What the event is known by; it stays the same when the event moves.
 * @property {string} title
 * @property {string} start `YYYY-MM-DD` for an all-day event, `YYYY-MM-DDTHH:mm` for another.
 * @property {string} end Exclusive, in the same form as `start`.
 * @property {boolean} [allDay]
 * @property {string} [category] A palette name for its category class, such as `blue` for `category-blue`.
 * @property {string} [href] Where the event opens. Without one, the event is a button.
 */

/**
 * @typedef {'day' | 'week' | 'month' | 'agenda'} ScheduleViewName
 * @typedef {{ date: string, view: ScheduleViewName }} ScheduleValue
 */

/**
 * @typedef {object} ScheduleMessages What the schedule writes, in the page's language.
 * @property {string} [allDay] The name of the all-day band and of an all-day event's time. `All day` by default.
 * @property {(count: number) => string} [more] The button for a day's other events. `+3 more` by default.
 * @property {(count: number, day: string) => string} [moreLabel] Its accessible name. `3 more events, <day>` by default.
 * @property {(count: number) => string} [events] A day's count, read with its number. `3 events` by default.
 * @property {string} [empty] What an agenda with no events says. `No events` by default.
 */

/**
 * @typedef {object} ScheduleOptions
 * @property {ScheduleEvent[]} [events]
 * @property {ScheduleValue} [value] The day and the view to show first. Today's month by default.
 * @property {string} [today] Today, as `YYYY-MM-DD`. Give it when the schedule is rendered on a server.
 * @property {string} [locale] A BCP 47 tag for the names. The `lang` the schedule stands in by default.
 * @property {number} [weekStart] The first day of a week, 0 for Sunday to 6 for Saturday. The locale's own by default.
 * @property {number} [lanes] How many events a day of a month shows before the rest go behind its more button. 3 by default.
 * @property {number} [from] The first hour a day or a week shows at least. 8 by default.
 * @property {number} [to] The last hour a day or a week shows at least. 18 by default.
 * @property {ScheduleMessages} [messages]
 * @property {(value: ScheduleValue) => void} [draw] Takes over writing the title and the body.
 */

/**
 * @typedef {object} ScheduleItem An event as one view shows it: a piece of it, in a lane or on the hours.
 * @property {ScheduleEvent} event
 * @property {string} id
 * @property {string} title
 * @property {string} label Its accessible name: the title and when it is, in words.
 * @property {string} time The time shown beside the title, or empty.
 * @property {boolean} allDay
 * @property {boolean} plain A short event in a month or a list: a dot, not a sheet.
 * @property {boolean} continued It began before this row or this day.
 * @property {boolean} continues It goes on after this row or this day.
 * @property {number} column In a lane: the day it starts on in its row, from 1.
 * @property {number} span In a lane: how many days it covers in its row.
 * @property {number} lane In a lane: its lane, from 0.
 * @property {number} start On the hours: where it begins, in hours.
 * @property {number} end On the hours: where it ends, in hours.
 * @property {number} lanes On the hours: how many events stand side by side where it does.
 * @property {string} classes Its classes beyond `schedule-event`, as the contract names them.
 */

/**
 * @typedef {object} ScheduleDay
 * @property {string} date `YYYY-MM-DD`.
 * @property {string} text Its number.
 * @property {string} label The whole date, in words.
 * @property {string} summary The whole date and how many events it holds, for its number's accessible name.
 * @property {string} heading A short name for a column heading, such as `Thu 13`.
 * @property {boolean} today
 * @property {boolean} outside A day of a month before or after.
 * @property {number} count How many events it holds.
 * @property {number} hidden How many of them are behind its more button.
 * @property {ScheduleItem[]} items In a month, the pieces that start in it on a shown lane; in a list, all of its events.
 * @property {ScheduleItem[]} all Every event it holds, for its more button's list.
 */

/**
 * @typedef {object} ScheduleLayout
 * @property {ScheduleValue} value
 * @property {string} title The period, as the locale writes it.
 * @property {string} today
 * @property {string} previous The value's date one period back.
 * @property {string} next The value's date one period on.
 * @property {{ name: string, short: string }[]} weekdays
 * @property {{ days: ScheduleDay[], lanes: number }[]} weeks A month's weeks.
 * @property {ScheduleDay[]} days A day's or a week's days, with their events on the hours in `items`.
 * @property {ScheduleItem[]} allDay The all-day band's events of a day or a week.
 * @property {number} from The first hour shown.
 * @property {number} to The last hour shown.
 * @property {string[]} rail The labels of the hours, from `from` to `to`.
 * @property {ScheduleDay[]} agenda The agenda's days that hold an event, with their events in `items`.
 * @property {Required<Pick<ScheduleMessages, 'allDay' | 'empty'>>} words
 */

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/** @param {number} number @param {number} [length] */
const pad = (number, length = 2) => String(number).padStart(length, '0')

/** @param {number} year @param {number} month @param {number} date */
function noon(year, month, date) {
  const result = new Date(2000, 0, 1, 12)
  result.setFullYear(year, month, date)
  return result
}

/** @param {Date} date */
const iso = (date) => `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** @param {unknown} text */
function day(text) {
  const match = typeof text === 'string' && /^(\d{4})-(\d{2})-(\d{2})/.exec(text)
  if (!match) return null
  const date = noon(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return iso(date) === match[0] ? date : null
}

/** A local time as its day and its minute of the day. @param {unknown} text */
function moment(text) {
  const date = day(text)
  if (!date) return null
  const match = /T(\d{2}):(\d{2})/.exec(/** @type {string} */ (text))
  return { date, minutes: match ? Math.min(1440, Number(match[1]) * 60 + Number(match[2])) : 0 }
}

/** @param {Date} date @param {number} days */
const shift = (date, days) => noon(date.getFullYear(), date.getMonth(), date.getDate() + days)
/** Calendar days from one day to another; noon to noon, so a daylight-saving hour never tips it. @param {Date} from @param {Date} to */
const between = (from, to) => Math.round((to.getTime() - from.getTime()) / 864e5)

/** @param {Date} date @param {number} count */
function months(date, count) {
  const year = date.getFullYear()
  const month = date.getMonth() + count
  return noon(year, month, Math.min(date.getDate(), noon(year, month + 1, 0).getDate()))
}

/** @param {string | undefined} locale */
function firstDay(locale) {
  try {
    const info = /** @type {any} */ (new Intl.Locale(locale ?? new Intl.DateTimeFormat().resolvedOptions().locale))
    return (info.getWeekInfo?.() ?? info.weekInfo).firstDay % 7
  } catch {
    return 1
  }
}

/** @param {string | undefined} tag */
function canonical(tag) {
  try {
    return Intl.getCanonicalLocales(tag)[0]
  } catch {
    return undefined
  }
}

const views = /** @type {ScheduleViewName[]} */ (['day', 'week', 'month', 'agenda'])

/**
 * A value as the schedule reads it: a real day and a known view.
 * @param {Partial<ScheduleValue> | null | undefined} value @param {string} today
 * @returns {ScheduleValue}
 */
function settle(value, today) {
  const date = day(value?.date) ? /** @type {string} */ (value?.date).slice(0, 10) : today
  const view = views.includes(/** @type {ScheduleViewName} */ (value?.view)) ? /** @type {ScheduleViewName} */ (value?.view) : 'month'
  return { date, view }
}

/**
 * The value's date one period away.
 * @param {ScheduleValue} value @param {number} step
 */
function turn(value, step) {
  const date = /** @type {Date} */ (day(value.date))
  if (value.view === 'day') return iso(shift(date, step))
  if (value.view === 'week') return iso(shift(date, step * 7))
  return iso(months(date, step))
}

/**
 * Each event's first and last day, and whether it keeps to the hours of a day.
 * @param {ScheduleEvent} event
 */
function span(event) {
  if (event.allDay) {
    const first = day(event.start)
    if (!first) return null
    const end = day(event.end)
    const last = end && end > first ? shift(end, -1) : first
    return { event, first, last, from: 0, to: 1440, timed: false, long: true }
  }
  const from = moment(event.start)
  if (!from) return null
  let to = moment(event.end)
  if (!to || to.date < from.date || (iso(to.date) === iso(from.date) && to.minutes < from.minutes)) to = { date: from.date, minutes: from.minutes }
  // An event that ends at midnight ends with the day before.
  const last = to.minutes === 0 && to.date > from.date ? shift(to.date, -1) : to.date
  const length = between(from.date, to.date) * 1440 + to.minutes - from.minutes
  return { event, first: from.date, last, from: from.minutes, to: to.minutes, timed: true, long: length >= 1440, fromDate: from.date, toDate: to.date }
}

/**
 * Lay events out for a view: the data a renderer writes the schedule from.
 * @param {Partial<ScheduleValue>} [given] The day and the view; today's month by default.
 * @param {Omit<ScheduleOptions, 'value' | 'draw'>} [options]
 * @returns {ScheduleLayout}
 */
export function scheduleLayout(given, options = {}) {
  const locale = canonical(options.locale)
  /** @param {Intl.DateTimeFormatOptions} parts */
  const format = (parts) => new Intl.DateTimeFormat(locale, { calendar: 'gregory', ...parts })
  const full = format({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const weekdayShort = format({ weekday: 'short' })
  const agendaDate = format({ weekday: 'short', day: 'numeric', month: 'short' })
  const clock = format({ hour: 'numeric', minute: '2-digit' })
  const hour = format({ hour: 'numeric' })
  const number = new Intl.NumberFormat(locale, { useGrouping: false })
  const words = {
    allDay: options.messages?.allDay ?? 'All day',
    empty: options.messages?.empty ?? 'No events',
  }
  const counted = options.messages?.events ?? ((/** @type {number} */ count) => `${count} ${count === 1 ? 'event' : 'events'}`)
  const weekStart = Number.isInteger(options.weekStart) ? ((/** @type {number} */ (options.weekStart) % 7) + 7) % 7 : firstDay(locale)
  const now = day(options.today) ?? (() => { const date = new Date(); return noon(date.getFullYear(), date.getMonth(), date.getDate()) })()
  const today = iso(now)
  const value = settle(given, today)
  const anchor = /** @type {Date} */ (day(value.date))
  const lanes = Math.max(1, Math.floor(options.lanes ?? 3))

  const spans = /** @type {NonNullable<ReturnType<typeof span>>[]} */ ((options.events ?? []).map(span).filter(Boolean))
  /** @param {Date} date @param {number} minutes */
  const at = (date, minutes) => clock.format(new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(minutes / 60), minutes % 60))
  /** When an event is, in words. @param {NonNullable<ReturnType<typeof span>>} item */
  function when(item) {
    if (!item.timed) {
      return iso(item.first) === iso(item.last) ? full.format(item.first) : format({ day: 'numeric', month: 'long', year: 'numeric' }).formatRange(item.first, item.last)
    }
    const start = /** @type {Date} */ (item.fromDate)
    const end = /** @type {Date} */ (item.toDate)
    if (iso(start) === iso(end)) return `${full.format(start)}, ${at(start, item.from)} – ${at(end, item.to)}`
    return `${full.format(start)} ${at(start, item.from)} – ${full.format(end)} ${at(end, item.to)}`
  }
  /** The order events are listed in: all day first, longer first, earlier first. @param {NonNullable<ReturnType<typeof span>>} a @param {NonNullable<ReturnType<typeof span>>} b */
  const order = (a, b) => (a.first.getTime() - b.first.getTime()) || (Number(b.long) - Number(a.long)) || (between(b.first, b.last) - between(a.first, a.last)) || (a.from - b.from) || a.event.title.localeCompare(b.event.title) || a.event.id.localeCompare(b.event.id)

  /**
   * An event as a piece of a view.
   * @param {NonNullable<ReturnType<typeof span>>} item @param {Partial<ScheduleItem>} place
   * @returns {ScheduleItem}
   */
  function piece(item, place) {
    const plain = Boolean(place.plain)
    const merged = { column: 1, span: 1, lane: 0, start: 0, end: 0, lanes: 1, continued: false, continues: false, ...place, plain }
    const classes = [
      place.column !== undefined && 'schedule-event-lane',
      plain && 'schedule-event-plain',
      merged.continued && 'schedule-event-continued',
      merged.continues && 'schedule-event-continues',
      item.event.category && `schedule-event-category category-${item.event.category}`
    ].filter(Boolean).join(' ')
    return {
      event: item.event,
      id: item.event.id,
      title: item.event.title,
      label: `${item.event.title}, ${when(item)}`,
      time: place.time ?? '',
      allDay: !item.timed,
      ...merged,
      classes
    }
  }

  /** @param {Date} date @returns {ScheduleDay} */
  const describe = (date) => ({ date: iso(date), text: number.format(date.getDate()), label: full.format(date), summary: full.format(date), heading: `${weekdayShort.format(date)} ${number.format(date.getDate())}`, today: iso(date) === today, outside: false, count: 0, hidden: 0, items: [], all: [] })
  /** Events on a day, listed. @param {Date} date */
  const listed = (date) => spans.filter((item) => item.first <= date && item.last >= date).sort(order).map((item) => piece(item, {
    column: 1,
    plain: item.timed && !item.long,
    time: !item.timed ? words.allDay : iso(item.first) === iso(date) ? at(date, item.from) : '',
    continued: item.first < date,
    continues: item.last > date
  }))

  const corner = (/** @type {Date} */ date) => shift(date, -((date.getDay() - weekStart + 7) % 7))
  const weekdays = Array.from({ length: 7 }, (_, index) => {
    const date = shift(corner(anchor), index)
    return { name: format({ weekday: 'long' }).format(date), short: format({ weekday: 'short' }).format(date) }
  })

  /** @type {ScheduleLayout} */
  const layout = {
    value,
    title: '',
    today,
    previous: turn(value, -1),
    next: turn(value, 1),
    weekdays,
    weeks: [],
    days: [],
    allDay: [],
    from: 0,
    to: 0,
    rail: [],
    agenda: [],
    words
  }

  if (value.view === 'month') {
    const first = noon(anchor.getFullYear(), anchor.getMonth(), 1)
    const last = noon(anchor.getFullYear(), anchor.getMonth() + 1, 0)
    layout.title = format({ month: 'long', year: 'numeric' }).format(first)
    for (let head = corner(first); head <= last; head = shift(head, 7)) {
      const tail = shift(head, 6)
      const days = Array.from({ length: 7 }, (_, index) => {
        const date = shift(head, index)
        return { ...describe(date), outside: date < first || date > last }
      })
      /** @type {boolean[][]} */
      const taken = []
      const inWeek = spans.filter((item) => item.first <= tail && item.last >= head).sort(order)
      for (const item of inWeek) {
        // A short event keeps to the day it starts on; a long one spans its days in this week.
        const short = item.timed && !item.long
        if (short && item.first < head) continue
        const start = item.first < head ? head : item.first
        const end = short ? start : item.last > tail ? tail : item.last
        const column = between(head, start) + 1
        const length = between(start, end) + 1
        let lane = 0
        while (taken[lane]?.slice(column - 1, column - 1 + length).some(Boolean)) lane++
        taken[lane] ??= []
        for (let index = column - 1; index < column - 1 + length; index++) taken[lane][index] = true
        const placed = piece(item, {
          column,
          span: length,
          lane,
          plain: short,
          time: item.timed && item.first >= head ? at(item.first, item.from) : '',
          continued: !short && item.first < head,
          continues: !short && item.last > tail
        })
        for (let index = column - 1; index < column - 1 + length; index++) {
          days[index].count++
          if (lane >= lanes) days[index].hidden++
        }
        if (lane < lanes) days[column - 1].items.push(placed)
      }
      for (const entry of days) {
        if (entry.count) entry.summary = `${entry.label}, ${counted(entry.count)}`
        if (entry.hidden) entry.all = listed(/** @type {Date} */ (day(entry.date)))
      }
      // Every week keeps the same lanes, so the month's rows are one height.
      layout.weeks.push({ days, lanes })
    }
    return layout
  }

  if (value.view === 'agenda') {
    const first = noon(anchor.getFullYear(), anchor.getMonth(), 1)
    const last = noon(anchor.getFullYear(), anchor.getMonth() + 1, 0)
    layout.title = format({ month: 'long', year: 'numeric' }).format(first)
    for (let date = first; date <= last; date = shift(date, 1)) {
      const items = listed(date)
      if (!items.length) continue
      layout.agenda.push({ ...describe(date), heading: agendaDate.format(date), count: items.length, items, all: items })
    }
    return layout
  }

  // A day, or a week: the hours of each day, and a band for what lasts a whole day.
  const head = value.view === 'week' ? corner(anchor) : anchor
  const count = value.view === 'week' ? 7 : 1
  const tail = shift(head, count - 1)
  layout.title = value.view === 'week'
    ? format({ day: 'numeric', month: 'short', year: 'numeric' }).formatRange(head, tail)
    : full.format(anchor)

  /** @type {boolean[][]} */
  const taken = []
  for (const item of spans.filter((each) => each.long && each.first <= tail && each.last >= head).sort(order)) {
    const start = item.first < head ? head : item.first
    const end = item.last > tail ? tail : item.last
    const column = between(head, start) + 1
    const length = between(start, end) + 1
    let lane = 0
    while (taken[lane]?.slice(column - 1, column - 1 + length).some(Boolean)) lane++
    taken[lane] ??= []
    for (let index = column - 1; index < column - 1 + length; index++) taken[lane][index] = true
    layout.allDay.push(piece(item, {
      column,
      span: length,
      lane,
      time: item.timed && item.first >= head ? at(item.first, item.from) : '',
      continued: item.first < head,
      continues: item.last > tail
    }))
  }

  let from = Math.max(0, Math.min(24, Math.floor(options.from ?? 8)))
  let to = Math.max(from + 1, Math.min(24, Math.ceil(options.to ?? 18)))
  for (let index = 0; index < count; index++) {
    const date = shift(head, index)
    const entry = describe(date)
    entry.count = spans.filter((item) => item.first <= date && item.last >= date).length
    // The pieces of the short events on this day's hours, a piece past midnight on each day it touches.
    const pieces = spans
      .filter((item) => item.timed && !item.long && item.first <= date && /** @type {Date} */ (item.toDate) >= date)
      .map((item) => {
        const start = iso(item.first) === iso(date) ? item.from / 60 : 0
        const finish = iso(/** @type {Date} */ (item.toDate)) === iso(date) ? item.to / 60 : 24
        return { item, start, end: Math.max(finish, start + .25), continued: item.first < date, continues: iso(/** @type {Date} */ (item.toDate)) !== iso(date) }
      })
      .filter((entry) => entry.end > entry.start && !(entry.start === 0 && entry.continued && entry.end <= 0))
      .sort((a, b) => (a.start - b.start) || (b.end - a.end) || a.item.event.id.localeCompare(b.item.event.id))
    // Events that overlap share the width: a cluster takes as many lanes as it needs at once.
    /** @type {{ entry: typeof pieces[number], lane: number }[]} */
    let cluster = []
    /** @type {number[]} */
    let ends = []
    const close = () => {
      for (const { entry: each, lane } of cluster) {
        entry.items.push(piece(each.item, {
          start: each.start,
          end: each.end,
          lane,
          lanes: ends.length,
          time: `${at(date, Math.round(each.start * 60))} – ${at(date, Math.round(each.end * 60) % 1440)}`,
          continued: each.continued,
          continues: each.continues
        }))
      }
      cluster = []
      ends = []
    }
    for (const each of pieces) {
      if (ends.length && Math.max(...ends) <= each.start) close()
      let lane = ends.findIndex((end) => end <= each.start)
      if (lane === -1) lane = ends.push(each.end) - 1
      else ends[lane] = each.end
      cluster.push({ entry: each, lane })
      from = Math.min(from, Math.floor(each.start))
      to = Math.max(to, Math.ceil(each.end))
    }
    close()
    layout.days.push(entry)
  }
  layout.from = from
  layout.to = to
  layout.rail = Array.from({ length: to - from + 1 }, (_, index) => hour.format(new Date(2000, 0, 1, (from + index) % 24)))
  return layout
}

/**
 * @param {HTMLElement} root The element with the `schedule-view` class.
 * @param {ScheduleOptions} [options]
 * @returns {(() => void) & { value: ScheduleValue }} Removes the listeners; the view it wrote stays. Its `value`
 *   is the day and the view on show.
 */
export function schedule(root, options = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)

  const locale = canonical(options.locale ?? (root.closest('[lang]')?.getAttribute('lang') || undefined))
  const settings = { ...options, locale }
  delete settings.draw
  delete settings.value
  const today = scheduleLayout(undefined, settings).today
  let value = settle(options.value, today)

  const detach = /** @type {(() => void) & { value: ScheduleValue }} */ (Object.defineProperty(() => controller.abort(), 'value', {
    enumerable: true,
    get: () => ({ ...value }),
    set: (/** @type {ScheduleValue} */ next) => {
      const settled = settle(next, today)
      if (settled.date === value.date && settled.view === value.view) return
      value = settled
      show()
    }
  }))
  signal.addEventListener('abort', () => { if (attached.get(root) === controller) attached.delete(root) })

  const title = /** @type {HTMLElement | null} */ (root.querySelector('.schedule-view-title'))
  const body = /** @type {HTMLElement | null} */ (root.querySelector('.schedule-view-body'))
  const radios = () => /** @type {HTMLInputElement[]} */ ([...root.querySelectorAll('.schedule-view-switch input[type="radio"]')])
  const messages = options.messages ?? {}
  const more = messages.more ?? ((/** @type {number} */ count) => `+${count} more`)
  const moreLabel = messages.moreLabel ?? ((/** @type {number} */ count, /** @type {string} */ date) => `${count} more ${count === 1 ? 'event' : 'events'}, ${date}`)

  /** @param {string} tag @param {Record<string, string | undefined>} attributes @param {(Node | string)[]} children */
  function make(tag, attributes, ...children) {
    const element = root.ownerDocument.createElement(tag)
    for (const [name, text] of Object.entries(attributes)) if (text !== undefined) element.setAttribute(name, text)
    element.append(...children)
    return element
  }

  /** An event: a link where it opens, a button the page listens to elsewhere. @param {ScheduleItem} item @param {string} style */
  const event = (item, style) => make(item.event.href ? 'a' : 'button', {
    class: `schedule-event ${item.classes}`.trim(),
    style: style || undefined,
    href: item.event.href,
    type: item.event.href ? undefined : 'button',
    value: item.event.href ? undefined : item.id,
    'aria-label': item.label
  }, make('span', { class: 'schedule-title' }, item.title), ...(item.time && !item.allDay ? [make('span', { class: 'schedule-time' }, item.time)] : []))

  /** A list of events, for a popover or an agenda day. @param {ScheduleItem[]} items */
  const list = (items) => make('ol', { class: 'schedule-list' }, ...items.map((item) => make('li', {}, event(item, ''))))

  let serial = 0
  const prefix = root.id || `schedule-${Math.random().toString(36).slice(2, 8)}`

  /** @param {ScheduleLayout} layout */
  function month(layout) {
    return make('div', { class: 'schedule-month' },
      make('div', { class: 'schedule-weekdays', 'aria-hidden': 'true' }, ...layout.weekdays.map((weekday) => make('span', { class: 'schedule-weekday' }, weekday.short))),
      make('ol', { class: 'schedule-weeks' }, ...layout.weeks.map((week) => make('li', { class: 'schedule-week', style: `--lanes: ${week.lanes}` }, ...week.days.flatMap((entry, index) => {
        const nodes = [make('div', {
          class: entry.outside ? 'schedule-date schedule-date-outside' : 'schedule-date',
          style: `--column: ${index + 1}; --count: ${entry.count}`,
          'aria-current': entry.today ? 'date' : undefined
        }, make('button', { type: 'button', class: 'schedule-date-number', value: entry.date, 'aria-label': entry.summary }, entry.text))]
        for (const item of entry.items) nodes.push(event(item, `--column: ${item.column}; --span: ${item.span}; --lane: ${item.lane}`))
        if (entry.hidden) {
          const id = `${prefix}-more-${++serial}`
          nodes.push(
            make('button', { type: 'button', class: 'schedule-more', style: `--column: ${index + 1}`, popovertarget: id, 'aria-label': moreLabel(entry.hidden, entry.label) }, more(entry.hidden)),
            make('div', { id, popover: '', class: 'popover' }, make('p', { class: 'schedule-agenda-date' }, entry.label), list(entry.all))
          )
        }
        return nodes
      }))))
    )
  }

  /** @param {ScheduleLayout} layout */
  function hours(layout) {
    const columns = layout.days.length
    const children = [
      make('ol', { class: 'schedule-rail', 'aria-hidden': 'true' }, ...layout.rail.map((label) => make('li', {}, label))),
      ...layout.days.map((entry, index) => make('div', {
        class: 'schedule-day',
        style: `--column: ${index + 1}`,
        'aria-current': entry.today ? 'date' : undefined
      },
      make('h3', { class: 'schedule-heading', 'aria-label': entry.label }, columns > 1 ? entry.heading : entry.label),
      make('ol', { class: 'schedule-events', 'aria-label': entry.label }, ...entry.items.map((item) => make('li', {}, event(item, `--start: ${item.start}; --end: ${item.end}; --lane: ${item.lane}; --lanes: ${item.lanes}`))))))
    ]
    if (layout.allDay.length) {
      children.push(make('div', { class: 'schedule-allday', role: 'group', 'aria-label': layout.words.allDay },
        make('span', { class: 'schedule-allday-label', 'aria-hidden': 'true' }, layout.words.allDay),
        ...layout.allDay.map((item) => event(item, `--column: ${item.column}; --span: ${item.span}; --lane: ${item.lane}`))))
    }
    return make('div', { class: 'schedule', style: `--schedule-from: ${layout.from}; --schedule-to: ${layout.to}; --schedule-days: ${columns}` }, ...children)
  }

  /** @param {ScheduleLayout} layout */
  function agenda(layout) {
    if (!layout.agenda.length) return make('div', { class: 'empty' }, make('p', { class: 'empty-title' }, layout.words.empty))
    return make('ol', { class: 'schedule-agenda' }, ...layout.agenda.map((entry) => make('li', { class: 'schedule-agenda-day', 'aria-current': entry.today ? 'date' : undefined },
      make('h3', { class: 'schedule-agenda-date' }, entry.heading),
      list(entry.items))))
  }

  /** Show the value: mark the switch, and write the title and the body, or ask the renderer to. */
  function show() {
    for (const radio of radios()) radio.checked = radio.value === value.view
    if (options.draw) return options.draw({ ...value })
    const layout = scheduleLayout(value, settings)
    if (title) title.textContent = layout.title
    if (!body) return
    serial = 0
    body.replaceChildren(layout.value.view === 'month' ? month(layout) : layout.value.view === 'agenda' ? agenda(layout) : hours(layout))
  }

  /** The reader moved: show it and say so. @param {ScheduleValue} next */
  function move(next) {
    if (next.date === value.date && next.view === value.view) return
    value = next
    show()
    root.dispatchEvent(new Event('input', { bubbles: true }))
    root.dispatchEvent(new Event('change', { bubbles: true }))
  }

  root.addEventListener('click', (click) => {
    const target = /** @type {Element} */ (click.target)
    if (target.closest('.schedule-view-previous')) return move({ ...value, date: turn(value, -1) })
    if (target.closest('.schedule-view-next')) return move({ ...value, date: turn(value, 1) })
    if (target.closest('.schedule-view-today')) return move({ ...value, date: today })
    const number = /** @type {HTMLButtonElement | null} */ (target.closest('.schedule-date-number'))
    if (number && day(number.value)) {
      move({ date: number.value, view: 'day' })
      // The number that was pressed is gone with the month: focus goes to the name of the day now on show.
      if (title) {
        if (!title.hasAttribute('tabindex')) title.setAttribute('tabindex', '-1')
        title.focus()
      }
    }
  }, { signal })

  root.addEventListener('change', (change) => {
    const radio = /** @type {HTMLInputElement} */ (change.target)
    if (change.target === root || !radio.matches?.('.schedule-view-switch input[type="radio"]') || !radio.checked) return
    move({ ...value, view: /** @type {ScheduleViewName} */ (views.includes(/** @type {ScheduleViewName} */ (radio.value)) ? radio.value : 'month') })
  }, { signal })

  show()
  return detach
}
