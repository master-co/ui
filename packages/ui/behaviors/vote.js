/**
 * Vote: lets a reader take a vote back.
 *
 * The two arrows stay native radios: choosing one, moving between them with the arrow keys and their value in
 * the form are the platform's. A radio cannot be cleared by pressing it again, so without this script a reader
 * can change a vote and never withdraw it. With it, a second press on the arrow that holds the vote, or Space on
 * it, unchecks it, and the score the stylesheet shows returns to `--votes`. The arrow then says so as a radio
 * does when it changes: it dispatches `input` and `change`, which bubble to the form.
 *
 * Which arrow held the vote is read when the press begins, from the document: an application that sets
 * `checked` itself is never out of step with it.
 */

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * @param {HTMLElement} root The element with the `vote` class, holding a `vote-up` and a `vote-down`.
 * @returns {() => void} Removes the listeners.
 */
export function vote(root) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)

  const arrowOf = (/** @type {EventTarget | null} */ target) =>
    /** @type {HTMLInputElement | null} */ (/** @type {Element | null} */ (target)?.closest?.('.vote-up, .vote-down') ?? null)
  /** The arrow that held the vote when the press in hand began. */
  let held = /** @type {HTMLInputElement | null} */ (null)

  const clear = (/** @type {HTMLInputElement} */ arrow) => {
    arrow.checked = false
    arrow.dispatchEvent(new Event('input', { bubbles: true }))
    arrow.dispatchEvent(new Event('change', { bubbles: true }))
  }

  // A press checks the radio before `click` is heard, so what it held is read as the press begins.
  root.addEventListener('pointerdown', (event) => {
    const arrow = arrowOf(event.target)
    held = arrow?.checked ? arrow : null
  }, { signal })

  root.addEventListener('click', (event) => {
    const arrow = arrowOf(event.target)
    const again = arrow && arrow === held && !arrow.disabled
    held = null
    if (again) clear(arrow)
  }, { signal })

  // Space on a checked radio does nothing in a browser; here it takes the vote back.
  root.addEventListener('keydown', (event) => {
    if (event.key !== ' ' || event.ctrlKey || event.metaKey || event.altKey) return
    const arrow = arrowOf(event.target)
    if (!arrow?.checked || arrow.disabled) return
    event.preventDefault()
    clear(arrow)
  }, { signal })

  return () => controller.abort()
}
