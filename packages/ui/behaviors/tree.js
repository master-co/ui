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
 *
 * Inside `role="tree"` it serves three more trees:
 *
 * - With `aria-multiselectable="true"` any number of leaves are selected, as in a file list. A click selects
 *   one row alone; Control or Command with a click and Space select or unselect one; Shift with a click,
 *   Space or an arrow key selects every visible row from the anchor, the row chosen last; Control or Command
 *   with A selects every visible row, or none when they all are. A row that can be selected and is not says
 *   `aria-selected="false"`.
 * - When its rows carry `aria-checked`, it is a checkbox tree. Space, a click on a leaf and a click on a
 *   row's `tree-check` check or uncheck the row and every row under it, and each branch above says `true`,
 *   `false` or `mixed` from the rows under it.
 * - A branch that opens with no rows under it says `aria-busy="true"` until its rows arrive. Every branch
 *   the script opens dispatches a bubbling `expand` CustomEvent from the root, with the row in
 *   `detail.item` and what it stands for in `detail.value`: that is when the page writes the rows. The
 *   script hears them arrive, takes `aria-busy` away and gives them the keys at once; under a checked
 *   branch, they are checked.
 *
 * With `rename: true`, F2 turns the `tree-label` of the row in focus into an `editable`, driven by the
 * editable behavior: Enter saves, Escape puts the label back, and focus returns to the row. A new label is
 * written into the `tree-label` and dispatched as a bubbling `rename` CustomEvent from the root, with the
 * row in `detail.item`, what it stood for in `detail.value` and the new label in `detail.label`. Where the
 * label is saved after that is the page's. `edit(row)` on the function the behavior returns does what F2
 * does, with or without the option, for a page that offers renaming from a menu or a button.
 *
 * The function the behavior returns has a `value`: what the selected row stands for, its `data-value` or its
 * text, and null when no row is selected. In a multiselectable tree it is the list of the selected rows, and
 * in a checkbox tree the list of the checked leaves, branches left out, both in the order of the document.
 * Set it to select or check rows from outside; that dispatches nothing.
 */
import { editable } from './editable.js'

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/** How long typed letters stay one word, in milliseconds. */
const PAUSE = 500

/**
 * @typedef {object} TreeOptions
 * @property {boolean} [rename] Whether F2 turns the label of the row in focus into a field. False by default.
 * @property {(label: string) => string} [renameLabel] The accessible name of that field. `Rename <label>` by default.
 */

/**
 * @param {HTMLElement} root The element with the `tree` class.
 * @param {TreeOptions} [options]
 * @returns {(() => void) & { value: string | string[] | null, edit: (item: HTMLElement) => boolean }} Removes
 *   the listeners and gives every row back the `tabindex` it had. Its `value` is what the selected row stands
 *   for, or the list of the selected rows or the checked leaves; `edit(row)` renames a row in place and says
 *   whether it could.
 */
export function tree(root, { rename = false, renameLabel = (label) => `Rename ${label}` } = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)

  /** The rows of this tree, not those of a tree inside it. */
  const all = () => /** @type {HTMLElement[]} */ ([...root.querySelectorAll('.tree-item')]).filter((item) => item.closest('.tree') === root)
  /** @param {Element} item */
  const valueOf = (item) => item.getAttribute('data-value') ?? (item.textContent ?? '').replace(/\s+/g, ' ').trim()
  /** A checkbox tree: its rows carry aria-checked. */
  const checkable = () => all().some((item) => item.hasAttribute('aria-checked'))
  /** A tree where any number of rows are selected. */
  const multiple = () => root.getAttribute('aria-multiselectable') === 'true' && !checkable()

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
  /**
   * The rows under a branch: its details' tree-sub, or the tree-sub that follows its row.
   * @param {Element} item
   */
  const sub = (item) => {
    const details = group(item)
    const holder = details ? details.querySelector('.tree-sub') : item.nextElementSibling
    return holder?.matches('.tree-sub') ? holder : null
  }
  /** @param {Element} item */
  const empty = (item) => !sub(item)?.querySelector('.tree-item')
  /** @param {Element} item @param {boolean} open */
  const setOpen = (item, open) => {
    const details = group(item)
    if (details) {
      details.open = open
      return
    }
    item.setAttribute('aria-expanded', String(open))
    if (!open) return
    // A branch with nothing under it yet is waiting for its rows, which the page writes when it hears this.
    if (empty(item)) item.setAttribute('aria-busy', 'true')
    root.dispatchEvent(new CustomEvent('expand', { bubbles: true, detail: { item, value: valueOf(item) } }))
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
  /**
   * A row that can be selected: a treeitem that is not a branch.
   * @param {Element} item
   */
  const selectable = (item) => item.getAttribute('role') === 'treeitem' && !isBranch(item)
  /** @param {Element} item */
  const isSelected = (item) => item.getAttribute('aria-selected') === 'true'

  /** @param {Element} item */
  const changed = (item) => root.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { item } }))

  /**
   * Mark the selected rows of a multiselectable tree, `true` or `false` on each row that can be selected.
   * @param {Set<Element>} selected
   * @returns {boolean} Whether a row changed.
   */
  function mark(selected) {
    let moved = false
    for (const row of all()) {
      if (!selectable(row)) continue
      const next = String(selected.has(row))
      if (isSelected(row) !== selected.has(row)) moved = true
      if (row.getAttribute('aria-selected') !== next) row.setAttribute('aria-selected', next)
    }
    return moved
  }

  /**
   * Give each branch of a checkbox tree the state of the rows under it: `true` when all of them are checked,
   * `false` when none is, `mixed` otherwise. A branch with no rows under it keeps its own.
   */
  function settle() {
    const rows = all()
    /** @type {Map<Element, Element[]>} The checkable rows right under each branch. */
    const under = new Map()
    for (const row of rows) {
      const branch = parent(row)
      if (!branch || !row.hasAttribute('aria-checked')) continue
      const children = under.get(branch) ?? []
      children.push(row)
      under.set(branch, children)
    }
    // Deepest first: the rows of a branch come after it in the document, so a branch reads settled rows.
    for (const row of rows.toReversed()) {
      const children = under.get(row)
      if (!children || !row.hasAttribute('aria-checked')) continue
      const states = children.map((child) => child.getAttribute('aria-checked'))
      const state = states.every((each) => each === 'true') ? 'true' : states.every((each) => each === 'false') ? 'false' : 'mixed'
      if (row.getAttribute('aria-checked') !== state) row.setAttribute('aria-checked', state)
    }
  }

  /**
   * Check or uncheck a row and every row under it that is not disabled, and settle the branches above.
   * A mixed row is checked, unless every row under it that can change is checked already.
   * @param {HTMLElement} item
   */
  function check(item) {
    const below = all().filter((row) => within(row, item) && row.hasAttribute('aria-checked') && enabled(row))
    const state = item.getAttribute('aria-checked')
    const next = state === 'true' || (state === 'mixed' && below.every((row) => row.getAttribute('aria-checked') === 'true')) ? 'false' : 'true'
    for (const row of [item, ...below]) row.setAttribute('aria-checked', next)
    settle()
    changed(item)
  }

  const detach = /** @type {(() => void) & { value: string | string[] | null, edit: (item: HTMLElement) => boolean }} */ (Object.defineProperty(() => controller.abort(), 'value', {
    enumerable: true,
    get: () => {
      if (checkable()) return all().filter((item) => !isBranch(item) && item.getAttribute('aria-checked') === 'true').map(valueOf)
      const selected = all().filter(isSelected).map(valueOf)
      return multiple() ? selected : selected[0] ?? null
    },
    set: (/** @type {string | string[] | null} */ next) => {
      const values = next === null || next === undefined ? [] : [next].flat()
      if (checkable()) {
        for (const item of all()) {
          if (isBranch(item) || !item.hasAttribute('aria-checked')) continue
          const state = String(values.includes(valueOf(item)))
          if (item.getAttribute('aria-checked') !== state) item.setAttribute('aria-checked', state)
        }
        settle()
        return
      }
      if (multiple()) {
        mark(new Set(all().filter((item) => selectable(item) && values.includes(valueOf(item)))))
        return
      }
      for (const item of all()) {
        if (values.length && valueOf(item) === values[0]) item.setAttribute('aria-selected', 'true')
        else if (isSelected(item)) item.removeAttribute('aria-selected')
      }
    }
  }))

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
    if (isSelected(item)) return
    for (const other of all()) if (isSelected(other)) other.removeAttribute('aria-selected')
    item.setAttribute('aria-selected', 'true')
    changed(item)
  }

  /** @type {HTMLElement | null} The row a run starts from in a multiselectable tree: the one chosen last. */
  let anchor = null
  /**
   * Select, in a multiselectable tree: one row alone, or one row more or less.
   * @param {HTMLElement} item @param {boolean} alone
   */
  function choose(item, alone) {
    anchor = item
    const selected = new Set(alone ? [] : all().filter(isSelected))
    if (alone || !selected.has(item)) selected.add(item)
    else selected.delete(item)
    if (mark(selected)) changed(item)
  }
  /**
   * Select every visible row from the anchor to a row, both included, and leave the others as they are.
   * @param {HTMLElement} to
   */
  function run(to) {
    const rows = all().filter((row) => shown(row) && enabled(row))
    const end = rows.indexOf(to)
    if (end < 0) return
    const from = anchor && rows.includes(anchor) ? rows.indexOf(anchor) : end
    if (!anchor) anchor = to
    const selected = new Set([...all().filter(isSelected), ...rows.slice(Math.min(from, end), Math.max(from, end) + 1).filter(selectable)])
    if (mark(selected)) changed(to)
  }
  /** Select every visible row, or none when they all are. */
  function every() {
    const rows = all().filter((row) => shown(row) && enabled(row) && selectable(row))
    if (!rows.length) return
    const already = rows.every(isSelected)
    if (mark(new Set(already ? [] : rows))) changed(rows[0])
  }

  /** @type {((back: boolean) => void) | null} Ends the rename under way. */
  let renaming = null
  /**
   * Turn a row's label into an editable in place. Returns whether it did.
   * @param {HTMLElement} item
   */
  function edit(item) {
    const words = /** @type {HTMLElement | undefined} */ ([...item.querySelectorAll('.tree-label')].find((part) => rowOf(part) === item))
    if (!words || !enabled(item) || renaming) return false
    const document = root.ownerDocument
    const text = (words.textContent ?? '').trim()
    const value = valueOf(item)
    // The editable's own markup, as its contract has it: the preview holds the cell open while the field is shown.
    const holder = document.createElement('span')
    holder.className = 'editable'
    const preview = document.createElement('button')
    preview.type = 'button'
    preview.className = 'editable-preview'
    preview.tabIndex = -1
    preview.textContent = text
    const field = document.createElement('input')
    field.className = 'editable-field'
    field.setAttribute('value', text)
    field.required = true
    field.hidden = true
    field.setAttribute('aria-label', renameLabel(text))
    holder.append(preview, field)
    words.hidden = true
    words.after(holder)
    const control = editable(holder)
    const listening = new AbortController()

    renaming = (back) => {
      renaming = null
      listening.abort()
      control()
      holder.remove()
      words.hidden = false
      if (back) focus(item)
      else mend()
    }
    // What the field says is the editable's: the tree says `rename` instead.
    for (const type of ['input', 'change']) holder.addEventListener(type, (event) => event.stopPropagation(), { signal: listening.signal })
    field.addEventListener('change', () => {
      const next = field.value
      // Write the text the row holds, not a new node, so a framework that wrote it keeps it.
      const only = words.firstChild
      if (only && only === words.lastChild && only.nodeType === 3) only.nodeValue = next
      else words.textContent = next
      root.dispatchEvent(new CustomEvent('rename', { bubbles: true, detail: { item, value, label: next } }))
    }, { signal: listening.signal })
    // Enter and Escape close the field in the editable's own listener, which comes first: focus returns to the row.
    field.addEventListener('keydown', () => { if (field.hidden) renaming?.(true) }, { signal: listening.signal })
    // Leaving the field saves it, or puts it back; focus stays where the reader took it. Hiding the field on
    // Enter blurs it too, so this waits a task, after the keydown above has given focus back to the row.
    field.addEventListener('blur', () => setTimeout(() => { if (field.hidden) renaming?.(false) }), { signal: listening.signal })
    control.edit()
    return true
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
    if (rowOf(item) !== item || event.altKey) return
    const command = event.ctrlKey || event.metaKey
    const visible = all().filter(shown)
    const rows = visible.filter(enabled)
    const at = visible.indexOf(item)
    const next = () => visible.slice(at + 1).find(enabled)
    const previous = () => visible.slice(0, Math.max(at, 0)).findLast(enabled)

    if (multiple() && event.shiftKey) {
      /** @type {HTMLElement | undefined} */
      let to
      let known = true
      if (event.key === 'ArrowDown' && !command) to = next()
      else if (event.key === 'ArrowUp' && !command) to = previous()
      else if (event.key === 'Home' && command) to = rows[0]
      else if (event.key === 'End' && command) to = rows.at(-1)
      else if (event.key === ' ' && !command) to = enabled(item) ? item : undefined
      else known = false
      if (known) {
        event.preventDefault()
        typed = ''
        if (!to) return
        // A run that starts here starts from the row the keys were on.
        if (!anchor || !rows.includes(anchor)) anchor = item
        focus(to)
        run(to)
        return
      }
    }
    if (multiple() && command && !event.shiftKey && event.key.toLowerCase() === 'a') {
      event.preventDefault()
      every()
      return
    }
    if (event.key === 'F2' && rename && !command && !event.shiftKey) {
      if (edit(item)) event.preventDefault()
      return
    }
    if (command) return

    const rtl = getComputedStyle(root).direction === 'rtl'
    const inward = rtl ? 'ArrowLeft' : 'ArrowRight'
    const outward = rtl ? 'ArrowRight' : 'ArrowLeft'
    const branch = isBranch(item) && enabled(item)
    // A character to find a row by. Space is one while a word is being typed, and activates otherwise.
    const letter = event.key.length === 1 && event.key !== '*' && (event.key !== ' ' || typed !== '')

    if (event.key === 'ArrowDown') focus(next())
    else if (event.key === 'ArrowUp') focus(previous())
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
    else if (event.key === ' ' && checkable() && item.hasAttribute('aria-checked')) {
      if (enabled(item)) check(item)
    } else if (event.key === ' ' && multiple() && selectable(item)) {
      if (enabled(item)) choose(item, false)
    } else if (event.key === 'Enter' || event.key === ' ') {
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
    const target = /** @type {Element} */ (event.target)
    // A click in the field of a rename is the field's.
    if (!item || !enabled(item) || target.closest('.editable')) return
    rove(item)
    const box = target.closest('.tree-check')
    if (item.hasAttribute('aria-checked') && (box || !isBranch(item))) {
      // The check of a summary or a link checks the row; the row does not open or follow.
      if (box) event.preventDefault()
      check(item)
      return
    }
    if (group(item)) return
    if (item.hasAttribute('aria-expanded')) setOpen(item, isClosed(item))
    else if (!selectable(item)) return
    else if (!multiple()) select(item)
    else if (/** @type {MouseEvent} */ (event).shiftKey) run(item)
    else choose(item, !(/** @type {MouseEvent} */ (event).ctrlKey || /** @type {MouseEvent} */ (event).metaKey))
  }, { signal })

  // A row that takes focus some other way, under a pointer or a screen reader, becomes the tab stop. A disabled
  // one a press focused does not: the stop stays on a row the keys can land on, as mend keeps it.
  root.addEventListener('focusin', (event) => {
    const item = rowOf(event.target)
    if (item && item === event.target && enabled(item)) rove(item)
  }, { signal })

  // toggle does not bubble: capture hears every details of the tree, whoever opened or closed it.
  root.addEventListener('toggle', mend, { capture: true, signal })

  /** Bring rows written after the script attached into the pattern. */
  function arrived() {
    /** @type {HTMLElement | null} A checked branch whose rows arrived, which checks them. */
    let checked = null
    for (const item of all()) {
      if (item.getAttribute('aria-busy') !== 'true' || !isBranch(item) || empty(item)) continue
      item.removeAttribute('aria-busy')
      // A checked branch was checked whole: the rows that arrive under it are checked too.
      if (item.getAttribute('aria-checked') !== 'true') continue
      for (const row of all()) {
        if (!within(row, item) || !row.hasAttribute('aria-checked') || row.getAttribute('aria-checked') === 'true') continue
        row.setAttribute('aria-checked', 'true')
        checked = item
      }
    }
    if (checkable()) settle()
    else if (multiple()) mark(new Set(all().filter(isSelected)))
    mend()
    if (checked) changed(checked)
  }
  const observer = new MutationObserver(arrived)
  observer.observe(root, { childList: true, subtree: true })

  signal.addEventListener('abort', () => {
    if (attached.get(root) === controller) attached.delete(root)
    observer.disconnect()
    renaming?.(false)
    clearTimeout(pause)
    for (const [item, index] of original) {
      if (index === null) item.removeAttribute('tabindex')
      else item.setAttribute('tabindex', index)
    }
  })

  if (checkable()) settle()
  else if (multiple()) mark(new Set(all().filter(isSelected)))
  // Tab enters at the row the markup put in the tab order, or the selected or current row, or the first.
  const rows = all().filter((item) => shown(item) && enabled(item))
  rove(
    rows.find((item) => item.getAttribute('tabindex') === '0') ??
    rows.find((item) => isSelected(item) || item.hasAttribute('aria-current')) ??
    rows[0]
  )
  detach.edit = (item) => rowOf(item) === item && edit(item)
  return detach
}
