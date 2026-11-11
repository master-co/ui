/**
 * Wheel: says which option rests under the mark.
 *
 * Turning a column is scrolling and coming to rest is scroll snapping; both are the platform's. When a
 * column has settled, this script moves `aria-selected="true"` to the option under the mark and the column
 * dispatches `change`, with the option and its value (`data-value`, or its text) in `detail`.
 *
 * It also brings each column's chosen option under the mark when it attaches and when the column is laid
 * out again, brings a clicked option there, gives a focused column the keys of a listbox, one option at a
 * time, and turns a column that came to rest on a disabled option on to the nearest one that is not.
 *
 * The function the behavior returns has a `value`: what each column's selected option stands for, in the
 * order of the columns. Set it to turn the columns from outside; that dispatches nothing.
 */

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/** How long a column must stand still to have settled, where the browser has no `scrollend`. */
const still = 120

/**
 * @param {HTMLElement} root The element with the `wheel` class.
 * @returns {(() => void) & { value: string[] }} Removes everything the behavior added. Its `value` is the
 *   value of each column.
 */
export function wheel(root) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)

  /** The option each column is turning to, so keys pressed while it turns add up. @type {Map<Element, HTMLElement>} */
  const heading = new Map()
  /** @type {Map<Element, ReturnType<typeof setTimeout>>} */
  const timers = new Map()

  /** @param {Element} column @returns {HTMLElement[]} */
  const options = (column) => [.../** @type {NodeListOf<HTMLElement>} */ (column.querySelectorAll('.wheel-option'))].filter((option) => !option.hidden)
  /** @param {Element} option */
  const disabled = (option) => option.getAttribute('aria-disabled') === 'true'
  /** @param {EventTarget | null} target The column an event came from, if it is one of this wheel's. */
  const columnOf = (target) => {
    const column = /** @type {Element | null} */ (target)?.closest?.('.wheel-column')
    return column && root.contains(column) ? /** @type {HTMLElement} */ (column) : null
  }
  const motion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'

  /**
   * How far a column has scrolled when an option rests under the mark. The column's padding puts its first
   * option there before any scrolling, so it is the option's distance from the first one.
   * @param {Element} column @param {HTMLElement} option
   */
  const rest = (column, option) => option.offsetTop - (options(column)[0]?.offsetTop ?? 0)

  /**
   * The option nearest the mark.
   * @param {Element} column @param {HTMLElement[]} among @returns {HTMLElement | undefined}
   */
  const nearest = (column, among) => among.reduce((found, option) =>
    Math.abs(rest(column, option) - column.scrollTop) < Math.abs(rest(column, found) - column.scrollTop) ? option : found, among[0])

  /**
   * Scroll a column until an option rests under the mark.
   * @param {Element} column @param {HTMLElement} option @param {ScrollBehavior} [behavior]
   */
  function turn(column, option, behavior = 'instant') {
    const top = rest(column, option)
    if (top !== column.scrollTop) heading.set(column, option)
    column.scrollTo({ top, behavior })
  }

  /** @param {Element} column @param {HTMLElement} chosen */
  function select(column, chosen) {
    for (const option of column.querySelectorAll('.wheel-option')) {
      const selected = String(option === chosen)
      if (option.getAttribute('aria-selected') !== selected) option.setAttribute('aria-selected', selected)
    }
  }

  /** A column has come to rest: the option under the mark is its value. @param {Element} column */
  function settle(column) {
    heading.delete(column)
    const all = options(column)
    const option = nearest(column, all)
    if (!option) return
    if (disabled(option)) {
      const enabled = nearest(column, all.filter((each) => !disabled(each)))
      if (enabled) turn(column, enabled, motion())
      return
    }
    const changed = option.getAttribute('aria-selected') !== 'true'
    select(column, option)
    if (changed) column.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value: valueOf(option), option } }))
  }

  /** Bring a column's chosen option under the mark, or choose the one that is there. @param {Element} column */
  function align(column) {
    const all = options(column)
    const chosen = all.find((option) => option.getAttribute('aria-selected') === 'true') ?? nearest(column, all.filter((option) => !disabled(option)))
    if (!chosen) return
    select(column, chosen)
    turn(column, chosen)
  }

  // Scrolling does not bubble, so the root listens on the way down and hears every column, whenever it was added.
  if ('onscrollend' in window) {
    root.addEventListener('scrollend', (event) => {
      const column = columnOf(event.target)
      if (column && column === event.target) settle(column)
    }, { capture: true, signal })
  } else {
    root.addEventListener('scroll', (event) => {
      const column = columnOf(event.target)
      if (!column || column !== event.target) return
      clearTimeout(timers.get(column))
      timers.set(column, setTimeout(() => settle(column), still))
    }, { capture: true, signal })
  }

  root.addEventListener('click', (event) => {
    const option = /** @type {HTMLElement | null} */ (/** @type {Element} */ (event.target).closest?.('.wheel-option'))
    const column = columnOf(option)
    if (!option || !column || option.hidden || disabled(option)) return
    turn(column, option, motion())
  }, { signal })

  root.addEventListener('keydown', (event) => {
    const column = columnOf(event.target)
    if (!column || event.ctrlKey || event.metaKey || event.altKey) return
    const all = options(column)
    const from = all.indexOf(heading.get(column) ?? nearest(column, all) ?? all[0])
    /** @param {HTMLElement[]} list */
    const enabled = (list) => list.filter((option) => !disabled(option))
    const before = enabled(all.slice(0, Math.max(from, 0)))
    const after = enabled(all.slice(from + 1))
    // A page is as many options as the column shows.
    const page = parseInt(getComputedStyle(root).getPropertyValue('--wheel-rows')) || 5
    let option
    if (event.key === 'ArrowUp') option = before.at(-1)
    else if (event.key === 'ArrowDown') option = after[0]
    else if (event.key === 'PageUp') option = before.at(-page) ?? before[0]
    else if (event.key === 'PageDown') option = after[page - 1] ?? after.at(-1)
    else if (event.key === 'Home') option = enabled(all)[0]
    else if (event.key === 'End') option = enabled(all).at(-1)
    else return
    event.preventDefault()
    if (option) turn(column, option, motion())
  }, { signal })

  /** @param {HTMLElement} option */
  const valueOf = (option) => option.dataset.value ?? option.textContent?.trim() ?? ''
  const detach = /** @type {(() => void) & { value: string[] }} */ (Object.defineProperty(() => controller.abort(), 'value', {
    enumerable: true,
    get: () => [...root.querySelectorAll('.wheel-column')].map((column) => {
      const selected = options(column).find((option) => option.getAttribute('aria-selected') === 'true')
      return selected ? valueOf(selected) : ''
    }),
    set: (/** @type {string[]} */ next) => {
      [...root.querySelectorAll('.wheel-column')].forEach((column, index) => {
        const option = options(column).find((each) => valueOf(each) === next?.[index])
        if (!option || disabled(option)) return
        select(column, option)
        turn(column, option)
      })
    }
  }))

  const columns = [...root.querySelectorAll('.wheel-column')]
  columns.forEach(align)
  // A column laid out later, in a popover that opens, starts at its top: bring its chosen option back.
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver((entries) => entries.forEach((entry) => align(entry.target)))
    columns.forEach((column) => observer.observe(column))
    signal.addEventListener('abort', () => observer.disconnect())
  }
  signal.addEventListener('abort', () => timers.forEach((timer) => clearTimeout(timer)))

  return detach
}
