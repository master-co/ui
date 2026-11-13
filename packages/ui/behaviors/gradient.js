/**
 * Gradient: a gradient's stops on a bar, the stop in hand in a color picker, and its type, angle and centre.
 *
 * The gradient is a value: its `type` (`linear`, `radial` or `conic`), its `angle` in degrees, its `center` as two
 * percentages, and its `stops`, each with an `id` that stays with it, an `offset` from 0 to 100 and a `color`. The
 * behavior writes the stops' handles on `gradient-bar` from that value, as data, and keeps the rest of the
 * markup's controls in step with it. It publishes what the stylesheet paints as content, never as material:
 * `--gradient` and `--gradient-fallback` on the root, and `--gradient-offset` and `--gradient-color` on each
 * handle, which the stylesheet places along the bar.
 *
 * A handle (`gradient-stop`) is a slider of its stop's offset. A press on it takes the stop in hand and a drag
 * moves it, past another stop if the pointer goes there: the stops keep their ids and the handle keeps focus.
 * The arrow keys move it by one, by ten with Shift, Home and End take it to 0 and 100, PageUp and PageDown move it
 * by ten, and Delete or Backspace remove it while there are more than two. The stop in hand is
 * `aria-current="true"`; the color picker in `gradient-color`, the range and the number in `gradient-offset`,
 * and the remove button show and change it. `gradient-add` adds a stop after it, of its color, ten points on
 * (100 at most); `gradient-remove` removes it and hands focus to its neighbor; `gradient-reverse` turns the
 * stops round. The radios in `gradient-type`, the dial in `gradient-angle` and the numbers in `gradient-center`
 * set the rest; the dial is disabled for a radial gradient and the numbers for a linear one, which do not use them. Two stops may share an offset, for a hard edge; stops at one offset keep their order.
 *
 * `gradientCss(value)` writes the gradient as CSS, the one function the preview and the copied text share:
 * interpolated in OKLab where the browser can say so, with a fallback for where it cannot. Colors are written
 * as sRGB with their opacity, as the color picker writes them; no other CSS is read back.
 *
 * The reader's moves dispatch a bubbling `input` while they go on and `change` when they end. The function the
 * behavior returns has a `value`; set it to show another gradient, which dispatches nothing. With
 * `aria-disabled="true"` or `aria-readonly="true"` on the root nothing moves.
 */
import { colorPicker, colorPickerFormat } from './color-picker.js'
import { dial } from './dial.js'

/**
 * @typedef {{ id: string, offset: number, color: string }} GradientStop
 * @typedef {{ type: 'linear' | 'radial' | 'conic', angle: number, center: [number, number], stops: GradientStop[] }} GradientValue
 * @typedef {object} GradientOptions
 * @property {Partial<GradientValue>} [value] The gradient to show first.
 * @property {(stop: GradientStop, index: number, count: number) => string} [stopLabel] A handle's accessible name.
 *   `Stop 2 of 3` by default.
 * @property {(stop: GradientStop) => string} [stopText] A handle's value in words. `40%, #ff6a00` by default.
 * @property {(value: GradientValue) => void} [draw] Takes over writing the handles, for a renderer that writes them.
 */

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

const clamp = (/** @type {number} */ value, low = 0, high = 100) => Math.min(high, Math.max(low, value))
const round = (/** @type {number} */ value, places = 1) => Number(value.toFixed(places))
const types = /** @type {const} */ (['linear', 'radial', 'conic'])

/** A color as the gradient writes it: sRGB with its opacity, or the text it was given when it is not a color. */
const normal = (/** @type {string} */ color) => colorPickerFormat(color, 'hex') ?? color

/**
 * The stops in the order they are painted: by offset, and in their own order where two share one.
 * @param {GradientStop[]} stops
 */
export const gradientStops = (stops) => stops.map((stop, index) => ({ stop, index })).sort((a, b) => a.stop.offset - b.stop.offset || a.index - b.index).map(({ stop }) => stop)

/**
 * A value as the gradient holds it: a known type, numbers in their ranges and at least two stops with ids.
 * @param {Partial<GradientValue> | null | undefined} value
 * @returns {GradientValue}
 */
export function gradientValue(value) {
  const stops = (value?.stops ?? []).map((stop, index) => ({ id: String(stop.id ?? `stop-${index + 1}`), offset: round(clamp(Number(stop.offset) || 0)), color: normal(String(stop.color ?? '#000000')) }))
  while (stops.length < 2) stops.push({ id: `stop-${stops.length + 1}`, offset: stops.length ? 100 : 0, color: stops.length ? '#ffffff' : '#000000' })
  return {
    type: types.includes(/** @type {any} */ (value?.type)) ? /** @type {GradientValue['type']} */ (value?.type) : 'linear',
    angle: round(((Number(value?.angle ?? 90) % 360) + 360) % 360),
    center: [round(clamp(Number(value?.center?.[0] ?? 50))), round(clamp(Number(value?.center?.[1] ?? 50)))],
    stops,
  }
}

/**
 * The gradient as CSS: `css` interpolated in OKLab, and `fallback` for a browser that cannot be told how to
 * interpolate. The preview paints the one it can and the copied text holds both, the fallback first.
 * @param {Partial<GradientValue>} given
 */
export function gradientCss(given) {
  const value = gradientValue(given)
  const stops = gradientStops(value.stops).map((stop) => `${stop.color} ${round(stop.offset)}%`).join(', ')
  const [x, y] = value.center
  const shape = { linear: `${value.angle}deg`, radial: `circle at ${x}% ${y}%`, conic: `from ${value.angle}deg at ${x}% ${y}%` }[value.type]
  const name = `${value.type}-gradient`
  return {
    css: `${name}(in oklab ${shape}, ${stops})`,
    fallback: `${name}(${shape}, ${stops})`,
    text: `background-image: ${name}(${shape}, ${stops});\nbackground-image: ${name}(in oklab ${shape}, ${stops});`,
  }
}

const same = (/** @type {GradientValue} */ a, /** @type {GradientValue} */ b) => JSON.stringify(a) === JSON.stringify(b)

/**
 * @param {HTMLElement} root The element with the `gradient` class.
 * @param {GradientOptions} [options]
 * @returns {(() => void) & { value: GradientValue }} Removes everything the behavior added. Its `value` is the gradient.
 */
export function gradient(root, options = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)

  const stopLabel = options.stopLabel ?? ((_, index, count) => `Stop ${index + 1} of ${count}`)
  const stopText = options.stopText ?? ((stop) => `${round(stop.offset)}%, ${stop.color}`)
  let value = gradientValue(options.value)
  let hand = value.stops[0].id
  let serial = value.stops.length

  const part = (/** @type {string} */ name) => /** @type {HTMLElement | null} */ (root.querySelector(`.gradient-${name}`))
  const bar = part('bar')
  const locked = () => root.getAttribute('aria-disabled') === 'true' || root.getAttribute('aria-readonly') === 'true'
  const handles = () => /** @type {HTMLElement[]} */ (bar ? [...bar.querySelectorAll('.gradient-stop')] : [])
  const handleOf = (/** @type {string} */ id) => handles().find((each) => each.dataset.id === id) ?? null
  const stopOf = (/** @type {string} */ id) => value.stops.find((stop) => stop.id === id)
  const say = (/** @type {'input' | 'change'} */ type) => root.dispatchEvent(new Event(type, { bubbles: true }))
  const rtl = () => getComputedStyle(root).direction === 'rtl'

  /* The color picker of the stop in hand: attached here, so the gradient hears every color it gives. */
  const pickerRoot = /** @type {HTMLElement | null} */ (root.querySelector('.gradient-color .color-picker'))
  const picker = pickerRoot ? colorPicker(pickerRoot) : null
  signal.addEventListener('abort', () => picker?.())
  /* The dial of the angle, likewise. */
  const angleRoot = /** @type {HTMLElement | null} */ (root.querySelector('.gradient-angle .dial'))
  const turn = angleRoot ? dial(angleRoot) : null
  signal.addEventListener('abort', () => turn?.())

  /** Write the handles from the value, where no renderer does. */
  function build() {
    if (!bar || options.draw) return
    const ids = value.stops.map((stop) => stop.id)
    for (const handle of handles()) if (!ids.includes(handle.dataset.id ?? '')) handle.remove()
    for (const stop of value.stops) {
      if (handleOf(stop.id)) continue
      const handle = root.ownerDocument.createElement('span')
      handle.className = 'gradient-stop'
      handle.dataset.id = stop.id
      handle.setAttribute('role', 'slider')
      handle.setAttribute('aria-valuemin', '0')
      handle.setAttribute('aria-valuemax', '100')
      bar.append(handle)
    }
  }

  /** Mark everything from the value: the handles, the paint and the controls, except the control giving it. */
  function paint(/** @type {Element | null} */ from = null) {
    if (!stopOf(hand)) hand = value.stops[0].id
    const css = gradientCss(value)
    root.style.setProperty('--gradient', css.css)
    root.style.setProperty('--gradient-fallback', css.fallback)
    root.style.setProperty('--gradient-bar', gradientCss({ ...value, type: 'linear', angle: rtl() ? 270 : 90 }).fallback)
    const ordered = gradientStops(value.stops)
    for (const handle of handles()) {
      const stop = stopOf(handle.dataset.id ?? '')
      if (!stop) continue
      handle.style.setProperty('--gradient-offset', String(stop.offset))
      handle.style.setProperty('--gradient-color', stop.color)
      handle.setAttribute('aria-valuenow', String(stop.offset))
      handle.setAttribute('aria-valuetext', stopText(stop))
      handle.setAttribute('aria-label', stopLabel(stop, ordered.indexOf(stop), ordered.length))
      handle.setAttribute('tabindex', stop.id === hand ? '0' : '-1')
      if (stop.id === hand) handle.setAttribute('aria-current', 'true')
      else handle.removeAttribute('aria-current')
      if (locked()) handle.setAttribute('aria-disabled', 'true')
      else handle.removeAttribute('aria-disabled')
    }
    const stop = /** @type {GradientStop} */ (stopOf(hand))
    for (const input of /** @type {HTMLInputElement[]} */ ([...root.querySelectorAll('.gradient-offset input')])) {
      if (input !== from) input.value = String(stop.offset)
      input.disabled = locked()
    }
    if (picker && from !== pickerRoot && picker.value !== stop.color && colorPickerFormat(picker.value, 'hex') !== stop.color) picker.value = stop.color
    for (const radio of /** @type {HTMLInputElement[]} */ ([...root.querySelectorAll('.gradient-type input[type="radio"]')])) {
      radio.checked = radio.value === value.type
      radio.disabled = locked()
    }
    // The angle is a linear and a conic gradient's, the centre a radial and a conic one's: the other is disabled.
    const angle = angleRoot
    if (turn && angle !== from && turn.value !== value.angle) turn.value = value.angle
    if (angle) {
      if (locked() || value.type === 'radial') angle.setAttribute('aria-disabled', 'true')
      else angle.removeAttribute('aria-disabled')
    }
    const [x, y] = /** @type {HTMLInputElement[]} */ ([...root.querySelectorAll('.gradient-center input')])
    if (x && x !== from) x.value = String(value.center[0])
    if (y && y !== from) y.value = String(value.center[1])
    for (const input of [x, y]) if (input) input.disabled = locked() || value.type === 'linear'
    const remove = /** @type {HTMLButtonElement | null} */ (part('remove'))
    if (remove) remove.disabled = locked() || value.stops.length <= 2
    for (const name of ['add', 'reverse']) {
      const button = /** @type {HTMLButtonElement | null} */ (part(name))
      if (button) button.disabled = locked()
    }
    const output = part('css')
    if (output) output.textContent = css.text
  }

  /** Show the value: ask a renderer for the handles, or write them, then mark everything. */
  function show(/** @type {Element | null} */ from = null) {
    if (options.draw) options.draw(structuredClone(value))
    build()
    paint(from)
  }

  /**
   * The reader changed the value.
   * @param {(next: GradientValue) => void} change @param {'input' | 'change'} type @param {Element | null} [from]
   */
  function edit(change, type, from = null) {
    if (locked()) return
    const next = structuredClone(value)
    change(next)
    const settled = gradientValue(next)
    if (same(settled, value)) return
    value = settled
    show(from)
    say('input')
    if (type === 'change') say('change')
  }

  /** @param {string} id */
  const focus = (id) => handleOf(id)?.focus()

  /** Remove the stop in hand, handing focus to its neighbor on the bar. */
  function remove() {
    if (value.stops.length <= 2 || locked()) return
    const ordered = gradientStops(value.stops)
    const at = ordered.findIndex((stop) => stop.id === hand)
    const neighbor = ordered[at + 1] ?? ordered[at - 1]
    const gone = hand
    hand = neighbor.id
    edit((next) => { next.stops = next.stops.filter((stop) => stop.id !== gone) }, 'change')
    focus(hand)
  }

  /* A handle: take it in hand, drag it, move it with the keys. */
  let held = /** @type {number | null} */ (null)
  /** The offset under the pointer, along the bar in its writing direction. @param {PointerEvent} event */
  const offsetAt = (event) => {
    const box = /** @type {HTMLElement} */ (bar).getBoundingClientRect()
    const along = box.width ? (event.clientX - box.left) / box.width : 0
    // A drag lands on whole points; the keys and the number reach anything between.
    return Math.round(clamp((rtl() ? 1 - along : along) * 100))
  }
  bar?.addEventListener('pointerdown', (event) => {
    const handle = /** @type {HTMLElement | null} */ (/** @type {Element} */ (event.target).closest('.gradient-stop'))
    if (!handle || locked() || event.button !== 0) return
    event.preventDefault()
    hand = handle.dataset.id ?? hand
    held = event.pointerId
    handle.setPointerCapture?.(event.pointerId)
    paint()
    handle.focus()
  }, { signal })
  bar?.addEventListener('pointermove', (event) => {
    if (held !== event.pointerId) return
    const offset = offsetAt(event)
    edit((next) => { /** @type {GradientStop} */ (next.stops.find((stop) => stop.id === hand)).offset = offset }, 'input')
  }, { signal })
  const release = (/** @type {PointerEvent} */ event) => {
    if (held !== event.pointerId) return
    held = null
    say('change')
  }
  bar?.addEventListener('pointerup', release, { signal })
  bar?.addEventListener('pointercancel', release, { signal })
  bar?.addEventListener('focusin', (event) => {
    const handle = /** @type {HTMLElement | null} */ (/** @type {Element} */ (event.target).closest('.gradient-stop'))
    if (!handle || handle.dataset.id === hand) return
    hand = handle.dataset.id ?? hand
    paint()
  }, { signal })
  bar?.addEventListener('keydown', (event) => {
    const handle = /** @type {HTMLElement | null} */ (/** @type {Element} */ (event.target).closest('.gradient-stop'))
    if (!handle || event.altKey || event.ctrlKey || event.metaKey || locked()) return
    const stop = stopOf(handle.dataset.id ?? '')
    if (!stop) return
    const big = event.shiftKey ? 10 : 1
    const forward = rtl() ? -1 : 1
    let to = stop.offset
    switch (event.key) {
      case 'ArrowRight': to += big * forward; break
      case 'ArrowLeft': to -= big * forward; break
      case 'ArrowUp': to += big; break
      case 'ArrowDown': to -= big; break
      case 'PageUp': to += 10; break
      case 'PageDown': to -= 10; break
      case 'Home': to = 0; break
      case 'End': to = 100; break
      case 'Delete':
      case 'Backspace':
        event.preventDefault()
        remove()
        return
      default: return
    }
    event.preventDefault()
    edit((next) => { /** @type {GradientStop} */ (next.stops.find((each) => each.id === stop.id)).offset = clamp(to) }, 'change')
  }, { signal })

  /* The controls of the stop in hand and of the whole gradient. */
  root.addEventListener('click', (event) => {
    const target = /** @type {Element} */ (event.target)
    if (target.closest('.gradient-add')) {
      const stop = /** @type {GradientStop} */ (stopOf(hand))
      const id = `stop-${++serial}`
      edit((next) => { next.stops.push({ id, offset: Math.min(100, stop.offset + 10), color: stop.color }) }, 'change')
      hand = id
      paint()
      focus(id)
    } else if (target.closest('.gradient-remove')) {
      remove()
    } else if (target.closest('.gradient-reverse')) {
      edit((next) => { next.stops = next.stops.map((stop) => ({ ...stop, offset: 100 - stop.offset })).reverse() }, 'change')
    }
  }, { signal })

  /** @param {Event} event */
  const control = (event) => {
    const target = /** @type {HTMLInputElement} */ (event.target)
    const type = /** @type {'input' | 'change'} */ (event.type)
    if (target === root) return
    if (pickerRoot?.contains(target)) {
      const color = picker?.value
      if (color) edit((next) => { /** @type {GradientStop} */ (next.stops.find((stop) => stop.id === hand)).color = normal(color) }, type, pickerRoot)
    } else if (target.closest('.gradient-offset')) {
      if (target.value === '' || !target.checkValidity()) return
      edit((next) => { /** @type {GradientStop} */ (next.stops.find((stop) => stop.id === hand)).offset = clamp(Number(target.value)) }, type, target)
    } else if (target.closest('.gradient-type') && target.checked) {
      edit((next) => { next.type = /** @type {GradientValue['type']} */ (target.value) }, 'change', target)
    } else if (target.closest('.gradient-angle')) {
      const dial = /** @type {HTMLElement | null} */ (target.closest('.dial'))
      if (dial) edit((next) => { next.angle = Number(dial.getAttribute('aria-valuenow')) }, type, dial)
    } else if (target.closest('.gradient-center')) {
      if (target.value === '' || !target.checkValidity()) return
      const [x] = [...root.querySelectorAll('.gradient-center input')]
      const axis = target === x ? 0 : 1
      edit((next) => { next.center[axis] = clamp(Number(target.value)) }, type, target)
    } else {
      return
    }
    // What a control of the gradient says is the gradient's to say.
    event.stopPropagation()
  }
  root.addEventListener('input', control, { signal })
  root.addEventListener('change', control, { signal })

  // A renderer that writes the handles may write them again at any time.
  if (options.draw && bar && typeof MutationObserver === 'function') {
    const observer = new MutationObserver(() => paint())
    observer.observe(bar, { childList: true })
    signal.addEventListener('abort', () => observer.disconnect())
  }

  signal.addEventListener('abort', () => { if (attached.get(root) === controller) attached.delete(root) })
  show()

  return /** @type {(() => void) & { value: GradientValue }} */ (Object.defineProperty(() => controller.abort(), 'value', {
    enumerable: true,
    get: () => structuredClone(value),
    set: (/** @type {Partial<GradientValue>} */ next) => {
      const settled = gradientValue(next)
      if (same(settled, value)) return
      value = settled
      serial = Math.max(serial, value.stops.length)
      show()
    },
  }))
}
