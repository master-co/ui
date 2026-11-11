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
 * the markup; read it from the returned function's `value`. To set it from outside, attach again with a new
 * `value`: the second call replaces the first.
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

/**
 * @param {HTMLElement} root The element with the `calendar` class.
 * @param {CalendarOptions} [options]
 * @returns {(() => void) & { readonly value: CalendarValue }} Removes the listeners; the month it drew stays. Its `value` is what is chosen now.
 */
export function calendar(root, options = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)

  const range = Boolean(options.range)
  const given = [options.value].flat().map(parse).filter((date) => date !== null).map(iso).sort()
  /** The chosen day; in a range, its two ends. */
  let start = /** @type {string | null} */ (given[0] ?? null)
  let end = /** @type {string | null} */ ((range && given[1]) || null)

  /** @returns {CalendarValue} */
  const value = () => (range && start ? [start, end] : start)
  const detach = /** @type {(() => void) & { readonly value: CalendarValue }} */ (
    Object.defineProperty(() => controller.abort(), 'value', { get: value, enumerable: true })
  )

  const grid = /** @type {HTMLElement} */ (root.querySelector('.calendar-grid'))
  if (!grid) return detach
  const title = root.querySelector('.calendar-title')
  const turns = /** @type {HTMLButtonElement[]} */ ([...root.querySelectorAll('.calendar-header button')])
  const previous = turns[0]
  const next = turns.length > 1 ? turns[turns.length - 1] : undefined

  /** The language of the names: the option, or the `lang` the calendar stands in, or the browser's. */
  let locale = /** @type {string | undefined} */ (undefined)
  try {
    locale = Intl.getCanonicalLocales(options.locale ?? (root.closest('[lang]')?.getAttribute('lang') || undefined))[0]
  } catch {}
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

  const min = parse(options.min)
  const max = parse(options.max)
  const today = () => {
    const now = new Date()
    return noon(now.getFullYear(), now.getMonth(), now.getDate())
  }
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

  /** The month in the grid, as `YYYY-MM`, and its days by their ISO date. */
  let drawn = ''
  /** @type {Map<string, HTMLButtonElement>} */
  const cells = new Map()
  /** @param {EventTarget | null} target */
  const dateOf = (target) => {
    for (const [key, cell] of cells) if (cell === target) return parse(key)
    return null
  }

  /** @param {string} tag @param {Record<string, string>} attributes @param {(Node | string)[]} children */
  function make(tag, attributes, ...children) {
    const element = root.ownerDocument.createElement(tag)
    for (const [name, text] of Object.entries(attributes)) element.setAttribute(name, text)
    element.append(...children)
    return element
  }

  /** Write the weekday names and the weeks of the focused day's month. */
  function build() {
    const from = noon(focused.getFullYear(), focused.getMonth(), 1)
    const to = noon(focused.getFullYear(), focused.getMonth() + 1, 0)
    const corner = shift(from, -((from.getDay() - weekStart + 7) % 7))
    const week = Array.from({ length: 7 }, (_, index) => index)
    const rows = [make('div', { class: 'calendar-week', role: 'row' }, ...week.map((index) => {
      const date = shift(corner, index)
      return make('span', { class: 'calendar-weekday', role: 'columnheader', 'aria-label': weekdayName.format(date) }, weekdayShort.format(date))
    }))]
    cells.clear()
    for (let head = corner; head <= to; head = shift(head, 7)) {
      rows.push(make('div', { class: 'calendar-week', role: 'row' }, ...week.map((index) => {
        const date = shift(head, index)
        const outside = date < from || date > to
        const cell = /** @type {HTMLButtonElement} */ (make('button', {
          type: 'button',
          class: outside ? 'calendar-day calendar-day-outside' : 'calendar-day',
          role: 'gridcell',
          tabindex: '-1',
          'aria-label': dayName.format(date)
        }, dayNumber.format(date.getDate())))
        cells.set(iso(date), cell)
        return cell
      })))
    }
    grid.replaceChildren(...rows)
    drawn = iso(from).slice(0, 7)
    if (title) title.textContent = monthName.format(from)
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
    const turned = iso(focused).slice(0, 7) !== drawn
    const within = turned && grid.contains(root.ownerDocument.activeElement)
    if (turned) build()
    paint()
    if (within) cells.get(iso(focused))?.focus()
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
    draw()
    cells.get(iso(focused))?.focus()
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
    if (!date || iso(date) === iso(focused) || iso(date).slice(0, 7) !== drawn) return
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

  draw()
  return detach
}
