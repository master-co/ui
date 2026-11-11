/**
 * Calendar: fills the date grid and moves through it.
 *
 * The stylesheet draws a day from its attributes; this script supplies the days. It writes the weekday names
 * and the weeks of the shown month into `calendar-grid`, names the month in `calendar-title`, and makes the
 * first and the last button of `calendar-header` show the month before and the month after. On the days it
 * sets today (`aria-current="date"`), the chosen day or range (`aria-selected="true"` and the range classes),
 * the days that cannot be chosen (`disabled`) and the one day in the tab order (`tabindex`).
 *
 * In the grid the keys are those of the Authoring Practices date grid. A move past the edge of the month
 * shows the neighboring month and keeps focus on the new day; a move never lands on a day that cannot be
 * chosen, and stops at `min` and `max`. Enter and Space are left to the day, which is a button: its click
 * chooses.
 *
 * Choosing dispatches a bubbling `change` CustomEvent from the root with `detail.value`: the day as
 * `YYYY-MM-DD`, or `[start, end]` once both ends of a range are chosen. The value lives in the script, not in
 * the markup; read it from the returned function's `value`, and set that to choose from outside, which shows
 * the month of the new value and dispatches nothing.
 *
 * The grid may be written by something else: a template, or a framework that renders it on a server. Give
 * `draw`, and the script writes no element. It calls `draw` with the month to show, as `YYYY-MM`, and marks
 * the days once they are there; `calendarMonth()` gives that month's weekday names and weeks as data. Each
 * day is a button whose `value` is its date, which is how the script knows the days it did not write.
 *
 * Days are local and Gregorian, kept at noon so that no daylight-saving change moves one to the day before.
 */

/**
 * @typedef {object} CalendarOptions
 * @property {string | string[]} [value] The chosen day as `YYYY-MM-DD`, or the two ends of a range.
 * @property {string} [month] The month to show first, as `YYYY-MM`. The month of the value, or of today, by default.
 * @property {string} [min] The first day that can be chosen, as `YYYY-MM-DD`.
 * @property {string} [max] The last day that can be chosen, as `YYYY-MM-DD`.
 * @property {boolean} [range] Choose two days and every day between them.
 * @property {number} [weekStart] The day in the first column, 0 for Sunday to 6 for Saturday. The locale's own by default, and Monday where the browser cannot say.
 * @property {string} [locale] A BCP 47 tag for the names of months and days. The `lang` the calendar stands in by default.
 * @property {(date: Date) => boolean} [disabled] Says whether a day cannot be chosen.
 * @property {(month: string) => void} [draw] Takes over writing the grid: called with the month to show, as
 *   `YYYY-MM`, whenever it is not the month the grid holds. Write the days `calendarMonth(month)` lists.
 */

/**
 * @typedef {object} CalendarMonth A month as data, for a renderer that writes the grid itself.
 * @property {string} month The month, as `YYYY-MM`.
 * @property {string} title The month and the year, as the locale writes them.
 * @property {{ name: string, short: string }[]} weekdays The seven column headings, from the first day of the week.
 * @property {{ date: string, text: string, label: string, outside: boolean, selected: boolean, tab: boolean, range: string }[][]} weeks
 *   The weeks that hold a day of the month. `date` is `YYYY-MM-DD`, `text` the number shown, `label` the full
 *   date for assistive technology, and `outside` marks a day of the month before or after. The last three say
 *   how a `value` given with the month is drawn, for a renderer that writes the days before the behavior
 *   attaches: `selected` is `aria-selected`, `tab` the one day with `tabindex="0"`, and `range` the classes of
 *   a day in a range, empty for any other day.
 */

/**
 * @typedef {string | [string, string | null] | null} CalendarValue A day, or the two ends of a range; the
 * end of a range is null until it is chosen.
 */

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/** @param {number} number @param {number} [length] */
const pad = (number, length = 2) => String(number).padStart(length, '0')

/**
 * A local day at noon. A month or a day past its range rolls over as it does in `Date`, so day 0 is the last
 * day of the month before.
 * @param {number} year @param {number} month @param {number} date
 */
function noon(year, month, date) {
  const result = new Date(2000, 0, 1, 12)
  result.setFullYear(year, month, date)
  return result
}

/** @param {Date} date */
const iso = (date) => `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/**
 * `YYYY-MM-DD` as a day; null for anything else, and for a day no month has.
 * @param {unknown} text
 */
function parse(text) {
  const match = typeof text === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!match) return null
  const date = noon(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return iso(date) === text ? date : null
}

/** @param {Date} date @param {number} days */
const shift = (date, days) => noon(date.getFullYear(), date.getMonth(), date.getDate() + days)

/**
 * The same day a number of months away, or the last day of that month when it is shorter.
 * @param {Date} date @param {number} count
 */
function months(date, count) {
  const year = date.getFullYear()
  const month = date.getMonth() + count
  return noon(year, month, Math.min(date.getDate(), noon(year, month + 1, 0).getDate()))
}

/**
 * The first day of the week where a locale is spoken, 0 for Sunday to 6 for Saturday.
 * @param {string | undefined} locale
 */
function firstDay(locale) {
  try {
    const info = /** @type {any} */ (new Intl.Locale(locale ?? new Intl.DateTimeFormat().resolvedOptions().locale))
    return (info.getWeekInfo?.() ?? info.weekInfo).firstDay % 7
  } catch {
    return 1
  }
}

/** Today, as a local day at noon. */
function today() {
  const now = new Date()
  return noon(now.getFullYear(), now.getMonth(), now.getDate())
}

/**
 * A BCP 47 tag in its canonical form; undefined, which is the browser's own language, for one that is not a tag.
 * @param {string | undefined} tag
 */
function canonical(tag) {
  try {
    return Intl.getCanonicalLocales(tag)[0]
  } catch {
    return undefined
  }
}

/**
 * A month as data: its name, the names of the weekdays and its weeks, each day with its date, its number and
 * its full name. The calendar behavior writes its grid from this; a renderer that writes the grid itself,
 * with the `draw` option, reads the same.
 * @param {string} [of] The month as `YYYY-MM`, or any day of it as `YYYY-MM-DD`. This month by default.
 * @param {{ weekStart?: number, locale?: string, value?: string | (string | null)[] | null, range?: boolean }} [options]
 *   `weekStart`: the day in the first column, 0 for Sunday to 6 for Saturday; the locale's own by default.
 *   `locale`: a BCP 47 tag for the names. `value` and `range`: what is chosen, as the behavior takes them,
 *   to have its days marked in the data. The behavior marks the days itself once it attaches.
 * @returns {CalendarMonth}
 */
export function calendarMonth(of, options = {}) {
  const locale = canonical(options.locale)
  /** @param {Intl.DateTimeFormatOptions} parts */
  const format = (parts) => new Intl.DateTimeFormat(locale, { calendar: 'gregory', ...parts })
  const monthName = format({ month: 'long', year: 'numeric' })
  const dayName = format({ dateStyle: 'full' })
  const weekdayName = format({ weekday: 'long' })
  const weekdayShort = format({ weekday: 'short' })
  const dayNumber = new Intl.NumberFormat(locale, { useGrouping: false })
  const weekStart = Number.isInteger(options.weekStart)
    ? ((/** @type {number} */ (options.weekStart) % 7) + 7) % 7
    : firstDay(locale)

  const day = parse(of) ?? parse(`${of}-01`) ?? today()
  const from = noon(day.getFullYear(), day.getMonth(), 1)
  const to = noon(day.getFullYear(), day.getMonth() + 1, 0)
  const corner = shift(from, -((from.getDay() - weekStart + 7) % 7))
  const week = Array.from({ length: 7 }, (_, index) => index)
  // The chosen day, or the two ends of a range, as the behavior reads them.
  const given = [options.value].flat().map(parse).filter((date) => date !== null).map(iso).sort()
  const start = given[0] ?? null
  const last = (options.range && given[1]) || start
  const weeks = []
  for (let head = corner; head <= to; head = shift(head, 7)) {
    weeks.push(week.map((index) => {
      const date = shift(head, index)
      const key = iso(date)
      const selected = start !== null && key >= start && key <= /** @type {string} */ (last)
      return {
        date: key,
        text: dayNumber.format(date.getDate()),
        label: dayName.format(date),
        outside: date < from || date > to,
        selected,
        tab: key === start,
        range: options.range && selected
          ? [key === start && 'calendar-day-range-start', key === last && 'calendar-day-range-end', key !== start && key !== last && 'calendar-day-range'].filter(Boolean).join(' ')
          : ''
      }
    }))
  }
  return {
    month: iso(from).slice(0, 7),
    title: monthName.format(from),
    weekdays: week.map((index) => ({ name: weekdayName.format(shift(corner, index)), short: weekdayShort.format(shift(corner, index)) })),
    weeks
  }
}

/**
 * @param {HTMLElement} root The element with the `calendar` class.
 * @param {CalendarOptions} [options]
 * @returns {(() => void) & { value: CalendarValue }} Removes the listeners; the month it drew stays. Its
 *   `value` is what is chosen now.
 */
export function calendar(root, options = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)

  const range = Boolean(options.range)
  /** The chosen day; in a range, its two ends. */
  let start = /** @type {string | null} */ (null)
  let end = /** @type {string | null} */ (null)
  /**
   * Take a value given from outside. Says whether it differs from what is chosen.
   * @param {unknown} next
   */
  const take = (next) => {
    const given = [next].flat().map(parse).filter((date) => date !== null).map(iso).sort()
    const before = [start, end].join()
    start = given[0] ?? null
    end = (range && given[1]) || null
    return [start, end].join() !== before
  }
  take(options.value)

  /** @returns {CalendarValue} */
  const value = () => (range && start ? [start, end] : start)
  const detach = /** @type {(() => void) & { value: CalendarValue }} */ (
    Object.defineProperty(() => controller.abort(), 'value', {
      enumerable: true,
      get: value,
      // The same value given back, as a framework does after a choice, moves nothing: the month stays.
      set: (/** @type {CalendarValue} */ next) => {
        if (!grid || !take(next)) return
        if (start) focused = settle(/** @type {Date} */ (parse(start)))
        draw()
      }
    })
  )

  const grid = /** @type {HTMLElement} */ (root.querySelector('.calendar-grid'))
  if (!grid) return detach
  const title = root.querySelector('.calendar-title')
  const turns = /** @type {HTMLButtonElement[]} */ ([...root.querySelectorAll('.calendar-header button')])
  const previous = turns[0]
  const next = turns.length > 1 ? turns[turns.length - 1] : undefined

  /** The language of the names: the option, or the `lang` the calendar stands in, or the browser's. */
  const locale = canonical(options.locale ?? (root.closest('[lang]')?.getAttribute('lang') || undefined))
  const weekStart = Number.isInteger(options.weekStart)
    ? ((/** @type {number} */ (options.weekStart) % 7) + 7) % 7
    : firstDay(locale)

  const min = parse(options.min)
  const max = parse(options.max)
  /** @param {Date} date */
  const unavailable = (date) => Boolean((min && date < min) || (max && date > max) || options.disabled?.(new Date(date)))
  /** @param {Date} date */
  const clamp = (date) => (min && date < min ? min : max && date > max ? max : date)

  /**
   * The day nearest to one that can hold focus: itself, or a later day of its month, or an earlier one.
   * @param {Date} date
   */
  function settle(date) {
    date = clamp(date)
    for (const step of [1, -1]) {
      for (let near = date; near.getMonth() === date.getMonth(); near = shift(near, step)) {
        if (!unavailable(near)) return near
      }
    }
    return date
  }

  /** The day in the tab order. Its month is the month shown: the chosen day or today when the month holds it. */
  const first = parse(`${options.month}-01`)
  let focused = settle(
    [parse(start), today()].find((date) => date && (!first || iso(date).slice(0, 7) === options.month)) ?? /** @type {Date} */ (first)
  )

  /** The days in the grid by their ISO date, which each one carries as its `value`. */
  /** @type {Map<string, HTMLButtonElement>} */
  const cells = new Map()
  function collect() {
    cells.clear()
    for (const cell of /** @type {NodeListOf<HTMLButtonElement>} */ (grid.querySelectorAll('.calendar-day'))) {
      if (parse(cell.value)) cells.set(cell.value, cell)
    }
  }
  /** The month in the grid, as `YYYY-MM`: the month of a day that is not of a neighboring one. */
  const shown = () => {
    for (const [key, cell] of cells) if (!cell.classList.contains('calendar-day-outside')) return key.slice(0, 7)
    return ''
  }
  /** @param {EventTarget | null} target */
  const dateOf = (target) => {
    const cell = /** @type {HTMLButtonElement | null} */ (target)
    return cell && cells.get(cell.value) === cell ? parse(cell.value) : null
  }
  /** Whether focus goes to the focused day once the grid shows it. */
  let wanted = false

  /** @param {string} tag @param {Record<string, string>} attributes @param {(Node | string)[]} children */
  function make(tag, attributes, ...children) {
    const element = root.ownerDocument.createElement(tag)
    for (const [name, text] of Object.entries(attributes)) element.setAttribute(name, text)
    element.append(...children)
    return element
  }

  /** Write the weekday names and the weeks of the focused day's month. */
  function build() {
    const view = calendarMonth(iso(focused), { weekStart, locale })
    grid.replaceChildren(
      make('div', { class: 'calendar-week', role: 'row' }, ...view.weekdays.map((weekday) =>
        make('span', { class: 'calendar-weekday', role: 'columnheader', 'aria-label': weekday.name }, weekday.short))),
      ...view.weeks.map((week) => make('div', { class: 'calendar-week', role: 'row' }, ...week.map((day) =>
        make('button', {
          type: 'button',
          class: day.outside ? 'calendar-day calendar-day-outside' : 'calendar-day',
          role: 'gridcell',
          tabindex: '-1',
          value: day.date,
          'aria-label': day.label
        }, day.text))))
    )
    if (title) title.textContent = view.title
  }

  /** @param {Element} element @param {string} name @param {string | null} text */
  const mark = (element, name, text) => (text === null ? element.removeAttribute(name) : element.setAttribute(name, text))

  /**
   * A month button that has nowhere to go is disabled; focus it held moves to the grid before it is.
   * @param {HTMLButtonElement | undefined} button @param {boolean} reached
   */
  function limit(button, reached) {
    if (!button) return
    if (reached && root.ownerDocument.activeElement === button) cells.get(iso(focused))?.focus()
    button.disabled = reached
  }

  /** Mark every day in the grid: today, chosen, in a range, unavailable, in the tab order. */
  function paint() {
    const now = iso(today())
    const tab = iso(focused)
    const last = end ?? start
    for (const [key, cell] of cells) {
      const chosen = start !== null && (range ? key >= start && key <= /** @type {string} */ (last) : key === start)
      mark(cell, 'aria-selected', chosen ? 'true' : null)
      mark(cell, 'aria-current', key === now ? 'date' : null)
      mark(cell, 'tabindex', key === tab ? '0' : '-1')
      cell.disabled = unavailable(/** @type {Date} */ (parse(key)))
      if (!range) continue
      cell.classList.toggle('calendar-day-range-start', chosen && key === start)
      cell.classList.toggle('calendar-day-range-end', chosen && key === last)
      cell.classList.toggle('calendar-day-range', chosen && key !== start && key !== last)
    }
    limit(previous, Boolean(min) && noon(focused.getFullYear(), focused.getMonth(), 1) <= /** @type {Date} */ (min))
    limit(next, Boolean(max) && noon(focused.getFullYear(), focused.getMonth() + 1, 0) >= /** @type {Date} */ (max))
  }

  /** Show the focused day's month. Focus that stood in a grid that is rewritten goes to the focused day. */
  function draw() {
    collect()
    const month = iso(focused).slice(0, 7)
    if (shown() !== month) {
      if (grid.contains(root.ownerDocument.activeElement)) wanted = true
      // A renderer that writes the grid is asked for the month; the days are marked once it has written them.
      if (options.draw) return options.draw(month)
      build()
      collect()
    }
    paint()
    if (wanted) cells.get(iso(focused))?.focus()
    wanted = false
  }

  /**
   * Move focus to a day, or to the next one in the direction of travel that can be chosen.
   * @param {Date} to @param {number} step Days to go on by while the day is unavailable.
   */
  function move(to, step) {
    to = clamp(to)
    for (let tries = 0; unavailable(to); tries++) {
      to = shift(to, step)
      if (tries === 366 || (min && to < min) || (max && to > max)) return
    }
    focused = to
    wanted = true
    draw()
  }

  /** @param {Date} date */
  function choose(date) {
    const key = iso(date)
    if (!range) start = key
    else if (!start || end) [start, end] = [key, null]
    else [start, end] = key < start ? [key, start] : [start, key]
    focused = date
    draw()
    if (!range || end) root.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value: value() } }))
  }

  /** @param {number} count */
  const turn = (count) => {
    focused = settle(months(focused, count))
    draw()
  }
  previous?.addEventListener('click', () => turn(-1), { signal })
  next?.addEventListener('click', () => turn(1), { signal })

  grid.addEventListener('click', (event) => {
    const date = dateOf(/** @type {Element} */ (event.target).closest('.calendar-day'))
    if (date && !unavailable(date)) choose(date)
  }, { signal })

  // A day that takes focus some other way, under a pointer or a screen reader, becomes the tab stop. A day
  // of a neighboring month does not: the grid must not be rewritten under a press that has not ended.
  grid.addEventListener('focusin', (event) => {
    const date = dateOf(event.target)
    if (!date || iso(date) === iso(focused) || iso(date).slice(0, 7) !== shown()) return
    focused = date
    paint()
  }, { signal })

  grid.addEventListener('keydown', (event) => {
    const from = dateOf(event.target)
    const paging = event.key === 'PageUp' || event.key === 'PageDown'
    if (!from || event.ctrlKey || event.metaKey || event.altKey || (event.shiftKey && !paging)) return
    const forward = getComputedStyle(root).direction === 'rtl' ? -1 : 1
    const weekday = (from.getDay() - weekStart + 7) % 7
    let to, step
    switch (event.key) {
      case 'ArrowLeft': step = -forward; to = shift(from, step); break
      case 'ArrowRight': step = forward; to = shift(from, step); break
      case 'ArrowUp': step = -7; to = shift(from, step); break
      case 'ArrowDown': step = 7; to = shift(from, step); break
      case 'Home': step = 1; to = shift(from, -weekday); break
      case 'End': step = -1; to = shift(from, 6 - weekday); break
      case 'PageUp': step = -1; to = months(from, event.shiftKey ? -12 : -1); break
      case 'PageDown': step = 1; to = months(from, event.shiftKey ? 12 : 1); break
      default: return
    }
    event.preventDefault()
    move(to, step)
  }, { signal })

  signal.addEventListener('abort', () => {
    if (attached.get(root) === controller) attached.delete(root)
    for (const button of [previous, next]) if (button) button.disabled = false
  })

  // The days a renderer writes arrive after it was asked for them, and it may write them again at any time.
  if (options.draw && typeof MutationObserver === 'function') {
    const observer = new MutationObserver(draw)
    observer.observe(grid, { childList: true, subtree: true, attributes: true, attributeFilter: ['value'] })
    signal.addEventListener('abort', () => observer.disconnect())
  }

  draw()
  return detach
}
