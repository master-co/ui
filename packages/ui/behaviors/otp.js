/**
 * OTP: makes the slots of a one-time code one field to the hand.
 *
 * Each `otp-slot` stays a native input. The script moves focus on after a character and back with
 * Backspace, walks the slots with the arrow keys, Home and End, refuses a character a slot does not allow,
 * and spreads a pasted or autofilled code over the slots: from the first when it is a whole code, from the
 * slot it landed in when it is part of one. A slot that takes focus has its character selected, so typing
 * replaces it.
 *
 * While attached the slots lose `maxlength`, which would cut an autofilled code (`autocomplete="one-time-code"`
 * on the first slot) to one character before the script saw it; the script keeps each slot to one character
 * instead, and `detach` gives the attribute back.
 *
 * A slot the script writes to dispatches `input`, as it does when typed in. When every slot is filled the
 * root dispatches a bubbling `change` CustomEvent with the code in `detail.value`. A slot's own `change`
 * bubbles through the root too; it has no `detail`.
 *
 * The function the behavior returns has a `value`: the characters the slots hold, in order. Set it to fill
 * the slots from outside; that dispatches nothing.
 */

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * @param {HTMLElement} root The element with the `otp` class.
 * @param {{ pattern?: RegExp }} [options] `pattern`: what one character must match. By default the `pattern`
 * attribute of the first slot, and a digit when it has none.
 * @returns {(() => void) & { value: string }} Removes the listeners and gives the slots their `maxlength`
 *   back. Its `value` is the code so far.
 */
export function otp(root, options = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)

  const every = () => /** @type {HTMLInputElement[]} */ ([...root.querySelectorAll('.otp-slot')])
  const detach = Object.defineProperty(() => controller.abort(), 'value', {
    enumerable: true,
    get: () => every().map((slot) => slot.value).join(''),
    set: (/** @type {string} */ text) => {
      const characters = accept(text ?? '')
      every().forEach((slot, index) => { slot.value = characters[index] ?? '' })
    }
  })
  /** The slots the keys may land on. */
  const slots = () => every().filter((slot) => !slot.disabled && !slot.closest('[hidden]'))

  let pattern = options.pattern ?? /^[0-9]$/
  if (!options.pattern) {
    const own = every()[0]?.getAttribute('pattern')
    try {
      if (own) pattern = new RegExp(`^(?:${own})$`, 'u')
    } catch {}
  }
  /**
   * The characters of a text a slot may hold.
   * @param {string} text
   */
  const accept = (text) => Array.from(text).filter((character) => {
    pattern.lastIndex = 0
    return pattern.test(character)
  })

  /** @type {Map<HTMLInputElement, string | null>} Each slot's `maxlength` before the script removed it. */
  const lengths = new Map()
  for (const slot of every()) {
    lengths.set(slot, slot.getAttribute('maxlength'))
    slot.removeAttribute('maxlength')
  }

  /** True while the script writes to a slot, so that it does not answer its own `input`. */
  let writing = false
  /**
   * Set a slot's character and say so the way typing does.
   * @param {HTMLInputElement} slot @param {string} character
   */
  function write(slot, character) {
    if (slot.value === character) return
    // The prototype's setter: a framework that shadows `value` to notice its own writes still hears the event.
    const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(slot), 'value')?.set
    if (set) set.call(slot, character)
    else slot.value = character
    writing = true
    slot.dispatchEvent(new Event('input', { bubbles: true }))
    writing = false
  }
  /**
   * Focus a slot with its character selected. Focus is moved only when it already stands in the code:
   * a code filled in from elsewhere does not take it.
   * @param {HTMLInputElement | undefined} slot
   */
  function focus(slot) {
    if (!slot || !root.contains(root.ownerDocument.activeElement)) return
    slot.focus()
    slot.select()
  }
  /** Say the code when every slot holds a character. */
  function report() {
    const list = slots()
    if (!list.length || !list.every((slot) => slot.value)) return
    root.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value: list.map((slot) => slot.value).join('') } }))
  }
  /**
   * Spread several characters over the slots: a whole code from the first slot, a part from where it landed.
   * @param {HTMLInputElement} slot @param {string[]} characters
   */
  function fill(slot, characters) {
    const list = slots()
    const from = characters.length >= list.length ? 0 : list.indexOf(slot)
    const fits = characters.slice(0, list.length - from)
    fits.forEach((character, offset) => write(list[from + offset], character))
    focus(list[Math.min(from + fits.length, list.length - 1)])
    report()
  }

  root.addEventListener('beforeinput', (event) => {
    if (event.data && slots().includes(/** @type {HTMLInputElement} */ (event.target)) && !accept(event.data).length) event.preventDefault()
  }, { signal })

  root.addEventListener('input', (event) => {
    const slot = /** @type {HTMLInputElement} */ (event.target)
    const list = slots()
    const index = list.indexOf(slot)
    if (writing || index < 0) return
    const { data, inputType = '' } = /** @type {InputEvent} */ (event)
    const held = accept(slot.value)
    if (inputType.startsWith('delete')) {
      write(slot, held[0] ?? '')
      // Backspace is answered at keydown. A deletion that arrives here came from a keyboard that names no
      // key: go back, so the next press has a character to delete.
      if (inputType === 'deleteContentBackward' && !held.length) focus(list[index - 1])
      return
    }
    // What the edit put in when the event says, since it may stand beside the character the slot held;
    // the whole value otherwise, which is how an autofilled code arrives.
    const characters = data ? accept(data) : held
    if (characters.length > 1) return fill(slot, characters)
    // A character the slot does not allow leaves it as it was.
    if (!characters.length) return write(slot, held[0] ?? '')
    write(slot, characters[0])
    focus(list[index + 1] ?? slot)
    report()
  }, { signal })

  root.addEventListener('paste', (event) => {
    const slot = /** @type {HTMLInputElement} */ (event.target)
    if (!slots().includes(slot)) return
    event.preventDefault()
    const characters = accept(event.clipboardData?.getData('text') ?? '')
    if (characters.length) fill(slot, characters)
  }, { signal })

  root.addEventListener('keydown', (event) => {
    const list = slots()
    const index = list.indexOf(/** @type {HTMLInputElement} */ (event.target))
    if (index < 0 || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return
    const slot = list[index]
    const forward = getComputedStyle(root).direction === 'rtl' ? -1 : 1
    if (event.key === 'Backspace') {
      if (slot.value) write(slot, '')
      else if (index > 0) {
        write(list[index - 1], '')
        focus(list[index - 1])
      }
    } else if (event.key === 'Delete') write(slot, '')
    else if (event.key === 'ArrowLeft') focus(list[index - forward])
    else if (event.key === 'ArrowRight') focus(list[index + forward])
    else if (event.key === 'Home') focus(list[0])
    else if (event.key === 'End') focus(list[list.length - 1])
    else return
    event.preventDefault()
  }, { signal })

  // A slot entered by Tab or a press has its character selected: the next one typed replaces it.
  root.addEventListener('focusin', (event) => {
    const slot = /** @type {HTMLInputElement} */ (event.target)
    if (slots().includes(slot)) slot.select()
  }, { signal })

  signal.addEventListener('abort', () => {
    if (attached.get(root) === controller) attached.delete(root)
    for (const [slot, length] of lengths) if (length !== null) slot.setAttribute('maxlength', length)
  })

  return /** @type {(() => void) & { value: string }} */ (detach)
}
