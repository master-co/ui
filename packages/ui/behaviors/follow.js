/**
 * Follow: keeps the end of a scroll area in view while new content arrives, as a chat, a log or a streamed
 * answer needs.
 *
 * The region follows from the moment it is attached: it is scrolled to its end, and each time what it holds
 * grows (a row added, a streamed word, an image that loaded) it is scrolled to its end again. It stops
 * following once the reader scrolls toward the start, with a wheel, a finger, the scrollbar or the keys, and
 * follows again when the reader comes back to the end. While it does not follow, a `scroll-area-latest`
 * button in the region loses its `hidden`; pressing it scrolls to the end and follows again.
 *
 * Content inserted above what the reader is looking at, such as older messages loaded at the top, keeps the
 * reader's place. The browser does that by itself with scroll anchoring (`overflow-anchor`). Where it has
 * none, or holds back (a browser stops anchoring when the margin of the row it holds changes, as the space
 * between two turns does when a turn is inserted before them), the behavior moves the region by as much as
 * the content above moved. It looks once the browser has laid the change out, so where the browser has
 * anchored, nothing has moved and it does nothing.
 *
 * The region dispatches `change` each time the reader makes it follow or stop. The function the behavior
 * returns has a `value`: whether it follows. Set it to true to scroll to the end and follow again, as an
 * application does when the reader sends a message; set it to false to stop. That dispatches nothing.
 */

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/** How close to the end, in pixels, still counts as the end: a fraction of a pixel is left by a zoomed page. */
const NEAR = 8

/**
 * @param {HTMLElement} root The element with the `scroll-area` class.
 * @returns {(() => void) & { value: boolean }} Removes the listeners and the observers, and gives the
 *   `scroll-area-latest` buttons back the `hidden` they had. Its `value` is whether the region follows.
 */
export function follow(root) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)

  /** The buttons that lead back to the end: this region's own, not those of a region inside it. */
  const buttons = () => /** @type {HTMLElement[]} */ ([...root.querySelectorAll('.scroll-area-latest')]).filter((button) => button.closest('.scroll-area') === root)
  const before = new Map(buttons().map((button) => [button, button.hidden]))
  const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

  let following = true
  /** Where the region stood and how tall its content was when it was last looked at. */
  let top = 0
  let height = 0
  /** The element the reader is looking at, and how far it stood from the top of the region. */
  /** @type {{ element: Element, offset: number } | null} */
  let anchor = null

  const distance = () => root.scrollHeight - root.scrollTop - root.clientHeight
  const remember = () => {
    top = root.scrollTop
    height = root.scrollHeight
    anchor = following ? null : look()
  }

  /**
   * The element the reader is looking at, chosen as the browser chooses the one it anchors: the first in the
   * view that the view holds whole, walking into one that runs past an edge of the view, such as the list that
   * holds the rows or a long message. And where it stands from the top of the view.
   */
  function look() {
    const view = root.getBoundingClientRect()
    /** @type {Element} */
    let parent = root
    /** @type {{ element: Element, offset: number } | null} */
    let found = null
    for (let depth = 0; depth < 6; depth++) {
      // What the stylesheet keeps out of scroll anchoring (the button, a line rows are inserted under) is never held.
      // The box is asked first: it is cheap while the layout is clean, and the style is asked only of the row in view,
      // not of every row above it on every scroll.
      const child = [...parent.children].find((each) => each.getBoundingClientRect().bottom > view.top && getComputedStyle(each).overflowAnchor !== 'none')
      if (!child) break
      const box = child.getBoundingClientRect()
      found = { element: child, offset: box.top - view.top }
      if ((box.top >= view.top && box.bottom <= view.bottom) || !child.children.length) break
      parent = child
    }
    return found
  }

  /** @param {boolean} next @param {boolean} [silent] */
  function set(next, silent = false) {
    // Heard on every scroll: a button that already says it is left untouched.
    for (const button of buttons()) if (button.hidden !== next) button.hidden = next
    if (next === following) return
    following = next
    if (!silent) root.dispatchEvent(new Event('change', { bubbles: true }))
  }

  /** @param {ScrollBehavior} [behavior] */
  function end(behavior = 'instant') {
    const target = root.scrollHeight - root.clientHeight
    if (behavior === 'smooth' && root.scrollTo) root.scrollTo({ top: target, behavior })
    else root.scrollTop = target
  }

  /** Content has arrived: follow it to the end at once. The reader's place is kept once it is laid out. */
  function arrive() {
    if (!following) return
    end()
    remember()
  }

  /** What the region holds has been laid out anew: follow it to the end, or keep the reader's place. */
  function settle() {
    if (following) end()
    else if (anchor?.element.isConnected) {
      const moved = anchor.element.getBoundingClientRect().top - root.getBoundingClientRect().top - anchor.offset
      if (Math.abs(moved) >= 1) root.scrollTop += moved
    }
    remember()
  }

  // Heard before the page's own listeners, which may load older rows as the reader nears the start: the place
  // is taken before they arrive.
  root.addEventListener('scroll', (event) => {
    // Listening in the capture phase hears every scroller inside too, such as a code block that scrolls across.
    if (event.target !== root) return
    const shrank = root.scrollHeight < height
    // Toward the start is the reader leaving the end; content that shrank pulls the region back by itself.
    if (root.scrollTop < top - 1 && !shrank) set(false)
    else if (distance() <= NEAR) set(true)
    remember()
  }, { signal, passive: true, capture: true })

  /**
   * Whether a scroller inside the region will take a move toward the start itself: one that scrolls along and
   * is not at its own start. The region then stays where it is, and goes on following.
   */
  const taken = (/** @type {EventTarget | null} */ from) => {
    for (let each = from instanceof Element ? from : null; each && each !== root; each = each.parentElement) {
      if (each.scrollTop > 0 && /auto|scroll/.test(getComputedStyle(each).overflowY)) return true
    }
    return false
  }

  // A wheel turned toward the start says so before the region has moved, while content may still arrive. With
  // Control held it zooms the page, as a trackpad's pinch does, and with Shift it scrolls across: neither moves
  // the region toward its start.
  root.addEventListener('wheel', (event) => {
    if (event.deltaY < 0 && !event.ctrlKey && !event.shiftKey && root.scrollHeight > root.clientHeight && !taken(event.target)) set(false)
  }, { signal, passive: true })

  // So does a key that scrolls toward the start: a smooth scroll that has not yet moved would be pulled back to the
  // end by the next content to arrive. A key in a field moves its caret instead, and a key a control inside has
  // taken for itself scrolls nothing.
  root.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || root.scrollHeight <= root.clientHeight) return
    if (event.key !== 'ArrowUp' && event.key !== 'PageUp' && event.key !== 'Home') return
    const target = /** @type {Element} */ (event.target)
    if (target.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return
    set(false)
  }, { signal })

  // A finger that drags the content down scrolls toward the start.
  let finger = 0
  let across = 0
  root.addEventListener('touchstart', (event) => {
    finger = event.touches[0]?.clientY ?? 0
    across = event.touches[0]?.clientX ?? 0
  }, { signal, passive: true })
  root.addEventListener('touchmove', (event) => {
    const y = event.touches[0]?.clientY ?? finger
    const x = event.touches[0]?.clientX ?? across
    // A swipe across something wide drifts a little down too: it is a move toward the start only when it goes
    // further down than across, and when nothing inside takes it.
    if (y > finger + 1 && y - finger > Math.abs(x - across) && root.scrollHeight > root.clientHeight && !taken(event.target)) set(false)
    finger = y
    across = x
  }, { signal, passive: true })

  root.addEventListener('click', (event) => {
    const button = /** @type {Element} */ (event.target).closest?.('.scroll-area-latest')
    if (!button || button.closest('.scroll-area') !== root) return
    // The button hides as it is pressed; the region keeps the focus it had.
    // A region that holds what takes focus has no tabindex of its own: it is given one out of the tab order, so
    // the focus the hidden button had does not fall to the page.
    if (button.contains(root.ownerDocument.activeElement)) {
      if (!root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1')
      root.focus({ preventScroll: true })
    }
    set(true)
    end(reduced() ? 'instant' : 'smooth')
  }, { signal })

  // A size observer answers after layout, where the reader's place can be measured; without one, every change
  // is measured as it happens.
  const sizes = typeof ResizeObserver === 'function' ? new ResizeObserver(settle) : null
  const mutations = new MutationObserver(sizes ? arrive : settle)
  mutations.observe(root, { childList: true, subtree: true, characterData: true })
  // An image that loads or a row that wraps anew changes a size without changing the document.
  const watch = () => {
    if (!sizes) return
    sizes.disconnect()
    sizes.observe(root)
    for (const child of root.children) sizes.observe(child)
  }
  watch()
  const rows = new MutationObserver(watch)
  rows.observe(root, { childList: true })

  signal.addEventListener('abort', () => {
    if (attached.get(root) === controller) attached.delete(root)
    mutations.disconnect()
    rows.disconnect()
    sizes?.disconnect()
    for (const [button, hidden] of before) button.hidden = hidden
  })

  set(true, true)
  end()
  remember()

  return /** @type {(() => void) & { value: boolean }} */ (Object.defineProperty(() => controller.abort(), 'value', {
    enumerable: true,
    get: () => following,
    set: (/** @type {boolean} */ next) => {
      set(Boolean(next), true)
      if (next) end()
      remember()
    }
  }))
}
