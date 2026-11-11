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
}

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b)
/** What decides whether a behavior is attached again: its options, a function counted by its presence. */
const signature = (options?: object) => Object.entries(options ?? {}).map(([name, value]) => `${name}:${typeof value === 'function' ? 'function' : String(value)}`).join()

/**
 * Attach a Master UI behavior to the element that takes the returned ref, and keep a value in step with it.
 *
 * The behavior is the one place the keys, the focus and the state attributes are decided; this hook only
 * gives it a root and a lifetime. It is attached again when an option changes. `control.value` is written
 * to the behavior's `value` whenever it differs, and `control.onValueChange` hears every `input` and
 * `change` that leaves the behavior with another value.
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

  useEffect(() => {
    live.current = { options, control }
    // A value the reader changed and this component's owner did not accept is put back.
    const handle = attached.current
    if (!handle || control.value === undefined) return
    if (!same(handle.value, control.value)) handle.value = control.value
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
    attached.current = handle
    const first = control.value ?? control.defaultValue
    if (first !== undefined) handle.value = first
    kept.current = handle.value

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
    }
    // The behavior reads the options once, when it attaches: `key` stands for them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [behavior, key])
}
