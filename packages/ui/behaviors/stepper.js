/**
 * Stepper: makes the two buttons step the number between them.
 *
 * The field stays a native number input: its arrow keys, `min`, `max`, `step` and spin button role are the
 * platform's. A button calls `stepDown()` or `stepUp()` on it, the methods those keys use, and the field
 * dispatches `input` and `change` as it does when typed in. A button is `disabled` while the value stands at
 * the limit it steps toward. A button held down steps again and again after a short delay, until the pointer
 * lifts, leaves or is cancelled, or the limit is reached.
 *
 * A button says which way it steps in its `value`, negative for down. Without one, the button before the
 * field steps down and the button after it steps up.
 *
 * The function the behavior returns has a `value`: the field's number, null while it is empty. Set it to
 * write the field from outside; that dispatches nothing, and the buttons follow the new value.
 */

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/** How long a button is held before it repeats, and how long between repeats, in milliseconds. */
const DELAY = 400
const EVERY = 60

/**
 * @param {HTMLElement} root The element with the `stepper` class.
 * @returns {(() => void) & { value: number | null }} Removes the listeners and gives the buttons back the
 *   `disabled` they had. Its `value` is the field's number.
 */
export function stepper(root) {
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

  /** Disable the button whose limit the value has reached. An empty field has reached neither. */
  function sync() {
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
      button.disabled = field.disabled || field.readOnly ? before[buttons.indexOf(button)] : reached
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

  signal.addEventListener('abort', () => {
    if (attached.get(root) === controller) attached.delete(root)
    release()
    buttons.forEach((button, index) => { button.disabled = before[index] })
  })

  follow = sync
  sync()
  return detach
}
