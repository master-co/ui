import { useCallback, useEffect, useReducer, useRef } from 'react'

/** What a Master UI behavior returns: the function that detaches it, with a `value` where the pattern has one. */
type Handle<V> = (() => void) & { value?: V }

export interface Control<V> {
  /** The value, when this component is told it. Leave it out and the pattern keeps its own. */
  value?: V
  /** The value to start from when `value` is left out. */
  defaultValue?: V
  /** Called with the new value each time the reader changes it. */
  onValueChange?: (value: V) => void
  /** Listeners for events of the root, such as the `change` a behavior dispatches when a code is complete. */
  on?: Record<string, (event: Event) => void>
  /** Takes what the behavior returned each time it attaches, and null when it detaches, for a handle with more than a `value`. */
  attached?: (handle: Handle<V> | null) => void
}

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b)
/** An option as it counts toward attaching again: a function by its presence, a list or an object by what it holds. */
const written = (value: unknown) => {
  if (typeof value === 'function') return 'function'
  if (value === null || typeof value !== 'object') return String(value)
  try {
    return JSON.stringify(value, (_, inner: unknown) => (typeof inner === 'function' ? 'function' : inner))
  } catch {
    return String(value)
  }
}
/** What decides whether a behavior is attached again: its options. */
const signature = (options?: object) => Object.entries(options ?? {}).map(([name, value]) => `${name}:${written(value)}`).join()

/**
 * Attach a Master UI behavior to the element that takes the returned ref, and keep a value in step with it.
 *
 * The behavior is the one place the keys, the focus and the state attributes are decided; this hook only
 * gives it a root and a lifetime. It is attached again when an option changes, from the value it was left at.
 * `control.value` is written to the behavior's `value` when the owner gives another, when the owner did not
 * take a change it was told of, and when a render wrote rows again over it; `control.onValueChange` hears
 * every `input` and `change` that leaves the behavior with another value.
 */
export function useBehavior<E extends HTMLElement, O extends object, V = never>(
  behavior: (root: E, options?: O) => Handle<V>,
  options?: O,
  control: Control<V> = {},
) {
  const live = useRef({ options, control })
  const attached = useRef<Handle<V> | null>(null)
  const kept = useRef<V | undefined>(undefined)
  const [, again] = useReducer((count: number) => count + 1, 0)
  // What the behavior holds as this render starts. A render that changes it wrote rows again from data, with
  // the first value's attributes; one that leaves it leaves what the reader is in the middle of, such as the
  // first end of a range in a month that turns.
  const before = attached.current?.value

  useEffect(() => {
    live.current = { options, control }
    const handle = attached.current
    if (!handle || control.value === undefined) return
    // The owner gave another value, or did not take a change it was told of, which is put back; or the rows
    // were written again over the value.
    const told = !same(control.value, kept.current)
    const drawn = !same(handle.value, before)
    if (!(told || drawn) || same(handle.value, control.value)) return
    handle.value = control.value
    kept.current = handle.value
  })

  const key = signature(options)
  return useCallback((root: E | null) => {
    if (!root) return
    // A function among the options is called through the latest render, so a new one does not attach again.
    const stable = options && Object.fromEntries(Object.entries(options).map(([name, value]) => [
      name,
      typeof value === 'function' ? (...parameters: unknown[]) => (live.current.options as Record<string, (...parameters: unknown[]) => unknown>)[name]!(...parameters) : value,
    ])) as O
    const handle = behavior(root, stable)
    // Attached again, the behavior starts from the value the reader left, not from the default it started with.
    const first = control.value ?? (control.defaultValue !== undefined && kept.current !== undefined ? kept.current : control.defaultValue)
    attached.current = handle
    if (first !== undefined) handle.value = first
    kept.current = handle.value
    live.current.control.attached?.(handle)

    const controller = new AbortController()
    const hear = () => {
      const { value, onValueChange } = live.current.control
      const next = handle.value as V
      if (!same(next, kept.current)) {
        kept.current = next
        onValueChange?.(next)
      }
      if (value !== undefined) again()
    }
    for (const type of ['input', 'change']) root.addEventListener(type, hear, { signal: controller.signal })
    for (const type of Object.keys(control.on ?? {})) root.addEventListener(type, event => live.current.control.on?.[type]?.(event), { signal: controller.signal })

    return () => {
      controller.abort()
      handle()
      attached.current = null
      live.current.control.attached?.(null)
    }
    // The behavior reads the options once, when it attaches: `key` stands for them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [behavior, key])
}
