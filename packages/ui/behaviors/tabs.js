/**
 * Tabs: one tab stop for a tablist, and the panel of the selected tab.
 *
 * As links in a `nav`, tabs need no script: each one is a page. A `role="tablist"` of `role="tab"` buttons
 * switches panels on the page, and this script gives it the keys of the Authoring Practices tabs. The
 * selected tab has `aria-selected="true"` and is the one tab in the tab order; the arrow keys, Home and End
 * move focus to another tab and select it, skipping disabled ones and wrapping at the ends. A tab names its
 * panel in `aria-controls`: the panel of the selected tab is shown and the others get `hidden`.
 * With `searchable`, a browser that supports `beforematch` can reveal an inactive panel for Find in Page
 * or a fragment link. A reveal selects the matching tab through the same path as a click.
 *
 * A tablist with `aria-orientation="vertical"` is walked with the up and down arrows instead.
 *
 * Selecting another tab dispatches a bubbling `input` and then a `change` CustomEvent from the tablist, each
 * with `detail.value`, what the tab stands for, its `data-value` or its text, and the tab in `detail.tab`. The
 * function the behavior returns has that `value` too; set it to select a tab from outside, which dispatches
 * nothing.
 */

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * @param {HTMLElement} root The element with the `tabs` class and `role="tablist"`.
 * @param {{ searchable?: boolean }} [options] Let the browser find and reveal text in inactive panels.
 * @returns {(() => void) & { value: string | null }} Removes the listeners and gives every tab back the
 *   `tabindex` it had. Its `value` is what the selected tab stands for.
 */
export function tabs(root, { searchable = false } = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)
  const document = root.ownerDocument
  const tree = root.getRootNode()
  const scope = /** @type {Document | ShadowRoot} */ ('getElementById' in tree ? tree : document)
  const findable = searchable && 'onbeforematch' in document.documentElement

  /** The tabs of this tablist, not those of a tablist inside one of its panels. */
  const all = () => /** @type {HTMLElement[]} */ ([...root.querySelectorAll('[role="tab"]')]).filter((tab) => tab.closest('[role="tablist"]') === root)
  /** @param {Element} tab */
  const available = (tab) => !tab.hasAttribute('hidden') && !(/** @type {HTMLButtonElement} */ (tab).disabled) && tab.getAttribute('aria-disabled') !== 'true'
  /** @param {Element} tab */
  const enabled = (tab) => available(tab) && !tab.parentElement?.closest('[hidden]')
  /** @param {Element} tab */
  const valueOf = (tab) => tab.getAttribute('data-value') ?? (tab.textContent ?? '').replace(/\s+/g, ' ').trim()
  const selected = () => all().find((tab) => tab.getAttribute('aria-selected') === 'true')
  /** @param {Element} tab */
  const panel = (tab) => {
    const id = tab.getAttribute('aria-controls')
    return id ? scope.getElementById(id) : null
  }

  /** @type {Map<HTMLElement, string | null>} Each tab's `tabindex` before the script wrote one. */
  const original = new Map()
  /** @type {Map<HTMLElement, string | null>} A browser can still expose the empty box of an until-found panel. */
  const panelVisibility = new Map()
  /** @type {HTMLElement[]} The last order, so removal has a next or previous neighbour. */
  let order = []
  /** @type {HTMLElement | undefined} */
  let current

  /** @param {HTMLElement} shown @param {boolean} hide */
  function hideFromAssistiveTechnology(shown, hide) {
    if (hide) {
      if (!panelVisibility.has(shown)) panelVisibility.set(shown, shown.getAttribute('aria-hidden'))
      shown.setAttribute('aria-hidden', 'true')
    } else if (panelVisibility.has(shown)) {
      const original = panelVisibility.get(shown)
      if (original == null) shown.removeAttribute('aria-hidden')
      else shown.setAttribute('aria-hidden', original)
      panelVisibility.delete(shown)
    }
  }

  /**
   * Mark one tab selected: the tab in the tab order, with its panel shown and the others hidden.
   * @param {HTMLElement | undefined} chosen
   * @param {EventTarget | null} [revealing] The panel a native beforematch is about to reveal.
   */
  function mark(chosen, revealing) {
    current = chosen
    order = all()
    for (const tab of order) {
      if (!original.has(tab)) original.set(tab, tab.getAttribute('tabindex'))
      const on = tab === chosen
      if (tab.getAttribute('aria-selected') !== String(on)) tab.setAttribute('aria-selected', String(on))
      if (tab.getAttribute('tabindex') !== (on ? '0' : '-1')) tab.setAttribute('tabindex', on ? '0' : '-1')
      const shown = panel(tab)
      if (!shown) continue
      const discoverable = !on && findable && available(tab)
      hideFromAssistiveTechnology(shown, discoverable)
      if (shown === revealing) continue
      if (on) shown.removeAttribute('hidden')
      else {
        const hidden = discoverable ? 'until-found' : ''
        if (shown.getAttribute('hidden') !== hidden) shown.setAttribute('hidden', hidden)
      }
    }
  }

  /** @param {HTMLElement | undefined} tab */
  function announce(tab) {
    const detail = { value: tab ? valueOf(tab) : null, tab: tab ?? null }
    for (const type of ['input', 'change']) root.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }))
  }

  /** @param {HTMLElement} tab @param {EventTarget | null} [revealing] */
  function select(tab, revealing) {
    if (tab.getAttribute('aria-selected') === 'true') return
    mark(tab, revealing)
    announce(tab)
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
    const every = all()
    const list = every.filter(enabled)
    if (!every.includes(current) || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
    const vertical = root.getAttribute('aria-orientation') === 'vertical'
    const rtl = getComputedStyle(root).direction === 'rtl'
    const before = vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft'
    const after = vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight'
    // Counted from where the focused tab stands among all of them: a disabled tab may hold focus too, the
    // selected one that was disabled later, and its neighbours are the tabs beside it, not the ends.
    const at = every.indexOf(current)
    const later = [...every.slice(at + 1), ...every.slice(0, at)].filter(enabled)
    let to
    if (event.key === before) to = later.at(-1)
    else if (event.key === after) to = later[0]
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

  /** @type {HTMLElement | undefined} The focused tab before removal, which can return focus to the body. */
  let focused
  root.addEventListener('focusin', (event) => {
    const tab = /** @type {HTMLElement} */ (event.target)
    if (all().includes(tab)) focused = tab
  }, { signal })
  root.addEventListener('focusout', (event) => {
    const tab = focused
    if (event.relatedTarget) focused = undefined
    else queueMicrotask(() => {
      if (focused === tab && tab?.isConnected && scope.activeElement !== tab) focused = undefined
    })
  }, { signal })

  if (typeof MutationObserver === 'function') {
    const observer = new MutationObserver(() => {
      const list = all()
      if (list.length === order.length && list.every((tab, index) => tab === order[index])) return
      const removed = current && !list.includes(current)
      const previousValue = current ? valueOf(current) : null
      const restore = removed && focused === current && (!scope.activeElement || scope.activeElement === document.body)
      const index = current ? order.indexOf(current) : -1
      const neighbours = [...order.slice(index + 1), ...order.slice(0, index).reverse()]
      const next = current && !removed ? current : selected() ?? list.find(tab => valueOf(tab) === previousValue && enabled(tab))
        ?? neighbours.find(tab => list.includes(tab) && enabled(tab)) ?? list.find(enabled)
      for (const tab of order) {
        if (list.includes(tab)) continue
        const originalIndex = original.get(tab)
        if (originalIndex == null) tab.removeAttribute('tabindex')
        else tab.setAttribute('tabindex', originalIndex)
        original.delete(tab)
        const orphan = panel(tab)
        if (orphan && !list.some(other => panel(other) === orphan)) {
          hideFromAssistiveTechnology(orphan, false)
          orphan.hidden = true
        }
      }
      mark(next)
      if (restore) next?.focus()
      if (removed && previousValue !== (next ? valueOf(next) : null)) announce(next)
    })
    observer.observe(root, { childList: true, subtree: true })
    signal.addEventListener('abort', () => observer.disconnect())
  }

  if (findable) {
    // The panels usually follow the tablist as siblings, so hear their native reveals on the document.
    scope.addEventListener('beforematch', (event) => {
      const target = /** @type {HTMLElement} */ (event.target)
      const tab = all().find((each) => panel(each) === target)
      if (!tab) return
      if (available(tab)) {
        // Let the browser remove hidden itself so it can continue revealing enclosing panels.
        select(tab, target)
      } else {
        target.setAttribute('hidden', '')
        hideFromAssistiveTechnology(target, false)
      }
    }, { signal })

    // A document may have resolved its initial fragment before the app attached. Select after the
    // caller can hear changes, then let the browser scroll the now-visible target into view.
    queueMicrotask(() => {
      if (signal.aborted) return
      let id = document.defaultView?.location.hash.slice(1)
      if (!id) return
      try { id = decodeURIComponent(id) } catch { /* Try the literal fragment when it is malformed. */ }
      const target = scope.getElementById(id)
      if (!target) return
      const tab = all().find((each) => available(each) && panel(each)?.contains(target))
      if (tab && tab !== selected()) {
        select(tab)
        target.scrollIntoView()
      }
    })
  }

  signal.addEventListener('abort', () => {
    if (attached.get(root) === controller) attached.delete(root)
    for (const [tab, index] of original) {
      if (index === null) tab.removeAttribute('tabindex')
      else tab.setAttribute('tabindex', index)
      const shown = panel(tab)
      if (findable && shown?.getAttribute('hidden') === 'until-found') shown.setAttribute('hidden', '')
    }
    for (const shown of panelVisibility.keys()) hideFromAssistiveTechnology(shown, false)
  })

  // The tablist starts at the tab the markup selects, or at the first one that can be.
  mark(selected() ?? all().find(enabled))
  return detach
}
