/**
 * Compare: the handle moves the line between the two pictures.
 *
 * Where the browser has scroll-driven animations the stylesheet already reads the thumb's place and this
 * script changes nothing. Elsewhere it copies the range input's value, as a percentage of its range, into
 * `--compare-position` on the root: when it attaches, and each time the input moves.
 *
 * The function the behavior returns has a `value`: the range input's number. Set it to move the line from
 * outside; that dispatches nothing.
 */

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * @param {HTMLElement} root The element with the `compare` class.
 * @returns {(() => void) & { value: number }} Removes everything the behavior added. Its `value` is the
 *   range input's number.
 */
export function compare(root) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  attached.set(root, controller)

  const range = /** @type {HTMLInputElement | null} */ (root.querySelector('.compare-range'))
  /** Set once the input is found: copies its place into the property. */
  let trace = () => {}
  const detach = /** @type {(() => void) & { value: number }} */ (Object.defineProperty(() => controller.abort(), 'value', {
    enumerable: true,
    get: () => (range ? Number(range.value) : NaN),
    set: (/** @type {number} */ next) => {
      if (!range || !Number.isFinite(next)) return
      range.value = String(next)
      trace()
    }
  }))
  if (!range) return detach

  const follow = () => {
    const min = parseFloat(range.min) || 0
    const max = Number.isFinite(parseFloat(range.max)) ? parseFloat(range.max) : 100
    const position = (parseFloat(range.value) - min) / (max - min) * 100
    if (Number.isFinite(position)) root.style.setProperty('--compare-position', `${Math.round(position * 100) / 100}%`)
  }
  range.addEventListener('input', follow, { signal: controller.signal })
  trace = follow
  follow()

  return detach
}
