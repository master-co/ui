/**
 * Toast: removes a toast that has left.
 *
 * A toast is a `<dialog>` the page appends to a `toast-region`. The browser and the stylesheet show it, dismiss it
 * and let it run out; none of them takes it out of the document, so a page that appends a toast for each message
 * collects the ones that are gone. This script removes a toast once it has run out, and one that was dismissed once
 * it has left: it waits for the exit the stylesheet plays.
 *
 * It is for a region whose toasts are appended. A page that keeps a toast in its markup and opens it again by
 * setting `open` leaves this script out, and `attach()` does not attach it.
 */

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * @param {HTMLElement} root The element with the `toast-region` class.
 * @returns {() => void} Removes the listeners. Toasts that are in the region stay.
 */
export function toast(root) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)

  const toastOf = (/** @type {EventTarget | null} */ target) =>
    /** @type {HTMLDialogElement | null} */ (/** @type {Element | null} */ (target)?.matches?.('.toast') && /** @type {Element} */ (target).parentElement === root ? target : null)

  // A timed toast ends its clock with the animation the stylesheet names.
  root.addEventListener('animationend', (event) => {
    if (/** @type {AnimationEvent} */ (event).animationName === 'toast-expire') toastOf(event.target)?.remove()
  }, { signal })

  // `close` does not bubble, so it is heard on its way down. The exit starts with the next frame: the toast is
  // removed when what is running on it has finished, and at once where nothing runs.
  root.addEventListener('close', (event) => {
    const left = toastOf(event.target)
    if (!left) return
    const remove = () => { if (!signal.aborted && !left.open) left.remove() }
    const view = root.ownerDocument.defaultView
    const frame = (/** @type {() => void} */ run) => view?.requestAnimationFrame ? view.requestAnimationFrame(run) : setTimeout(run, 0)
    frame(() => {
      const running = left.getAnimations?.() ?? []
      if (running.length) Promise.allSettled(running.map(animation => animation.finished)).then(remove)
      else remove()
    })
  }, { capture: true, signal })

  return () => controller.abort()
}
