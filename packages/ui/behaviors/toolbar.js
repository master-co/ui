/**
 * Toolbar: one tab stop for a row of controls, and toggle buttons that press.
 *
 * A toolbar is a single stop in the tab order; the arrow keys move between its controls. Where the browser
 * has `focusgroup`, give the toolbar `focusgroup="toolbar"` and the browser does that, and this script leaves
 * the keys to it. Elsewhere it keeps one control at `tabindex="0"` and the rest at `-1`: the one focused last,
 * so returning to the toolbar returns to it, or the first. ArrowRight and ArrowLeft move along a toolbar
 * (ArrowDown and ArrowUp in one with `aria-orientation="vertical"`), wrapping at the ends and following the
 * reading direction; Home and End go to the first and the last control. Disabled and hidden controls are
 * skipped; a control with `aria-disabled="true"` stays reachable, as it should in a toolbar.
 *
 * A native radio group counts as one control, its checked radio: the arrows leave it for the next control,
 * and Space chooses the focused radio. A select, a text field and a menu's list keep their own arrows.
 *
 * A button with `aria-pressed` presses on a click: `aria-pressed` turns from false to true and back. A button
 * with `aria-disabled="true"` does neither, and its click is stopped. Detaching gives every control back the
 * `tabindex` it had.
 */

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

const controls = 'button, select, input, textarea, a[href], [tabindex]'

/**
 * @param {HTMLElement} root The element with the `toolbar` class and `role="toolbar"`.
 * @returns {() => void} Removes everything the behavior added.
 */
export function toolbar(root) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)
  const detach = () => controller.abort()

  root.addEventListener('click', (event) => {
    const button = /** @type {Element} */ (event.target).closest('button, [role="button"]')
    if (!button || !root.contains(button)) return
    if (button.getAttribute('aria-disabled') === 'true') {
      event.preventDefault()
      event.stopImmediatePropagation()
      return
    }
    const pressed = button.getAttribute('aria-pressed')
    if (pressed === 'true' || pressed === 'false') button.setAttribute('aria-pressed', String(pressed !== 'true'))
  // Heard on the way down, so a click on a button with aria-disabled is stopped before its own listeners.
  }, { signal, capture: true })

  // The browser's focusgroup moves focus by itself; a second roving tabindex would fight it.
  if ('focusGroup' in HTMLElement.prototype && root.hasAttribute('focusgroup')) return detach

  /** The controls the keys land on, in the order of the document: one per radio group. */
  const items = () => {
    /** @type {HTMLElement[]} */
    const found = []
    const groups = new Set()
    for (const element of /** @type {NodeListOf<HTMLElement>} */ (root.querySelectorAll(controls))) {
      if (element.closest('[hidden], [popover], dialog') || /** @type {HTMLButtonElement} */ (element).disabled) continue
      if (element.matches('input[type="hidden"]')) continue
      const radio = /** @type {HTMLInputElement} */ (element)
      if (radio.type === 'radio' && radio.name) {
        if (groups.has(radio.name)) continue
        groups.add(radio.name)
        const all = /** @type {HTMLInputElement[]} */ ([...root.querySelectorAll(`input[type="radio"]`)]).filter((each) => each.name === radio.name && !each.disabled)
        found.push(all.find((each) => each.checked) ?? all[0] ?? radio)
        continue
      }
      found.push(element)
    }
    return found
  }

  /** @type {Map<HTMLElement, string | null>} Each control's `tabindex` before the script wrote one. */
  const original = new Map()
  /** @param {HTMLElement} control @param {boolean} on */
  const index = (control, on) => {
    if (!original.has(control)) original.set(control, control.getAttribute('tabindex'))
    const wanted = on ? '0' : '-1'
    if (control.getAttribute('tabindex') !== wanted) control.setAttribute('tabindex', wanted)
  }
  signal.addEventListener('abort', () => {
    for (const [control, value] of original) {
      if (value === null) control.removeAttribute('tabindex')
      else control.setAttribute('tabindex', value)
    }
  })

  /** Make one control the toolbar's tab stop. Radios of a group keep the platform's own tab stop. */
  const rove = (/** @type {HTMLElement | undefined} */ to) => {
    const list = items()
    const stop = to && list.includes(to) ? to : list[0]
    for (const item of list) {
      if (item.matches('input[type="radio"]')) {
        const name = /** @type {HTMLInputElement} */ (item).name
        for (const radio of /** @type {NodeListOf<HTMLInputElement>} */ (root.querySelectorAll('input[type="radio"]'))) {
          if (radio.name === name) index(radio, item === stop)
        }
      } else index(item, item === stop)
    }
  }

  /** The control an element belongs to: a radio stands for its group. */
  const itemOf = (/** @type {Element} */ element) => {
    const list = items()
    const radio = /** @type {HTMLInputElement} */ (element)
    if (radio.matches?.('input[type="radio"]')) return list.find((item) => /** @type {HTMLInputElement} */ (item).name === radio.name)
    return list.find((item) => item === element)
  }

  root.addEventListener('focusin', (event) => {
    const item = itemOf(/** @type {Element} */ (event.target))
    if (item) rove(item)
  }, { signal })

  root.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return
    const target = /** @type {HTMLElement} */ (event.target)
    // Fields and lists keep their own keys.
    if (target.matches('select, textarea, input:not([type="radio"], [type="checkbox"], [type="button"], [type="submit"], [type="reset"])')) return
    if (target.closest('[popover], dialog, [role="menu"], [role="listbox"]') && target.closest('[popover], dialog, [role="menu"], [role="listbox"]') !== root) return
    const vertical = root.getAttribute('aria-orientation') === 'vertical'
    const rtl = getComputedStyle(root).direction === 'rtl'
    const steps = vertical
      ? /** @type {Record<string, number>} */ ({ ArrowDown: 1, ArrowUp: -1 })
      : /** @type {Record<string, number>} */ ({ ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 })
    const list = items()
    const current = itemOf(target)
    if (!current) return
    let to
    if (event.key in steps) {
      const index = list.indexOf(current)
      to = list[(index + steps[event.key] + list.length) % list.length]
    } else if (event.key === 'Home') to = list[0]
    else if (event.key === 'End') to = list.at(-1)
    else return
    event.preventDefault()
    to?.focus()
  }, { signal })

  rove(items().find((item) => item.tabIndex === 0) ?? undefined)
  return detach
}
