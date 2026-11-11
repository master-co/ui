/**
 * Listbox: a list of options that stands in the page and holds focus itself.
 *
 * The stylesheet draws two states and this script moves them. The active option, the one the keys are on,
 * has `aria-selected="true"` and is named by `aria-activedescendant` on the listbox; focus never leaves
 * the listbox. A chosen option has `aria-checked="true"`: one of them, or any number of them when the
 * listbox has `aria-multiselectable="true"`. Disabled and hidden options are skipped.
 *
 * The listbox dispatches `input` and `change` each time what is chosen changes.
 *
 * A listbox that a text field controls, in a combobox or a command palette, is driven from that field by
 * the behavior of the same name; this one leaves it alone.
 */
import { activate, enabled, options, step, typeahead } from './internal.js'

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * @param {HTMLElement} root The element with the `listbox` class and `role="listbox"`, focusable with `tabindex="0"`.
 * @returns {() => void} Removes everything the behavior added.
 */
export function listbox(root) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)
  const detach = () => controller.abort()

  // A listbox that a field with role="combobox" controls belongs to that field's behavior.
  const fields = root.id ? [...root.ownerDocument.querySelectorAll('[role="combobox"][aria-controls]')] : []
  if (fields.some((field) => (field.getAttribute('aria-controls') ?? '').split(/\s+/).includes(root.id))) return detach

  const seek = typeahead()
  const all = () => [...root.querySelectorAll('[role="option"]')]
  const active = () => root.querySelector('[role="option"][aria-selected="true"]')
  const multiple = () => root.getAttribute('aria-multiselectable') === 'true'

  /**
   * Choose an option. In a list of one choice it takes the check from the others; in a multiselectable list
   * it is checked or unchecked by itself.
   * @param {Element} option
   */
  function choose(option) {
    if (multiple()) {
      option.setAttribute('aria-checked', String(option.getAttribute('aria-checked') !== 'true'))
    } else {
      if (option.getAttribute('aria-checked') === 'true') return
      for (const other of all()) other.setAttribute('aria-checked', String(other === option))
    }
    root.dispatchEvent(new Event('input', { bubbles: true }))
    root.dispatchEvent(new Event('change', { bubbles: true }))
  }

  // Focus arrives on a list with no active option: the keys start from what is chosen, or from the first option.
  root.addEventListener('focus', () => {
    if (active()) return
    const items = options(root)
    activate(root, root, items.find((option) => option.getAttribute('aria-checked') === 'true') ?? items[0])
  }, { signal })

  root.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    const items = options(root)
    const current = active()
    let to
    switch (event.key) {
      case 'ArrowDown': to = step(items, current, 1, false); break
      case 'ArrowUp': to = step(items, current, -1, false); break
      case 'Home': to = items[0]; break
      case 'End': to = items.at(-1); break
      case 'Enter':
      case ' ':
        if (!current || !enabled(current)) return
        event.preventDefault()
        choose(current)
        return
      default:
        to = seek(event, items, current)
        if (to) activate(root, root, to)
        return
    }
    event.preventDefault()
    if (to) activate(root, root, to)
  }, { signal })

  root.addEventListener('click', (event) => {
    const option = /** @type {Element} */ (event.target).closest('[role="option"]')
    if (!option || !root.contains(option) || !enabled(option)) return
    activate(root, root, option)
    choose(option)
  }, { signal })

  return detach
}
