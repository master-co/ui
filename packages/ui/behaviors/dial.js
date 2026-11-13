/**
 * Dial: turns a dial's thumb with the keys, the pointer and, when asked, the wheel.
 *
 * The stylesheet draws the dial from its value; this script only passes the number on. Each change writes it
 * to the root's `aria-valuenow`, to `--dial-value` on the root, to the text of `dial-value` and to the value
 * of a hidden input inside the root, which is what a form submits. `aria-valuemin` and `aria-valuemax` are
 * the ends, 0 and 100 when they are left out; the behavior copies them to `--dial-min` and `--dial-max` once,
 * as it attaches. The value stays on a step from the least.
 *
 * A drag reads the pointer's angle around the middle of the dial and turns it into a value with the two
 * angles the stylesheet draws with, `--dial-start` and `--dial-sweep`. A press on the track moves the value
 * there; a press on the thumb keeps it where it was taken hold of. A dial that sweeps the whole circle comes
 * round: past its greatest value it starts again from the least, and the greatest is the same place as the
 * least, so the value never reaches it. A knob does not come round: a drag through the gap at its foot stays
 * at the end it left until the pointer comes back.
 *
 * Clockwise is more in every writing direction, as on a clock, so the arrow keys do not turn around from right
 * to left.
 *
 * The label and `aria-valuetext` keep the words around the number they were written with ("40%" becomes
 * "41%"); give `text` to write them another way.
 *
 * The root dispatches `input` each time the value changes, and `change` when a drag ends or a key or the
 * wheel moved it. Both bubble.
 *
 * The function the behavior returns has a `value`: the number. Set it to turn the dial from outside; that
 * dispatches nothing.
 */
import { valued, write } from './internal.js'

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * How far a wheel scrolls before the dial turns a step, in pixels. A notch of a mouse wheel is more, whatever
 * the screen's density, so each notch is one step; a trackpad's small moves are gathered until they reach it.
 */
const NOTCH = 40

/**
 * The words before and after the first number in a text, or null when it holds none.
 * @param {string} text
 * @returns {[string, string] | null}
 */
function around(text) {
  const found = /-?\d+(?:[.,]\d+)*/.exec(text)
  return found ? [text.slice(0, found.index), text.slice(found.index + found[0].length)] : null
}

/**
 * @param {HTMLElement} root The element with the `dial` class and `role="slider"`.
 * @param {{ step?: number, page?: number, text?: (value: number) => string, wheel?: boolean }} [options]
 *   `step`: how far an arrow key turns the value, and what a drag rounds it to. 1 by default.
 *   `page`: how far PageUp and PageDown turn it. A tenth of the range by default, on a step.
 *   `text`: the words for a value, written in `dial-value` and in `aria-valuetext`.
 *   `wheel`: let a wheel turn the dial while Alt (Option) is held. False by default, so scrolling the page
 *   over a dial never turns it.
 * @returns {(() => void) & { value: number }} Removes the listeners. Its `value` is the number.
 */
export function dial(root, { step = 1, page, text, wheel = false } = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)
  signal.addEventListener('abort', () => { if (attached.get(root) === controller) attached.delete(root) })

  const label = root.querySelector('.dial-value')
  const field = /** @type {HTMLInputElement | null} */ (root.querySelector('input[type="hidden"]'))
  const shown = around(label?.textContent ?? '')
  const spoken = root.hasAttribute('aria-valuetext') ? around(root.getAttribute('aria-valuetext') ?? '') : null
  const size = step > 0 ? step : 1

  /** @param {string} name @param {number} fallback */
  const number = (name, fallback) => {
    const value = parseFloat(root.getAttribute(name) ?? '')
    return Number.isFinite(value) ? value : fallback
  }
  const least = () => number('aria-valuemin', 0)
  const greatest = () => Math.max(least(), number('aria-valuemax', 100))
  const now = () => number('aria-valuenow', least())
  const disabled = () => root.getAttribute('aria-disabled') === 'true'
  /** @param {number} value */
  const places = (value) => (String(value).split('.')[1] ?? '').length
  /** Where the least value stands and how far the track runs, in degrees clockwise from the top, as the stylesheet draws them. */
  const geometry = () => {
    const style = getComputedStyle(root)
    const full = root.classList.contains('dial-full')
    /** @param {string} name @param {number} fallback */
    const angle = (name, fallback) => {
      const value = parseFloat(style.getPropertyValue(name))
      return Number.isFinite(value) ? value : fallback
    }
    return { start: angle('--dial-start', full ? 0 : 225), sweep: Math.min(360, Math.max(0, angle('--dial-sweep', full ? 360 : 270))) }
  }
  const round = () => geometry().sweep >= 360

  /**
   * Bring a value onto the dial: onto a step from the least, then between the ends, or round them.
   * @param {number} value
   */
  const fit = (value) => {
    const min = least()
    const span = greatest() - min
    if (!(span > 0)) return min
    let next = min + Math.round((value - min) / size) * size
    if (round()) next = min + (((next - min) % span) + span) % span
    else next = Math.min(min + span, Math.max(min, next))
    return Number(next.toFixed(Math.max(places(size), places(min))))
  }

  /** How far along the track a value is, from nothing to all of it. */
  const share = (value = now()) => {
    const span = greatest() - least()
    return span > 0 ? Math.min(1, Math.max(0, (value - least()) / span)) : 0
  }

  /**
   * Write a value everywhere it is read: the drawing, assistive technology, the label and the form.
   * @param {number} value A value already on the dial.
   */
  const draw = (value) => {
    const figure = String(value)
    root.setAttribute('aria-valuenow', figure)
    root.style.setProperty('--dial-value', figure)
    if (label) label.textContent = text ? text(value) : shown ? shown[0] + figure + shown[1] : figure
    if (text) root.setAttribute('aria-valuetext', text(value))
    else if (spoken) root.setAttribute('aria-valuetext', spoken[0] + figure + spoken[1])
    if (field) write(field, figure)
  }

  /**
   * Turn the dial to a value, and say so.
   * @param {number} value
   * @returns {boolean} Whether the value changed.
   */
  const set = (value) => {
    const next = fit(value)
    if (!Number.isFinite(next) || next === now()) return false
    draw(next)
    root.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  }
  const changed = () => root.dispatchEvent(new Event('change', { bubbles: true }))

  /**
   * The pointer's angle around the middle of the dial, clockwise from the top, in degrees. Near the middle,
   * where a small move would swing it round, and on a dial that is not laid out, there is none.
   * @param {PointerEvent} event
   */
  const pointed = (event) => {
    const box = root.getBoundingClientRect()
    if (!box.width || !box.height) return null
    const x = event.clientX - (box.left + box.width / 2)
    const y = event.clientY - (box.top + box.height / 2)
    if (Math.hypot(x, y) < box.width / 10) return null
    return (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360
  }

  /**
   * The value at an angle. A press in the gap at the foot of a knob takes the nearer end. A drag follows the
   * pointer the short way round from where the value was, so a knob it turns past an end stays at that end,
   * through the gap and beyond, until the pointer comes back, rather than jump to the other end.
   * @param {number} degrees
   * @param {number} [from] The share the value had, while a drag goes on.
   */
  const at = (degrees, from) => {
    const { start, sweep } = geometry()
    const along = ((degrees - start) % 360 + 360) % 360
    let part
    if (sweep >= 360) part = along / 360
    else if (from !== undefined) {
      const to = from * sweep + ((along - from * sweep) % 360 + 540) % 360 - 180
      part = to >= sweep ? 1 : to <= 0 ? 0 : to / sweep
    }
    else if (along <= sweep) part = sweep ? along / sweep : 0
    else part = along - sweep < 360 - along ? 1 : 0
    return least() + part * (greatest() - least())
  }

  /** The pointer that holds the dial, how far from the thumb it took hold, and the value before it did. */
  let held = /** @type {number | null} */ (null)
  let offset = 0
  let before = NaN

  root.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || disabled()) return
    held = event.pointerId
    offset = 0
    before = now()
    // Capture keeps the moves coming when the pointer leaves the dial. A scripted event has no pointer to capture.
    try { root.setPointerCapture(event.pointerId) } catch {}
    const degrees = pointed(event)
    if (degrees === null) return
    const target = /** @type {Element | null} */ (event.target)
    if (target?.closest?.('.dial-thumb')) {
      // Taken by the thumb, the dial turns from where it was taken, without a jump.
      const { start, sweep } = geometry()
      offset = ((start + share() * sweep - degrees) % 360 + 540) % 360 - 180
      return
    }
    set(at(degrees))
  }, { signal })

  root.addEventListener('pointermove', (event) => {
    if (event.pointerId !== held) return
    const degrees = pointed(event)
    if (degrees !== null) set(at(degrees + offset, share()))
  }, { signal })

  /** @param {PointerEvent} event */
  const release = (event) => {
    if (event.pointerId !== held) return
    held = null
    if (now() !== before) changed()
  }
  root.addEventListener('pointerup', release, { signal })
  root.addEventListener('pointercancel', release, { signal })
  root.addEventListener('lostpointercapture', release, { signal })

  root.addEventListener('keydown', (event) => {
    if (disabled() || event.ctrlKey || event.metaKey || event.altKey) return
    const min = least()
    const max = greatest()
    const value = now()
    const large = page ?? Math.max(size, Math.round((max - min) / 10 / size) * size)
    let next
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') next = value + size
    else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') next = value - size
    else if (event.key === 'PageUp') next = value + large
    else if (event.key === 'PageDown') next = value - large
    else if (event.key === 'Home') next = min
    // Round a full circle the greatest value is the least again: End stops a step before it.
    else if (event.key === 'End') next = round() ? max - size : max
    else return
    event.preventDefault()
    if (set(next)) changed()
  }, { signal })

  if (wheel) {
    /** What the wheel has scrolled toward the next step, in pixels. */
    let turned = 0
    root.addEventListener('wheel', (event) => {
      if (!event.altKey || disabled()) return
      event.preventDefault()
      // A wheel that scrolls by lines or pages turns a step with each event.
      turned += event.deltaMode ? Math.sign(event.deltaY) * NOTCH : event.deltaY
      if (Math.abs(turned) < NOTCH) return
      // A wheel turned away from the reader scrolls up, and turns the value up.
      const up = turned < 0
      turned = 0
      if (set(now() + (up ? size : -size))) changed()
    }, { signal, passive: false })
  }

  // The first value is drawn everywhere it is read, so a style, a label or a field the markup left out is filled
  // in, and so are the ends, for a browser that cannot read them from the attributes.
  if (root.hasAttribute('aria-valuemin')) root.style.setProperty('--dial-min', String(least()))
  if (root.hasAttribute('aria-valuemax')) root.style.setProperty('--dial-max', String(greatest()))
  draw(fit(now()))

  return valued(() => controller.abort(), now, (value) => {
    if (!Number.isFinite(value)) return
    const next = fit(value)
    if (next !== now()) draw(next)
  })
}
