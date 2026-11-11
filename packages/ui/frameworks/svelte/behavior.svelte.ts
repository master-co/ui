import { untrack } from 'svelte'
import type { Attachment } from 'svelte/attachments'

/** What a Master UI behavior returns: the function that detaches it, with a `value` where the pattern has one. */
type Handle<V> = (() => void) & { value?: V }

export interface Control<V> {
  /** Reads the value this component was given. While it is undefined the pattern keeps its own. */
  value?: () => V | undefined
  /** Takes the new value each time the reader changes it. */
  change?: (value: V) => void
  /** Listeners for events of the root, such as the `change` a behavior dispatches when a code is complete. */
  on?: Record<string, (event: Event) => void>
}

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b)
/** What decides whether a behavior is attached again: its options, a function counted by its presence. */
const signature = (options?: object) => Object.entries(options ?? {}).map(([name, value]) => `${name}:${typeof value === 'function' ? 'function' : String(value)}`).join()

/**
 * An attachment that gives a Master UI behavior its root, and keeps a value in step with it.
 *
 * The behavior is the one place the keys, the focus and the state attributes are decided; this only gives
 * it a root and a lifetime. It is attached again when an option changes. `control.value` is written to the
 * behavior's `value` whenever it differs, and `control.change` hears every `input` and `change` that leaves
 * the behavior with another value.
 *
 * This file is a module with runes: an attachment runs again for anything it reads, so the options are read
 * through a derived string and the value in an effect of its own, or every value would attach again.
 * @example <div class="listbox" {@attach behavior(listbox, undefined, { value: () => value })}>
 */
export function behavior<E extends HTMLElement, O extends object, V = never>(
  attach: (root: E, options?: O) => Handle<V>,
  options?: () => O | undefined,
  control: Control<V> = {},
): Attachment<E> {
  const key = $derived(signature(options?.()))
  return (root) => {
    // The behavior reads the options once, when it attaches: `key` stands for them.
    void key
    return untrack(() => {
      const given = options?.()
      // A function among the options is called through the latest one, so a new one does not attach again.
      const stable = given && Object.fromEntries(Object.entries(given).map(([name, value]) => [
        name,
        typeof value === 'function' ? (...parameters: unknown[]) => (options!() as Record<string, (...parameters: unknown[]) => unknown>)[name](...parameters) : value,
      ])) as O
      const handle = attach(root, stable)
      /** The last value the owner knows: the one it gave, or the one it was told. */
      let kept = handle.value

      $effect(() => {
        const value = control.value?.()
        if (value === undefined) return
        untrack(() => {
          if (!same(handle.value, value)) handle.value = value
          kept = handle.value
        })
      })

      const controller = new AbortController()
      const hear = () => {
        const next = handle.value as V
        if (same(next, kept)) return
        kept = next
        control.change?.(next)
      }
      for (const type of ['input', 'change']) root.addEventListener(type, hear, { signal: controller.signal })
      for (const [type, listener] of Object.entries(control.on ?? {})) root.addEventListener(type, listener, { signal: controller.signal })

      return () => {
        controller.abort()
        handle()
      }
    })
  }
}
