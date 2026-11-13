/**
 * Range: keeps the two thumbs of a range a distance apart.
 *
 * The two inputs stay native range inputs: their keys, their dragging, their `min`, `max` and `step` and their
 * values in the form are the platform's. Without this script the thumbs may cross, and the stylesheet still
 * fills between them. With it, `range-start` never passes `range-end`: when the reader moves one thumb closer
 * to the other than `distance`, the moved thumb stops there, so the start is always the lower value. It
 * corrects the value in the `input` it is moved with, before that event reaches the inputs or anything
 * around the range, so every listener reads the corrected pair and the thumb never shows the value it was
 * refused. The thumb that stands still is never pushed.
 *
 * The distance is in the inputs' own units. Give a multiple of their `step`: the value is written and the
 * input rounds it to its step, so the thumb stops at the closest step that keeps the distance.
 */

import { write } from './internal.js'

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * @param {HTMLElement} root The element with the `range` class, holding a `range-start` and a `range-end`.
 * @param {{ distance?: number }} [options] `distance`: how close the two values may come, in the inputs'
 *   units. 0 by default: the thumbs may meet but not cross.
 * @returns {() => void} Removes the listener.
 */
export function range(root, { distance = 0 } = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)
  const detach = () => controller.abort()

  const start = /** @type {HTMLInputElement | null} */ (root.querySelector('.range-start'))
  const end = /** @type {HTMLInputElement | null} */ (root.querySelector('.range-end'))
  if (!start || !end) return detach
  const gap = Math.max(0, Number(distance) || 0)

  // In the capture phase, so the value is corrected before the input itself, or anything else, hears it.
  root.addEventListener('input', (event) => {
    const moved = event.target
    if (moved !== start && moved !== end) return
    if (Number(end.value) - Number(start.value) >= gap) return
    if (moved === start) {
      write(start, String(Number(end.value) - gap))
      // Rounded to its step, the value may have come back up past the limit: one step down keeps the distance.
      if (Number(end.value) - Number(start.value) < gap && Number(start.value) > Number(start.min || 0)) start.stepDown()
    } else {
      write(end, String(Number(start.value) + gap))
      if (Number(end.value) - Number(start.value) < gap && Number(end.value) < Number(end.max || 100)) end.stepUp()
    }
  }, { capture: true, signal })

  return detach
}
