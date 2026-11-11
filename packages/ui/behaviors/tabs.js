/**
 * Tabs: one tab stop for a tablist, and the panel of the selected tab.
 *
 * As links in a `nav`, tabs need no script: each one is a page. A `role="tablist"` of `role="tab"` buttons
 * switches panels on the page, and this script gives it the keys of the Authoring Practices tabs. The
 * selected tab has `aria-selected="true"` and is the one tab in the tab order; the arrow keys, Home and End
 * move focus to another tab and select it, skipping disabled ones and wrapping at the ends. A tab names its
 * panel in `aria-controls`: the panel of the selected tab is shown and the others get `hidden`.
 *
 * A tablist with `aria-orientation="vertical"` is walked with the up and down arrows instead.
 *
 * Selecting a tab dispatches a bubbling `change` CustomEvent from the tablist with `detail.value`, what the
 * tab stands for, its `data-value` or its text, and the tab in `detail.tab`. The function the behavior
 * returns has that `value` too; set it to select a tab from outside, which dispatches nothing.
 */

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * @param {HTMLElement} root The element with the `tabs` class and `role="tablist"`.
 * @returns {(() => void) & { value: string | null }} Removes the listeners and gives every tab back the
 *   `tabindex` it had. Its `value` is what the selected tab stands for.
 */
export function tabs(root) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)

  /** The tabs of this tablist, not those of a tablist inside one of its panels. */
  const all = () => /** @type {HTMLElement[]} */ ([...root.querySelectorAll('[role="tab"]')]).filter((tab) => tab.closest('[role="tablist"]') === root)
  /** @param {Element} tab */
  const enabled = (tab) => !tab.closest('[hidden]') && !(/** @type {HTMLButtonElement} */ (tab).disabled) && tab.getAttribute('aria-disabled') !== 'true'
  /** @param {Element} tab */
  const valueOf = (tab) => tab.getAttribute('data-value') ?? (tab.textContent ?? '').replace(/\s+/g, ' ').trim()
  const selected = () => all().find((tab) => tab.getAttribute('aria-selected') === 'true')
  /** @param {Element} tab */
  const panel = (tab) => {
    const id = tab.getAttribute('aria-controls')
    return id ? root.ownerDocument.getElementById(id) : null
  }

  /** @type {Map<HTMLElement, string | null>} Each tab's `tabindex` before the script wrote one. */
  const original = new Map()

  /**
   * Mark one tab selected: the tab in the tab order, with its panel shown and the others hidden.
   * @param {HTMLElement | undefined} chosen
   */
  function mark(chosen) {
    for (const tab of all()) {
      if (!original.has(tab)) original.set(tab, tab.getAttribute('tabindex'))
      const on = tab === chosen
      if (tab.getAttribute('aria-selected') !== String(on)) tab.setAttribute('aria-selected', String(on))
      if (tab.getAttribute('tabindex') !== (on ? '0' : '-1')) tab.setAttribute('tabindex', on ? '0' : '-1')
      const shown = panel(tab)
      if (shown && shown.hidden === on) shown.hidden = !on
    }
  }

  /** @param {HTMLElement} tab */
  function select(tab) {
    if (tab.getAttribute('aria-selected') === 'true') return
    mark(tab)
    root.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value: valueOf(tab), tab } }))
  }

  const detach = /** @type {(() => void) & { value: string | null }} */ (Object.defineProperty(() => controller.abort(), 'value', {
    enumerable: true,
    get: () => {
      const tab = selected()
      return tab ? valueOf(tab) : null
    },
    set: (/** @type {string | null} */ next) => {
      const tab = all().find((each) => valueOf(each) === next)
      if (tab) mark(tab)
    }
  }))

  root.addEventListener('keydown', (event) => {
    const current = /** @type {HTMLElement} */ (event.target)
    const list = all().filter(enabled)
    if (!all().includes(current) || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
    const vertical = root.getAttribute('aria-orientation') === 'vertical'
    const rtl = getComputedStyle(root).direction === 'rtl'
    const before = vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft'
    const after = vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight'
    const at = list.indexOf(current)
    let to
    if (event.key === before) to = list[(at - 1 + list.length) % list.length] ?? list.at(-1)
    else if (event.key === after) to = list[(at + 1) % list.length]
    else if (event.key === 'Home') to = list[0]
    else if (event.key === 'End') to = list.at(-1)
    else return
    event.preventDefault()
    if (!to) return
    select(to)
    to.focus()
  }, { signal })

  root.addEventListener('click', (event) => {
    const tab = /** @type {HTMLElement | null} */ (/** @type {Element} */ (event.target).closest('[role="tab"]'))
    if (tab && all().includes(tab) && enabled(tab)) select(tab)
  }, { signal })

  signal.addEventListener('abort', () => {
    if (attached.get(root) === controller) attached.delete(root)
    for (const [tab, index] of original) {
      if (index === null) tab.removeAttribute('tabindex')
      else tab.setAttribute('tabindex', index)
    }
  })

  // The tablist starts at the tab the markup selects, or at the first one that can be.
  mark(selected() ?? all().find(enabled))
  return detach
}
