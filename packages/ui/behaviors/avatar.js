/**
 * Avatar: follows the photo's life, so a missing photo shows its fallback instead of a broken image.
 *
 * The photo (`avatar-image`) stands over its fallback (`avatar-fallback`, initials or an icon) in one cell. While
 * the photo loads both are there and the fallback shows through. When it has loaded, the fallback is hidden;
 * when it fails, or has no source, the photo is hidden and the fallback shows. A new `src` or `srcset` starts
 * over, and an answer about a source the photo no longer has changes nothing, so a slow photo that fails cannot
 * hide the one that replaced it. Both are moved with the `hidden` attribute; the size of the box never changes.
 *
 * The avatar is named once, on its root (`role="img"` and `aria-label`): the photo has an empty `alt` and the
 * fallback is `aria-hidden`, so the name is not read twice. A photo that is already in the cache is settled
 * as soon as this attaches.
 */

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * @param {HTMLElement} root The element with the `avatar` class.
 * @returns {() => void} Removes the listeners and the observer; the photo and the fallback keep the state they have.
 */
export function avatar(root) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)
  const detach = () => controller.abort()
  signal.addEventListener('abort', () => { if (attached.get(root) === controller) attached.delete(root) })

  const found = /** @type {HTMLImageElement | null} */ (root.querySelector('.avatar-image'))
  const fallback = /** @type {HTMLElement | null} */ (root.querySelector('.avatar-fallback'))
  if (!found) return detach
  const image = found

  /** @param {HTMLElement | null} element @param {boolean} hidden */
  const hide = (element, hidden) => { if (element && element.hidden !== hidden) element.hidden = hidden }
  /** The source the photo is loading now: what an answer is checked against. */
  const source = () => `${image.getAttribute('src') ?? ''} ${image.getAttribute('srcset') ?? ''}`.trim()

  /** Show the fallback alone: the photo failed, or has nothing to load. */
  const failed = () => { hide(image, true); hide(fallback, false) }
  /** Show the photo alone. */
  const loaded = () => { hide(image, false); hide(fallback, true) }

  let pending = source()
  /** @param {() => void} then */
  const answer = (then) => () => { if (source() === pending && !signal.aborted) then() }

  /** Start over with the source the photo has now. */
  function settle() {
    if (!source()) return failed()
    // Loading: the photo stays in the layout so it can load, and the fallback shows through until it paints.
    hide(image, false)
    hide(fallback, false)
    if (!image.complete) return
    // Already settled, from the cache or before this attached: decoding says which way. An SVG with no size of
    // its own has no natural width, so the width alone cannot tell a picture from a failure.
    if (typeof image.decode === 'function') image.decode().then(answer(loaded), answer(failed))
    else if (image.naturalWidth > 0) loaded()
    else failed()
  }
  image.addEventListener('load', answer(loaded), { signal })
  image.addEventListener('error', answer(failed), { signal })

  if (typeof MutationObserver === 'function') {
    const observer = new MutationObserver(() => {
      if (source() === pending) return
      pending = source()
      settle()
    })
    observer.observe(image, { attributes: true, attributeFilter: ['src', 'srcset'] })
    signal.addEventListener('abort', () => observer.disconnect())
  }

  settle()
  return detach
}
