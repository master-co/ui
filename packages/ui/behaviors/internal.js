/**
 * What the listbox, combobox, command and menu behaviors share: which items the keys may land on, how the
 * active option of a listbox moves, how a list is filtered and how typed letters find an item. It is not a
 * behavior and exports none; copy it beside the behaviors that import it.
 */

/**
 * Whether the keys may land on an item: it is not hidden, by itself or by what holds it, and not disabled.
 * @param {Element} item
 */
export function enabled(item) {
  return !item.closest('[hidden]') && !(/** @type {HTMLButtonElement} */ (item).disabled) && item.getAttribute('aria-disabled') !== 'true'
}

/** @param {Element} popover An element with the popover attribute. */
export function isOpen(popover) {
  return popover.matches(':popover-open')
}

/**
 * The text an item is found by: what it says, on one line.
 * @param {Element} item
 */
export function label(item) {
  return (item.textContent ?? '').replace(/\s+/g, ' ').trim()
}

/**
 * The value an option stands for: its `data-value`, or what it says without the description under it and the
 * hint at its end.
 * @param {Element} option
 */
export function valueOf(option) {
  const own = option.getAttribute('data-value')
  if (own !== null) return own
  const copy = /** @type {Element} */ (option.cloneNode(true))
  for (const extra of copy.querySelectorAll('.listbox-description, .listbox-end')) extra.remove()
  return label(copy)
}

/**
 * Write a field's value so that whoever listens hears the `input` that follows. A framework may shadow
 * `value` on the element to notice its own writes, as React does, and then ignores an event for a value it
 * has already seen. The setter of the element's prototype goes under that shadow.
 * @param {HTMLInputElement | HTMLTextAreaElement} field
 * @param {string} value
 */
export function write(field, value) {
  const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value')?.set
  if (set) set.call(field, value)
  else field.value = value
}

/**
 * Give the function a behavior returns its `value`: what is chosen now, and a way to choose from outside.
 * Setting it marks the pattern and dispatches nothing, as setting the `value` of a native control does.
 * @template V
 * @param {() => void} detach
 * @param {() => V} get
 * @param {(value: V) => void} set
 * @returns {(() => void) & { value: V }}
 */
export function valued(detach, get, set) {
  return /** @type {(() => void) & { value: V }} */ (Object.defineProperty(detach, 'value', { get, set, enumerable: true }))
}

/**
 * The options of a listbox the keys may land on, in the order of the document.
 * @param {Element} list The element with `role="listbox"`.
 * @returns {HTMLElement[]}
 */
export function options(list) {
  return /** @type {HTMLElement[]} */ ([...list.querySelectorAll('[role="option"]')]).filter(enabled)
}

/**
 * The item a number of steps from another. Past an end it wraps to the other one, or stays at the end when
 * `wrap` is false. With nowhere to step from, a step forward gives the first item and a step back the last.
 * @template {Element} T
 * @param {T[]} items
 * @param {Element | null | undefined} from
 * @param {1 | -1} by
 * @returns {T | undefined}
 */
export function step(items, from, by, wrap = true) {
  const index = items.indexOf(/** @type {T} */ (from))
  if (index < 0) return by > 0 ? items[0] : items.at(-1)
  if (wrap) return items[(index + by + items.length) % items.length]
  return items[Math.min(items.length - 1, Math.max(0, index + by))]
}

let ids = 0

/**
 * Make one option the active one, the option the arrow keys are on: `aria-selected` on the option,
 * `aria-activedescendant` on the element that holds focus, and the option scrolled into view. An option
 * without an id is given one. With no option, the list has no active option.
 * @param {Element} owner The element that holds focus: the listbox itself, or the field that controls it.
 * @param {Element} list The element with `role="listbox"`.
 * @param {Element | null | undefined} option
 */
export function activate(owner, list, option) {
  for (const other of list.querySelectorAll('[role="option"][aria-selected="true"]')) {
    if (other !== option) other.removeAttribute('aria-selected')
  }
  if (!option) return owner.removeAttribute('aria-activedescendant')
  if (!option.id) option.id = `${list.id || 'listbox'}-option-${++ids}`
  option.setAttribute('aria-selected', 'true')
  owner.setAttribute('aria-activedescendant', option.id)
  option.scrollIntoView({ block: 'nearest' })
}

/**
 * Filter a listbox: set `hidden` on the options whose text does not hold the query, whatever its case. The
 * stylesheet then shows the empty state and hides a group with nothing left in it.
 * @param {Element} list The element with `role="listbox"`.
 * @param {string} query
 */
export function filter(list, query) {
  const text = query.trim().toLowerCase()
  for (const option of /** @type {NodeListOf<HTMLElement>} */ (list.querySelectorAll('[role="option"]'))) {
    option.hidden = !label(option).toLowerCase().includes(text)
  }
}

/**
 * Typeahead. The function it returns takes a keydown: a letter, a digit or a sign, never a space or a key
 * held with Control, Command or Alt. It prevents the key's default and gives the item the typed letters
 * lead to, or nothing. Letters typed within half a second of each other are read together; one letter
 * pressed again and again walks through the items that start with it.
 * @returns {<T extends Element>(event: KeyboardEvent, items: T[], current?: Element | null) => T | undefined}
 */
export function typeahead() {
  let typed = ''
  let last = 0
  return (event, items, current) => {
    // A key event without a key is what a browser sends when it fills a field in.
    if (event.key?.length !== 1 || event.key === ' ' || event.ctrlKey || event.metaKey || event.altKey) return undefined
    event.preventDefault()
    const now = Date.now()
    if (now - last > 500) typed = ''
    last = now
    typed += event.key.toLowerCase()
    const again = typed.length > 1 && [...typed].every((letter) => letter === typed[0])
    const text = again ? typed[0] : typed
    // The first letter and a repeated one look past the current item; more letters may stay on it.
    const start = Math.max(0, items.indexOf(/** @type {any} */ (current)) + (again || typed.length === 1 ? 1 : 0))
    return [...items.slice(start), ...items.slice(0, start)].find((item) => label(item).toLowerCase().startsWith(text))
  }
}
