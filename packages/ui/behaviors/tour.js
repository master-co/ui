/**
 * Tour: opens the coachmarks of a tour one after another, each against the element it explains.
 *
 * The root, the element with the `coachmark-tour` class, holds the steps, each a `coachmark` with
 * `popover="manual"`, in the order they are taken. A step points at its target: the element its
 * `data-target` selector finds in the document, or, without one, the element right before it in the markup.
 * The `target` option takes over finding it, for a renderer that holds the targets itself.
 *
 * Starting the tour: a button with `command="--start"` and `commandfor` naming the root, or setting `value`.
 * Where the browser has no invoker commands, the behavior hears that button's click itself. The tour opens a
 * step with `showPopover({ source })`, so the browser anchors the card to its target and CSS places it, and
 * moves focus into it: to the action with `autofocus`, else to Next or Done, else to the step itself. A
 * `coachmark-spotlight` in the root is opened over the target first, beneath the card: the card's arrow
 * points at it, and with `coachmark-spotlight-dim` it dims the page around the target. The target is
 * scrolled into view first.
 *
 * The tour is not modal. The page stays usable while a step is open, and a step does not keep focus: it is
 * read as a dialog, and Tab leaves it for the page.
 *
 * The step's buttons say what they do in their `value`: `next`, `back`, `skip` and `done`. Next on the last
 * step completes the tour, as Done does; Skip and Escape, while focus is in the step, end it early. A step
 * closed by anything else, such as a button with `popovertargetaction="hide"`, ends it too. When it ends,
 * focus goes back to where it was when the tour started, unless the reader has since moved it into the page.
 *
 * A step may wait. A target that is not in the page, or not rendered, is waited for: the step opens as soon
 * as it appears, and is passed over when it has not appeared after `wait` milliseconds, so a tour never
 * stops on a step with nothing to point at. Back passes over a step whose target is gone without waiting.
 * A step with `data-advance` names an event on its target, such as `click`, that moves the tour on: the
 * reader does what the step asks, the page answers, and then the next step opens.
 *
 * The function it returns has a `value`: the index of the step the tour is on, from 0, or null when it is not
 * running. Set it to open a step, or to null to end the tour; that dispatches nothing. Each time the tour
 * moves by itself or by the reader, the root dispatches a bubbling `change` CustomEvent with `detail.value`;
 * when it ends, `change` with null and then `end`, whose `detail.completed` says whether the reader went
 * through to the last step or left before it.
 */
import { enabled, isOpen, valued } from './internal.js'

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * @typedef {object} TourOptions
 * @property {(step: HTMLElement, index: number) => Element | null | undefined} [target] Finds a step's
 *   target. By default its `data-target` selector, or the element right before it.
 * @property {number} [wait] How long a step waits for its target to appear before the tour passes it over,
 *   in milliseconds. 3000 by default.
 */

/**
 * @param {HTMLElement} root The element with the `coachmark-tour` class.
 * @param {TourOptions} [options]
 * @returns {(() => void) & { value: number | null }} Closes an open step and removes everything the behavior
 *   added. Its `value` is the index of the open step, or null.
 */
export function tour(root, { target, wait = 3000 } = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)
  const document = root.ownerDocument

  /** The steps of this tour, not of one inside it. */
  const steps = () => /** @type {HTMLElement[]} */ ([...root.querySelectorAll('.coachmark')]).filter((step) => step.closest('.coachmark-tour') === root)
  const spotlight = () => /** @type {HTMLElement | null} */ ([...root.querySelectorAll('.coachmark-spotlight')].find((each) => each.closest('.coachmark-tour') === root) ?? null)

  /** @param {HTMLElement} step @param {number} index */
  function find(step, index) {
    if (target) return target(step, index) ?? null
    const selector = step.getAttribute('data-target')
    if (!selector) return step.previousElementSibling
    try {
      return document.querySelector(selector)
    } catch {
      return null
    }
  }

  /** Whether an element is there to point at: in the document and rendered. */
  const present = (/** @type {Element | null | undefined} */ element) => Boolean(element?.isConnected && !element.closest('[hidden]') && (element.checkVisibility?.() ?? true))

  /** The step the tour is on, open or waiting for its target, and the step that is open. */
  let current = /** @type {number | null} */ (null)
  let shown = /** @type {HTMLElement | null} */ (null)
  /** Where focus was when the tour started. */
  let origin = /** @type {HTMLElement | null} */ (null)
  /** Stops waiting for a target, and stops listening for the action an open step asks for. */
  let waiting = () => {}
  let listening = new AbortController()

  /** Open a popover against an element, or where the browser places it where `source` is not understood. */
  const show = (/** @type {HTMLElement} */ popover, /** @type {Element} */ source) => {
    if (isOpen(popover)) popover.hidePopover()
    popover.showPopover(/** @type {any} */ ({ source }))
  }
  const hide = (/** @type {HTMLElement | null} */ popover) => {
    if (popover && isOpen(popover)) popover.hidePopover()
  }

  /** Close what is open: the step, then the spotlight under it. */
  function close() {
    listening.abort()
    const step = shown
    shown = null
    hide(step)
    hide(spotlight())
  }

  const say = (/** @type {string} */ type, /** @type {object} */ detail) => root.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }))
  const changed = () => say('change', { value: current })

  /** @param {HTMLElement} step @param {Element} found */
  function reveal(step, found) {
    waiting()
    close()
    found.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    const light = spotlight()
    if (light) show(light, found)
    show(step, found)
    shown = step
    if (!step.contains(document.activeElement)) {
      // The action with autofocus, or the way on: Next, or Done on the last step.
      const first = /** @type {HTMLElement[]} */ ([...step.querySelectorAll('[autofocus], button[value="next"], button[value="done"]')])
        .sort((a, b) => Number(b.hasAttribute('autofocus')) - Number(a.hasAttribute('autofocus')))
        .find(enabled)
      if (first) first.focus()
      else {
        if (!step.hasAttribute('tabindex')) step.tabIndex = -1
        step.focus()
      }
    }
    listening = new AbortController()
    const action = step.getAttribute('data-advance')
    if (!action) return
    // Heard as it starts, so a page that stops it still moves the tour, and answered once the page has had
    // its turn: what the action opens or adds is often the next step's target.
    document.addEventListener(action, (event) => {
      if (!found.contains(/** @type {Node} */ (event.target))) return
      listening.abort()
      setTimeout(() => {
        if (shown === step) advance()
      })
    }, { capture: true, signal: listening.signal })
  }

  /**
   * Open a step, or wait for its target. A step whose target does not appear in time is passed over; past
   * the last one the tour is complete.
   * @param {number} index
   */
  function open(index) {
    waiting()
    const list = steps()
    const step = list[index]
    if (!step) return end(true)
    const found = find(step, index)
    if (present(found)) return reveal(step, /** @type {Element} */ (found))
    close()
    const look = () => {
      const appeared = find(step, index)
      if (present(appeared)) reveal(step, /** @type {Element} */ (appeared))
    }
    const observer = new MutationObserver(look)
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true })
    const timer = setTimeout(() => {
      waiting()
      if (current !== index) return
      current = index + 1
      if (current >= steps().length) return end(true)
      open(current)
      changed()
    }, wait)
    waiting = () => {
      observer.disconnect()
      clearTimeout(timer)
      waiting = () => {}
    }
  }

  /** On to the next step, or the end of a complete tour. */
  function advance() {
    if (current === null) return
    if (current + 1 >= steps().length) return end(true)
    current += 1
    open(current)
    changed()
  }

  /** Back to the nearest step before this one whose target is there. */
  function back() {
    if (current === null) return
    const list = steps()
    for (let index = current - 1; index >= 0; index -= 1) {
      const found = find(/** @type {HTMLElement} */ (list[index]), index)
      if (!present(found)) continue
      current = index
      reveal(/** @type {HTMLElement} */ (list[index]), /** @type {Element} */ (found))
      changed()
      return
    }
  }

  /** @param {HTMLElement | null} [from] What started it, where focus goes back to. */
  function start(from) {
    if (current === null) origin = from ?? /** @type {HTMLElement | null} */ (document.activeElement)
    current = 0
    open(0)
    changed()
  }

  /**
   * End the tour: close what is open and give focus back, if it is still in the tour or nowhere.
   * @param {boolean} completed @param {boolean} [quiet] Ended from outside, by setting the value.
   */
  function end(completed, quiet = false) {
    waiting()
    if (current === null) return
    const active = document.activeElement
    const inside = !active || active === document.body || Boolean(active.closest('.coachmark-tour') === root && active.closest('.coachmark'))
    current = null
    close()
    if (inside && origin?.isConnected) origin.focus()
    origin = null
    if (quiet) return
    changed()
    say('end', { completed })
  }

  root.addEventListener('click', (event) => {
    const button = /** @type {HTMLButtonElement | null} */ (/** @type {Element} */ (event.target).closest('button[value]'))
    if (!button || !shown?.contains(button) || !enabled(button)) return
    if (button.value === 'next') advance()
    else if (button.value === 'back') back()
    else if (button.value === 'skip') end(false)
    else if (button.value === 'done') end(true)
  }, { signal })

  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !shown?.contains(/** @type {Node} */ (event.target))) return
    event.preventDefault()
    end(false)
  }, { signal })

  // A step closed by something else, such as a button that hides it, ends the tour where it stands.
  root.addEventListener('toggle', (event) => {
    const step = /** @type {HTMLElement} */ (event.target)
    if (step !== shown || isOpen(step)) return
    shown = null
    end(current !== null && current + 1 >= steps().length)
  }, { signal, capture: true })

  // A button with command="--start" and commandfor naming the root starts it, through the browser's invoker
  // commands, or this script where the browser has none.
  root.addEventListener('command', (event) => {
    const { command, source } = /** @type {Event & { command?: string, source?: HTMLElement | null }} */ (event)
    if (command === '--start') start(source)
  }, { signal })
  if (!('commandForElement' in document.createElement('button'))) {
    document.addEventListener('click', (event) => {
      const button = /** @type {Element} */ (event.target).closest?.('button[command="--start"]')
      if (button && root.id && button.getAttribute('commandfor') === root.id && enabled(button)) start(/** @type {HTMLElement} */ (button))
    }, { signal })
  }

  signal.addEventListener('abort', () => {
    if (attached.get(root) === controller) attached.delete(root)
    waiting()
    current = null
    close()
  })

  return valued(() => controller.abort(), () => current, (next) => {
    if (next === null || next === undefined || !(next >= 0)) return end(false, true)
    const index = Math.floor(next)
    if (index === current || index >= steps().length) return
    if (current === null) origin = /** @type {HTMLElement | null} */ (document.activeElement)
    current = index
    open(index)
  })
}
