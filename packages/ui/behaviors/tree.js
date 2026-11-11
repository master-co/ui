/**
 * Tree: one tab stop, walked and folded with the arrow keys.
 *
 * Without this script a tree still works: a branch is a native `<details>` whose `<summary>` is the row, it
 * opens and closes by itself, and every row is a tab stop. The script adds the keys of the Authoring
 * Practices tree and serves both ways the stylesheet draws a branch:
 *
 * - a `tree-group` details, which it opens and closes through `open`;
 * - a row with `aria-expanded`, whose `tree-sub` follows it, inside `role="tree"`.
 *
 * It keeps one row in the tab order (`tabindex`), skips rows inside a closed branch, `hidden` rows and
 * disabled ones, and reads direction for the horizontal arrows. A summary, a link and a button keep the
 * activation the browser gives them. A row that has none, `role="treeitem"` on a `div`, is activated by
 * Enter, Space and a click: a branch opens or closes, and a leaf becomes the selected row
 * (`aria-selected="true"`, removed from the row that had it), which dispatches a bubbling `change`
 * CustomEvent from the root with the row in `detail.item`.
 */

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/** How long typed letters stay one word, in milliseconds. */
const PAUSE = 500

/**
 * @param {HTMLElement} root The element with the `tree` class.
 * @returns {() => void} Removes the listeners and gives every row back the `tabindex` it had.
 */
export function tree(root) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)
  const detach = () => controller.abort()

  /** The rows of this tree, not those of a tree inside it. */
  const all = () => /** @type {HTMLElement[]} */ ([...root.querySelectorAll('.tree-item')]).filter((item) => item.closest('.tree') === root)
  /** @param {EventTarget | null} target */
  const rowOf = (target) => {
    const item = /** @type {HTMLElement | null} */ (target instanceof Element ? target.closest('.tree-item') : null)
    return item && item.closest('.tree') === root ? item : null
  }

  /**
   * The details a row is the summary of, when the branch is a details.
   * @param {Element} item
   */
  const group = (item) => {
    const parent = /** @type {HTMLDetailsElement | null} */ (item.parentElement)
    return parent?.matches('.tree-group') ? parent : null
  }
  /** @param {Element} item */
  const isBranch = (item) => Boolean(group(item)) || item.hasAttribute('aria-expanded')
  /** @param {Element} item */
  const isClosed = (item) => {
    const details = group(item)
    return details ? !details.open : item.getAttribute('aria-expanded') === 'false'
  }
  /** @param {Element} item @param {boolean} open */
  const setOpen = (item, open) => {
    const details = group(item)
    if (details) details.open = open
    else item.setAttribute('aria-expanded', String(open))
  }

  /**
   * The row of the branch that holds a row; null at the top level.
   * @param {Element} item
   */
  const parent = (item) => {
    const sub = item.closest('.tree-sub')
    if (!sub || !root.contains(sub)) return null
    const holder = sub.parentElement
    const row = holder?.matches('.tree-group') ? holder.querySelector('.tree-item') : sub.previousElementSibling
    return row?.matches('.tree-item') ? /** @type {HTMLElement} */ (row) : null
  }
  /** @param {Element} item @param {Element} branch */
  const within = (item, branch) => {
    for (let row = parent(item); row; row = parent(row)) if (row === branch) return true
    return false
  }
  /**
   * Whether a row is on screen: not hidden, and inside no closed branch.
   * @param {Element} item
   */
  const shown = (item) => {
    if (item.closest('[hidden]')) return false
    for (let row = parent(item); row; row = parent(row)) if (isClosed(row)) return false
    return true
  }
  /** @param {Element} item */
  const enabled = (item) => !(/** @type {HTMLButtonElement} */ (item).disabled) && item.getAttribute('aria-disabled') !== 'true'
  /** @param {Element} item */
  const label = (item) => (item.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase()

  /** @type {Map<HTMLElement, string | null>} Each row's `tabindex` before the script wrote one. */
  const original = new Map()
  /**
   * Put one row in the tab order and take the others out.
   * @param {HTMLElement | undefined} stop
   */
  function rove(stop) {
    if (!stop) return
    for (const item of all()) {
      if (!original.has(item)) original.set(item, item.getAttribute('tabindex'))
      const index = item === stop ? '0' : '-1'
      if (item.getAttribute('tabindex') !== index) item.setAttribute('tabindex', index)
    }
  }
  /** @param {HTMLElement | undefined} item */
  function focus(item) {
    if (!item) return
    rove(item)
    item.focus()
  }
  /** Keep the tab stop on a row that can take focus: a branch that closes over it takes it. */
  function mend() {
    let stop = all().find((item) => item.getAttribute('tabindex') === '0') ?? null
    while (stop && !(shown(stop) && enabled(stop))) stop = parent(stop)
    rove(stop ?? all().find((item) => shown(item) && enabled(item)))
  }

  /** @param {HTMLElement} item */
  function select(item) {
    if (item.getAttribute('aria-selected') === 'true') return
    for (const other of all()) if (other.getAttribute('aria-selected') === 'true') other.removeAttribute('aria-selected')
    item.setAttribute('aria-selected', 'true')
    root.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { item } }))
  }

  /** The letters typed so far, and the pause that ends them. */
  let typed = ''
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let pause
  /**
   * Move to the next row that starts with what was typed. One letter typed again goes on to the next match.
   * @param {string} character @param {HTMLElement} item @param {HTMLElement[]} rows The rows the keys may land on.
   */
  function find(character, item, rows) {
    clearTimeout(pause)
    pause = setTimeout(() => { typed = '' }, PAUSE)
    typed += character.toLowerCase()
    const again = [...typed].every((letter) => letter === typed[0])
    const at = rows.indexOf(item)
    // A word that grows may still be the row in focus; a single letter looks from the row after it.
    const from = again || at < 0 ? at + 1 : at
    const order = [...rows.slice(from), ...rows.slice(0, from)]
    focus(order.find((row) => label(row).startsWith(again ? typed[0] : typed)))
  }

  root.addEventListener('keydown', (event) => {
    const item = /** @type {HTMLElement} */ (event.target)
    if (rowOf(item) !== item || event.ctrlKey || event.metaKey || event.altKey) return
    const visible = all().filter(shown)
    const rows = visible.filter(enabled)
    const at = visible.indexOf(item)
    const rtl = getComputedStyle(root).direction === 'rtl'
    const inward = rtl ? 'ArrowLeft' : 'ArrowRight'
    const outward = rtl ? 'ArrowRight' : 'ArrowLeft'
    const branch = isBranch(item) && enabled(item)
    // A character to find a row by. Space is one while a word is being typed, and activates otherwise.
    const letter = event.key.length === 1 && event.key !== '*' && (event.key !== ' ' || typed !== '')

    if (event.key === 'ArrowDown') focus(visible.slice(at + 1).find(enabled))
    else if (event.key === 'ArrowUp') focus(visible.slice(0, Math.max(at, 0)).findLast(enabled))
    else if (event.key === 'Home') focus(rows[0])
    else if (event.key === 'End') focus(rows[rows.length - 1])
    else if (event.key === inward) {
      if (branch && isClosed(item)) setOpen(item, true)
      else if (branch) focus(visible.slice(at + 1).find((row) => enabled(row) && within(row, item)))
    } else if (event.key === outward) {
      if (branch && !isClosed(item)) setOpen(item, false)
      else {
        let row = parent(item)
        while (row && !enabled(row)) row = parent(row)
        focus(row ?? undefined)
      }
    } else if (event.key === '*') {
      const level = parent(item)
      for (const row of rows) if (parent(row) === level && isBranch(row) && isClosed(row)) setOpen(row, true)
    } else if (letter) find(event.key, item, rows)
    else if (event.key === 'Enter' || event.key === ' ') {
      // A summary and a button answer both keys by themselves, and a link answers Enter.
      if (item.matches('summary, button') || (event.key === 'Enter' && item.matches('a[href]'))) return
      item.click()
    } else return
    // A key that moved or folded ends the word being typed.
    if (!letter) typed = ''
    event.preventDefault()
  }, { signal })

  // A disabled row does nothing: its link is not followed and its details stays as it is. Said on the way
  // down, before the row or anything around it acts on the click.
  root.addEventListener('click', (event) => {
    const item = rowOf(event.target)
    if (item && !enabled(item)) event.preventDefault()
  }, { capture: true, signal })

  root.addEventListener('click', (event) => {
    const item = rowOf(event.target)
    if (!item || !enabled(item)) return
    rove(item)
    if (group(item)) return
    if (item.hasAttribute('aria-expanded')) setOpen(item, isClosed(item))
    else if (item.getAttribute('role') === 'treeitem') select(item)
  }, { signal })

  // A row that takes focus some other way, under a pointer or a screen reader, becomes the tab stop.
  root.addEventListener('focusin', (event) => {
    const item = rowOf(event.target)
    if (item && item === event.target) rove(item)
  }, { signal })

  // toggle does not bubble: capture hears every details of the tree, whoever opened or closed it.
  root.addEventListener('toggle', mend, { capture: true, signal })

  signal.addEventListener('abort', () => {
    if (attached.get(root) === controller) attached.delete(root)
    clearTimeout(pause)
    for (const [item, index] of original) {
      if (index === null) item.removeAttribute('tabindex')
      else item.setAttribute('tabindex', index)
    }
  })

  // Tab enters at the row the markup put in the tab order, or the selected or current row, or the first.
  const rows = all().filter((item) => shown(item) && enabled(item))
  rove(
    rows.find((item) => item.getAttribute('tabindex') === '0') ??
    rows.find((item) => item.getAttribute('aria-selected') === 'true' || item.hasAttribute('aria-current')) ??
    rows[0]
  )
  return detach
}
