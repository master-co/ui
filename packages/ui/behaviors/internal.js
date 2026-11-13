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

/*
 * Values as chips. A field that collects several values, the tags field and a combobox with a
 * multiselectable list, shows each value as a chip in an input group with `input-group-wrap`, before the
 * text field. What follows is what the two share: the chip a value is written as, what a chip stands for,
 * and the keys that walk from the field to the chips and back.
 */

/**
 * The chips a field holds, in the order of the document.
 * @param {Element} group The input group, or anything that holds the chips and the field.
 * @returns {HTMLElement[]}
 */
export function chipsOf(group) {
  return /** @type {HTMLElement[]} */ ([...group.querySelectorAll('.chip')])
}

/**
 * What a chip stands for: its `data-value`, or what it says.
 * @param {Element} chip
 */
export function chipValue(chip) {
  return chip.getAttribute('data-value') ?? label(chip)
}

/**
 * A chip for a value, written with the contract's classes: the text, a hidden input that carries the value
 * into a form when there is a `name`, and a remove button out of the tab order, named with the value.
 * @param {Document} document
 * @param {{ value: string, text?: string, name?: string | null, removeLabel: (text: string) => string }} chip
 */
export function writeChip(document, { value, text = value, name, removeLabel }) {
  const chip = document.createElement('span')
  chip.className = 'chip'
  chip.setAttribute('data-value', value)
  chip.append(text)
  if (name) {
    const hidden = document.createElement('input')
    hidden.type = 'hidden'
    hidden.name = name
    hidden.value = value
    chip.append(hidden)
  }
  const remove = document.createElement('button')
  remove.type = 'button'
  remove.className = 'chip-remove'
  remove.tabIndex = -1
  remove.setAttribute('aria-label', removeLabel(text))
  chip.append(remove)
  return chip
}

/**
 * The name a new chip's hidden input takes: the name the chips already carry.
 * @param {Element} group
 */
export function chipName(group) {
  return group.querySelector('.chip input[type="hidden"][name]')?.getAttribute('name') ?? null
}

/**
 * Whether the caret stands at the start of a field with nothing selected, where the keys reach the chips.
 * @param {HTMLInputElement} field
 */
function atStart(field) {
  return field.selectionStart === 0 && field.selectionEnd === 0
}

/**
 * The keys between a field and the chips before it. The field is the one tab stop; a chip is reached with
 * Backspace or the arrow key that points at it, and its remove button takes focus. On a chip the arrows walk
 * the chips and back to the field, Backspace and Delete remove it, Escape and any letter return to the field.
 * Returns the listener to add, with the abort signal, to the element that holds the chips and the field.
 * @param {HTMLInputElement} field
 * @param {(chip: HTMLElement) => void} remove Removes a chip's value. Called only while the field is enabled.
 */
export function chipKeys(field, remove) {
  /** @param {KeyboardEvent} event */
  return (event) => {
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return
    const group = /** @type {HTMLElement} */ (event.currentTarget)
    const target = /** @type {HTMLElement} */ (event.target)
    const chips = chipsOf(group)
    const rtl = getComputedStyle(group).direction === 'rtl'
    const back = rtl ? 'ArrowRight' : 'ArrowLeft'
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight'
    /** @param {HTMLElement | undefined} chip */
    const focus = (chip) => {
      const button = /** @type {HTMLElement | null | undefined} */ (chip?.querySelector('.chip-remove'))
      if (button) button.focus()
      else field.focus()
    }

    if (target === field) {
      if (!chips.length || !atStart(field)) return
      if (event.key === back || (event.key === 'Backspace' && !field.value)) {
        event.preventDefault()
        focus(chips.at(-1))
      }
      return
    }

    const chip = /** @type {HTMLElement | null} */ (target.closest('.chip'))
    if (!chip || !target.matches('.chip-remove')) return
    const index = chips.indexOf(chip)
    switch (event.key) {
      case back:
        event.preventDefault()
        focus(chips[Math.max(0, index - 1)])
        break
      case forward:
        event.preventDefault()
        focus(chips[index + 1])
        break
      case 'Home':
        event.preventDefault()
        focus(chips[0])
        break
      case 'End':
      case 'Escape':
        event.preventDefault()
        field.focus()
        break
      case 'Backspace':
      case 'Delete': {
        event.preventDefault()
        if (field.disabled || field.readOnly) return
        // Backspace leaves focus on the chip before, Delete on the one after; with neither, the field.
        const next = event.key === 'Backspace' ? chips[index - 1] ?? chips[index + 1] : chips[index + 1]
        remove(chip)
        focus(next)
        break
      }
      default:
        // A letter typed on a chip is meant for the field: focus moves before the key is read.
        if (event.key.length === 1) field.focus()
    }
  }
}
