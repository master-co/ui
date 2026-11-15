/**
 * Carousel: the slide in view, and the page's own controls that move the track.
 *
 * The track (`carousel`) is still a scroll container that snaps; this script never moves a slide or sets a
 * position. It watches which slide is most in view with an IntersectionObserver (among slides equally in
 * view, the current one, or else the first in the DOM order), and once a scroll has come to rest (`scrollend`,
 * or a pause in `scroll` where the browser has no `scrollend`) that slide is the current one. The current slide's dot
 * (`carousel-dot`) is marked `aria-current="true"`; previous and next (`carousel-previous`,
 * `carousel-next`) are disabled at the first and the last slide, where there is nowhere to go.
 *
 * Previous and next go to the slide before and after the current one, a dot to its slide, and setting the
 * returned function's `value` to its slide; each asks the platform to scroll the slide into view at its own
 * snap alignment, at once when the reader asks for reduced motion. Several slides may be in view; there is
 * still one current slide, and the others are not hidden.
 *
 * A slide stands for its `data-value`, or its `id`. A dot names its slide with `aria-controls`. The value
 * follows its slide, not its place, so a slide added before it does not change what is current. A change the
 * reader makes dispatches a bubbling `input` and `change` from the root; setting `value` dispatches nothing.
 * The carousel never moves by itself.
 */

/**
 * @typedef {object} CarouselOptions
 * @property {string} [value] The slide to show first: its `data-value` or `id`.
 */

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * @param {HTMLElement} root The element with the `carousel-view` class, or a `carousel` track on its own.
 * @param {CarouselOptions} [options]
 * @returns {(() => void) & { value: string | null }} Removes the listeners and the observers. Its `value` is
 *   the current slide.
 */
export function carousel(root, options = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)

  const track = /** @type {HTMLElement | null} */ (root.classList.contains('carousel') ? root : root.querySelector('.carousel'))
  /** @type {string | null} */
  let current = null

  const detach = /** @type {(() => void) & { value: string | null }} */ (Object.defineProperty(() => controller.abort(), 'value', {
    enumerable: true,
    get: () => current,
    set: (/** @type {string | null} */ next) => {
      // A root with no track returned before the slides could be read: there is nothing to go to.
      if (!track) return
      const slide = next === null ? null : find(next)
      if (!slide || key(slide) === current) return
      go(slide)
      commit(key(slide), false)
    }
  }))
  signal.addEventListener('abort', () => { if (attached.get(root) === controller) attached.delete(root) })
  if (!track) return detach

  /** @param {Element} slide */
  const key = (slide) => slide.getAttribute('data-value') ?? slide.id
  const slides = () => /** @type {HTMLElement[]} */ ([...track.querySelectorAll('.carousel-slide')].filter((slide) => !(/** @type {HTMLElement} */ (slide)).hidden))
  /** @param {string} value */
  const find = (value) => slides().find((slide) => key(slide) === value) ?? null
  const dots = () => /** @type {HTMLButtonElement[]} */ ([...root.querySelectorAll('.carousel-dot')])
  const previous = /** @type {HTMLButtonElement | null} */ (root.querySelector('.carousel-previous'))
  const next = /** @type {HTMLButtonElement | null} */ (root.querySelector('.carousel-next'))

  /** How much of each slide is in view, from the observer. */
  /** @type {Map<Element, number>} */
  const seen = new Map()

  /**
   * The slide most in view. Among equals the current one stays, so a slide chosen while several are in view,
   * such as the last of a track that ends with three in view, is still current once the track comes to rest;
   * otherwise the first in the DOM order.
   */
  function primary() {
    let best = /** @type {HTMLElement | null} */ (null)
    let most = 0
    for (const slide of slides()) {
      const ratio = seen.get(slide) ?? 0
      if (ratio > most + .001) {
        best = slide
        most = ratio
      }
    }
    const held = current === null ? null : find(current)
    return best && held && (seen.get(held) ?? 0) >= most - .001 ? held : best
  }

  /** Mark the dots and the buttons for the current slide. */
  function paint() {
    const all = slides()
    const at = all.findIndex((slide) => key(slide) === current)
    for (const dot of dots()) {
      const slide = all.find((each) => each.id && each.id === dot.getAttribute('aria-controls'))
      if (slide && key(slide) === current) dot.setAttribute('aria-current', 'true')
      else dot.removeAttribute('aria-current')
    }
    // At an end, the button that has nowhere to go is disabled; focus it held moves to the other one.
    const limit = (/** @type {HTMLButtonElement | null} */ button, /** @type {boolean} */ reached, /** @type {HTMLButtonElement | null} */ other) => {
      if (!button || button.disabled === reached) return
      // The other button stands beside it: focus moves there without scrolling the page, as a popover gives it back.
      if (reached && root.ownerDocument.activeElement === button) (other && !other.disabled ? other : track)?.focus({ preventScroll: true })
      button.disabled = reached
    }
    limit(previous, at <= 0, next)
    limit(next, at === -1 || at >= all.length - 1, previous)
  }

  /**
   * Make a slide the current one.
   * @param {string | null} value @param {boolean} said Whether the reader made the change, which is told.
   */
  function commit(value, said) {
    if (value === current) return paint()
    current = value
    paint()
    if (!said) return
    root.dispatchEvent(new Event('input', { bubbles: true }))
    root.dispatchEvent(new Event('change', { bubbles: true }))
  }

  /**
   * Scroll a slide into view at its own snap alignment, through the platform.
   * @param {HTMLElement} slide @param {boolean} [now] Jump instead of gliding, as for the first slide.
   */
  function go(slide, now = false) {
    const still = now || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
    const vertical = track && getComputedStyle(track).flexDirection.startsWith('column')
    // `scroll-snap-align` names the block axis first and the inline axis second; one value is both. A track that
    // scrolls down snaps on the first, one that scrolls across on the last.
    const values = (getComputedStyle(slide).scrollSnapAlign || 'start').split(' ')
    const align = /** @type {ScrollLogicalPosition} */ (((vertical ? values[0] : values.at(-1)) || 'start').replace('none', 'start'))
    slide.scrollIntoView(/** @type {ScrollIntoViewOptions} */ ({
      behavior: still ? 'instant' : 'smooth',
      block: vertical ? align : 'nearest',
      inline: vertical ? 'nearest' : align,
      // Where the browser has it, only the track scrolls, never the page around it.
      container: 'nearest'
    }))
  }

  /** @param {number} step */
  const turn = (step) => {
    const all = slides()
    const at = all.findIndex((slide) => key(slide) === current)
    const to = all[Math.max(0, Math.min(all.length - 1, (at === -1 ? 0 : at) + step))]
    if (!to) return
    go(to)
    commit(key(to), true)
  }
  previous?.addEventListener('click', () => turn(-1), { signal })
  next?.addEventListener('click', () => turn(1), { signal })
  root.addEventListener('click', (event) => {
    const dot = /** @type {Element} */ (event.target).closest('.carousel-dot')
    const slide = dot && slides().find((each) => each.id && each.id === dot.getAttribute('aria-controls'))
    if (!slide) return
    go(slide)
    commit(key(slide), true)
  }, { signal })

  /** @type {IntersectionObserver | null} */
  let observer = null

  /**
   * A scroll has come to rest: the slide most in view is the current one. The observer measures in the rendering
   * of the frame after the scroll ends, after that frame's animation callbacks, so this waits two frames and
   * takes what the observer has not yet delivered.
   */
  const settle = () => requestAnimationFrame(() => requestAnimationFrame(() => {
    if (signal.aborted) return
    for (const entry of observer?.takeRecords() ?? []) seen.set(entry.target, entry.intersectionRatio)
    const slide = primary()
    if (slide) commit(key(slide), true)
    else paint()
  }))
  if ('onscrollend' in /** @type {object} */ (track)) {
    track.addEventListener('scrollend', settle, { signal })
  } else {
    let timer = 0
    track.addEventListener('scroll', () => {
      clearTimeout(timer)
      timer = setTimeout(settle, 150)
    }, { signal, passive: true })
    signal.addEventListener('abort', () => clearTimeout(timer))
  }

  if (typeof IntersectionObserver === 'function') {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) seen.set(entry.target, entry.intersectionRatio)
      if (current === null) {
        const slide = primary()
        if (slide) commit(key(slide), false)
      } else {
        paint()
      }
    }, { root: track, threshold: [0, .25, .5, .75, .99, 1] })
    const watching = observer
    const watch = () => {
      watching.disconnect()
      seen.clear()
      for (const slide of slides()) watching.observe(slide)
    }
    watch()
    signal.addEventListener('abort', () => watching.disconnect())
    // Slides that come and go, added or removed, or shown and hidden with `hidden`: watch the new set, and keep
    // the current one if it is still there. What changes inside a slide is not the set.
    if (typeof MutationObserver === 'function') {
      const mutations = new MutationObserver((records) => {
        if (!records.some((record) => record.target === track || (record.type === 'attributes' && /** @type {Element} */ (record.target).classList.contains('carousel-slide')))) return
        watch()
        if (current !== null && !find(current)) current = null
        paint()
      })
      mutations.observe(track, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] })
      signal.addEventListener('abort', () => mutations.disconnect())
    }
  }

  const first = options.value ? find(options.value) : null
  if (first) {
    go(first, true)
    current = key(first)
  } else {
    const all = slides()
    current = all.length ? key(all[0]) : null
  }
  paint()
  return detach
}
