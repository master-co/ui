/**
 * Sortable: a list whose items are put in order by dragging a handle or with the keys.
 *
 * The root, the element with the `sortable` class, holds the items, `sortable-item`, each with a button,
 * `sortable-handle`, named with what it moves. The list runs down the page, or across it with `sortable-row`.
 *
 * With the pointer: a press on a handle that moves more than a few pixels picks the item up. The handle says
 * `aria-pressed="true"` while it is carried and the item follows the pointer through `--sortable-offset`.
 * The items between its place and the one it would land in make room: they carry `sortable-item-back` or
 * `sortable-item-forward`, and the stylesheet moves them by `--sortable-size`, the carried item's size with
 * the gap after it, which the root carries during the drag. Where each item stands is measured once, as the
 * item is picked up, so an item still gliding aside never moves the place it is aimed at, and the place
 * changes only once the carried item's middle is a few pixels past a neighbor's: a pointer that rests on the
 * line between two places does not make them trade back and forth. No node moves until the release, which
 * moves the item once, while the root says `aria-busy="true"`. Escape puts it back. A list that scrolls is
 * scrolled while the pointer is near its ends.
 *
 * With the keys: Enter or Space on a handle picks the item up, the arrow keys along the list move it one
 * place at a time, Enter or Space drops it and Escape puts it back where it was picked up. Leaving the handle
 * drops it too. Each step is said in the `sortable-status` region, a `role="status"` inside the root or
 * right after it: picked up, moved, dropped or put back, with the place it is in. An item is called by its
 * `aria-label`, or by the first words it holds.
 *
 * Without a drag: a press on a handle that does not move, a click or a tap, picks the item up as Enter does
 * and gives its handle focus. A press on another item's handle then moves it to that place and drops it, and a
 * press on its own handle drops it where it is. Dragging is never the only way, for a pointer that cannot
 * drag, a screen reader's double tap, or a hand that would rather not.
 *
 * A move is the item node itself moving, with `moveBefore()` where the browser has it so what it holds keeps
 * its state, and inside a view transition where the browser has one and motion is not reduced: the items
 * slide to their places. The root dispatches `input` and `change` after a move. The function it returns has
 * a `value`, the order of the items: each one's `data-value`, or its text. Set it to put them in that order;
 * that dispatches nothing.
 *
 * Items may be written by something else, such as a framework that renders them from its own list. Give
 * `move`, and the script moves no node: it calls `move(from, to)` with the two places, and waits for the
 * promise it returns, if any, before the view transition takes its second picture.
 */
import { label, valued } from './internal.js'

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * @typedef {object} SortableMessages What the status region says, given the item's name, its place from 1
 *   and the number of items.
 * @property {(name: string, position: number, count: number) => string} [grab]
 * @property {(name: string, position: number, count: number) => string} [point] Picked up by a press without a drag.
 * @property {(name: string, position: number, count: number) => string} [move]
 * @property {(name: string, position: number, count: number) => string} [drop]
 * @property {(name: string, position: number, count: number) => string} [cancel]
 */

/** @type {Required<SortableMessages>} */
const english = {
  grab: (name, position, count) => `${name}, picked up at position ${position} of ${count}. Use the arrow keys to move it, Space to drop it, Escape to cancel.`,
  point: (name, position, count) => `${name}, picked up at position ${position} of ${count}. Press the handle of another item to move it there, or this one to drop it.`,
  move: (name, position, count) => `${name}, position ${position} of ${count}.`,
  drop: (name, position, count) => `${name}, dropped at position ${position} of ${count}.`,
  cancel: (name, position, count) => `${name}, move cancelled. Back at position ${position} of ${count}.`,
}

/** How far a press moves before it is a drag, in pixels. */
const threshold = 4

/** How far past a neighbor's middle the carried item's middle goes before they trade places, in pixels. */
const hysteresis = 6

/**
 * @param {HTMLElement} root The element with the `sortable` class.
 * @param {{ messages?: SortableMessages, move?: (from: number, to: number) => unknown }} [options]
 *   `messages`: what the status region says. `move`: takes over moving the items.
 * @returns {(() => void) & { value: string[] }} Removes everything the behavior added. Its `value` is the
 *   order of the items.
 */
export function sortable(root, { messages = {}, move } = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)
  const say = { ...english, ...messages }
  const document = root.ownerDocument

  const items = () => /** @type {HTMLElement[]} */ ([...root.querySelectorAll('.sortable-item')]).filter((item) => item.closest('.sortable') === root)
  const valueOfItem = (/** @type {Element} */ item) => item.getAttribute('data-value') ?? label(item)
  /** What an item is called: its `aria-label`, or the first words it holds, such as a row's title. */
  const nameOf = (/** @type {Element} */ item) => {
    const own = item.getAttribute('aria-label')
    if (own) return own
    const walker = document.createTreeWalker(item, 4 /* NodeFilter.SHOW_TEXT */)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim()
      if (text) return text
    }
    return label(item)
  }
  const row = () => root.classList.contains('sortable-row')
  const status = () => /** @type {HTMLElement | null} */ (root.querySelector('.sortable-status') ?? (root.nextElementSibling?.matches('.sortable-status') ? root.nextElementSibling : null))

  /**
   * Put a node at a place among the items, the node itself, so what it holds keeps its state.
   * @param {HTMLElement} item
   * @param {number} index
   */
  const place = (item, index) => {
    const others = items().filter((each) => each !== item)
    const container = /** @type {HTMLElement} */ (item.parentElement)
    const before = others[index] ?? others.at(-1)?.nextSibling ?? null
    if (before === item) return
    const host = /** @type {any} */ (container)
    if (typeof host.moveBefore === 'function') {
      try {
        host.moveBefore(item, before)
        return
      } catch {
        // A node that cannot be moved atomically, such as one from another document, is inserted again.
      }
    }
    container.insertBefore(item, before)
  }

  const detach = valued(
    () => controller.abort(),
    () => items().map(valueOfItem),
    (next) => {
      const order = [next ?? []].flat().map(String)
      const current = items()
      if (current.map(valueOfItem).join('\n') === order.join('\n')) return
      const ranked = [...current].sort((a, b) => {
        const at = (/** @type {Element} */ item) => {
          const index = order.indexOf(valueOfItem(item))
          return index < 0 ? order.length + current.indexOf(/** @type {HTMLElement} */ (item)) : index
        }
        return at(a) - at(b)
      })
      ranked.forEach((item, index) => place(item, index))
    }
  )

  /** Say something in the status region, after a pause, so a focus announcement does not swallow it. */
  let timer = 0
  const announce = (/** @type {string} */ text) => {
    const region = status()
    if (!region) return
    region.textContent = ''
    clearTimeout(timer)
    timer = /** @type {any} */ (setTimeout(() => { region.textContent = text }, 400))
  }
  signal.addEventListener('abort', () => clearTimeout(timer))

  const motion = () => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  /**
   * Run a change inside a view transition where there is one: scoped to the list where the browser can,
   * otherwise of the document. Resolves once the change is made.
   * @param {() => unknown} update
   * @returns {Promise<unknown>} When the transition, or the change without one, is over.
   */
  const transition = (update) => {
    // While the items change places, the list is busy: the stylesheet lets nothing glide but the transition.
    // It turns busy inside the change, after the first picture is taken, so an item still gliding aside is
    // pictured where it is and goes on from there instead of jumping to where it was going.
    const change = () => {
      root.setAttribute('aria-busy', 'true')
      return update()
    }
    const done = () => root.removeAttribute('aria-busy')
    const scoped = /** @type {any} */ (root).startViewTransition
    const whole = /** @type {any} */ (document).startViewTransition
    const named = typeof CSS !== 'undefined' && CSS.supports?.('view-transition-name', 'match-element')
    if (!named || !motion() || (!scoped && !whole)) return Promise.resolve(change()).finally(done)
    const running = scoped ? scoped.call(root, change) : whole.call(document, change)
    return running.finished.catch(() => {}).finally(done)
  }

  /**
   * Move an item from one place to another and say so. With `move`, the owner of the items moves it.
   * @param {HTMLElement} item
   * @param {number} to
   * @param {() => void} [after] Runs inside the change, once the item is in its new place.
   */
  const shift = (item, to, after) => {
    const from = items().indexOf(item)
    const handle = /** @type {HTMLElement | null} */ (item.querySelector('.sortable-handle'))
    const focused = handle && document.activeElement === handle
    return transition(async () => {
      if (from !== to) {
        if (move) await move(from, to)
        else place(item, to)
      }
      after?.()
      // A node inserted again loses focus; the handle gets it back without scrolling the page again.
      const moved = move ? items()[to] : item
      const again = /** @type {HTMLElement | null} */ (moved?.querySelector('.sortable-handle'))
      if (focused && again && document.activeElement !== again) again.focus({ preventScroll: true })
      moved?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    })
  }

  const changed = () => {
    root.dispatchEvent(new Event('input', { bubbles: true }))
    root.dispatchEvent(new Event('change', { bubbles: true }))
  }

  /* The keys. */

  /** @type {{ item: HTMLElement, from: number } | null} */
  let grabbed = null
  /** True while a key's move is running: the blur it may cause is not leaving the handle. */
  let moving = false
  /** True once a drag has ended, until the next press: the click its release makes is not a press. */
  let released = false

  const handleOf = (/** @type {Element | null} */ item) => /** @type {HTMLElement | null} */ (item?.querySelector('.sortable-handle') ?? null)
  /** @returns {[number, number]} */
  const position = (/** @type {HTMLElement} */ item) => [items().indexOf(item) + 1, items().length]

  const pick = (/** @type {HTMLElement} */ item, pointed = false) => {
    grabbed = { item, from: items().indexOf(item) }
    handleOf(item)?.setAttribute('aria-pressed', 'true')
    announce((pointed ? say.point : say.grab)(nameOf(item), ...position(item)))
  }

  const drop = (/** @type {HTMLElement} */ item) => {
    const from = grabbed?.from ?? -1
    grabbed = null
    // The handle stays pressed through the move's transition and lets go after it.
    handleOf(item)?.setAttribute('aria-pressed', 'false')
    const now = items().indexOf(item)
    announce(say.drop(nameOf(item), ...position(item)))
    if (now !== from) changed()
  }

  const cancel = async (/** @type {HTMLElement} */ item) => {
    const from = grabbed?.from ?? items().indexOf(item)
    grabbed = null
    moving = true
    await shift(item, from)
    moving = false
    const current = items()[from] ?? item
    handleOf(current)?.setAttribute('aria-pressed', 'false')
    announce(say.cancel(nameOf(current), ...position(current)))
  }

  root.addEventListener('click', async (event) => {
    const handle = /** @type {HTMLElement | null} */ (/** @type {Element} */ (event.target).closest('.sortable-handle'))
    const item = /** @type {HTMLElement | null} */ (handle?.closest('.sortable-item') ?? null)
    if (!handle || !item || item.closest('.sortable') !== root) return
    if (/** @type {HTMLButtonElement} */ (handle).disabled) return
    // Enter and Space: pick up and drop where it is.
    if (/** @type {MouseEvent} */ (event).detail === 0) {
      if (grabbed?.item === item) drop(item)
      else {
        if (grabbed) drop(grabbed.item)
        pick(item)
      }
      return
    }
    // The pointer: the click a drag's release makes has already moved the item.
    if (released) {
      released = false
      return
    }
    if (moving) return
    if (!grabbed) {
      pick(item, true)
      // The handle takes focus, as a key's pick has it: the arrows and Escape work from here, and a press
      // elsewhere on the page drops the item where it is.
      handle.focus({ preventScroll: true })
      return
    }
    if (grabbed.item === item) {
      drop(item)
      return
    }
    // A press on another item's handle: the item picked up takes that place, and is dropped there.
    const to = items().indexOf(item)
    moving = true
    await shift(grabbed.item, to)
    moving = false
    const current = move ? items()[to] : grabbed?.item
    if (grabbed && current) {
      grabbed.item = current
      drop(current)
    }
  }, { signal })

  root.addEventListener('keydown', async (event) => {
    if (!grabbed || event.ctrlKey || event.metaKey || event.altKey) return
    const handle = /** @type {Element} */ (event.target).closest('.sortable-handle')
    if (!handle || handle.closest('.sortable-item') !== grabbed.item) return
    const item = grabbed.item
    const rtl = getComputedStyle(root).direction === 'rtl'
    const steps = row()
      ? /** @type {Record<string, number>} */ ({ ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 })
      : /** @type {Record<string, number>} */ ({ ArrowDown: 1, ArrowUp: -1 })
    if (event.key === 'Escape') {
      event.preventDefault()
      await cancel(item)
      return
    }
    if (!(event.key in steps) && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const list = items()
    const from = list.indexOf(item)
    const to = event.key === 'Home' ? 0 : event.key === 'End' ? list.length - 1 : Math.min(list.length - 1, Math.max(0, from + steps[event.key]))
    if (to === from || moving) return
    moving = true
    await shift(item, to)
    moving = false
    const current = move ? items()[to] : item
    if (grabbed && current) {
      grabbed.item = current
      announce(say.move(nameOf(current), ...position(current)))
    }
  }, { signal })

  root.addEventListener('focusout', (event) => {
    if (!grabbed || moving) return
    if (/** @type {Element} */ (event.target).closest('.sortable-item') !== grabbed.item) return
    drop(grabbed.item)
  }, { signal })

  /* The pointer. */

  /**
   * A drag in progress. `others` are the items it passes and `middles` where their middles stand in the root's
   * scrolled content, and `middle` the carried item's own, all measured once as it is picked up.
   * @type {{ item: HTMLElement, handle: HTMLElement, id: number, start: number, scroll: number, last: number, dragging: boolean, from: number, to: number, frame: number, others: HTMLElement[], middles: number[], middle: number, rtl: boolean } | null}
   */
  let drag = null
  const axis = (/** @type {PointerEvent | MouseEvent} */ event) => (row() ? event.clientX : event.clientY)
  const scrollOf = () => (row() ? root.scrollLeft : root.scrollTop)

  /** The items that make room step back to where they were. */
  const unmark = () => {
    for (const item of items()) item.classList.remove('sortable-item-back', 'sortable-item-forward')
  }

  /** The root's start along the list, on the screen. Its box never moves with the items inside it. */
  const originOf = () => {
    const box = root.getBoundingClientRect()
    return row() ? box.left : box.top
  }

  /**
   * An item's box in the layout: its box without the translate it wears now, which is wherever an item gliding
   * aside, or back, has got to, so a measure taken mid-glide is still true.
   * @param {HTMLElement} each
   * @returns {{ start: number, size: number }} Along the list, on the screen.
   */
  const laid = (each) => {
    const box = each.getBoundingClientRect()
    const [x = 0, y = 0] = String(getComputedStyle(each)?.translate ?? '').split(' ').map((part) => parseFloat(part) || 0)
    return row() ? { start: box.left - x, size: box.width } : { start: box.top - y, size: box.height }
  }

  /**
   * Where an item's middle stands in the layout, in the root's scrolled content.
   * @param {HTMLElement} each
   * @param {number} origin The root's start on the screen.
   */
  const settled = (each, origin) => {
    const { start, size } = laid(each)
    return start + size / 2 - origin + scrollOf()
  }

  /** Measure the drag's items once, as the item is picked up; no node moves until the release. */
  const measure = () => {
    if (!drag) return
    const origin = originOf()
    const list = items()
    drag.from = list.indexOf(drag.item)
    drag.to = drag.from
    drag.others = list.filter((each) => each !== drag?.item)
    drag.middles = drag.others.map((each) => settled(each, origin))
    drag.middle = settled(drag.item, origin)
    drag.rtl = row() && getComputedStyle(root)?.direction === 'rtl'
  }

  /**
   * Find where the item would land from its middle, and have the items between its place and that one make
   * room: toward the start when it is carried toward the end, and the other way. Its middle is where it was
   * measured plus how far it has been carried; a neighbor's is where it stands in the layout, without the room
   * it is making, so the place does not chase itself. To trade places the carried middle has to pass a
   * neighbor's by a few pixels, which keeps a resting pointer from flipping them.
   */
  const aim = () => {
    if (!drag) return
    const { from, others, middles, rtl } = drag
    // Both sides are read in the root's content, so a scroll of the root or of the page moves neither.
    const carried = drag.middle + drag.last - drag.start + scrollOf() - drag.scroll
    // Along the list: right to left, a place further on is further left.
    const along = (/** @type {number} */ middle) => (rtl ? -middle : middle)
    const current = drag.to
    let to = others.findIndex((_, index) => along(carried) < along(middles[index]) + (index < current ? -hysteresis : hysteresis))
    if (to < 0) to = others.length
    drag.to = to
    others.forEach((each, index) => {
      // `index` is the place the item would take with the carried one gone from the list.
      each.classList.toggle('sortable-item-back', index >= from && index < to)
      each.classList.toggle('sortable-item-forward', index >= to && index < from)
    })
  }

  const follow = () => {
    if (!drag) return
    drag.item.style.setProperty('--sortable-offset', `${drag.last - drag.start + scrollOf() - drag.scroll}px`)
  }

  /** While the pointer is near an end of a list that scrolls, scroll it, faster the further in it is. */
  const scroll = (/** @type {number} */ time, /** @type {number} */ before = time) => {
    if (!drag?.dragging) return
    const box = root.getBoundingClientRect()
    const length = row() ? root.scrollWidth - root.clientWidth : root.scrollHeight - root.clientHeight
    if (length > 0) {
      const start = row() ? box.left : box.top
      const end = row() ? box.right : box.bottom
      const size = row() ? drag.item.offsetWidth : drag.item.offsetHeight
      const zone = Math.min(size, (end - start) / 3)
      const into = drag.last < start + zone ? drag.last - (start + zone) : drag.last > end - zone ? drag.last - (end - zone) : 0
      if (into) {
        const speed = Math.max(-2, Math.min(2, into / zone)) * 0.6
        const by = speed * (time - before)
        if (row()) root.scrollLeft += by
        else root.scrollTop += by
        follow()
        aim()
      }
    }
    drag.frame = requestAnimationFrame((next) => scroll(next, time))
  }

  /**
   * How far an item makes room by: from the carried item's start to the next one's, which counts the gap
   * between them. The carried item is measured once, as it is picked up, where the items stand in the layout.
   * @param {HTMLElement} item
   */
  const room = (item) => {
    const list = items()
    const index = list.indexOf(item)
    const next = list[index + 1]
    const before = list[index - 1]
    const own = laid(item)
    if (next) return Math.abs(laid(next).start - own.start)
    if (before) return Math.abs(own.start - laid(before).start)
    return own.size
  }

  const end = (/** @type {boolean} */ keep) => {
    if (!drag) return
    const { item, handle, dragging, to, frame } = drag
    cancelAnimationFrame(frame)
    drag = null
    if (!dragging) return
    released = true
    const from = items().indexOf(item)
    if (!keep || to === from) {
      // The items that made room glide back, and so does the carried one.
      unmark()
      item.style.removeProperty('--sortable-offset')
      handle.setAttribute('aria-pressed', 'false')
      root.style.removeProperty('--sortable-size')
      if (!keep) announce(say.cancel(nameOf(item), ...position(item)))
      return
    }
    // The items that made room already stand where they land: the move takes the room away and puts the node
    // there in one change, so only the carried item travels.
    shift(item, to, () => {
      unmark()
      item.style.removeProperty('--sortable-offset')
    }).then(() => {
      const current = move ? items()[to] : item
      handleOf(current ?? item)?.setAttribute('aria-pressed', 'false')
      root.style.removeProperty('--sortable-size')
      if (current) announce(say.drop(nameOf(current), ...position(current)))
    })
    changed()
  }

  root.addEventListener('pointerdown', (event) => {
    const handle = /** @type {HTMLElement | null} */ (/** @type {Element} */ (event.target).closest('.sortable-handle'))
    const item = /** @type {HTMLElement | null} */ (handle?.closest('.sortable-item') ?? null)
    if (!handle || !item || item.closest('.sortable') !== root || event.button !== 0 || !event.isPrimary || drag) return
    if (/** @type {HTMLButtonElement} */ (handle).disabled) return
    released = false
    // With an item picked up, a press on a handle chooses where it goes: focus stays on the picked handle, so
    // the item is not dropped before the click.
    if (grabbed) {
      event.preventDefault()
      return
    }
    // No text is selected and nothing scrolls under the press; focus stays where it was, so a ring the keys
    // would show does not appear for the pointer.
    event.preventDefault()
    try {
      handle.setPointerCapture?.(event.pointerId)
    } catch {
      // A pointer the browser no longer knows cannot be captured; the document still hears it.
    }
    const at = items().indexOf(item)
    drag = { item, handle, id: event.pointerId, start: axis(event), scroll: scrollOf(), last: axis(event), dragging: false, from: at, to: at, frame: 0, others: [], middles: [], middle: 0, rtl: false }
  }, { signal })

  document.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return
    drag.last = axis(event)
    if (!drag.dragging) {
      if (Math.abs(drag.last - drag.start) < threshold) return
      drag.dragging = true
      // Measured before anything is carried or makes room.
      measure()
      root.style.setProperty('--sortable-size', `${room(drag.item)}px`)
      drag.handle.setAttribute('aria-pressed', 'true')
      drag.frame = requestAnimationFrame((time) => scroll(time))
    }
    follow()
    aim()
  }, { signal })

  document.addEventListener('pointerup', (event) => {
    if (drag && event.pointerId === drag.id) end(true)
  }, { signal })
  document.addEventListener('pointercancel', (event) => {
    if (drag && event.pointerId === drag.id) end(false)
  }, { signal })
  document.addEventListener('keydown', (event) => {
    if (drag?.dragging && event.key === 'Escape') {
      event.preventDefault()
      end(false)
    }
  }, { signal })

  signal.addEventListener('abort', () => {
    if (drag) cancelAnimationFrame(drag.frame)
    drag = null
  })

  return detach
}
