/**
 * Combobox: a text field that opens a listbox of matches.
 *
 * Focus stays in the field, the element with `role="combobox"`. Typing sets `hidden` on the options that do
 * not match, opens the list and makes the first match the active option; the stylesheet shows the empty
 * state by itself. The active option has `aria-selected="true"` and is named by `aria-activedescendant` on
 * the field. Choosing an option, with Enter or the pointer, writes its text into the field, marks it
 * `aria-checked="true"` and closes the list. The list is a `popover="manual"`: this script opens and closes
 * it and keeps the field's `aria-expanded` in step.
 *
 * The field dispatches `input` and `change` when an option is chosen, as it does for typing.
 *
 * The function it returns has a `value`: what the chosen option stands for, its `data-value` or its text,
 * and null while the field holds text that no option was chosen for. Set it to choose an option from
 * outside; that writes the option's text into the field and dispatches nothing.
 *
 * With `filter: false` the script hides nothing: the page, or a server, decides which options the list
 * holds, and writes them while the reader types. Options that arrive while the list is open get an active
 * option again.
 *
 * A list with `aria-multiselectable="true"` holds several values. The field is then an input group with
 * `input-group-wrap`, and each chosen option is a chip before the field. Choosing checks or unchecks an
 * option, empties the field and keeps the list open, so the next value is a few keys away. The field is the
 * one tab stop: Backspace in an empty field reaches the last chip, and the keys on a chip are those of the
 * tags field. Removing a chip unchecks its option. The `value` is then the list of chosen values, in the
 * order they were chosen. A chip this script writes carries a hidden input with the value when the chips
 * already carry one with a `name`, or when `name` is given; with `draw`, the page writes the chips itself.
 */
import { activate, chipKeys, chipName, chipValue, chipsOf, enabled, filter, isOpen, label, options, step, valued, valueOf, write, writeChip } from './internal.js'

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * What an option writes into the field: its text, without the description under it and the hint at its end.
 * @param {Element} option
 */
function text(option) {
  const copy = /** @type {Element} */ (option.cloneNode(true))
  for (const extra of copy.querySelectorAll('.listbox-description, .listbox-end')) extra.remove()
  return label(copy)
}

/**
 * @typedef {object} ComboboxOptions
 * @property {boolean} [filter] Hide the options that do not hold what is typed. True by default; false when
 *   the page writes the matching options itself.
 * @property {string} [name] With several values: the name of the hidden input a new chip carries. The name
 *   the chips already carry by default.
 * @property {(text: string) => string} [removeLabel] With several values: the accessible name of a chip's
 *   remove button. `Remove <value>` by default.
 * @property {(values: string[]) => void} [draw] With several values: takes over writing the chips, called
 *   with the chosen values whenever they change.
 */

/**
 * @param {HTMLElement} root The element with the `combobox` class.
 * @param {ComboboxOptions} [options]
 * @returns {(() => void) & { value: string | string[] | null }} Removes everything the behavior added. Its
 *   `value` is what the chosen option stands for, or the list of them when the list is multiselectable.
 */
export function combobox(root, { filter: filtering = true, name, removeLabel = (text) => `Remove ${text}`, draw } = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)

  const field = /** @type {HTMLInputElement | null} */ (root.querySelector('[role="combobox"]'))
  const list = /** @type {HTMLElement | null} */ (root.querySelector('[role="listbox"]'))
  const toggle = root.querySelector('.combobox-toggle')
  const all = () => (list ? [...list.querySelectorAll('[role="option"]')] : [])
  const multiple = () => list?.getAttribute('aria-multiselectable') === 'true'
  const group = field?.closest('.input-group') ?? root
  const named = name ?? chipName(group)

  /**
   * The chosen values, in the order they were chosen: the chips' order when the script attaches, then each
   * value as it is chosen. A checked option it has not seen chosen comes last, in the order of the list.
   */
  let order = chipsOf(group).map(chipValue)
  const chosen = () => {
    const checked = all().filter((option) => option.getAttribute('aria-checked') === 'true').map(valueOf)
    const known = order.filter((value) => checked.includes(value))
    return [...known, ...checked.filter((value) => !known.includes(value))]
  }

  /** Write the chips for the chosen values: the ones that stay are kept, the rest written or removed. */
  const chips = (/** @type {string[]} */ next = chosen()) => {
    order = [...next]
    if (!multiple() || !field) return
    if (draw) return draw(next)
    const kept = new Map(chipsOf(group).map((chip) => [chipValue(chip), chip]))
    for (const [value, chip] of kept) if (!next.includes(value)) chip.remove()
    for (const value of next) {
      const option = all().find((each) => valueOf(each) === value)
      const chip = kept.get(value) ?? writeChip(root.ownerDocument, { value, text: option ? text(option) : value, name: named, removeLabel })
      field.before(chip)
    }
  }

  const detach = valued(
    () => controller.abort(),
    () => {
      if (multiple()) return chosen()
      const checked = list?.querySelector('[role="option"][aria-checked="true"]')
      return checked ? valueOf(checked) : null
    },
    (next) => {
      if (!field || !list) return
      if (multiple()) {
        const values = [next ?? []].flat().map(String)
        for (const option of all()) option.setAttribute('aria-checked', String(values.includes(valueOf(option))))
        chips(values.filter((value) => all().some((option) => valueOf(option) === value)))
        return
      }
      const option = next === null || next === undefined ? undefined : all().find((each) => valueOf(each) === next)
      for (const other of all()) other.setAttribute('aria-checked', String(other === option))
      if (option) field.value = text(option)
      else if (next === null || next === undefined) field.value = ''
    }
  )
  if (!field || !list) return detach

  const active = () => list.querySelector('[role="option"][aria-selected="true"]')
  /** True while the field hears the `input` this script dispatches, which is not typing. */
  let choosing = false
  /** True once typing has asked for an active option, until the list closes. */
  let seeking = false

  /** Keep `aria-expanded` in step with the popover. A closed list has no active option. */
  const sync = () => {
    field.setAttribute('aria-expanded', String(isOpen(list)))
    if (!isOpen(list)) {
      activate(field, list, null)
      seeking = false
    }
  }

  const open = () => {
    if (field.disabled) return
    if (!isOpen(list)) list.showPopover()
    sync()
  }

  const close = () => {
    if (isOpen(list)) list.hidePopover()
    sync()
  }

  const announce = () => {
    choosing = true
    field.dispatchEvent(new Event('input', { bubbles: true }))
    field.dispatchEvent(new Event('change', { bubbles: true }))
    choosing = false
  }

  /** @param {Element} option */
  const choose = (option) => {
    if (multiple()) {
      const next = chosen().filter((value) => value !== valueOf(option))
      const checking = option.getAttribute('aria-checked') !== 'true'
      option.setAttribute('aria-checked', String(checking))
      chips(checking ? [...next, valueOf(option)] : next)
      // The field starts the next search; the list stays open on the option just chosen.
      write(field, '')
      if (filtering) filter(list, '')
      announce()
      return
    }
    write(field, text(option))
    for (const other of all()) other.setAttribute('aria-checked', String(other === option))
    close()
    announce()
  }

  /** Remove a chip's value: its option is unchecked. */
  const unchoose = (/** @type {HTMLElement} */ chip) => {
    const value = chipValue(chip)
    for (const option of all()) if (valueOf(option) === value) option.setAttribute('aria-checked', 'false')
    chips(chosen().filter((each) => each !== value))
    announce()
  }

  field.addEventListener('input', () => {
    if (choosing) return
    if (filtering) filter(list, field.value)
    // Typing over a chosen value takes its check away: the field no longer holds it. With several values the
    // field only searches, and the chips keep what is chosen.
    const checked = multiple() ? null : list.querySelector('[role="option"][aria-checked="true"]')
    if (checked && text(checked) !== field.value) checked.setAttribute('aria-checked', 'false')
    open()
    seeking = true
    activate(field, list, options(list)[0])
  }, { signal })

  // Options written after the typing that asked for them, by a framework or from a server, find the list
  // open with no active option, or with one that has left: the first of them becomes it.
  if (typeof MutationObserver === 'function') {
    const observer = new MutationObserver(() => {
      const current = active()
      if (seeking && isOpen(list) && !(current && enabled(current))) activate(field, list, options(list)[0])
    })
    observer.observe(list, { childList: true, subtree: true })
    signal.addEventListener('abort', () => observer.disconnect())
  }

  field.addEventListener('keydown', (event) => {
    // While an input method composes, Enter and the arrows belong to it.
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return
    const expanded = isOpen(list)
    const current = active()
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault()
        open()
        activate(field, list, step(options(list), current, event.key === 'ArrowDown' ? 1 : -1))
        break
      // With the list closed, and with Shift held, Home and End stay the field's own: they move the caret.
      case 'Home':
      case 'End':
        if (!expanded || event.shiftKey) return
        event.preventDefault()
        activate(field, list, event.key === 'Home' ? options(list)[0] : options(list).at(-1))
        break
      // Without an active option Enter is left alone, so it still submits a form.
      case 'Enter':
        if (!expanded || !current || !enabled(current)) return
        event.preventDefault()
        choose(current)
        break
      // Prevented while the list is open, so a dialog around the field stays open.
      case 'Escape':
        if (!expanded) return
        event.preventDefault()
        close()
        break
    }
  }, { signal })

  field.addEventListener('click', open, { signal })

  // With several values, the chips before the field: the keys between them, and their remove buttons.
  const walk = chipKeys(field, unchoose)
  group.addEventListener('keydown', (event) => { if (multiple()) walk(/** @type {KeyboardEvent} */ (event)) }, { signal })
  group.addEventListener('click', (event) => {
    const chip = /** @type {Element} */ (event.target).closest('.chip-remove')?.closest('.chip')
    if (!chip || !multiple() || field.disabled || field.readOnly) return
    unchoose(/** @type {HTMLElement} */ (chip))
    field.focus()
  }, { signal })

  // The list closes when focus leaves the field for something outside the combobox.
  root.addEventListener('focusout', (event) => {
    if (!root.contains(/** @type {Node | null} */ (event.relatedTarget))) close()
  }, { signal })

  // Something else may close the popover: the field says what is true.
  list.addEventListener('toggle', sync, { signal })

  // The pointer works the list and the toggle while the caret stays in the field.
  list.addEventListener('mousedown', (event) => event.preventDefault(), { signal })
  toggle?.addEventListener('mousedown', (event) => event.preventDefault(), { signal })

  list.addEventListener('click', (event) => {
    const option = /** @type {Element} */ (event.target).closest('[role="option"]')
    if (option && enabled(option)) choose(option)
  }, { signal })

  toggle?.addEventListener('click', () => {
    if (isOpen(list)) close()
    else open()
    field.focus()
  }, { signal })

  sync()
  return detach
}
