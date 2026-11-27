/**
 * Kanban: a board of columns whose items are moved within a column or into another, by dragging a handle,
 * with the keys, or by choosing a column and a position in the mover.
 *
 * The root, the element with the `kanban` class, holds the columns, `kanban-column`, each a named section with
 * a list, `kanban-items`, of items, `kanban-item`. A column and an item stand for their `data-value`. An item
 * has a button, `kanban-handle`, named with what it moves. The order of the columns is the markup's; only the
 * items move.
 *
 * Nothing moves until a move is committed. While an item is carried its handle says `aria-pressed="true"`, the
 * item stays in its place, and the place it would land in is marked: `kanban-item-target` on the item it would
 * land before, or `kanban-items-target` on a list it would end. The stylesheet draws the line.
 *
 * With the pointer: a press on a handle that moves more than a few pixels picks the item up, and for a mouse so
 * does a press anywhere on the item that is not on a link, a button or a field. A finger carries by the handle
 * alone, since a press elsewhere on an item is how a list is scrolled. The item's name is
 * written into `kanban-preview`, a manual popover in the root, which is shown in the top layer and follows the
 * pointer through `--kanban-x` and `--kanban-y` at the item's width, `--kanban-width`. The column under the
 * pointer, or the nearest across, is where it would land, before the first item whose middle is under the
 * pointer; the items do not move, so their boxes are true at every step. The board is scrolled across and the
 * column's list along while the pointer is near their ends. The release commits; a release where it was picked
 * up or outside the board, Escape, a cancelled pointer and a capture lost leave it where it was. Only the
 * pointer that started the drag moves it. The release lets go of the handle and the sheet leaves where it is, at
 * once, `kanban-preview-landing` while it does: from there the item itself is what moves, and the sheet, which
 * holds only its name, never slides over it. Without the popover API nothing follows the pointer.
 *
 * With the keys: Enter or Space on a handle picks the item up, as a press that does not move does. The up and
 * down arrows choose a place in the column, the left and right arrows the column beside it as it is seen,
 * Home and End the first and the last place. Enter or Space commits, Escape cancels, and leaving the handle
 * commits too. Each step is said in the `kanban-status` region, a `role="status"` inside the root or right
 * after it, with the item's name, the column and the place.
 *
 * Without a drag or the keys: a button in an item whose `popovertarget` (or `commandfor`) is the popover that
 * holds the form `kanban-mover` opens it for that item. The behavior writes the columns into the form's select
 * named `column` and the places into its select named `position`; submitting the form commits.
 *
 * Every commit takes one path, `move(item, column, index)` on the function this returns, where `index` is the
 * place among the column's other items. A commit that changes the arrangement moves the item node itself, with
 * `moveBefore()` where the browser has it so what it holds keeps its state, brings it into view, and then the
 * root dispatches `input` and `change`, once each. A commit that changes nothing dispatches nothing. Where the
 * browser has view transitions scoped to an element, the board starts one around the change, so every item
 * glides to the place it now has; the stylesheet names the items for it. Then a commit is finished a frame
 * later, and `move` answers with a promise. The board takes no press while the items glide, which is why the
 * stylesheet keeps the glide quick. Under reduced motion the change is drawn at once.
 * `move` itself is for the page: it does not bring the item into view, does not move into a hidden column, and
 * is refused while an earlier move is still being drawn.
 *
 * The function it returns has a `value`, the arrangement: one `{ value, items }` to a column, in the order of
 * the columns. Set it to arrange the board; that dispatches nothing. A value that names a column or an item
 * the board does not have, or names one twice, is refused and the board stays as it is. An item the value
 * leaves out keeps its column, after the ones it names. Setting it, or calling `move`, during a move cancels
 * that move first, as does anything else that rearranges the board under it.
 *
 * Items may be written by something else, such as a framework that renders them from its own data. Give
 * `arrange`, and the script moves no node: it calls `arrange(next)` with the arrangement to draw and waits
 * for the promise it returns, if any, before it gives focus back and dispatches. An owner that does not take
 * the arrangement leaves the board as it was, and nothing is dispatched.
 *
 * This behavior measures: where the pointer is among the columns and the items, how far a list has to
 * scroll, and where the carried sheet stands. It writes only the three custom properties named above.
 */
import { label, valued } from './internal.js'

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * @typedef {{ value: string, items: string[] }[]} KanbanValue The arrangement: each column's value and the
 *   values of its items, in order.
 */

/**
 * @typedef {object} KanbanMessages What the status region says, given the item's name, the column's name, the
 *   place in it from 1 and the number of items the column holds with the item in that place.
 * @property {(name: string, column: string, position: number, count: number) => string} [grab]
 * @property {(name: string, column: string, position: number, count: number) => string} [move] A place is chosen.
 * @property {(name: string, column: string, position: number, count: number) => string} [drop]
 * @property {(name: string, column: string, position: number, count: number) => string} [cancel]
 */

/**
 * @typedef {{ column: HTMLElement, index: number }} Place A column and a place among its items other than the
 *   one that is moved.
 */

/** @type {Required<KanbanMessages>} */
const english = {
  grab: (name, column, position, count) => `${name}, picked up in ${column}, position ${position} of ${count}. Use the arrow keys to choose a place, Space to drop it there, Escape to cancel.`,
  move: (name, column, position, count) => `${name}: ${column}, position ${position} of ${count}.`,
  drop: (name, column, position, count) => `${name}, dropped in ${column}, position ${position} of ${count}.`,
  cancel: (name, column, position, count) => `${name}, move cancelled. Still in ${column}, position ${position} of ${count}.`,
}

/** What a press on an item is for already: on these a mouse does not carry the item. */
const busy = 'a[href], button, input, select, textarea, summary, label, [contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"]'

/** How far a press moves before it is a drag, in pixels. */
const threshold = 4

/** How far past an item's middle the pointer goes before the place changes, in pixels. */
const hysteresis = 4

/** How near an end of a scroller the pointer starts to scroll it, in pixels, and never more than a third of it. */
const edge = 56

/** The most a scroller moves, in pixels to a millisecond. */
const pace = 0.9

/**
 * @param {HTMLElement} root The element with the `kanban` class.
 * @param {{ messages?: KanbanMessages, arrange?: (next: KanbanValue) => unknown }} [options]
 *   `messages`: what the status region says. `arrange`: takes over arranging the items.
 * @returns {(() => void) & { value: KanbanValue, move: (item: string, column: string, index: number) => boolean | Promise<boolean> }}
 *   Removes everything the behavior added. Its `value` is the arrangement; `move` commits one move and says,
 *   at once or when `arrange` is done, whether the arrangement changed.
 */
export function kanban(root, { messages = {}, arrange } = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)
  const say = { ...english, ...messages }
  const document = root.ownerDocument

  /* What the board holds, read from the document each time. */

  const within = (/** @type {Element | null | undefined} */ element) => !!element && element.closest('.kanban') === root
  const columns = () => /** @type {HTMLElement[]} */ ([...root.querySelectorAll('.kanban-column')]).filter(within)
  /** The columns an item may go to: the ones that are shown. */
  const open = () => columns().filter((column) => !column.closest('[hidden]'))
  const listOf = (/** @type {Element} */ column) => /** @type {HTMLElement | null} */ (column.querySelector('.kanban-items'))
  const itemsOf = (/** @type {Element} */ column) => /** @type {HTMLElement[]} */ ([...column.querySelectorAll('.kanban-item')]).filter((item) => item.closest('.kanban-column') === column)
  const columnOf = (/** @type {Element} */ item) => /** @type {HTMLElement | null} */ (item.closest('.kanban-column'))
  const handleOf = (/** @type {Element | null | undefined} */ item) => /** @type {HTMLButtonElement | null} */ (item?.querySelector('.kanban-handle') ?? null)
  const valueOf = (/** @type {Element} */ element) => element.getAttribute('data-value') ?? label(element)
  const find = (/** @type {string} */ value) => columns().flatMap(itemsOf).find((item) => valueOf(item) === value)
  const status = () => /** @type {HTMLElement | null} */ (root.querySelector('.kanban-status') ?? (root.nextElementSibling?.matches('.kanban-status') ? root.nextElementSibling : null))
  const preview = () => /** @type {HTMLElement | null} */ (root.querySelector('.kanban-preview'))
  const mover = () => /** @type {HTMLFormElement | null} */ (root.querySelector('.kanban-mover'))

  /** What an item is called: its `aria-label`, or the first words it holds, such as a card's title. */
  const nameOf = (/** @type {Element} */ item) => {
    const own = item.getAttribute('aria-label')
    if (own) return own
    const walker = document.createTreeWalker(item, 4 /* NodeFilter.SHOW_TEXT */)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim()
      if (text) return text
    }
    return valueOf(item)
  }

  /** What a column is called: what names the section, or its title. */
  const titleOf = (/** @type {Element} */ column) => {
    const named = (column.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)).filter(Boolean)
    const text = named.map((element) => label(/** @type {Element} */ (element))).join(' ').trim()
    if (text) return text
    const own = column.getAttribute('aria-label')
    if (own) return own
    const title = column.querySelector('.kanban-title')
    return title ? label(title) : valueOf(column)
  }

  /** @returns {KanbanValue} */
  const read = () => columns().map((column) => ({ value: valueOf(column), items: itemsOf(column).map(valueOf) }))
  const written = () => JSON.stringify(read())

  /**
   * The whole arrangement a value asks for, or nothing when the board cannot be arranged that way: it names a
   * column or an item the board does not have, or one twice.
   * @param {unknown} next
   * @returns {KanbanValue | null}
   */
  const plan = (next) => {
    if (!Array.isArray(next)) return null
    const board = columns()
    const known = new Set(board.map(valueOf))
    const held = new Set(board.flatMap(itemsOf).map(valueOf))
    /** @type {Map<string, string[]>} */
    const asked = new Map()
    const named = new Set()
    for (const entry of next) {
      if (!entry || typeof entry !== 'object' || !Array.isArray(entry.items)) return null
      const column = String(entry.value)
      if (!known.has(column) || asked.has(column)) return null
      const items = entry.items.map(String)
      for (const item of items) {
        if (!held.has(item) || named.has(item)) return null
        named.add(item)
      }
      asked.set(column, items)
    }
    return board.map((column) => ({
      value: valueOf(column),
      items: [...(asked.get(valueOf(column)) ?? []), ...itemsOf(column).map(valueOf).filter((item) => !named.has(item))],
    }))
  }

  /**
   * Put a node at a place in a list, the node itself, so what it holds keeps its state.
   * @param {HTMLElement} list
   * @param {HTMLElement} item
   * @param {number} index Among the list's other items.
   */
  const put = (list, item, index) => {
    const others = /** @type {HTMLElement[]} */ ([...list.querySelectorAll('.kanban-item')]).filter((each) => each !== item && each.closest('.kanban-items') === list)
    const before = others[index] ?? others.at(-1)?.nextSibling ?? null
    if (before === item || (item.parentNode === list && item.nextSibling === before && before !== null)) return
    const host = /** @type {any} */ (list)
    if (typeof host.moveBefore === 'function') {
      try {
        host.moveBefore(item, before)
        return
      } catch {
        // A node that cannot be moved atomically, such as one from another document, is inserted again.
      }
    }
    list.insertBefore(item, before)
  }

  /** Arrange the board as a whole arrangement says, node by node. */
  const draw = (/** @type {KanbanValue} */ next) => {
    const nodes = new Map(columns().flatMap(itemsOf).map((item) => [valueOf(item), item]))
    for (const column of columns()) {
      const list = listOf(column)
      const items = next.find((entry) => entry.value === valueOf(column))?.items ?? []
      if (!list) continue
      items.forEach((value, index) => {
        const item = nodes.get(value)
        if (item) put(list, item, index)
      })
    }
  }

  /** Say something in the status region, after a pause, so a focus announcement does not swallow it. */
  let timer = 0
  const announce = (/** @type {string} */ text) => {
    const region = status()
    if (!region) return
    region.textContent = ''
    clearTimeout(timer)
    timer = /** @type {any} */ (setTimeout(() => { region.textContent = text }, 400))
  }

  const motion = () => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  /**
   * The platform's own way of drawing a change of arrangement, a view transition scoped to the board, where the
   * browser has one and motion is wanted.
   * @returns {((this: Element, update: () => unknown) => any) | null}
   */
  const glides = () => {
    const start = /** @type {any} */ (root).startViewTransition
    return typeof start === 'function' && motion() ? start : null
  }

  /** Where an item stands now. */
  const placeOf = (/** @type {HTMLElement} */ item) => {
    const column = /** @type {HTMLElement} */ (columnOf(item))
    return { column, index: itemsOf(column).indexOf(item) }
  }
  const others = (/** @type {Place} */ place, /** @type {HTMLElement} */ item) => itemsOf(place.column).filter((each) => each !== item)
  const same = (/** @type {Place | null} */ a, /** @type {Place | null} */ b) => !!a && !!b && a.column === b.column && a.index === b.index
  /** The words a place is said with: the column's name, the place from 1 and how many the column would hold. */
  const spoken = (/** @type {HTMLElement} */ item, /** @type {Place} */ place) => /** @type {[string, string, number, number]} */ ([nameOf(item), titleOf(place.column), place.index + 1, others(place, item).length + 1])

  /* The mark of a place. */

  const unmark = () => {
    for (const each of root.querySelectorAll('.kanban-item-target')) each.classList.remove('kanban-item-target')
    for (const each of root.querySelectorAll('.kanban-items-target')) each.classList.remove('kanban-items-target')
  }

  /** Mark the place the carried item would land in. Its own place is not marked: nothing would move. */
  const mark = () => {
    unmark()
    if (!carry?.target || same(carry.target, carry.origin)) return
    const before = others(carry.target, carry.item)[carry.target.index]
    if (before) before.classList.add('kanban-item-target')
    else listOf(carry.target.column)?.classList.add('kanban-items-target')
  }

  /* The move in progress. */

  /**
   * An item picked up, by the keys or the pointer. `origin` is where it stands, `target` where it would land,
   * nothing when the pointer is off the board, and `written` the arrangement as it was picked up.
   * @type {{ item: HTMLElement, handle: HTMLButtonElement, keys: boolean, origin: Place, target: Place | null, written: string } | null}
   */
  let carry = null
  /** True while a commit is moving nodes: a blur it causes is not leaving the handle. */
  let moving = false
  /** True once a drag has ended, until the next press: the click its release makes is not a press. */
  let released = false

  /** While an item is carried, anything else that rearranges the board cancels the move. */
  const watcher = typeof MutationObserver === 'function'
    ? new MutationObserver(() => {
      if (carry && !moving && (!carry.item.isConnected || written() !== carry.written)) stop(false)
    })
    : null

  const pick = (/** @type {HTMLElement} */ item, /** @type {HTMLButtonElement} */ handle, keys = true) => {
    const origin = placeOf(item)
    carry = { item, handle, keys, origin, target: origin, written: written() }
    handle.setAttribute('aria-pressed', 'true')
    watcher?.observe(root, { childList: true, subtree: true })
  }

  /** Let go of the carried item without moving it: the mark, the watch and the pressed handle are cleared. */
  const release = () => {
    const held = carry
    carry = null
    watcher?.disconnect()
    unmark()
    return held
  }

  /**
   * End the move in progress, of either kind, leaving the item where it was.
   * @param {boolean} [told] Whether to say so.
   */
  const stop = (told = true) => {
    if (drag) end(false, told)
    const held = release()
    if (!held) return
    held.handle.setAttribute('aria-pressed', 'false')
    if (told && held.item.isConnected) announce(say.cancel(...spoken(held.item, placeOf(held.item))))
  }

  const changed = () => {
    root.dispatchEvent(new Event('input', { bubbles: true }))
    root.dispatchEvent(new Event('change', { bubbles: true }))
  }

  /**
   * The one path of a commit: put an item in a place, bring it into view, give focus back and dispatch.
   * @param {HTMLElement} item
   * @param {Place} to
   * @param {boolean | 'pointer'} focus Whether its handle takes focus afterward: `'pointer'` after a drag, which
   *   asks for no focus ring, since a ring is for the keys and the first press on a page would otherwise draw one.
   *   Focus the move itself took away is always given back.
   * @param {boolean} [seen] Whether the item is brought into view: not for a move the page makes by itself.
   * @returns {boolean | Promise<boolean>} Whether the arrangement changed: at once, or once it has been drawn.
   */
  const shift = (item, to, focus, seen = true) => {
    const from = placeOf(item)
    const index = Math.max(0, Math.min(others(to, item).length, to.index))
    const list = listOf(to.column)
    if (!list || (from.column === to.column && from.index === index)) return false
    const value = valueOf(item)
    const before = written()
    const active = /** @type {HTMLElement | null} */ (item.contains(document.activeElement) ? document.activeElement : null)

    const after = () => {
      moving = false
      const moved = find(value) ?? item
      // A reader's own move is brought into view; one the page makes, with `move`, leaves the view where it is.
      if (seen) moved.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
      // Another item picked up while this one was drawn is held on the board as it now is.
      if (carry) carry.written = written()
      if (focus) handleOf(moved)?.focus(/** @type {FocusOptions} */ ({ preventScroll: true, ...(focus === 'pointer' ? { focusVisible: false } : {}) }))
      // A node inserted again loses focus; what had it gets it back without scrolling again.
      else if (active?.isConnected && document.activeElement !== active && !root.contains(document.activeElement)) active.focus({ preventScroll: true })
      const now = written() !== before
      if (now) changed()
      return now
    }

    // An owner that throws, at once or later, leaves the board as it was and able to move again.
    const failed = (/** @type {unknown} */ error) => {
      moving = false
      throw error
    }
    /** Draw the arrangement: the owner's own drawing, or the node put in its place. */
    const draw = () => {
      if (!arrange) return put(list, item, index)
      const next = read().map((entry) => ({ value: entry.value, items: entry.items.filter((each) => each !== value) }))
      next.find((entry) => entry.value === valueOf(to.column))?.items.splice(index, 0, value)
      return arrange(next)
    }

    moving = true
    const glide = glides()
    if (glide) {
      // The platform draws the way from the old arrangement to the new: every item glides to where it now stands.
      let transition = null
      try {
        transition = glide.call(root, () => draw())
      } catch {
        // A browser that would not start one draws the arrangement at once, below.
      }
      if (transition) {
        // A transition another one cuts short still drew the arrangement: only its animation is given up.
        transition.ready?.catch(() => {})
        transition.finished?.catch(() => {})
        return transition.updateCallbackDone.then(after, failed)
      }
    }
    if (arrange) {
      let drawn
      try {
        drawn = draw()
      } catch (error) {
        return failed(error)
      }
      return Promise.resolve(drawn).then(after, failed)
    }
    draw()
    return after()
  }

  /* The carried sheet. */

  /** Ends a landing in progress at once. */
  let settle = () => {}

  const show = (/** @type {HTMLElement} */ item) => {
    const sheet = preview()
    if (!sheet || typeof sheet.showPopover !== 'function') return
    settle()
    sheet.textContent = nameOf(item)
    try {
      sheet.showPopover()
    } catch {
      // A popover that cannot be shown, such as one out of the document, shows nothing.
    }
  }

  /** @param {boolean} [now] Whether a leaving the sheet is doing ends at once too. */
  const hide = (now = true) => {
    const sheet = preview()
    if (!sheet) return
    if (now) sheet.classList.remove('kanban-preview-landing')
    try {
      if (sheet.matches(':popover-open')) sheet.hidePopover()
    } catch {
      // A browser without the popover API never showed it.
    }
  }

  const follow = (/** @type {number} */ x, /** @type {number} */ y) => {
    const sheet = preview()
    if (!sheet) return
    sheet.style.setProperty('--kanban-x', `${Math.round(x)}px`)
    sheet.style.setProperty('--kanban-y', `${Math.round(y)}px`)
  }

  /**
   * The release: the sheet leaves where it is, at once, `kanban-preview-landing` while it does. It stood for the
   * item only while the pointer carried it, and holds only its name: sent on to the item's place it was a second,
   * smaller picture of the item sliding over the item itself. From the release the item is the one that moves.
   */
  const leave = () => {
    const sheet = preview()
    let shown = false
    try {
      shown = !!sheet?.matches(':popover-open')
    } catch {
      shown = false
    }
    if (!sheet || !shown) return
    settle()
    sheet.classList.add('kanban-preview-landing')
    hide(false)
    const ending = new AbortController()
    const wait = setTimeout(() => settle(), 240)
    settle = () => {
      settle = () => {}
      clearTimeout(wait)
      ending.abort()
      sheet.classList.remove('kanban-preview-landing')
    }
    sheet.addEventListener('transitionend', (event) => {
      if (event.target === sheet && /** @type {TransitionEvent} */ (event).propertyName === 'opacity') settle()
    }, { signal: ending.signal })
  }

  /* The keys, and a press that does not move. */

  /** Bring the place chosen into view: its column across the board, then the item it stands before. */
  const reveal = () => {
    if (!carry?.target) return
    const list = others(carry.target, carry.item)
    carry.target.column.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    ;(list[carry.target.index] ?? list.at(-1))?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }

  /**
   * Commit the move the keys chose.
   * @param {boolean} focus Whether the handle keeps focus: not when focus is what left it.
   * @param {boolean} [told] Whether the drop is said: not when another item is picked up in the same breath,
   *   whose own words would be cut off by these.
   */
  const commit = async (focus, told = true) => {
    const held = release()
    if (!held) return
    const to = held.target ?? held.origin
    const moves = !same(to, held.origin)
    try {
      if (moves) await shift(held.item, to, focus)
    } finally {
      // Whatever became of the move, the item is no longer held: a handle left pressed would fade it for good.
      held.handle.setAttribute('aria-pressed', 'false')
    }
    const item = find(valueOf(held.item)) ?? held.item
    handleOf(item)?.setAttribute('aria-pressed', 'false')
    // A drop in the same place is said too: the reader hears that the item is no longer held.
    if (told && item.isConnected) announce(say.drop(...spoken(item, placeOf(item))))
  }

  root.addEventListener('click', (event) => {
    const target = /** @type {Element} */ (event.target)
    const handle = /** @type {HTMLButtonElement | null} */ (target.closest('.kanban-handle'))
    const item = /** @type {HTMLElement | null} */ (handle?.closest('.kanban-item') ?? null)
    if (!handle || !item || !within(item) || handle.disabled) return
    // The click a drag's release makes has already been answered.
    if (/** @type {MouseEvent} */ (event).detail !== 0 && released) {
      released = false
      return
    }
    if (moving || drag?.dragging) return
    if (carry?.item === item) {
      commit(true)
      return
    }
    if (carry) commit(false, false)
    // A sheet still leaving is gone before the item is held again.
    settle()
    pick(item, handle)
    // The handle takes focus, so the arrows and Escape work from here and a press elsewhere drops the item.
    if (document.activeElement !== handle) handle.focus({ preventScroll: true })
    announce(say.grab(...spoken(item, placeOf(item))))
  }, { signal })

  root.addEventListener('keydown', (event) => {
    if (!carry?.keys || !carry.target || event.ctrlKey || event.metaKey || event.altKey) return
    if (/** @type {Element} */ (event.target).closest('.kanban-handle') !== carry.handle) return
    if (event.key === 'Escape') {
      event.preventDefault()
      stop()
      return
    }
    const { item, target } = carry
    const count = (/** @type {HTMLElement} */ column) => itemsOf(column).filter((each) => each !== item).length
    /** @type {Place | null} */
    let next = null
    if (event.key === 'ArrowUp') next = { column: target.column, index: Math.max(0, target.index - 1) }
    else if (event.key === 'ArrowDown') next = { column: target.column, index: Math.min(count(target.column), target.index + 1) }
    else if (event.key === 'Home') next = { column: target.column, index: 0 }
    else if (event.key === 'End') next = { column: target.column, index: count(target.column) }
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const rtl = getComputedStyle(root).direction === 'rtl'
      const by = (event.key === 'ArrowRight') !== rtl ? 1 : -1
      const board = open()
      // A column that has been hidden under the item is left for the nearest one that is shown.
      const at = board.indexOf(target.column)
      const column = board[Math.max(0, Math.min(board.length - 1, at + by))]
      if (column) next = { column, index: Math.min(count(column), target.index) }
    }
    if (!next) return
    event.preventDefault()
    if (same(next, target)) return
    carry.target = next
    mark()
    reveal()
    announce(say.move(...spoken(item, next)))
  }, { signal })

  root.addEventListener('focusout', (event) => {
    if (!carry?.keys || moving || event.target !== carry.handle) return
    // A window that loses focus has not left the handle: the item is still held when the reader comes back.
    if (document.hasFocus?.() === false) return
    commit(false)
  }, { signal })

  /* The pointer. */

  /**
   * A press on a handle, and the drag it becomes. `dx` and `dy` are where the pointer took hold of the item,
   * from its corner.
   * @type {{ item: HTMLElement, handle: HTMLButtonElement, whole: boolean, id: number, startX: number, startY: number, x: number, y: number, dx: number, dy: number, dragging: boolean, frame: number } | null}
   */
  let drag = null

  /** The column the pointer is in, or the nearest across when it is between two. */
  const columnAt = (/** @type {number} */ x) => {
    /** @type {HTMLElement | null} */
    let nearest = null
    let least = Infinity
    for (const column of open()) {
      const box = column.getBoundingClientRect()
      const away = x < box.left ? box.left - x : x > box.right ? x - box.right : 0
      if (away < least) {
        least = away
        nearest = column
      }
    }
    return nearest
  }

  /**
   * Find the place under the pointer and mark it. Off the board there is none. The items stand still during a
   * drag, so each box is where the item is; to leave the place it has, the pointer passes an item's middle by
   * a few pixels, which keeps a resting pointer from trading two places back and forth.
   */
  const aim = () => {
    if (!drag || !carry) return
    const { x, y } = drag
    const board = root.getBoundingClientRect()
    const column = x < board.left || x > board.right || y < board.top || y > board.bottom ? null : columnAt(x)
    if (!column) carry.target = null
    else {
      const list = itemsOf(column).filter((each) => each !== carry?.item)
      const current = carry.target?.column === column ? carry.target.index : -1
      let index = list.findIndex((each, at) => {
        const box = each.getBoundingClientRect()
        return y < box.top + box.height / 2 + (current < 0 ? 0 : at < current ? -hysteresis : hysteresis)
      })
      if (index < 0) index = list.length
      carry.target = { column, index }
    }
    mark()
  }

  /**
   * How fast a scroller moves for a pointer at `at` between its ends: nothing in the middle, faster the further
   * into an end, and no faster once the pointer is as far past the end as the zone is deep.
   */
  const speed = (/** @type {number} */ at, /** @type {number} */ start, /** @type {number} */ finish) => {
    const zone = Math.min(edge, (finish - start) / 3)
    if (zone <= 0) return 0
    const into = at < start + zone ? at - (start + zone) : at > finish - zone ? at - (finish - zone) : 0
    return Math.max(-2, Math.min(2, into / zone)) * (pace / 2)
  }

  /** While the pointer is near an end of the board or of the column it is over, scroll that one. */
  const scroll = (/** @type {number} */ time, /** @type {number} */ before = time) => {
    if (!drag?.dragging) return
    const elapsed = Math.min(64, time - before)
    let moved = false
    // Off the board a release cancels, so the board holds still there: it scrolls only toward a place.
    if (carry?.target && root.scrollWidth > root.clientWidth) {
      const box = root.getBoundingClientRect()
      const by = speed(drag.x, box.left, box.right) * elapsed
      if (by) {
        const from = root.scrollLeft
        root.scrollLeft += by
        moved = root.scrollLeft !== from
      }
    }
    const list = carry?.target ? listOf(carry.target.column) : null
    if (list && list.scrollHeight > list.clientHeight) {
      const box = list.getBoundingClientRect()
      const by = speed(drag.y, box.top, box.bottom) * elapsed
      if (by) {
        const from = list.scrollTop
        list.scrollTop += by
        moved ||= list.scrollTop !== from
      }
    }
    // The pointer has not moved, but what is under it has.
    if (moved) aim()
    drag.frame = requestAnimationFrame((next) => scroll(next, time))
  }

  /**
   * End the press, or the drag.
   * @param {boolean} keep Whether to commit where the pointer is.
   * @param {boolean} [told] Whether a drag that moves nothing is said to be cancelled.
   */
  const end = (keep, told = true) => {
    if (!drag) return
    const { item, handle, dragging, frame, id } = drag
    cancelAnimationFrame(frame)
    drag = null
    try {
      if (handle.hasPointerCapture?.(id)) handle.releasePointerCapture(id)
    } catch {
      // A pointer the browser no longer knows holds no capture.
    }
    if (!dragging) return
    // The release of a drag clicks the handle that held the pointer; that click is not a press.
    released = true
    const held = release()
    const to = keep && held?.target && !same(held.target, held.origin) ? held.target : null
    // The sheet leaves and the handle lets go: the item is drawn whole again, before the move, so the move
    // carries the item as it is and nothing else travels with it.
    leave()
    handle.setAttribute('aria-pressed', 'false')
    if (!to) {
      // Left where it was: only a drop on its own place is not a cancelled move.
      if (told && item.isConnected && !(keep && held?.target)) announce(say.cancel(...spoken(item, placeOf(item))))
      return
    }
    Promise.resolve(shift(item, to, 'pointer')).then((now) => {
      const moved = find(valueOf(item)) ?? item
      handleOf(moved)?.setAttribute('aria-pressed', 'false')
      if (now && moved.isConnected) announce(say.drop(...spoken(moved, placeOf(moved))))
    }, () => {
      // The owner did not take the arrangement: the item stays where it was, already let go.
    })
  }

  /** Take the pointer for the handle, so the drag goes on wherever the pointer does. */
  const capture = (/** @type {HTMLElement} */ handle, /** @type {number} */ id) => {
    try {
      handle.setPointerCapture?.(id)
    } catch {
      // A pointer the browser no longer knows cannot be captured; the document still hears it.
    }
  }

  root.addEventListener('pointerdown', (event) => {
    const target = /** @type {Element} */ (event.target)
    const grip = /** @type {HTMLButtonElement | null} */ (target.closest('.kanban-handle'))
    // A mouse carries an item by any part of it that does nothing else. A finger does not: there a press on the
    // item is the start of a scroll, and only the handle refuses to scroll.
    const whole = !grip && event.pointerType === 'mouse' && !target.closest(busy)
    const item = /** @type {HTMLElement | null} */ ((grip ?? (whole ? target : null))?.closest('.kanban-item') ?? null)
    const handle = grip ?? (whole ? handleOf(item) : null)
    if (!handle || !item || !within(item) || event.button !== 0 || !event.isPrimary || drag || moving) return
    if (handle.disabled) return
    released = false
    settle()
    if (grip) {
      // No text is selected and nothing scrolls under the press; focus stays where it was, so a ring the keys
      // would show does not appear for the pointer, and an item the keys hold is not dropped before the click.
      event.preventDefault()
      // A press on the handle of the item the keys hold is the press that drops it.
      if (carry?.item === item) return
      capture(handle, event.pointerId)
    }
    // A press on the item itself is still a click on whatever it is over until it moves: nothing is taken yet.
    drag = { item, handle, whole, id: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, dx: 0, dy: 0, dragging: false, frame: 0 }
  }, { signal })

  document.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return
    // A press whose release never arrived, as when a menu opened over it, is not a drag once no button is down.
    if (!drag.dragging && event.pointerType === 'mouse' && event.buttons === 0) {
      end(false)
      return
    }
    drag.x = event.clientX
    drag.y = event.clientY
    if (!drag.dragging) {
      if (Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < threshold) return
      // An item the keys hold is dropped where they chose before another is carried.
      if (carry) commit(false, false)
      drag.dragging = true
      if (drag.whole) {
        // The press began on the item's words: what it selected on the way here is let go, and the handle takes
        // the pointer from now on.
        document.getSelection?.()?.removeAllRanges()
        capture(drag.handle, drag.id)
      }
      const box = drag.item.getBoundingClientRect()
      drag.dx = drag.startX - box.left
      drag.dy = drag.startY - box.top
      pick(drag.item, drag.handle, false)
      preview()?.style.setProperty('--kanban-width', `${Math.round(box.width)}px`)
      follow(drag.x - drag.dx, drag.y - drag.dy)
      show(drag.item)
      drag.frame = requestAnimationFrame((time) => scroll(time))
    }
    follow(drag.x - drag.dx, drag.y - drag.dy)
    aim()
  }, { signal })

  document.addEventListener('pointerup', (event) => {
    if (drag && event.pointerId === drag.id) end(true)
  }, { signal })
  document.addEventListener('pointercancel', (event) => {
    if (drag && event.pointerId === drag.id) end(false)
  }, { signal })
  // A capture taken away during a drag, by the browser or by another script, ends it where it started.
  root.addEventListener('lostpointercapture', (event) => {
    if (drag?.dragging && event.pointerId === drag.id && event.target === drag.handle) end(false)
  }, { signal })
  // A wheel or a key may scroll a list, the board or the page under a pointer that holds still: the place is found again.
  document.addEventListener('scroll', () => {
    if (drag?.dragging) aim()
  }, { signal, capture: true, passive: true })
  document.addEventListener('keydown', (event) => {
    if (drag?.dragging && event.key === 'Escape') {
      event.preventDefault()
      end(false)
    }
  }, { signal })

  /* The mover. */

  /** The value of the item the mover is open for. */
  let chosen = ''

  /** Write a select's options: rows of data, in the select's own class where it has one. */
  const fill = (/** @type {HTMLSelectElement} */ select, /** @type {[value: string, text: string][]} */ rows, /** @type {string} */ value) => {
    const styled = select.classList.contains('select')
    select.replaceChildren(...rows.map(([each, text]) => {
      const option = document.createElement('option')
      option.value = each
      option.textContent = text
      if (styled) option.className = 'select-option'
      return option
    }))
    select.value = value
  }

  /** The places the chosen column has for the item: one more than its other items, the item's own by default. */
  const places = (/** @type {HTMLFormElement} */ form) => {
    const item = find(chosen)
    const column = open().find((each) => valueOf(each) === /** @type {HTMLSelectElement | undefined} */ (form.elements.namedItem('column'))?.value)
    const position = /** @type {HTMLSelectElement | null} */ (form.elements.namedItem('position'))
    if (!item || !column || !position) return
    const count = itemsOf(column).filter((each) => each !== item).length + 1
    const own = columnOf(item) === column ? itemsOf(column).indexOf(item) + 1 : count
    fill(position, Array.from({ length: count }, (_, at) => [String(at + 1), String(at + 1)]), String(own))
  }

  root.addEventListener('click', (event) => {
    const form = mover()
    const trigger = /** @type {Element} */ (event.target).closest('[popovertarget], [commandfor]')
    const item = /** @type {HTMLElement | null} */ (trigger?.closest('.kanban-item') ?? null)
    const sheet = form?.closest('[popover]')
    if (!form || !trigger || !item || !within(item) || !sheet?.id) return
    // An item whose handle is disabled stays where it is, by any way: the mover is not opened for it.
    if (handleOf(item)?.disabled) {
      event.preventDefault()
      return
    }
    if ((trigger.getAttribute('popovertarget') ?? trigger.getAttribute('commandfor')) !== sheet.id) return
    chosen = valueOf(item)
    // One form serves every item: it takes the name of the button that opened it, "Move Draft the launch post".
    const named = trigger.getAttribute('aria-label')
    if (named) form.setAttribute('aria-label', named)
    const column = /** @type {HTMLSelectElement | null} */ (form.elements.namedItem('column'))
    const own = columnOf(item)
    if (column && own) fill(column, open().map((each) => [valueOf(each), titleOf(each)]), valueOf(own))
    places(form)
  }, { signal })

  root.addEventListener('change', (event) => {
    const form = mover()
    if (form && /** @type {Element} */ (event.target).closest('.kanban-mover') === form && /** @type {HTMLSelectElement} */ (event.target).name === 'column') places(form)
  }, { signal })

  root.addEventListener('submit', async (event) => {
    const form = mover()
    if (!form || event.target !== form) return
    event.preventDefault()
    const item = find(chosen)
    const column = open().find((each) => valueOf(each) === /** @type {HTMLSelectElement | undefined} */ (form.elements.namedItem('column'))?.value)
    const index = Number(/** @type {HTMLSelectElement | undefined} */ (form.elements.namedItem('position'))?.value) - 1
    try {
      /** @type {any} */ (form.closest('[popover]'))?.hidePopover?.()
    } catch {
      // A popover that is not open has nothing to hide.
    }
    if (!item || !column || !Number.isInteger(index) || moving || handleOf(item)?.disabled) return
    stop(false)
    const now = await shift(item, { column, index }, true)
    const moved = find(chosen) ?? item
    // A move that changed nothing still leaves focus on the handle, where the keys go on from.
    if (!now) handleOf(moved)?.focus({ preventScroll: true })
    if (moved.isConnected) announce(say.drop(...spoken(moved, placeOf(moved))))
  }, { signal })

  /* The value, and the way out. */

  signal.addEventListener('abort', () => {
    clearTimeout(timer)
    if (drag) cancelAnimationFrame(drag.frame)
    drag = null
    const held = release()
    held?.handle.setAttribute('aria-pressed', 'false')
    settle()
    hide()
  })

  const detach = valued(
    () => controller.abort(),
    read,
    (next) => {
      const whole = plan(next)
      if (!whole || JSON.stringify(whole) === written()) return
      stop(false)
      if (arrange) arrange(whole)
      else draw(whole)
    }
  )

  return Object.assign(detach, {
    /**
     * Commit one move: an item, by its value, to a place among the other items of a column.
     * @param {string} item
     * @param {string} column
     * @param {number} index
     */
    move: (item, column, index) => {
      const node = find(String(item))
      // A column that is hidden takes no item, and a move still being drawn is finished before the next.
      const to = open().find((each) => valueOf(each) === String(column))
      if (!node || !to || !Number.isInteger(index) || index < 0 || moving) return false
      stop(false)
      return shift(node, { column: to, index }, false, false)
    },
  })
}
