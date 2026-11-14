/**
 * Gantt: moves and resizes the bars of a gantt, with the pointer and with the keys.
 *
 * The stylesheet places a bar from `--from` and `--to` on its row; this script only changes the two numbers.
 * A bar the reader may move is one the page marks `role="slider"`: the others stay pictures. On each such
 * bar the script writes what a slider needs that the page left out: its name, from the row's `gantt-label`,
 * `aria-valuemin` and `aria-valuemax`, the earliest start and the latest end, from the scale, `aria-valuenow`,
 * its start, and `aria-valuetext`, what `format` says of its range. Only one bar is in the tab order: the
 * whole chart is one stop, and the arrows walk it.
 *
 * With the pointer: a press on the body of a bar that moves more than a few pixels carries the bar, and a
 * press on one of its ends, the grips the stylesheet draws, moves that end. Both snap to `step` units of the
 * scale. While it is held the bar says `aria-busy="true"`, and the end that is held is marked with
 * `gantt-resize-start` or `gantt-resize-end`; its text says the range it would take. Escape, or a pointer the
 * browser takes back, puts it where it was.
 *
 * With the keys: ArrowUp and ArrowDown go to the bar above and below. ArrowLeft and ArrowRight move the bar a
 * step along the scale, Shift with them moves its end and Alt (Option) its start; Home and End take it, or
 * the end Shift or Alt names, as far as it goes. Where the page runs from right to left, so do the dates.
 *
 * A bar stays between its `aria-valuemin` and `aria-valuemax` and is never shorter than a step, or than it
 * already is. A bar marked `aria-readonly="true"` takes focus and does not move; one marked
 * `aria-disabled="true"` does neither. Every other rule is the page's: before a range is taken, the bar
 * dispatches a cancelable `beforechange` CustomEvent with `detail.id`, `detail.range` and `detail.previous`.
 * Calling `preventDefault()` refuses it, and the bar stays where it was or goes back there.
 *
 * The root dispatches `input` each time a bar's range changes, while it is dragged too, and `change` once a
 * drop or a key has changed it. The function the behavior returns has a `value`: each bar's range, `[start,
 * end]` in the scale's unit, keyed by its row's `data-value`, or its label's text. Set it to move bars from
 * outside; that dispatches nothing. A bar says its new range as a slider says its value; what a range cannot
 * say, that a change was refused or cancelled, is said in the `gantt-status` region right after the root.
 *
 * The rows may be written by something else, such as a framework that renders them from its own data. Give
 * `text: false` and the script leaves each bar's text to it; it still writes `aria-valuetext`.
 */
import { enabled, label, valued } from './internal.js'

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * The `aria-valuetext` a behavior wrote on each bar. One the page wrote is kept when the behavior attaches;
 * one a behavior wrote is written again, so attaching again with another `format` is heard.
 * @type {WeakMap<Element, string>}
 */
const written = new WeakMap()

/** @typedef {[start: number, end: number]} GanttRange */
/** @typedef {Record<string, GanttRange>} GanttValue Each bar's range, keyed by its row's id. */

/**
 * @typedef {object} GanttMessages What the status region says, given the bar's name and what `format` says
 *   of the range it is at.
 * @property {(name: string, text: string) => string} [refused] A change the page refused.
 * @property {(name: string, text: string) => string} [cancelled] A drag put back with Escape.
 */

/**
 * @typedef {object} GanttChange What `beforechange` carries in its `detail`.
 * @property {string} id The bar's id: its row's `data-value`, or its label's text.
 * @property {GanttRange} range The range it would take.
 * @property {GanttRange} previous The range it has.
 */

/** @type {Required<GanttMessages>} */
const english = {
  refused: (name, text) => `${name} cannot move there. It stays at ${text}.`,
  cancelled: (name, text) => `${name} is back at ${text}.`,
}

/** How far a press moves before it is a drag, in pixels. */
const threshold = 4

/** A number of the scale without the dust of adding fractions. */
const tidy = (/** @type {number} */ number) => Math.round(number * 1e6) / 1e6
const clamp = (/** @type {number} */ value, /** @type {number} */ least, /** @type {number} */ most) => Math.min(most, Math.max(least, value))
const same = (/** @type {GanttRange} */ a, /** @type {GanttRange} */ b) => a[0] === b[0] && a[1] === b[1]

let ids = 0

/**
 * @param {HTMLElement} root The element with the `gantt` class.
 * @param {{ step?: number, format?: (start: number, end: number) => string, text?: boolean, messages?: GanttMessages }} [options]
 *   `step`: how far a key moves a bar, and what the pointer snaps to, in the scale's unit; 1 by default.
 *   `format`: what a bar says for a range, as its text and its `aria-valuetext`. `text`: false leaves each
 *   bar's text to a renderer. `messages`: what the status region says.
 * @returns {(() => void) & { value: GanttValue }} Removes everything the behavior added. Its `value` is
 *   each bar's range, keyed by its id.
 */
export function gantt(root, { step = 1, format = (start, end) => (start === end ? `${start}` : `${start} to ${end}`), text = true, messages = {} } = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)
  const say = { ...english, ...messages }
  const document = root.ownerDocument
  const unit = step > 0 ? step : 1

  /** The rows that have a bar, not the row of the scale. */
  const rows = () => /** @type {HTMLElement[]} */ ([...root.querySelectorAll('.gantt-row')]).filter((row) => row.closest('.gantt') === root && !row.classList.contains('gantt-scale') && row.querySelector('.gantt-bar'))
  const barOf = (/** @type {Element} */ row) => /** @type {HTMLElement} */ (row.querySelector('.gantt-bar'))
  const rowOf = (/** @type {Element} */ bar) => /** @type {HTMLElement} */ (bar.closest('.gantt-row'))
  /** A bar the reader moves: the page made it a slider. */
  const sliding = (/** @type {Element | null | undefined} */ bar) => !!bar && bar.getAttribute('role') === 'slider' && bar.classList.contains('gantt-bar') && bar.closest('.gantt') === root
  const sliders = () => rows().map(barOf).filter(sliding)
  /** The bars the arrow keys may land on: a read-only bar is read, a disabled one is passed over. */
  const reachable = () => sliders().filter(enabled)
  const fixed = (/** @type {Element} */ bar) => !enabled(bar) || bar.getAttribute('aria-readonly') === 'true'
  const milestone = (/** @type {Element} */ bar) => bar.classList.contains('gantt-milestone')
  const idOf = (/** @type {Element} */ row) => row.getAttribute('data-value') ?? label(row.querySelector('.gantt-label') ?? row)
  const nameOf = (/** @type {Element} */ bar) => bar.getAttribute('aria-label') ?? label(rowOf(bar).querySelector('.gantt-label') ?? bar)

  /**
   * A number the stylesheet reads: the element's own, or the one it inherits or is given by default.
   * @param {HTMLElement} element @param {string} name @param {number} fallback
   */
  const read = (element, name, fallback) => {
    const own = parseFloat(element.style.getPropertyValue(name))
    if (Number.isFinite(own)) return own
    const computed = parseFloat(getComputedStyle(element).getPropertyValue(name))
    return Number.isFinite(computed) ? computed : fallback
  }
  /** @returns {GanttRange} */
  const scale = () => [read(root, '--gantt-from', 0), read(root, '--gantt-to', 12)]
  /** @returns {GanttRange} A milestone is a point: its range begins and ends at `--from`. */
  const rangeOf = (/** @type {HTMLElement} */ row) => {
    const start = read(row, '--from', 0)
    return [start, milestone(barOf(row)) ? start : read(row, '--to', 1)]
  }
  /** @returns {GanttRange} The earliest start and the latest end a bar may take. */
  const limits = (/** @type {Element} */ bar) => {
    const [from, to] = scale()
    const least = parseFloat(bar.getAttribute('aria-valuemin') ?? '')
    const most = parseFloat(bar.getAttribute('aria-valuemax') ?? '')
    return [Number.isFinite(least) ? least : from, Number.isFinite(most) ? most : to]
  }

  /**
   * Give a bar a range: the two properties the stylesheet places it by, and what it says. Assistive
   * technology hears the value once it is taken, not at every step of a drag.
   * @param {HTMLElement} row @param {GanttRange} range @param {boolean} taken
   */
  const write = (row, [start, end], taken) => {
    const bar = barOf(row)
    row.style.setProperty('--from', String(start))
    if (!milestone(bar)) row.style.setProperty('--to', String(end))
    const words = format(start, end)
    if (text && bar.textContent !== words) bar.textContent = words
    if (taken && sliding(bar)) {
      bar.setAttribute('aria-valuenow', String(start))
      bar.setAttribute('aria-valuetext', words)
      written.set(bar, words)
    }
  }

  /**
   * Where a range goes when a part of it is moved by some units, kept inside the bar's limits and never
   * shorter than a step, or than the bar already is. ±Infinity takes it as far as it goes.
   * @param {Element} bar @param {GanttRange} range @param {'move' | 'start' | 'end'} part @param {number} by
   * @returns {GanttRange}
   */
  const fit = (bar, [start, end], part, by) => {
    const [least, most] = limits(bar)
    const length = end - start
    const shortest = Math.min(unit, length)
    if (part === 'start') return [tidy(clamp(start + by, Math.min(least, end - shortest), end - shortest)), end]
    if (part === 'end') return [start, tidy(clamp(end + by, start + shortest, Math.max(most, start + shortest)))]
    const first = tidy(clamp(start + by, least, Math.max(least, most - length)))
    return [first, tidy(first + length)]
  }

  /** Ask the page whether a bar may take a range. */
  const allowed = (/** @type {HTMLElement} */ bar, /** @type {GanttRange} */ range, /** @type {GanttRange} */ previous) => bar.dispatchEvent(new CustomEvent('beforechange', {
    bubbles: true,
    cancelable: true,
    detail: /** @type {GanttChange} */ ({ id: idOf(rowOf(bar)), range: [...range], previous: [...previous] }),
  }))
  const input = () => root.dispatchEvent(new Event('input', { bubbles: true }))
  const change = () => root.dispatchEvent(new Event('change', { bubbles: true }))

  /** Say something in the status region, after a pause, so the bar's own announcement does not swallow it. */
  let timer = 0
  const announce = (/** @type {string} */ words) => {
    const region = /** @type {HTMLElement | null} */ (root.nextElementSibling?.matches('.gantt-status') ? root.nextElementSibling : root.querySelector('.gantt-status'))
    if (!region) return
    region.textContent = ''
    clearTimeout(timer)
    timer = /** @type {any} */ (setTimeout(() => { region.textContent = words }, 400))
  }
  signal.addEventListener('abort', () => clearTimeout(timer))

  /** @type {Map<HTMLElement, string | null>} Each bar's `tabindex` before the script wrote one, given back on detach. */
  const original = new Map()
  /** @param {HTMLElement} bar @param {boolean} on */
  const index = (bar, on) => {
    if (!original.has(bar)) original.set(bar, bar.getAttribute('tabindex'))
    const wanted = on ? '0' : '-1'
    if (bar.getAttribute('tabindex') !== wanted) bar.setAttribute('tabindex', wanted)
  }
  signal.addEventListener('abort', () => {
    for (const [bar, value] of original) {
      if (value === null) bar.removeAttribute('tabindex')
      else bar.setAttribute('tabindex', value)
    }
  })

  /** One bar in the tab order: this one. */
  const rove = (/** @type {HTMLElement} */ bar) => {
    for (const each of sliders()) index(each, each === bar)
  }

  /** Write what a slider needs and the page left out, and leave the chart one stop in the tab order. */
  const prepare = () => {
    const bars = sliders()
    for (const bar of bars) {
      const row = rowOf(bar)
      const [least, most] = scale()
      if (!bar.hasAttribute('aria-valuemin')) bar.setAttribute('aria-valuemin', String(least))
      if (!bar.hasAttribute('aria-valuemax')) bar.setAttribute('aria-valuemax', String(most))
      const [start, end] = rangeOf(row)
      if (bar.getAttribute('aria-valuenow') !== String(start)) bar.setAttribute('aria-valuenow', String(start))
      const told = bar.getAttribute('aria-valuetext')
      if (told === null || told === written.get(bar)) {
        const words = format(start, end)
        if (told !== words) bar.setAttribute('aria-valuetext', words)
        written.set(bar, words)
      }
      if (!bar.hasAttribute('aria-label') && !bar.hasAttribute('aria-labelledby')) {
        const name = row.querySelector('.gantt-label')
        if (name) {
          if (!name.id) name.id = `${root.id || 'gantt'}-label-${++ids}`
          bar.setAttribute('aria-labelledby', name.id)
        }
      }
    }
    const stop = bars.find((bar) => bar.getAttribute('tabindex') === '0' && enabled(bar)) ?? reachable()[0]
    for (const bar of bars) index(bar, bar === stop)
  }
  prepare()

  /** The bar the pointer holds, from the press until the release. */
  /** @type {{ bar: HTMLElement, row: HTMLElement, pointer: number, x: number, part: 'move' | 'start' | 'end', original: GanttRange, current: GanttRange, size: number, dragging: boolean } | null} */
  let drag = null
  /** Let go of a bar without a word: its marks go, its range stays as it is. */
  const release = () => {
    if (!drag) return
    drag.bar.removeAttribute('aria-busy')
    drag.bar.classList.remove('gantt-resize-start', 'gantt-resize-end')
    drag = null
  }

  const detach = valued(
    () => controller.abort(),
    () => /** @type {GanttValue} */ (Object.fromEntries(rows().map((row) => [idOf(row), rangeOf(row)]))),
    (given) => {
      for (const row of rows()) {
        const range = given?.[idOf(row)]
        if (!Array.isArray(range)) continue
        const start = Number(range[0])
        const end = milestone(barOf(row)) ? start : Number(range[1])
        if (!Number.isFinite(start) || !Number.isFinite(end)) continue
        if (drag?.row === row) release()
        const bar = barOf(row)
        if (!same(rangeOf(row), [start, end]) || (sliding(bar) && bar.getAttribute('aria-valuetext') !== format(start, end))) write(row, [start, end], true)
      }
    }
  )

  root.addEventListener('focusin', (event) => {
    const bar = /** @type {HTMLElement} */ (event.target)
    // A press may focus a disabled bar; the tab stop stays on a bar the keys can land on.
    if (sliding(bar) && enabled(bar) && bar.tabIndex !== 0) rove(bar)
  }, { signal })

  /* The keys. */

  root.addEventListener('keydown', (event) => {
    const bar = /** @type {HTMLElement} */ (event.target)
    if (!sliding(bar) || event.ctrlKey || event.metaKey || drag?.dragging) return
    if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && !event.shiftKey && !event.altKey) {
      event.preventDefault()
      // From the bar's own place, so a disabled bar that holds focus goes to its neighbours, not to the ends.
      const all = sliders()
      const at = all.indexOf(bar)
      const to = event.key === 'ArrowDown' ? all.slice(at + 1).find(enabled) : all.slice(0, at).findLast(enabled)
      if (to && to !== bar) {
        rove(to)
        to.focus()
      }
      return
    }
    const rtl = getComputedStyle(root).direction === 'rtl'
    const later = rtl ? 'ArrowLeft' : 'ArrowRight'
    const earlier = rtl ? 'ArrowRight' : 'ArrowLeft'
    /** @type {Record<string, number>} */
    const steps = { [later]: unit, [earlier]: -unit, End: Infinity, Home: -Infinity }
    if (!(event.key in steps) || fixed(bar)) return
    const part = event.shiftKey ? 'end' : event.altKey ? 'start' : 'move'
    // A milestone is a point: it has no end of its own to move.
    if (part !== 'move' && milestone(bar)) return
    event.preventDefault()
    const row = rowOf(bar)
    const previous = rangeOf(row)
    const range = fit(bar, previous, part, steps[event.key])
    if (same(range, previous)) return
    if (!allowed(bar, range, previous)) {
      announce(say.refused(nameOf(bar), format(...previous)))
      return
    }
    write(row, range, true)
    input()
    change()
  }, { signal })

  /* The pointer. */


  /**
   * Which part of a bar a press is on: an end, inside the width of the grip the stylesheet draws there, or
   * the body. A milestone has only a body.
   * @param {HTMLElement} bar @param {number} x
   * @returns {'move' | 'start' | 'end'}
   */
  const partAt = (bar, x) => {
    if (milestone(bar)) return 'move'
    const box = bar.getBoundingClientRect()
    const drawn = parseFloat(getComputedStyle(bar, '::before').width)
    const grip = Number.isFinite(drawn) && drawn > 0 ? drawn : Math.min(8, box.width * 0.3)
    const rtl = getComputedStyle(root).direction === 'rtl'
    const fromStart = rtl ? box.right - x : x - box.left
    if (fromStart <= grip) return 'start'
    if (box.width - fromStart <= grip) return 'end'
    return 'move'
  }

  /**
   * How wide a unit of the scale is, in pixels, read from the longest bar the stylesheet drew: every track
   * is as wide as the others. Without a span to read, from the track of the root's grid.
   */
  const unitWidth = () => {
    let longest = 0
    let width = 0
    for (const row of rows()) {
      const bar = barOf(row)
      if (milestone(bar) || row.closest('[hidden]')) continue
      const [start, end] = rangeOf(row)
      if (end - start > longest) {
        longest = end - start
        width = bar.getBoundingClientRect().width
      }
    }
    if (longest > 0 && width > 0) return width / longest
    const [from, to] = scale()
    const track = parseFloat(getComputedStyle(root).gridTemplateColumns.split(' ').at(-1) ?? '')
    return Number.isFinite(track) && track > 0 && to > from ? track / (to - from) : 0
  }

  /** Let the bar go: keep the range it was carried to, if the page takes it, or put it back. */
  const end = (/** @type {boolean} */ keep) => {
    if (!drag) return
    const { bar, row, original, current, dragging } = drag
    release()
    if (!dragging) return
    if (same(current, original)) return
    if (keep && allowed(bar, current, original)) {
      write(row, current, true)
      change()
      return
    }
    write(row, original, false)
    input()
    announce((keep ? say.refused : say.cancelled)(nameOf(bar), format(...original)))
  }

  root.addEventListener('pointerdown', (event) => {
    const bar = /** @type {HTMLElement | null} */ (/** @type {Element} */ (event.target).closest('.gantt-bar'))
    if (!bar || !sliding(bar) || fixed(bar) || event.button !== 0 || !event.isPrimary || drag) return
    // The press is left to the browser, which focuses the bar as a click does, without the ring the keys show,
    // so the keys go on where the pointer left off. The stylesheet keeps the text from being selected.
    try {
      bar.setPointerCapture?.(event.pointerId)
    } catch {
      // A pointer the browser no longer knows cannot be captured; the document still hears it.
    }
    const range = rangeOf(rowOf(bar))
    drag = { bar, row: rowOf(bar), pointer: event.pointerId, x: event.clientX, part: partAt(bar, event.clientX), original: range, current: range, size: 0, dragging: false }
  }, { signal })

  document.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointer) return
    const rtl = getComputedStyle(root).direction === 'rtl'
    const moved = (event.clientX - drag.x) * (rtl ? -1 : 1)
    if (!drag.dragging) {
      if (Math.abs(moved) < threshold) return
      drag.size = unitWidth()
      if (!(drag.size > 0)) return
      drag.dragging = true
      drag.bar.setAttribute('aria-busy', 'true')
      if (drag.part !== 'move') drag.bar.classList.add(`gantt-resize-${drag.part}`)
    }
    const range = fit(drag.bar, drag.original, drag.part, Math.round(moved / drag.size / unit) * unit)
    if (same(range, drag.current)) return
    drag.current = range
    write(drag.row, range, false)
    input()
  }, { signal })

  document.addEventListener('pointerup', (event) => {
    if (drag && event.pointerId === drag.pointer) end(true)
  }, { signal })
  document.addEventListener('pointercancel', (event) => {
    if (drag && event.pointerId === drag.pointer) end(false)
  }, { signal })
  document.addEventListener('keydown', (event) => {
    if (drag?.dragging && event.key === 'Escape') {
      event.preventDefault()
      end(false)
    }
  }, { signal })

  signal.addEventListener('abort', release)

  return detach
}
