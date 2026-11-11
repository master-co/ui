/**
 * Splitter: moves the handle between two panes.
 *
 * The stylesheet lays the panes out from `--splitter-size` and keeps both of them `--splitter-min` wide;
 * this script only passes the number on. A drag of the handle and the keys of a window splitter write the
 * first pane's size, as a percentage of the container, to `--splitter-size` on the root and to the handle's
 * `aria-valuenow`. The handle's `aria-valuemin` and `aria-valuemax` are the least and the greatest it goes.
 *
 * The handle dispatches `input` each time the size changes and `change` when a drag ends or a key moved it.
 */

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * @param {HTMLElement} root The element with the `splitter` class.
 * @param {{ step?: number }} [options] `step`: how far an arrow key moves the handle, in percent. 5 by default.
 * @returns {() => void} Removes everything the behavior added.
 */
export function splitter(root, { step = 5 } = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)
  const detach = () => controller.abort()

  // The handle is a child of the root: a pane may hold a splitter of its own.
  const handle = /** @type {HTMLElement | undefined} */ ([...root.children].find((child) => child.classList.contains('splitter-handle')))
  if (!handle) return detach

  const disabled = () => handle.getAttribute('aria-disabled') === 'true'
  const stacked = () => handle.getAttribute('aria-orientation') === 'horizontal'
  const rtl = () => getComputedStyle(root).direction === 'rtl'
  /** @param {string} name @param {number} fallback */
  const number = (name, fallback) => {
    const value = parseFloat(handle.getAttribute(name) ?? '')
    return Number.isFinite(value) ? value : fallback
  }
  const least = () => number('aria-valuemin', 0)
  const greatest = () => number('aria-valuemax', 100)
  const now = () => number('aria-valuenow', 50)
  const changed = () => handle.dispatchEvent(new Event('change', { bubbles: true }))

  /**
   * Pass a size on: the property the stylesheet lays out from, and the value assistive technology reads.
   * @param {number} value The first pane's size, in percent.
   * @returns {boolean} Whether the size changed.
   */
  const set = (value) => {
    const size = `${Math.round(Math.min(greatest(), Math.max(least(), value)) * 100) / 100}%`
    if (size === (root.style.getPropertyValue('--splitter-size').trim() || `${now()}%`)) return false
    root.style.setProperty('--splitter-size', size)
    handle.setAttribute('aria-valuenow', String(Math.round(parseFloat(size))))
    handle.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  }

  /** The pointer that holds the handle, and whether it has moved it. */
  let held = /** @type {number | null} */ (null)
  let moved = false

  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || disabled()) return
    held = event.pointerId
    moved = false
    // Capture keeps the moves coming when the pointer leaves the line. A scripted event has no pointer to capture.
    try { handle.setPointerCapture(event.pointerId) } catch {}
  }, { signal })

  handle.addEventListener('pointermove', (event) => {
    if (event.pointerId !== held) return
    // Reading the container turns a place on the screen into a share of it; the stylesheet does the placing.
    const box = root.getBoundingClientRect()
    const share = stacked()
      ? (event.clientY - box.top) / box.height
      : rtl() ? (box.right - event.clientX) / box.width : (event.clientX - box.left) / box.width
    if (Number.isFinite(share) && set(share * 100)) moved = true
  }, { signal })

  /** @param {PointerEvent} event */
  const release = (event) => {
    if (event.pointerId !== held) return
    held = null
    if (moved) changed()
  }
  handle.addEventListener('pointerup', release, { signal })
  handle.addEventListener('pointercancel', release, { signal })
  handle.addEventListener('lostpointercapture', release, { signal })

  handle.addEventListener('keydown', (event) => {
    if (disabled() || event.ctrlKey || event.metaKey || event.altKey) return
    // The arrows of the handle's own axis: a line between panes side by side moves left and right.
    const smaller = stacked() ? 'ArrowUp' : rtl() ? 'ArrowRight' : 'ArrowLeft'
    const larger = stacked() ? 'ArrowDown' : rtl() ? 'ArrowLeft' : 'ArrowRight'
    let value
    if (event.key === smaller) value = now() - step
    else if (event.key === larger) value = now() + step
    else if (event.key === 'Home') value = least()
    else if (event.key === 'End') value = greatest()
    else return
    event.preventDefault()
    if (set(value)) changed()
  }, { signal })

  return detach
}
