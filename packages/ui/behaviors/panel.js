/**
 * Panel: a floating surface the reader moves, resizes, folds to its header and closes.
 *
 * The root, the element with the `panel` class, is a `popover="manual"`: the browser opens and closes it from
 * a button with `commandfor` (or `popovertarget`) and puts it in the top layer. This script does what the
 * browser does not.
 *
 * - **Moving.** A drag of `panel-handle`, the button under the header, and the arrow keys on it, write the
 *   panel's place to `--panel-x` and `--panel-y` on the root, in pixels from the viewport's top left corner.
 *   Shift moves four steps at a time.
 * - **Resizing.** A drag of `panel-resize`, the corner at the bottom end, and Alt with the arrow keys on the
 *   handle, write its size to `--panel-width` and `--panel-height`.
 * - **Folding.** A click on `panel-minimize` turns its `aria-pressed`; pressed, the stylesheet folds the panel
 *   to its header.
 * - **Closing.** Escape with focus in the panel closes it, unless something inside handled the key first.
 * - **Focus.** A panel opened from a control takes focus on its handle, and gives it back to that control when
 *   it closes with focus inside.
 * - **Stacking.** Panels stand in the top layer in the order they were shown. A press or focus inside a panel
 *   behind another shows it again, which brings it to the front.
 *
 * The stylesheet keeps a panel inside the viewport whatever it is given; at the end of each move or resize this
 * script reads where the panel was drawn and keeps that, so the place it holds is the place the reader sees.
 *
 * The root dispatches `input` while the panel moves or resizes and `change` when a drag ends, a key moved it
 * or it was folded. The function the behavior returns has a `value`: `{ x, y, width, height, minimized }`,
 * the four numbers in pixels or `null` where the stylesheet's default holds. Set it to put the panel back where
 * it was; that dispatches nothing.
 */
import { valued } from './internal.js'

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/** The panels that are open, the frontmost last. One list for the page, so one panel can come before another. */
/** @type {HTMLElement[]} */
const stack = []

/**
 * @typedef {object} PanelValue Where a panel is, how large and whether it is folded.
 * @property {number | null} x Pixels from the viewport's left edge, or `null` for the stylesheet's place.
 * @property {number | null} y Pixels from the viewport's top edge.
 * @property {number | null} width Pixels, or `null` for the stylesheet's width.
 * @property {number | null} height Pixels, or `null` for as tall as what it holds.
 * @property {boolean} minimized Folded to its header.
 */

/** @type {(keyof Omit<PanelValue, 'minimized'>)[]} */
const measures = ['x', 'y', 'width', 'height']

/** The arrow keys, as a step along each axis of the screen. */
/** @type {Record<string, [number, number]>} */
const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }

/**
 * @param {HTMLElement} root The element with the `panel` class and `popover="manual"`.
 * @param {{ step?: number }} [options] `step`: how far an arrow key moves or resizes the panel, in pixels.
 *   16 by default; with Shift, four steps.
 * @returns {(() => void) & { value: PanelValue }} Removes everything the behavior added. Its `value` is where
 *   the panel is, how large and whether it is folded.
 */
export function panel(root, { step = 16 } = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)
  const document = root.ownerDocument

  /** A part of this panel, not of a panel inside it. */
  const part = (/** @type {string} */ name) => /** @type {HTMLElement | undefined} */ ([...root.querySelectorAll(`.${name}`)].find((element) => element.closest('.panel') === root))
  const open = () => root.matches(':popover-open')
  const rtl = () => getComputedStyle(root).direction === 'rtl'
  const minimized = () => part('panel-minimize')?.getAttribute('aria-pressed') === 'true'

  /** @param {keyof Omit<PanelValue, 'minimized'>} name */
  const read = (name) => {
    const number = parseFloat(root.style.getPropertyValue(`--panel-${name}`))
    return Number.isFinite(number) ? number : null
  }
  /** @param {keyof Omit<PanelValue, 'minimized'>} name @param {number | null | undefined} value */
  const write = (name, value) => {
    if (value === null || value === undefined || !Number.isFinite(value)) root.style.removeProperty(`--panel-${name}`)
    else root.style.setProperty(`--panel-${name}`, `${Math.round(value)}px`)
  }
  /** @returns {PanelValue} */
  const current = () => ({ x: read('x'), y: read('y'), width: read('width'), height: read('height'), minimized: minimized() })
  const said = (/** @type {string} */ type) => root.dispatchEvent(new Event(type, { bubbles: true }))

  /**
   * Keep where the stylesheet drew the panel: the place, the size or both, as the reader sees them after the
   * stylesheet kept them inside the viewport. A folded panel's height is its header's, so it is not kept.
   * @param {{ place?: boolean, width?: boolean, height?: boolean }} what
   */
  const settle = ({ place, width, height }) => {
    const box = root.getBoundingClientRect()
    if (place) {
      write('x', box.left)
      write('y', box.top)
    }
    if (width) write('width', box.width)
    if (height && !minimized()) write('height', box.height)
  }

  const detach = valued(
    () => controller.abort(),
    current,
    (next) => {
      for (const name of measures) write(name, next?.[name])
      const folder = part('panel-minimize')
      if (folder) folder.setAttribute('aria-pressed', String(Boolean(next?.minimized)))
    }
  )

  // Stacking. Showing a panel again puts it last in the top layer, in front of the others. Both calls are made
  // before the browser draws, so nothing is seen to leave, and the browser says one toggle, from open to open.
  let raising = false
  const remove = () => {
    const index = stack.indexOf(root)
    if (index >= 0) stack.splice(index, 1)
  }
  const raise = () => {
    if (!open()) return
    const front = stack.filter((each) => each.ownerDocument === document && each.isConnected && each.matches(':popover-open')).at(-1)
    remove()
    stack.push(root)
    if (!front || front === root) return
    const focused = /** @type {HTMLElement | null} */ (document.activeElement)
    raising = true
    try {
      root.hidePopover()
      root.showPopover()
    } finally {
      raising = false
    }
    // Hiding a popover can send focus back to the control that opened it; the reader was here.
    if (focused && root.contains(focused) && document.activeElement !== focused) focused.focus({ preventScroll: true })
  }
  if (open()) stack.push(root)
  signal.addEventListener('abort', remove)
  root.addEventListener('pointerdown', raise, { signal, capture: true })
  root.addEventListener('focusin', raise, { signal })

  // Focus. The control a panel was opened from, to give focus back to when it closes.
  let opener = /** @type {HTMLElement | null} */ (null)
  /** A control outside the panel that opens it, when the browser did not say which one did. */
  const invoker = () => {
    if (!root.id) return null
    const points = (/** @type {Element} */ each) => each.getAttribute('commandfor') === root.id || each.getAttribute('popovertarget') === root.id
    return /** @type {HTMLElement | undefined} */ ([...document.querySelectorAll('[commandfor], [popovertarget]')].find((each) => points(each) && !root.contains(each))) ?? null
  }
  root.addEventListener('beforetoggle', (event) => {
    if (raising) return
    const toggle = /** @type {ToggleEvent & { source?: Element | null }} */ (event)
    if (toggle.newState === 'open') {
      const active = document.activeElement
      const source = toggle.source ?? (active && active !== document.body && !root.contains(active) ? active : null)
      opener = /** @type {HTMLElement | null} */ (source)
    } else if (root.contains(document.activeElement)) {
      // Closing with focus inside: focus goes back before the panel leaves, so it is never lost to the page.
      const back = opener?.isConnected ? opener : invoker()
      back?.focus()
    }
  }, { signal })
  root.addEventListener('toggle', () => {
    if (!open()) {
      remove()
      return
    }
    if (stack.includes(root)) return
    stack.push(root)
    // Opened from a control: focus goes to the panel. Opened by a page as it loads, focus stays where it is.
    if (opener && !root.contains(document.activeElement)) part('panel-handle')?.focus()
  }, { signal })

  // The pointer: the handle carries the panel, the corner resizes it.
  /** @type {{ id: number, resize: boolean, box: DOMRect, x: number, y: number, moved: boolean } | null} */
  let held = null
  root.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !(event.target instanceof Element)) return
    const handle = part('panel-handle')
    const corner = part('panel-resize')
    const resize = Boolean(corner?.contains(event.target))
    if (!resize && !(handle && handle.contains(event.target))) return
    held = { id: event.pointerId, resize, box: root.getBoundingClientRect(), x: event.clientX, y: event.clientY, moved: false }
    // Capture keeps the moves coming when the pointer leaves the handle. A scripted event has no pointer to capture.
    try { /** @type {HTMLElement} */ (resize ? corner : handle).setPointerCapture(event.pointerId) } catch {}
  }, { signal })

  root.addEventListener('pointermove', (event) => {
    if (!held || event.pointerId !== held.id) return
    const { box } = held
    const across = event.clientX - held.x
    const down = event.clientY - held.y
    if (held.resize) {
      // From right to left the corner is at the bottom left: it widens to the left and the right edge stays.
      const width = box.width + (rtl() ? -across : across)
      write('width', width)
      if (rtl()) write('x', box.right - root.getBoundingClientRect().width)
      if (!minimized()) write('height', box.height + down)
    } else {
      write('x', box.left + across)
      write('y', box.top + down)
    }
    held.moved = true
    said('input')
  }, { signal })

  /** @param {PointerEvent} event */
  const release = (event) => {
    if (!held || event.pointerId !== held.id) return
    const { moved, resize } = held
    held = null
    if (!moved) return
    settle({ place: !resize || rtl(), width: resize, height: resize })
    said('change')
  }
  root.addEventListener('pointerup', release, { signal })
  root.addEventListener('pointercancel', release, { signal })
  root.addEventListener('lostpointercapture', release, { signal })

  // The keys.
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || !open()) return
      // A popover inside the panel, such as a menu, closes first.
      const inner = event.target instanceof Element ? event.target.closest('[popover]') : null
      if (inner && inner !== root) return
      event.preventDefault()
      root.hidePopover()
      return
    }
    const arrow = arrows[event.key]
    if (!arrow || event.target !== part('panel-handle') || event.ctrlKey || event.metaKey) return
    event.preventDefault()
    const by = step * (event.shiftKey ? 4 : 1)
    const before = JSON.stringify(current())
    const box = root.getBoundingClientRect()
    const [across, down] = arrow
    if (event.altKey) {
      if (across) {
        const width = box.width + (rtl() ? -across : across) * by
        write('width', width)
        if (rtl()) write('x', box.right - root.getBoundingClientRect().width)
        settle({ place: rtl(), width: true })
      } else if (!minimized()) {
        write('height', box.height + down * by)
        settle({ height: true })
      }
    } else {
      write('x', box.left + across * by)
      write('y', box.top + down * by)
      settle({ place: true })
    }
    if (JSON.stringify(current()) === before) return
    said('input')
    said('change')
  }, { signal })

  // Folding.
  root.addEventListener('click', (event) => {
    const folder = part('panel-minimize')
    if (!folder || !(event.target instanceof Node) || !folder.contains(event.target)) return
    if (/** @type {HTMLButtonElement} */ (folder).disabled || folder.getAttribute('aria-disabled') === 'true') return
    folder.setAttribute('aria-pressed', String(!minimized()))
    said('input')
    said('change')
  }, { signal })

  return detach
}
