/**
 * Stepper: makes the two buttons step the number between them.
 *
 * The field stays a native number input: its arrow keys, `min`, `max`, `step` and spin button role are the
 * platform's. A button calls `stepDown()` or `stepUp()` on it, the methods those keys use, and the field
 * dispatches `input` and `change` as it does when typed in. A button is `disabled` while the value stands at
 * the limit it steps toward, and hands the focus it had to the field; a form's reset brings the buttons back
 * in step with the first number. A button held down steps again and again after a short delay, until the pointer
 * lifts, leaves or is cancelled, or the limit is reached.
 *
 * A button says which way it steps in its `value`, negative for down. Without one, the button before the
 * field steps down and the button after it steps up.
 *
 * A formatted figure: where the stepper has a `stepper-display`, or is given `format`, the number is also
 * written as `Intl.NumberFormat` writes it, with a unit, a currency or grouping. The display shows it while
 * the field is not focused, and the field's `aria-valuetext` says it; the field itself keeps the plain number,
 * which is what is typed, stepped and sent with a form.
 *
 * Scrubbing: dragging a `stepper-scrub` sideways, a handle in the stepper or a label of its field, steps the
 * number by one step every few pixels, ten with Shift held, toward the end of the line for more. A mouse
 * locks the pointer while it drags, where the browser can, so the drag never runs into the edge of the
 * screen. The field dispatches `input` at each step and `change` when the drag ends. A drag starts after
 * 3px, so a press on a label still focuses the field.
 *
 * The function the behavior returns has a `value`: the field's number, null while it is empty. Set it to
 * write the field from outside; that dispatches nothing, and the buttons and the display follow the new value.
 */

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/** How long a button is held before it repeats, and how long between repeats, in milliseconds. */
const DELAY = 400
const EVERY = 60
/** How far a pointer moves before a press on a scrub handle becomes a drag, in pixels. */
const SLOP = 3

/**
 * @typedef {object} StepperOptions
 * @property {Intl.NumberFormatOptions | ((value: number) => string)} [format] How the figure is written while
 *   the field is not focused: options for `Intl.NumberFormat`, or a function of the number. A stepper with a
 *   `stepper-display` and no `format` groups the digits as the locale does.
 * @property {string | string[]} [locale] The locale `Intl.NumberFormat` writes in. The page's by default.
 * @property {number} [pixels] How far a scrub moves for one step, in pixels. 4 by default.
 */

/**
 * @param {HTMLElement} root The element with the `stepper` class.
 * @param {StepperOptions} [options]
 * @returns {(() => void) & { value: number | null }} Removes the listeners and gives the buttons back the
 *   `disabled` they had, and the display and the field the words they had. Its `value` is the field's number.
 */
export function stepper(root, { format, locale, pixels = 4 } = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)

  const field = /** @type {HTMLInputElement} */ (root.querySelector('.stepper-field'))
  /** Set once the buttons are known: brings them in step with the field. */
  let follow = () => {}
  const detach = /** @type {(() => void) & { value: number | null }} */ (Object.defineProperty(() => controller.abort(), 'value', {
    enumerable: true,
    get: () => (!field || field.value === '' || Number.isNaN(Number(field.value)) ? null : Number(field.value)),
    set: (/** @type {number | null} */ next) => {
      if (!field) return
      field.value = next === null || next === undefined ? '' : String(next)
      follow()
    }
  }))
  if (!field) return detach
  const buttons = /** @type {HTMLButtonElement[]} */ ([...root.querySelectorAll('button')])
  const before = buttons.map((button) => button.disabled)

  /** Whether focus is on a button by the keys: where the browser cannot say, it is taken to be. */
  const keyed = (/** @type {Element} */ button) => {
    try {
      return button.matches(':focus-visible')
    } catch {
      return true
    }
  }

  /** @param {HTMLButtonElement} button */
  const down = (button) => (button.value ? Number(button.value) < 0 : Boolean(button.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING))

  /** The button a pointer holds down, the timer of its next step, and whether it has stepped while held. */
  let held = /** @type {HTMLButtonElement | null} */ (null)
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer
  let repeated = false
  function release() {
    clearTimeout(timer)
    held = null
  }

  /** The formatted figure: where it is shown, how it is written, and what the page had before. */
  const display = /** @type {HTMLElement | null} */ (root.querySelector('.stepper-display'))
  const written = display?.textContent ?? null
  const spoken = field.getAttribute('aria-valuetext')
  const formatter = typeof format === 'function'
    ? format
    : format || display ? new Intl.NumberFormat(locale, format).format : null

  /** Write the number as the reader reads it, in the display and in the field's aria-valuetext. */
  function figure() {
    if (!formatter) return
    const value = field.value === '' ? NaN : Number(field.value)
    const text = Number.isFinite(value) ? formatter(value) : ''
    if (display && display.textContent !== text) display.textContent = text
    // Said at every step of a scrub and every key typed: an attribute is written only when it changes.
    if (text && text !== field.value) {
      if (field.getAttribute('aria-valuetext') !== text) field.setAttribute('aria-valuetext', text)
    } else if (field.hasAttribute('aria-valuetext')) field.removeAttribute('aria-valuetext')
  }

  /** Disable the button whose limit the value has reached. An empty field has reached neither. */
  function sync() {
    figure()
    const value = field.value === '' ? NaN : Number(field.value)
    for (const button of buttons) {
      const limit = down(button) ? field.min : field.max
      const reached = limit !== '' && (down(button) ? value <= Number(limit) : value >= Number(limit))
      // A button disabled under the pointer hears no click to end its hold.
      if (reached && button === held) {
        release()
        repeated = false
      }
      // A field that is disabled or read-only steps nothing, so its buttons stay as their author left them.
      // A field that cannot be stepped leaves its buttons as they are: whoever disabled the field decides them.
      if (field.disabled || field.readOnly) continue
      const next = reached
      if (button.disabled === next) continue
      // A button pressed with the keys up to its limit would take focus with it as it is disabled: the field,
      // the control it steps, has it instead.
      // Only then: a button tapped up to its limit would otherwise open the keyboard of a touch screen on the field.
      if (next && root.ownerDocument.activeElement === button && keyed(button)) field.focus({ preventScroll: true })
      button.disabled = next
    }
  }

  /** @param {HTMLButtonElement} button */
  function step(button) {
    if (field.disabled || field.readOnly) return
    const value = field.value
    // A field with step="any" has no step to take.
    try {
      if (down(button)) field.stepDown()
      else field.stepUp()
    } catch {
      return
    }
    if (field.value === value) return
    field.dispatchEvent(new Event('input', { bubbles: true }))
    field.dispatchEvent(new Event('change', { bubbles: true }))
  }

  /** @param {HTMLButtonElement} button @param {number} wait */
  function repeat(button, wait) {
    timer = setTimeout(() => {
      repeated = true
      step(button)
      if (held === button) repeat(button, EVERY)
    }, wait)
  }

  for (const button of buttons) {
    button.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return
      release()
      repeated = false
      held = button
      repeat(button, DELAY)
    }, { signal })
    for (const type of ['pointerup', 'pointerleave', 'pointercancel']) button.addEventListener(type, release, { signal })
    // One press is one step, from a pointer, a key or assistive technology. The click that ends a hold has
    // already been answered by its repeats; a click with no pointer behind it (detail 0) never ends one.
    button.addEventListener('click', (event) => {
      const ended = repeated && event.detail > 0
      repeated = false
      if (!ended) step(button)
    }, { signal })
  }

  // Typing and the field's own arrow keys move the value too.
  field.addEventListener('input', sync, { signal })
  field.addEventListener('change', sync, { signal })
  // A form's reset puts the first number back without an event: the buttons and the figure follow once it has.
  field.form?.addEventListener('reset', () => setTimeout(() => { if (!signal.aborted) sync() }), { signal })

  /**
   * Scrubbing. A handle belongs to this stepper when it stands in it, or is (or stands in) a label of its
   * field; a label may be anywhere in the page, so the document hears the press.
   * @param {EventTarget | null} target
   */
  const handleOf = (target) => {
    const handle = /** @type {Element | null} */ (target instanceof Element ? target.closest('.stepper-scrub') : null)
    if (!handle) return null
    if (root.contains(handle)) return handle.closest('.stepper') === root ? handle : null
    return [...(field.labels ?? [])].some((label) => label === handle || label.contains(handle)) ? handle : null
  }
  /** The drag under way: its own listeners, where it started, how far it has gone and whether it stepped. */
  /** @type {AbortController | null} */
  let drag = null
  let swallow = false

  const page = root.ownerDocument
  page.addEventListener('pointerdown', (event) => {
    const handle = handleOf(event.target)
    if (!handle || event.button !== 0 || !event.isPrimary || field.disabled || field.readOnly) return
    drag?.abort()
    const gesture = new AbortController()
    drag = gesture
    // Detaching ends a drag under way: it aborts this one too, and a pointer it locked is let go however it ends.
    const options = { signal: gesture.signal }
    gesture.signal.addEventListener('abort', () => {
      if (locked && page.pointerLockElement === handle) page.exitPointerLock()
    })
    const start = event.clientX
    const sign = getComputedStyle(root).direction === 'rtl' ? -1 : 1
    let last = start
    let travel = 0
    let dragging = false
    let changed = false
    let locked = false

    /** Ends the gesture; set below, once the listeners that end it are there. */
    let finish = (/** @type {PointerEvent} */ _up) => {}

    page.addEventListener('pointermove', (move) => {
      if (move.pointerId !== event.pointerId) return
      // A release that never arrived, as when the window lost the pointer, is over once no button is down.
      if (event.pointerType === 'mouse' && move.buttons === 0) {
        finish(move)
        return
      }
      if (!dragging) {
        if (Math.abs(move.clientX - start) < SLOP) return
        dragging = true
        last = move.clientX
        // A mouse is held still while the drag goes on; a pen or a finger is captured by the handle.
        if (event.pointerType === 'mouse' && 'requestPointerLock' in handle) {
          locked = true
          // The lock arrives later than it is asked for: a drag that ended before it came lets it go at once.
          Promise.resolve(/** @type {any} */ (handle).requestPointerLock()).then(() => {
            if (gesture.signal.aborted && page.pointerLockElement === handle) page.exitPointerLock()
          }, () => { locked = false })
        } else {
          try { /** @type {HTMLElement} */ (handle).setPointerCapture(event.pointerId) } catch {}
        }
        return
      }
      const moved = page.pointerLockElement === handle ? move.movementX || 0 : move.clientX - last
      last = move.clientX
      travel += moved * sign
      const count = Math.trunc(travel / pixels)
      if (!count) return
      travel -= count * pixels
      const value = field.value
      // One step at a time, as the keys take them, so each lands on the step and the last stops at a limit.
      try {
        for (let taken = 0; taken < Math.abs(count) * (move.shiftKey ? 10 : 1); taken++) {
          const before = field.value
          if (count < 0) field.stepDown()
          else field.stepUp()
          if (field.value === before) break
        }
      } catch {
        return
      }
      if (field.value === value) return
      changed = true
      field.dispatchEvent(new Event('input', { bubbles: true }))
    }, options)

    const end = (/** @type {PointerEvent} */ up) => {
      if (up.pointerId !== event.pointerId) return
      gesture.abort()
      if (drag === gesture) drag = null
      if (!dragging) return
      // The click that ends a drag on a label would focus the field; the drag was the press.
      swallow = true
      setTimeout(() => { swallow = false })
      if (changed) field.dispatchEvent(new Event('change', { bubbles: true }))
    }
    finish = end
    page.addEventListener('pointerup', end, options)
    page.addEventListener('pointercancel', end, options)
  }, { signal })

  page.addEventListener('click', (event) => {
    if (!swallow) return
    swallow = false
    event.preventDefault()
    event.stopPropagation()
  }, { signal, capture: true })

  signal.addEventListener('abort', () => {
    if (attached.get(root) === controller) attached.delete(root)
    release()
    drag?.abort()
    buttons.forEach((button, index) => { button.disabled = before[index] })
    if (formatter) {
      if (display && written !== null) display.textContent = written
      if (spoken === null) field.removeAttribute('aria-valuetext')
      else field.setAttribute('aria-valuetext', spoken)
    }
  })

  follow = sync
  sync()
  return detach
}
