/**
 * Tags: a field that turns what is typed into values, each shown as a chip.
 *
 * The root is an input group with `input-group-wrap` and the `tags` class. It holds the chips, then one text
 * field, the element with `input-group-field`. Enter, and a delimiter (a comma by default), turn what the
 * field holds into a value: a chip is written before the field and the field is emptied. Pasted text with
 * delimiters, line breaks or tabs in it becomes as many values. A value that is empty, already there, past
 * `max` or refused by `validate` is not added: the field keeps the text and says `aria-invalid="true"` until
 * it changes.
 *
 * The field is the one tab stop. Backspace in an empty field, and the arrow key that points back, move focus
 * to the last chip's remove button; on a chip the arrows walk the chips, Backspace and Delete remove the
 * value and Escape returns to the field. A remove button removes its value on a click.
 *
 * A chip stands for its `data-value`, or for its text. A chip this script writes carries a hidden input with
 * the value when the chips already carry one with a `name`, or when `name` is given, so a form submits every
 * value; a form's reset puts back the values the field started with.
 *
 * The root dispatches `input` and `change` each time a value is added or removed. The function it returns
 * has a `value`: the values in order. Set it to replace them; that dispatches nothing.
 *
 * Chips may be written by something else, such as a framework that renders them from its own list. Give
 * `draw`, and the script writes no chip: it calls `draw` with the values to show, and its `value` is the
 * values it last drew, whether or not they are written yet.
 */
import { chipKeys, chipName, chipValue, chipsOf, valued, write, writeChip } from './internal.js'

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * @typedef {object} TagsOptions
 * @property {string[]} [delimiters] Keys that add the value as Enter does. `[',']` by default; `[]` leaves
 *   only Enter. Pasted text is split by them, by line breaks and by tabs.
 * @property {number} [max] How many values the field holds at most.
 * @property {(value: string) => boolean} [validate] Says whether a value may be added.
 * @property {string} [name] The name of the hidden input a new chip carries. The name the chips already
 *   carry by default; without either, a chip carries none.
 * @property {(text: string) => string} [removeLabel] The accessible name of a chip's remove button.
 *   `Remove <value>` by default.
 * @property {(values: string[]) => void} [draw] Takes over writing the chips: called with every value to
 *   show, in order, whenever they change.
 */

/**
 * @param {HTMLElement} root The input group with the `tags` class.
 * @param {TagsOptions} [options]
 * @returns {(() => void) & { value: string[] }} Removes everything the behavior added. Its `value` is the
 *   values, in order.
 */
export function tags(root, { delimiters = [','], max = Infinity, validate, name, removeLabel = (text) => `Remove ${text}`, draw } = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)

  const field = /** @type {HTMLInputElement | null} */ (root.querySelector('.input-group-field'))
  /** The values a renderer was last asked to draw: it may write them after this script has answered. */
  let drawn = chipsOf(root).map(chipValue)
  const values = () => (draw ? [...drawn] : chipsOf(root).map(chipValue))
  const document = root.ownerDocument
  const named = name ?? chipName(root)

  /** Write the chips for a list of values: the ones that stay are kept, the rest written or removed. */
  const show = (/** @type {string[]} */ next) => {
    if (draw) {
      drawn = [...next]
      return draw(next)
    }
    const kept = new Map(chipsOf(root).map((chip) => [chipValue(chip), chip]))
    for (const [value, chip] of kept) if (!next.includes(value)) chip.remove()
    for (const value of next) {
      const chip = kept.get(value) ?? writeChip(document, { value, name: named, removeLabel })
      if (field) field.before(chip)
      else root.append(chip)
    }
  }

  const detach = valued(
    () => controller.abort(),
    values,
    (next) => {
      const list = [...new Set((next ?? []).map(String))]
      if (list.join('\n') === values().join('\n')) return
      show(list)
    }
  )
  if (!field) return detach

  const initial = values()
  const announce = () => {
    root.dispatchEvent(new Event('input', { bubbles: true }))
    root.dispatchEvent(new Event('change', { bubbles: true }))
  }
  const refuse = () => field.setAttribute('aria-invalid', 'true')

  /**
   * Add what was typed, split into values. Returns whether every one of them was added.
   * @param {string[]} entries
   */
  const add = (entries) => {
    const current = values()
    /** @type {string[]} */
    const added = []
    let refused = false
    for (const entry of entries.map((each) => each.trim()).filter(Boolean)) {
      if (current.includes(entry) || added.includes(entry) || current.length + added.length >= max || (validate && !validate(entry))) {
        refused = true
        continue
      }
      added.push(entry)
    }
    if (added.length) {
      show([...current, ...added])
      announce()
    }
    return !refused
  }

  /** Turn the field's text into values: emptied when all of it was taken, kept and invalid when not. */
  const commit = () => {
    if (!field.value.trim()) {
      write(field, '')
      return
    }
    if (add([field.value])) write(field, '')
    else refuse()
  }

  /** @param {HTMLElement} chip */
  const remove = (chip) => {
    show(values().filter((value) => value !== chipValue(chip)))
    announce()
  }

  const walk = chipKeys(field, remove)
  root.addEventListener('keydown', (event) => {
    if (event.target === field && !event.isComposing && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (event.key === 'Enter' || delimiters.includes(event.key)) {
        // Enter in an empty field is left alone, so it still submits the form.
        if (event.key === 'Enter' && !field.value.trim()) return
        event.preventDefault()
        if (!field.readOnly) commit()
        return
      }
    }
    walk(event)
  }, { signal })

  field.addEventListener('input', () => field.removeAttribute('aria-invalid'), { signal })

  field.addEventListener('paste', (event) => {
    const text = event.clipboardData?.getData('text') ?? ''
    const splitter = new RegExp(`[\\n\\r\\t${delimiters.map((each) => each.replace(/[\\\]^-]/g, '\\$&')).join('')}]`)
    if (!splitter.test(text) || field.readOnly) return
    event.preventDefault()
    const parts = text.split(splitter)
    // What follows the last delimiter is still being typed: it stays in the field.
    const rest = /[\n\r\t]$/.test(text) || delimiters.some((each) => text.endsWith(each)) ? '' : (parts.pop() ?? '').trimStart()
    const whole = add([field.value, ...parts].filter((each) => each.trim()))
    write(field, rest)
    if (!whole) refuse()
  }, { signal })

  root.addEventListener('click', (event) => {
    const button = /** @type {Element} */ (event.target).closest('.chip-remove')
    const chip = button?.closest('.chip')
    if (!chip || !root.contains(chip) || field.disabled || field.readOnly) return
    remove(/** @type {HTMLElement} */ (chip))
    field.focus()
  }, { signal })

  // A press on the well itself, around the chips, puts the caret in the field.
  root.addEventListener('mousedown', (event) => {
    if (event.target !== root || field.disabled) return
    event.preventDefault()
    field.focus()
  }, { signal })

  field.form?.addEventListener('reset', () => {
    show(initial)
    field.removeAttribute('aria-invalid')
  }, { signal })

  return detach
}
