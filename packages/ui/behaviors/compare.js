/**
 * Compare: the handle moves the line between the two pictures.
 *
 * Where the browser has scroll-driven animations the stylesheet already reads the thumb's place and this
 * script changes nothing. Elsewhere it copies the range input's value, as a percentage of its range, into
 * `--compare-position` on the root: when it attaches, and each time the input moves.
 */

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * @param {HTMLElement} root The element with the `compare` class.
 * @returns {() => void} Removes everything the behavior added.
 */
export function compare(root) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  attached.set(root, controller)
  const detach = () => controller.abort()

  const range = /** @type {HTMLInputElement | null} */ (root.querySelector('.compare-range'))
  if (!range) return detach

  const follow = () => {
    const min = parseFloat(range.min) || 0
    const max = Number.isFinite(parseFloat(range.max)) ? parseFloat(range.max) : 100
    const position = (parseFloat(range.value) - min) / (max - min) * 100
    if (Number.isFinite(position)) root.style.setProperty('--compare-position', `${Math.round(position * 100) / 100}%`)
  }
  range.addEventListener('input', follow, { signal: controller.signal })
  follow()

  return detach
}
