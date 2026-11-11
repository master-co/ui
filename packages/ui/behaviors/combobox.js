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
 */
import { activate, enabled, filter, isOpen, label, options, step, valued, valueOf, write } from './internal.js'

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
 * @param {HTMLElement} root The element with the `combobox` class.
 * @param {{ filter?: boolean }} [options] `filter`: hide the options that do not hold what is typed. True by
 *   default; false when the page writes the matching options itself.
 * @returns {(() => void) & { value: string | null }} Removes everything the behavior added. Its `value` is
 *   what the chosen option stands for.
 */
export function combobox(root, { filter: filtering = true } = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)

  const field = /** @type {HTMLInputElement | null} */ (root.querySelector('[role="combobox"]'))
  const list = /** @type {HTMLElement | null} */ (root.querySelector('[role="listbox"]'))
  const toggle = root.querySelector('.combobox-toggle')
  const all = () => (list ? [...list.querySelectorAll('[role="option"]')] : [])
  const detach = valued(
    () => controller.abort(),
    () => {
      const chosen = list?.querySelector('[role="option"][aria-checked="true"]')
      return chosen ? valueOf(chosen) : null
    },
    (next) => {
      if (!field || !list) return
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

  /** @param {Element} option */
  const choose = (option) => {
    write(field, text(option))
    for (const other of all()) other.setAttribute('aria-checked', String(other === option))
    close()
    choosing = true
    field.dispatchEvent(new Event('input', { bubbles: true }))
    field.dispatchEvent(new Event('change', { bubbles: true }))
    choosing = false
  }

  field.addEventListener('input', () => {
    if (choosing) return
    if (filtering) filter(list, field.value)
    // Typing over a chosen value takes its check away: the field no longer holds it.
    const chosen = list.querySelector('[role="option"][aria-checked="true"]')
    if (chosen && text(chosen) !== field.value) chosen.setAttribute('aria-checked', 'false')
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
