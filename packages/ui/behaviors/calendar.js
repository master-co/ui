/**
 * Calendar: fills the date grid and moves through it.
 *
 * The stylesheet draws a day from its attributes; this script supplies the days. It writes the weekday names
 * and the weeks of the shown month into `calendar-grid`, names the month in `calendar-title`, and makes the
 * first and the last button of the header show the month before and the month after. On the days it sets
 * today (`aria-current="date"`), the chosen days (`aria-selected="true"`, and the range classes in a range),
 * the days that cannot be chosen (`disabled`) and the one day in the tab order (`tabindex`).
 *
 * In the grid the keys are those of the Authoring Practices date grid. A move past the edge of the month
 * shows the neighboring month and keeps focus on the new day; a move never lands on a day that cannot be
 * chosen, and stops at `min` and `max`. Enter and Space are left to the day, which is a button: its click
 * chooses, once for an Enter held down. A day marked `aria-disabled="true"` is reached and not chosen.
 *
 * Several months side by side are a `calendar-month` each, a header and a grid, in one calendar: the script
 * shows consecutive months in them, keeps one day in the tab order across them and lets the keys cross from
 * one grid to the next. The months turn together, one at a time.
 *
 * A calendar of one month whose title holds a `calendar-title-button` also jumps: the button shows the twelve
 * months of the year in the grid, and again the years of the decade; choosing one goes back down, and Escape
 * goes back to the days. The title says where the grid is, and the month buttons turn a year or a decade.
 *
 * Choosing dispatches a bubbling `input` and then a `change` CustomEvent from the root, each with
 * `detail.value`: the day as `YYYY-MM-DD`, or `[start, end]` once both ends of a range are chosen, or the
 * sorted days chosen with `multiple`. The first end of a range dispatches `input` alone, with `[start, null]`:
 * the value moved, and is not complete until the second end. The value lives in the script, not in the markup;
 * read it from the returned function's `value`, and set that to choose from outside, which shows the month of
 * the new value and dispatches nothing.
 *
 * The grid may be written by something else: a template, or a framework that renders it on a server. Give
 * `draw`, and the script writes no element. It calls `draw` with the month to show, as `YYYY-MM`, and the view,
 * and marks the days once they are there; `calendarMonth()` gives a month's weekday names and weeks as data and
 * `calendarPeriods()` the months of a year or the years of a decade. Each day is a button whose `value` is its
 * date, which is how the script knows the days it did not write.
 *
 * Days are local and Gregorian, kept at noon so that no daylight-saving change moves one to the day before.
 */

/** @typedef {'days' | 'months' | 'years'} CalendarView What the grid shows: the days of a month, the months of a year, or the years of a decade. */

/**
 * @typedef {object} CalendarLabels The names the month buttons take while the grid shows months or years. In
 * the days the buttons keep the names the markup gives them.
 * @property {string} [previousYear] `Previous year` by default.
 * @property {string} [nextYear] `Next year` by default.
 * @property {string} [previousDecade] `Previous decade` by default.
 * @property {string} [nextDecade] `Next decade` by default.
 */

/**
 * @typedef {object} CalendarOptions
 * @property {string | string[]} [value] The chosen day as `YYYY-MM-DD`, the two ends of a range, or the days chosen with `multiple`.
 * @property {string} [month] The month to show first, as `YYYY-MM`. The month of the value, or of today, by default.
 * @property {string} [min] The first day that can be chosen, as `YYYY-MM-DD`.
 * @property {string} [max] The last day that can be chosen, as `YYYY-MM-DD`.
 * @property {boolean} [range] Choose two days and every day between them.
 * @property {boolean} [multiple] Choose any number of separate days; each click turns one on or off. `range` wins over it.
 * @property {number} [weekStart] The day in the first column, 0 for Sunday to 6 for Saturday. The locale's own by default, and Monday where the browser cannot say.
 * @property {string} [locale] A BCP 47 tag for the names of months and days. The `lang` the calendar stands in by default.
 * @property {(date: Date) => boolean} [disabled] Says whether a day cannot be chosen.
 * @property {CalendarLabels} [labels] The names of the month buttons while the grid shows months or years.
 * @property {(month: string, view: CalendarView) => void} [draw] Takes over writing the grids: called with the
 *   month to show, as `YYYY-MM`, and the view, whenever the grids do not hold them. In the days, write the
 *   days `calendarMonth(month)` lists, and in the next grids the months after it; in the months or the years,
 *   the cells `calendarPeriods(month, { view })` lists.
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
 * @typedef {object} CalendarPeriods The months of a year or the years of a decade as data, for a renderer that
 * writes the grid itself.
 * @property {'months' | 'years'} view Which of the two it is.
 * @property {string} title The year, or the first and the last year of the decade, as the locale writes them.
 * @property {{ value: string, text: string, label: string, outside: boolean }[][]} rows Rows of three cells.
 *   `value` is `YYYY-MM` for a month and `YYYY` for a year, `text` what the cell shows and `label` its full
 *   name. A decade is shown with the year before and the year after it, which are `outside`.
 */

/**
 * @typedef {string | [string, string | null] | string[] | null} CalendarValue A day, the two ends of a range
 * (the end is null until it is chosen), or the days chosen with `multiple`, sorted.
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

/** The months since year 0, to count months between two days. @param {Date} date */
const ordinal = (date) => date.getFullYear() * 12 + date.getMonth()

/** The first year of the decade a year is in. @param {number} year */
const decade = (year) => year - (((year % 10) + 10) % 10)

/**
 * The first and the last day of a month (`YYYY-MM`) or a year (`YYYY`), as `YYYY-MM-DD`.
 * @param {string} period
 */
function span(period) {
  const year = Number(period.slice(0, 4))
  if (period.length === 4) return [`${period}-01-01`, `${period}-12-31`]
  const month = Number(period.slice(5, 7)) - 1
  return [iso(noon(year, month, 1)), iso(noon(year, month + 1, 0))]
}

/** A month cell's or a year cell's value; null for anything else. @param {unknown} text */
const periodOf = (text) => (typeof text === 'string' && /^\d{4}(-(0[1-9]|1[0-2]))?$/.test(text) ? text : null)

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
 * What is chosen, from a value as it is given: the valid days, sorted; one for a day, two for a range, and
 * each once for `multiple`.
 * @param {unknown} value @param {boolean} [range] @param {boolean} [multiple]
 */
function chosen(value, range, multiple) {
  const given = [value].flat().map(parse).filter((date) => date !== null).map(iso).sort()
  return range ? given.slice(0, 2) : multiple ? [...new Set(given)] : given.slice(0, 1)
}

/**
 * A month as data: its name, the names of the weekdays and its weeks, each day with its date, its number and
 * its full name. The calendar behavior writes its grid from this; a renderer that writes the grid itself,
 * with the `draw` option, reads the same.
 * @param {string} [of] The month as `YYYY-MM`, or any day of it as `YYYY-MM-DD`. The month of the first day of
 *   `value`, or this month, by default.
 * @param {{ weekStart?: number, locale?: string, value?: string | (string | null)[] | null, range?: boolean, multiple?: boolean, offset?: number }} [options]
 *   `weekStart`: the day in the first column, 0 for Sunday to 6 for Saturday; the locale's own by default.
 *   `locale`: a BCP 47 tag for the names. `value`, `range` and `multiple`: what is chosen, as the behavior
 *   takes them, to have its days marked in the data. The behavior marks the days itself once it attaches.
 *   `offset`: months to go on from `of`, 1 for the month after it, for the next grids of several months.
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

  // The chosen days, as the behavior reads them.
  const range = Boolean(options.range)
  const multiple = !range && Boolean(options.multiple)
  const given = chosen(options.value, range, multiple)
  const day = parse(of) ?? parse(`${of}-01`) ?? parse(given[0]) ?? today()
  const offset = Number.isInteger(options.offset) ? /** @type {number} */ (options.offset) : 0
  const from = noon(day.getFullYear(), day.getMonth() + offset, 1)
  const to = noon(day.getFullYear(), day.getMonth() + offset + 1, 0)
  const corner = shift(from, -((from.getDay() - weekStart + 7) % 7))
  const week = Array.from({ length: 7 }, (_, index) => index)
  const set = new Set(given)
  const start = given[0] ?? null
  const last = given[1] ?? start
  const weeks = []
  for (let head = corner; head <= to; head = shift(head, 7)) {
    weeks.push(week.map((index) => {
      const date = shift(head, index)
      const key = iso(date)
      const outside = date < from || date > to
      const selected = range ? start !== null && key >= start && key <= /** @type {string} */ (last) : set.has(key)
      return {
        date: key,
        text: dayNumber.format(date.getDate()),
        label: dayName.format(date),
        outside,
        selected,
        tab: key === start && !outside,
        range: range && selected
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
 * The months of a year, or the years of a decade, as data: what a calendar's grid shows when its title jumps.
 * The behavior writes its grid from this; a renderer that writes the grid itself, with the `draw` option,
 * reads the same.
 * @param {string} [of] A month as `YYYY-MM`, a day as `YYYY-MM-DD` or a year as `YYYY`. This month by default.
 * @param {{ view?: 'months' | 'years', locale?: string }} [options] `view`: `months`, the default, for the
 *   twelve months of the year, or `years` for the decade, with the year before and the year after it.
 *   `locale`: a BCP 47 tag for the names.
 * @returns {CalendarPeriods}
 */
export function calendarPeriods(of, options = {}) {
  const locale = canonical(options.locale)
  /** @param {Intl.DateTimeFormatOptions} parts */
  const format = (parts) => new Intl.DateTimeFormat(locale, { calendar: 'gregory', ...parts })
  const yearName = format({ year: 'numeric' })
  const day = parse(of) ?? parse(`${of}-01`) ?? parse(`${of}-01-01`) ?? today()
  const year = day.getFullYear()
  const cells = []
  let title
  if (options.view === 'years') {
    const first = decade(year)
    const [from, to] = [noon(first, 0, 1), noon(first + 9, 0, 1)]
    title = typeof yearName.formatRange === 'function' ? yearName.formatRange(from, to) : `${yearName.format(from)} – ${yearName.format(to)}`
    for (let each = first - 1; each <= first + 10; each++) {
      const text = yearName.format(noon(each, 0, 1))
      cells.push({ value: pad(each, 4), text, label: text, outside: each < first || each > first + 9 })
    }
  } else {
    const monthShort = format({ month: 'short' })
    const monthName = format({ month: 'long', year: 'numeric' })
    title = yearName.format(day)
    for (let month = 0; month < 12; month++) {
      const date = noon(year, month, 1)
      cells.push({ value: iso(date).slice(0, 7), text: monthShort.format(date), label: monthName.format(date), outside: false })
    }
  }
  const rows = []
  for (let index = 0; index < cells.length; index += 3) rows.push(cells.slice(index, index + 3))
  return { view: options.view === 'years' ? 'years' : 'months', title, rows }
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
  const multiple = !range && Boolean(options.multiple)
  /** The chosen days, sorted: one, the ends of a range (the second missing until it is chosen), or any number. */
  let picked = /** @type {string[]} */ ([])
  /**
   * Take a value given from outside. Says whether it differs from what is chosen.
   * @param {unknown} next
   */
  const take = (next) => {
    const before = picked.join()
    picked = chosen(next, range, multiple)
    return picked.join() !== before
  }
  take(options.value)

  /** @returns {CalendarValue} */
  const value = () => (multiple ? [...picked] : range ? (picked.length ? [picked[0], picked[1] ?? null] : null) : picked[0] ?? null)
  const detach = /** @type {(() => void) & { value: CalendarValue }} */ (
    Object.defineProperty(() => controller.abort(), 'value', {
      enumerable: true,
      get: value,
      // The same value given back, as a framework does after a choice, moves nothing: the month stays.
      set: (/** @type {CalendarValue} */ next) => {
        if (!grids().length || !take(next)) return
        if (picked.length) focused = settle(/** @type {Date} */ (parse(picked[0])))
        view = 'days'
        draw()
      }
    })
  )

  /** The grids, one for each month shown. They are read each time, since a renderer may write them again. */
  const grids = () => /** @type {HTMLElement[]} */ ([...root.querySelectorAll('.calendar-grid')])
  if (!grids().length) return detach
  const document = root.ownerDocument
  /** The title over a grid: the one in its `calendar-month`, or the calendar's. @param {HTMLElement} grid */
  const titleOf = (grid) => (grid.closest('.calendar-month') ?? root).querySelector('.calendar-title')
  /** The button in the title that jumps to the months and the years; a calendar of one month has it. */
  const jumper = () => (grids().length === 1 ? /** @type {HTMLButtonElement | null} */ (root.querySelector('.calendar-title-button')) : null)
  /** The month buttons: the first and the last button of the headers that is not the title. */
  const turns = () => {
    const buttons = /** @type {HTMLButtonElement[]} */ ([...root.querySelectorAll('.calendar-header button')]).filter((button) => !button.classList.contains('calendar-title-button'))
    return [buttons[0], buttons.length > 1 ? buttons[buttons.length - 1] : undefined]
  }
  const words = { previousYear: 'Previous year', nextYear: 'Next year', previousDecade: 'Previous decade', nextDecade: 'Next decade', ...options.labels }
  /** The names the markup gave the month buttons, while the months or the years rename them. */
  const names = new Map()

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

  /** What the grid shows. */
  let view = /** @type {CalendarView} */ ('days')
  /** How many months are shown side by side. */
  const count = () => (view === 'days' ? Math.max(1, grids().length) : 1)
  /** @param {Date} date @param {Date} from Whether a day is in the months shown from a month on. */
  const within = (date, from) => ordinal(date) - ordinal(from) >= 0 && ordinal(date) - ordinal(from) < count()

  /**
   * The day in the tab order. Its month is shown: the chosen day or today when the months shown first hold it,
   * or the first day of the first of them.
   */
  const first = parse(`${options.month}-01`)
  let focused = settle(
    [...(multiple ? picked : picked.slice(0, 1)).map(parse), today()].find((date) => date && (!first || within(date, first))) ?? /** @type {Date} */ (first)
  )
  /** The first day of the first month shown. */
  let anchor = first ?? noon(focused.getFullYear(), focused.getMonth(), 1)

  /** The cells in the grids by their value: a day's date, a month's `YYYY-MM`, a year's `YYYY`. */
  /** @type {Map<string, HTMLButtonElement>} */
  const cells = new Map()
  /** Every day and every month or year in the grids. */
  const everyCell = () => /** @type {HTMLButtonElement[]} */ ([...root.querySelectorAll('.calendar-grid .calendar-day, .calendar-grid .calendar-period')])
  /** @param {HTMLButtonElement} cell */
  const keyOf = (cell) => (cell.classList.contains('calendar-period') ? periodOf(cell.value) : parse(cell.value) && cell.value)
  /** A day shown twice, to complete a week of the month before it and as a day of its own, is its own month's. */
  function collect() {
    cells.clear()
    for (const cell of everyCell()) {
      const key = keyOf(cell)
      if (key && !(cells.has(key) && cell.classList.contains('calendar-day-outside'))) cells.set(key, cell)
    }
  }
  /**
   * What a grid shows: `d` and the month of its days, `m` and the year of its months, or `y` and the first year
   * of its decade.
   * @param {HTMLElement} grid
   */
  function holds(grid) {
    for (const cell of /** @type {NodeListOf<HTMLButtonElement>} */ (grid.querySelectorAll('.calendar-day:not(.calendar-day-outside), .calendar-period:not(.calendar-period-outside)'))) {
      if (cell.classList.contains('calendar-day')) {
        if (parse(cell.value)) return `d${cell.value.slice(0, 7)}`
      } else if (periodOf(cell.value)) return cell.value.length === 4 ? `y${cell.value}` : `m${cell.value.slice(0, 4)}`
    }
    return ''
  }
  /** What each grid is to show. */
  const wanted = () => grids().map((_, index) => view === 'days'
    ? `d${iso(noon(anchor.getFullYear(), anchor.getMonth() + index, 1)).slice(0, 7)}`
    : view === 'months' ? `m${pad(focused.getFullYear(), 4)}` : `y${pad(decade(focused.getFullYear()), 4)}`)
  /** The key of the cell in the tab order. */
  const stop = () => (view === 'days' ? iso(focused) : view === 'months' ? iso(focused).slice(0, 7) : pad(focused.getFullYear(), 4))
  /** @param {EventTarget | null} target */
  const dateOf = (target) => {
    const cell = /** @type {HTMLButtonElement | null} */ (target)
    return cell && cell.classList?.contains('calendar-day') && cells.get(cell.value) === cell ? parse(cell.value) : null
  }
  /** @param {EventTarget | null} target */
  const inGrid = (target) => Boolean(target) && grids().some((grid) => grid.contains(/** @type {Node} */ (target)))
  /** Whether focus goes to the focused cell once the grid shows it. */
  let follow = false

  /** @param {string} tag @param {Record<string, string>} attributes @param {(Node | string)[]} children */
  function make(tag, attributes, ...children) {
    const element = document.createElement(tag)
    for (const [name, text] of Object.entries(attributes)) element.setAttribute(name, text)
    element.append(...children)
    return element
  }

  /** @param {HTMLElement} grid @param {string} text */
  function name(grid, text) {
    const title = titleOf(grid)
    if (title) (title.querySelector('.calendar-title-button') ?? title).textContent = text
  }

  /** Write the weekday names and the weeks of each month shown, or the months or the years. */
  function build() {
    if (view !== 'days') {
      const grid = grids()[0]
      const periods = calendarPeriods(iso(focused), { view, locale })
      grid.replaceChildren(...periods.rows.map((row) => make('div', { class: 'calendar-week', role: 'row' }, ...row.map((cell) =>
        make('button', {
          type: 'button',
          class: cell.outside ? 'calendar-period calendar-period-outside' : 'calendar-period',
          role: 'gridcell',
          tabindex: '-1',
          value: cell.value,
          'aria-label': cell.label
        }, cell.text)))))
      name(grid, periods.title)
      return
    }
    grids().forEach((grid, offset) => {
      const month = calendarMonth(iso(anchor), { weekStart, locale, offset })
      grid.replaceChildren(
        make('div', { class: 'calendar-week', role: 'row' }, ...month.weekdays.map((weekday) =>
          make('span', { class: 'calendar-weekday', role: 'columnheader', 'aria-label': weekday.name }, weekday.short))),
        ...month.weeks.map((week) => make('div', { class: 'calendar-week', role: 'row' }, ...week.map((day) =>
          make('button', {
            type: 'button',
            class: day.outside ? 'calendar-day calendar-day-outside' : 'calendar-day',
            role: 'gridcell',
            tabindex: '-1',
            value: day.date,
            'aria-label': day.label
          }, day.text))))
      )
      name(grid, month.title)
    })
  }

  /** @param {Element} element @param {string} attribute @param {string | null} text */
  const mark = (element, attribute, text) => (text === null ? element.removeAttribute(attribute) : element.setAttribute(attribute, text))

  /**
   * A button that has nowhere to go is disabled; focus it held moves to the grid before it is.
   * @param {HTMLButtonElement | undefined | null} button @param {boolean} reached
   */
  function limit(button, reached) {
    if (!button) return
    if (reached && document.activeElement === button) cells.get(stop())?.focus()
    button.disabled = reached
  }

  /**
   * A month button's name in the months or the years; null gives it back the one the markup gave it.
   * @param {HTMLButtonElement | undefined} button @param {string | null} text
   */
  function rename(button, text) {
    if (!button) return
    if (text === null) {
      if (names.has(button)) mark(button, 'aria-label', names.get(button))
      names.delete(button)
      return
    }
    if (!names.has(button)) names.set(button, button.getAttribute('aria-label'))
    button.setAttribute('aria-label', text)
  }

  /** Mark every cell: today, chosen, in a range, unavailable, in the tab order; and the buttons around them. */
  function paint() {
    const now = iso(today())
    const tab = stop()
    const set = new Set(picked)
    const start = picked[0] ?? null
    const last = picked[1] ?? start
    for (const cell of everyCell()) {
      const key = keyOf(cell)
      if (!key) continue
      mark(cell, 'tabindex', key === tab && cells.get(key) === cell ? '0' : '-1')
      if (cell.classList.contains('calendar-period')) {
        // A month or a year is chosen when it holds a chosen day, and cannot be chosen when no day of it can.
        const [from, to] = span(key)
        const held = range ? start !== null && start <= to && /** @type {string} */ (last) >= from : picked.some((day) => day >= from && day <= to)
        mark(cell, 'aria-selected', held ? 'true' : null)
        mark(cell, 'aria-current', now >= from && now <= to ? 'date' : null)
        cell.disabled = Boolean((min && to < iso(min)) || (max && from > iso(max)))
        continue
      }
      const selected = range ? start !== null && key >= start && key <= /** @type {string} */ (last) : set.has(key)
      mark(cell, 'aria-selected', selected ? 'true' : null)
      mark(cell, 'aria-current', key === now ? 'date' : null)
      cell.disabled = unavailable(/** @type {Date} */ (parse(key)))
      if (!range) continue
      cell.classList.toggle('calendar-day-range-start', selected && key === start)
      cell.classList.toggle('calendar-day-range-end', selected && key === last)
      cell.classList.toggle('calendar-day-range', selected && key !== start && key !== last)
    }
    if (range || multiple) for (const grid of grids()) grid.setAttribute('aria-multiselectable', 'true')

    // The first and the last day the month buttons have gone past.
    const year = focused.getFullYear()
    const [lower, upper] = view === 'days'
      ? [anchor, noon(anchor.getFullYear(), anchor.getMonth() + count(), 0)]
      : view === 'months' ? [noon(year, 0, 1), noon(year, 11, 31)] : [noon(decade(year), 0, 1), noon(decade(year) + 9, 11, 31)]
    const [previous, next] = turns()
    rename(previous, view === 'months' ? words.previousYear : view === 'years' ? words.previousDecade : null)
    rename(next, view === 'months' ? words.nextYear : view === 'years' ? words.nextDecade : null)
    limit(previous, Boolean(min) && lower <= /** @type {Date} */ (min))
    limit(next, Boolean(max) && upper >= /** @type {Date} */ (max))
    // The decade is as far as the title goes.
    limit(jumper(), view === 'years')
  }

  /** Show the months that hold the focused day. Focus that stood in a grid that is rewritten goes to its cell. */
  function draw() {
    collect()
    const index = ordinal(focused) - ordinal(anchor)
    if (index < 0) anchor = noon(focused.getFullYear(), focused.getMonth(), 1)
    else if (index >= count()) anchor = noon(focused.getFullYear(), focused.getMonth() - count() + 1, 1)
    const shown = wanted()
    if (grids().some((grid, at) => holds(grid) !== shown[at])) {
      if (inGrid(document.activeElement)) follow = true
      // A renderer that writes the grid is asked for it; the cells are marked once it has written them.
      if (options.draw) return options.draw(iso(view === 'days' ? anchor : focused).slice(0, 7), view)
      build()
      collect()
    }
    paint()
    if (follow) cells.get(stop())?.focus()
    follow = false
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
    follow = true
    draw()
  }

  /** @param {Date} date */
  function choose(date) {
    const key = iso(date)
    if (multiple) picked = picked.includes(key) ? picked.filter((day) => day !== key) : [...picked, key].sort()
    else if (!range || picked.length !== 1) picked = [key]
    else picked = [picked[0], key].sort()
    focused = date
    draw()
    root.dispatchEvent(new CustomEvent('input', { bubbles: true, detail: { value: value() } }))
    // The first end of a range moves the value without completing it: that is an input and no change.
    if (!range || picked.length === 2) root.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value: value() } }))
  }

  /**
   * The day a month or a year stands for: the focused day moved into it.
   * @param {string} period
   */
  const dayIn = (period) => settle(months(focused, period.length === 4
    ? (Number(period) - focused.getFullYear()) * 12
    : ordinal(noon(Number(period.slice(0, 4)), Number(period.slice(5, 7)) - 1, 1)) - ordinal(focused)))

  /**
   * Choose a month, which shows its days, or a year, which shows its months.
   * @param {string} period
   */
  function open(period) {
    focused = dayIn(period)
    view = view === 'years' ? 'months' : 'days'
    draw()
  }

  /** The day focused when the title jumped from the days, which Escape goes back to. */
  let resume = focused
  /**
   * Jump to the months or the years, or go back from them to the day that was focused before.
   * @param {CalendarView} next
   */
  function show(next) {
    if (inGrid(document.activeElement)) follow = true
    if (view === 'days') resume = focused
    else if (next === 'days') focused = resume
    view = next
    draw()
  }

  /** @param {number} step Months to turn: one, or a year or a decade in the months or the years. */
  const turn = (step) => {
    if (view === 'days') {
      anchor = noon(anchor.getFullYear(), anchor.getMonth() + step, 1)
      if (!within(focused, anchor)) focused = settle(months(focused, step))
    } else focused = settle(months(focused, step * (view === 'months' ? 12 : 120)))
    draw()
  }

  root.addEventListener('click', (event) => {
    const button = /** @type {HTMLButtonElement | null} */ (/** @type {Element} */ (event.target).closest?.('button'))
    if (!button || !root.contains(button)) return
    collect()
    const [previous, next] = turns()
    if (button === jumper()) {
      if (view !== 'years') show(view === 'days' ? 'months' : 'years')
    } else if (button === previous) turn(-1)
    else if (button === next) turn(1)
    // A cell a renderer marked aria-disabled="true" stays in reach of the keys, and cannot be chosen.
    else if (button.getAttribute('aria-disabled') === 'true') return
    else if (button.classList.contains('calendar-period')) {
      if (cells.get(button.value) === button && !button.disabled) open(button.value)
    } else {
      const date = dateOf(button)
      if (date && !unavailable(date)) choose(date)
    }
  }, { signal })

  // A cell that takes focus some other way, under a pointer or a screen reader, becomes the tab stop. A cell
  // of a neighboring month or decade does not: the grid must not be rewritten under a press that has not ended.
  root.addEventListener('focusin', (event) => {
    const cell = /** @type {HTMLButtonElement} */ (event.target)
    if (!inGrid(cell) || cell.classList.contains('calendar-day-outside') || cell.classList.contains('calendar-period-outside')) return
    collect()
    const key = keyOf(cell)
    if (!key || cells.get(key) !== cell || key === stop()) return
    focused = cell.classList.contains('calendar-period') ? dayIn(key) : /** @type {Date} */ (parse(key))
    paint()
  }, { signal })

  root.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    // Escape goes back from the months or the years to the days; in the days it is left to what holds the calendar.
    if (event.key === 'Escape') {
      if (view === 'days' || event.shiftKey) return
      event.preventDefault()
      show('days')
      return
    }
    if (!inGrid(event.target)) return
    // Enter held down chooses once: its repeats would press the day again and again, turning it off and on with
    // multiple, or closing a range on the day it began.
    if (event.key === 'Enter' && event.repeat) {
      event.preventDefault()
      return
    }
    collect()
    const paging = event.key === 'PageUp' || event.key === 'PageDown'
    if (event.shiftKey && !paging) return
    const forward = getComputedStyle(root).direction === 'rtl' ? -1 : 1
    const cell = /** @type {HTMLButtonElement} */ (event.target)

    if (cell.classList.contains('calendar-period')) {
      if (cells.get(cell.value) !== cell) return
      // Three to a row: a step is a month or a year, a row three of them, a page a year or a decade.
      const unit = view === 'years' ? 12 : 1
      const column = (view === 'years' ? focused.getFullYear() - decade(focused.getFullYear()) + 1 : focused.getMonth()) % 3
      let step
      switch (event.key) {
        case 'ArrowLeft': step = -forward * unit; break
        case 'ArrowRight': step = forward * unit; break
        case 'ArrowUp': step = -3 * unit; break
        case 'ArrowDown': step = 3 * unit; break
        case 'Home': step = -column * unit; break
        case 'End': step = (2 - column) * unit; break
        case 'PageUp': step = view === 'years' ? -120 : -12; break
        case 'PageDown': step = view === 'years' ? 120 : 12; break
        default: return
      }
      event.preventDefault()
      focused = settle(months(focused, step))
      follow = true
      draw()
      return
    }

    const from = dateOf(cell)
    if (!from) return
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

  // The buttons the script disables at a limit, and whether their author had disabled them: detach gives that back.
  const authored = new Map([...turns(), jumper()].filter((button) => button).map((button) => [button, /** @type {HTMLButtonElement} */ (button).disabled]))
  signal.addEventListener('abort', () => {
    if (attached.get(root) === controller) attached.delete(root)
    const [previous, next] = turns()
    for (const button of [previous, next]) {
      if (!button) continue
      button.disabled = authored.get(button) ?? false
      rename(button, null)
    }
    const button = jumper()
    if (button) button.disabled = authored.get(button) ?? false
  })

  // The cells a renderer writes arrive after it was asked for them, and it may write them again at any time.
  if (options.draw && typeof MutationObserver === 'function') {
    const observer = new MutationObserver(draw)
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['value'] })
    signal.addEventListener('abort', () => observer.disconnect())
  }

  draw()
  return detach
}
