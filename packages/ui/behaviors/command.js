/**
 * Command palette: a dialog that is one search field over a listbox of commands.
 *
 * The dialog is native: a button with `command="show-modal"` opens it, and the browser supplies the scrim,
 * the focus trap and Esc. This script adds what a palette has beyond a dialog. Typing in the
 * `command-input` sets `hidden` on the options that do not match and makes the first match the active one;
 * the stylesheet hides a group with nothing left in it and shows the empty state. The arrow keys move the
 * active option, `aria-selected="true"` on the option and `aria-activedescendant` on the field. Enter
 * clicks the active option, so a link navigates and a listener on the option runs, and a click on an option,
 * from Enter or the pointer, closes the palette. A shortcut, Command or Control with K, opens the palette
 * from anywhere and closes it again.
 */
import { activate, enabled, filter, options, step } from './internal.js'

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * @param {HTMLDialogElement} root The dialog with the `command` class.
 * @param {{ shortcut?: string | false }} [options] `shortcut`: the key that, with Command or Control, opens and
 *   closes the palette. `'k'` by default; `false` for none.
 * @returns {() => void} Removes everything the behavior added.
 */
export function command(root, { shortcut = 'k' } = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)
  const detach = () => controller.abort()

  const field = /** @type {HTMLInputElement | null} */ (root.querySelector('.command-input'))
  const list = root.querySelector('.command-list')
  if (!field || !list) return detach

  const active = () => /** @type {HTMLElement | null} */ (list.querySelector('[role="option"][aria-selected="true"]'))

  // An option the markup already marks active is announced from the start, not after the first key.
  if (active() && enabled(/** @type {Element} */ (active()))) activate(field, list, /** @type {HTMLElement} */ (active()))

  field.addEventListener('input', () => {
    filter(list, field.value)
    activate(field, list, options(list)[0])
  }, { signal })

  field.addEventListener('keydown', (event) => {
    // While an input method composes, Enter and the arrows belong to it.
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return
    const items = options(list)
    const current = active()
    let to
    switch (event.key) {
      case 'ArrowDown': to = step(items, current, 1); break
      case 'ArrowUp': to = step(items, current, -1); break
      // With Shift held, Home and End stay the field's own: they select its text.
      case 'Home': if (event.shiftKey) return; to = items[0]; break
      case 'End': if (event.shiftKey) return; to = items.at(-1); break
      case 'Enter':
        if (!current || !items.includes(current)) return
        event.preventDefault()
        current.click()
        return
      default: return
    }
    event.preventDefault()
    activate(field, list, to)
  }, { signal })

  // A command has run once its option is clicked, by Enter or by the pointer: the palette closes.
  list.addEventListener('click', (event) => {
    const option = /** @type {Element} */ (event.target).closest('[role="option"]')
    if (option && enabled(option)) root.close()
  }, { signal })

  if (shortcut) {
    root.ownerDocument.addEventListener('keydown', (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return
      if (event.key?.toLowerCase() !== shortcut.toLowerCase()) return
      event.preventDefault()
      if (root.open) root.close()
      else root.showModal()
    }, { signal })
  }

  // The palette opens with an active option, so Enter has something to run.
  const marked = active()
  if (!marked || !options(list).includes(marked)) activate(field, list, options(list)[0])
  return detach
}
