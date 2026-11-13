/**
 * Drawer: lets a swiped drawer or sheet go, and gives a sheet's handle its keys.
 *
 * A dialog with `dialog-swipe` is a track that scrolls and snaps, so following a finger, a trackpad or a
 * wheel, the momentum and the fling are the browser's. This script does what scrolling cannot:
 *
 * - It closes the dialog once the panel has gone past the edge it rests on.
 * - It gives `closedby="any"` back: the track covers the scrim the browser listens on, so a press on the
 *   track beside the panel closes the dialog here.
 * - It lets a mouse drag the panel, which a mouse cannot scroll, by its handle or by any part of it that is
 *   not a control or the scrolled body, and lets it go to the rest it was flung toward or the nearest one.
 * - It writes to `--dialog-scrim` how much of the scrim is left, from 1 down to 0 as the panel leaves.
 * - It opens the panel at its first rest, even where the browser scrolled the focused control into view
 *   while the dialog was still sliding in.
 * - In a sheet with `dialog-detents`, it opens the sheet at half height, and the handle moves it between half
 *   and full height: a press, Enter or Space goes to the other one, ArrowUp grows it and ArrowDown shrinks
 *   it. `aria-expanded` on the handle says whether the sheet is at full height.
 *
 * Escape, the close buttons and the focus that returns to the trigger stay the browser's. Attached to a
 * dialog without `dialog-swipe` it does nothing, so a framework component may attach it to every dialog.
 */

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/** Where a mouse press stays what it is instead of taking hold of the panel. */
const controls = 'a[href], button, input, select, textarea, label, summary, [contenteditable]:not([contenteditable="false"]), [tabindex], .dialog-body'

/** How far a mouse moves before a press is a drag, in pixels. */
const slop = 4

/** How far ahead a fling is carried when the rest it lands on is chosen, in milliseconds of its speed. */
const carry = 200

/** How long a pointer may stand still before it lets go and still throw the panel, in milliseconds. */
const pause = 80

/** How long the track must stand still to have settled, where the browser has no `scrollend`. */
const still = 120

/**
 * @param {HTMLDialogElement} root The dialog with the `dialog` class.
 * @returns {() => void} Removes everything the behavior added.
 */
export function drawer(root) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)

  /** @type {IntersectionObserver | undefined} */
  let watching
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer

  const swiping = () => root.classList.contains('dialog-swipe')
  const panel = () => /** @type {HTMLElement | null} */ (root.querySelector('.dialog-panel'))
  const detents = () => !root.classList.contains('dialog-drawer') && root.classList.contains('dialog-detents')
  const handle = () => /** @type {HTMLElement | null} */ (detents() ? root.querySelector('.dialog-handle') : null)

  /**
   * The way the panel leaves, on the screen: down for a sheet; for a drawer, toward the edge it rests on.
   * @returns {{ x: number, y: number }}
   */
  const away = () => {
    if (!root.classList.contains('dialog-drawer')) return { x: 0, y: 1 }
    const rtl = getComputedStyle(root).direction === 'rtl'
    return { x: root.classList.contains('dialog-drawer-start') === rtl ? 1 : -1, y: 0 }
  }

  /**
   * Where the panel is and where it may rest, as distances it has moved away from its open rest.
   * @returns {{ now: number, rests: number[] } | undefined}
   */
  const measure = () => {
    const own = panel()
    if (!own) return undefined
    const { x, y } = away()
    const track = root.getBoundingClientRect()
    const box = own.getBoundingClientRect()
    const style = getComputedStyle(own)
    const size = y ? box.height : box.width
    if (!size) return undefined
    const margin = parseFloat(y ? style.marginBottom : x > 0 ? style.marginRight : style.marginLeft) || 0
    const now = y ? box.bottom + margin - track.bottom : x > 0 ? box.right + margin - track.right : track.left - box.left + margin
    const rests = [0, size + 2 * margin]
    if (detents()) {
      const shown = parseFloat(getComputedStyle(own, '::before').blockSize)
      if (shown > 0 && shown < size) rests.splice(1, 0, size - shown)
    }
    return { now, rests }
  }

  /**
   * Move the panel to a rest, as far from its open rest as given.
   * @param {number} rest
   * @param {ScrollBehavior} [behavior] `auto` leaves it to the stylesheet, which is smooth without reduced motion.
   */
  const go = (rest, behavior = 'auto') => {
    const found = measure()
    if (!found) return
    const { x, y } = away()
    const by = rest - found.now
    root.scrollBy?.({ left: -x * by, top: -y * by, behavior })
  }

  /** @param {boolean} full */
  const say = (full) => handle()?.setAttribute('aria-expanded', String(full))

  /** After the track has settled, say where the sheet rests. */
  const settled = () => {
    const found = measure()
    if (found && handle()) say(found.now < 1)
  }

  /**
   * How much of the scrim is left: all of it down to the last rest before the panel is gone, then thinning
   * to nothing as the panel leaves.
   */
  const thin = () => {
    const found = measure()
    if (!found) return
    const gone = /** @type {number} */ (found.rests.at(-1))
    const last = /** @type {number} */ (found.rests.at(-2))
    const left = Math.min(1, Math.max(0, (gone - found.now) / (gone - last)))
    root.style.setProperty('--dialog-scrim', String(Math.round(left * 1000) / 1000))
  }

  /** Close the dialog once the panel has gone from the track, by any way it went. */
  const watch = () => {
    watching?.disconnect()
    const own = panel()
    if (!own || typeof IntersectionObserver !== 'function') return
    const least = .01
    let seen = false
    watching = new IntersectionObserver((entries) => {
      const ratio = entries.at(-1)?.intersectionRatio ?? 0
      if (ratio >= least) seen = true
      else if (seen && root.open && swiping()) root.close()
    }, { root, threshold: [least] })
    watching.observe(own)
  }

  // A dialog that opens again starts with all its scrim, before its first frame where `beforetoggle` is known.
  root.addEventListener('beforetoggle', (event) => {
    if (/** @type {ToggleEvent} */ (event).newState === 'open') root.style.removeProperty('--dialog-scrim')
  }, { signal })

  root.addEventListener('toggle', (event) => {
    if (/** @type {ToggleEvent} */ (event).newState !== 'open' || !swiping()) {
      watching?.disconnect()
      return
    }
    root.style.removeProperty('--dialog-scrim')
    watch()
    // The panel opens at its first rest: half height in a sheet with detents, open otherwise. A browser that
    // scrolls the focused control into view while the dialog still slides in may have moved it away.
    const found = measure()
    if (found) go(found.rests.length > 2 ? found.rests[1] : 0, 'instant')
    // A sheet too short for a half rest opens, and stays, at full height.
    if (handle()) say(Boolean(found && found.rests.length < 3))
  }, { signal })

  root.addEventListener('scroll', () => {
    if (!swiping()) return
    thin()
    clearTimeout(timer)
    timer = setTimeout(settled, still)
  }, { signal })
  root.addEventListener('scrollend', () => {
    clearTimeout(timer)
    if (swiping()) settled()
  }, { signal })

  /** What a press began on, so that a drag let go of over the scrim is not a press on it. @type {EventTarget | null} */
  let pressed = null
  /** @type {{ id: number, x: number, y: number, last: number, at: number, speed: number, moved: boolean, grip: Element | null } | null} */
  let drag = null
  /** A handle that was dragged is not pressed when the drag ends. */
  let dragged = false

  root.addEventListener('pointerdown', (event) => {
    pressed = event.target
    if (!swiping() || event.pointerType !== 'mouse' || event.button !== 0) return
    const target = /** @type {Element} */ (event.target)
    const own = panel()
    if (!own?.contains(target)) return
    const grip = target.closest('.dialog-handle')
    if (!grip && target.closest(controls)) return
    // No text is selected and no focus moves; the panel is still :active, which stops the snapping.
    event.preventDefault()
    own.setPointerCapture?.(event.pointerId)
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, last: 0, at: event.timeStamp, speed: 0, moved: false, grip }
  }, { signal })

  root.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return
    const { x, y } = away()
    // How far the pointer has carried the panel away from where it took hold.
    const along = x * (event.clientX - drag.x) + y * (event.clientY - drag.y)
    if (!drag.moved && Math.abs(along) < slop) return
    drag.moved = true
    const by = along - drag.last
    const elapsed = event.timeStamp - drag.at
    if (elapsed > 0) drag.speed = drag.speed * .2 + (by / elapsed) * .8
    drag.last = along
    drag.at = event.timeStamp
    root.scrollBy?.({ left: -x * by, top: -y * by, behavior: 'instant' })
  }, { signal })

  /** @param {PointerEvent} event */
  const release = (event) => {
    if (!drag || event.pointerId !== drag.id) return
    const { moved, speed, grip, at } = drag
    drag = null
    if (!moved) return
    dragged = Boolean(grip)
    const found = measure()
    if (!found) return
    // A pointer that stood still before it let go throws nothing.
    const thrown = event.type === 'pointerup' && event.timeStamp - at < pause ? speed * carry : 0
    const aim = found.now + thrown
    const rest = found.rests.reduce((best, each) => Math.abs(each - aim) < Math.abs(best - aim) ? each : best)
    // After the frame the panel is let go of in, when the track snaps again, so this scroll is the last word.
    requestAnimationFrame(() => go(rest))
  }
  root.addEventListener('pointerup', release, { signal })
  root.addEventListener('pointercancel', release, { signal })

  root.addEventListener('click', (event) => {
    if (!swiping()) return
    const grip = handle()
    if (grip && /** @type {Element} */ (event.target).closest?.('.dialog-handle') === grip) {
      if (dragged) return void (dragged = false)
      const found = measure()
      const full = grip.getAttribute('aria-expanded') === 'true'
      say(!full)
      if (found && found.rests.length > 2) go(full ? found.rests[1] : 0)
      return
    }
    dragged = false
    if (event.target === root && pressed === root && root.getAttribute('closedby') === 'any') root.close()
  }, { signal })

  root.addEventListener('keydown', (event) => {
    const grip = handle()
    if (!grip || event.target !== grip || !swiping()) return
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    const full = event.key === 'ArrowUp'
    say(full)
    const found = measure()
    if (found && found.rests.length > 2) go(full ? 0 : found.rests[1])
  }, { signal })

  if (root.open && swiping()) watch()

  return () => {
    controller.abort()
    clearTimeout(timer)
    watching?.disconnect()
    if (attached.get(root) === controller) attached.delete(root)
  }
}
