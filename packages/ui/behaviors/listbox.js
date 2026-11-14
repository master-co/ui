/**
 * Listbox: a list of options that stands in the page and holds focus itself.
 *
 * The stylesheet draws two states and this script moves them. The active option, the one the keys are on,
 * has `aria-selected="true"` and is named by `aria-activedescendant` on the listbox; focus never leaves
 * the listbox. A chosen option has `aria-checked="true"`: one of them, or any number of them when the
 * listbox has `aria-multiselectable="true"`. Disabled and hidden options are skipped.
 *
 * In a multiselectable list the keys also choose a run of options, as a file list does. The option chosen
 * last is the anchor: Shift with an arrow key moves and checks every option from the anchor to the new
 * active one, Shift with Space or a Shift-click checks the run up to the option, Control or Command with
 * Shift and Home or End checks up to the first or the last, and Control or Command with A checks every
 * option, or unchecks them all when they are all checked already.
 *
 * The listbox dispatches `input` and `change` each time what is chosen changes. The function the behavior
 * returns has a `value`: what the chosen option stands for, its `data-value` or its text, null when none is
 * chosen, and a list of them when the listbox is multiselectable. Set it to choose from outside; that
 * dispatches nothing.
 *
 * A listbox that a text field controls, in a combobox or a command palette, is driven from that field by
 * the behavior of the same name; this one leaves it alone.
 */
import { activate, enabled, options, step, typeahead, valued, valueOf } from './internal.js'

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * @param {HTMLElement} root The element with the `listbox` class and `role="listbox"`, focusable with `tabindex="0"`.
 * @returns {(() => void) & { value: string | string[] | null }} Removes everything the behavior added. Its
 *   `value` is what is chosen.
 */
export function listbox(root) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)
  const all = () => [...root.querySelectorAll('[role="option"]')]
  const multiple = () => root.getAttribute('aria-multiselectable') === 'true'
  const detach = valued(
    () => controller.abort(),
    () => {
      const chosen = all().filter((option) => option.getAttribute('aria-checked') === 'true').map(valueOf)
      return multiple() ? chosen : chosen[0] ?? null
    },
    (next) => {
      const values = [next].flat()
      for (const option of all()) option.setAttribute('aria-checked', String(values.includes(valueOf(option))))
    }
  )

  // A listbox that a field with role="combobox" controls belongs to that field's behavior.
  const fields = root.id ? [...root.ownerDocument.querySelectorAll('[role="combobox"][aria-controls]')] : []
  if (fields.some((field) => (field.getAttribute('aria-controls') ?? '').split(/\s+/).includes(root.id))) return detach

  const seek = typeahead()
  const active = () => root.querySelector('[role="option"][aria-selected="true"]')
  /** @type {Element | null} The option a run starts from: the one chosen last. */
  let anchor = null

  /**
   * Check every option from the anchor to an option, both included, and leave the others as they are.
   * Dispatches only when something was not checked before.
   * @param {Element} to
   */
  function run(to) {
    const items = options(root)
    const from = anchor && items.includes(/** @type {HTMLElement} */ (anchor)) ? items.indexOf(/** @type {HTMLElement} */ (anchor)) : items.indexOf(/** @type {HTMLElement} */ (to))
    const end = items.indexOf(/** @type {HTMLElement} */ (to))
    if (end < 0) return
    let changed = false
    for (const option of items.slice(Math.min(from, end), Math.max(from, end) + 1)) {
      if (option.getAttribute('aria-checked') === 'true') continue
      option.setAttribute('aria-checked', 'true')
      changed = true
    }
    if (!anchor) anchor = to
    if (!changed) return
    root.dispatchEvent(new Event('input', { bubbles: true }))
    root.dispatchEvent(new Event('change', { bubbles: true }))
  }

  /** Check every option, or uncheck them all when every one is checked already. */
  function every() {
    const items = options(root)
    const all = items.every((option) => option.getAttribute('aria-checked') === 'true')
    for (const option of items) option.setAttribute('aria-checked', String(!all))
    if (!items.length) return
    root.dispatchEvent(new Event('input', { bubbles: true }))
    root.dispatchEvent(new Event('change', { bubbles: true }))
  }

  /**
   * Choose an option. In a list of one choice it takes the check from the others; in a multiselectable list
   * it is checked or unchecked by itself.
   * @param {Element} option
   */
  function choose(option) {
    anchor = option
    if (multiple()) {
      option.setAttribute('aria-checked', String(option.getAttribute('aria-checked') !== 'true'))
    } else {
      if (option.getAttribute('aria-checked') === 'true') return
      for (const other of all()) other.setAttribute('aria-checked', String(other === option))
    }
    root.dispatchEvent(new Event('input', { bubbles: true }))
    root.dispatchEvent(new Event('change', { bubbles: true }))
  }

  // A press gives the list focus before it becomes a click. An option made active then is scrolled into view,
  // which may move the page under the pointer, and the click lands somewhere else: the press waits for it.
  // A press may end outside the list, dragged off it; the document hears where it ends, or the next focus
  // from the keyboard would be taken for one a press brought.
  let pressed = false
  root.addEventListener('pointerdown', () => { pressed = true }, { signal })
  root.addEventListener('click', () => { pressed = false }, { signal })
  for (const type of ['pointerup', 'pointercancel']) root.ownerDocument.addEventListener(type, () => { pressed = false }, { signal })

  // Focus arrives on a list with no active option: the keys start from what is chosen, or from the first option.
  root.addEventListener('focus', () => {
    if (active() || pressed) return
    const items = options(root)
    activate(root, root, items.find((option) => option.getAttribute('aria-checked') === 'true') ?? items[0])
  }, { signal })

  root.addEventListener('keydown', (event) => {
    if (event.altKey) return
    const items = options(root)
    const current = active()
    const command = event.ctrlKey || event.metaKey
    if (multiple() && event.shiftKey) {
      /** @type {Element | undefined} */
      let to
      if (event.key === 'ArrowDown' && !command) to = step(items, current, 1, false)
      else if (event.key === 'ArrowUp' && !command) to = step(items, current, -1, false)
      else if (event.key === 'Home' && command) to = items[0]
      else if (event.key === 'End' && command) to = items.at(-1)
      else if (event.key === ' ' && !command) to = current && enabled(current) ? current : undefined
      if (to) {
        event.preventDefault()
        // A run that starts here starts from the option the keys were on.
        if (!anchor && current) anchor = current
        activate(root, root, to)
        run(to)
        return
      }
    }
    if (multiple() && command && !event.shiftKey && event.key.toLowerCase() === 'a') {
      event.preventDefault()
      every()
      return
    }
    if (command) return
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
    if (multiple() && event.shiftKey) run(option)
    else choose(option)
  }, { signal })

  return detach
}
