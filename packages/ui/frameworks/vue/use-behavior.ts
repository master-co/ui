import { nextTick, onBeforeUnmount, onMounted, onUpdated, watch, type Ref, type ShallowRef } from 'vue'

/** What a Master UI behavior returns: the function that detaches it, with a `value` where the pattern has one. */
type Handle<V> = (() => void) & { value?: V }

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b)
/** What decides whether a behavior is attached again: its options, a function counted by its presence. */
const signature = (options?: object) => Object.entries(options ?? {}).map(([name, value]) => `${name}:${typeof value === 'function' ? 'function' : String(value)}`).join()

/**
 * Attach a Master UI behavior to the element of a template ref, and keep a model in step with it.
 *
 * The behavior is the one place the keys, the focus and the state attributes are decided; this composable
 * only gives it a root and a lifetime. `options` is a function, read again whenever what it reads changes:
 * the behavior is attached again when an option does. `model` is written to the behavior's `value`
 * whenever the two differ, and takes every `input` and `change` that leaves the behavior with another value.
 *
 * Returns a function that reads the behavior's value as it is now.
 */
export function useBehavior<E extends HTMLElement, O extends object, V = never>(
  root: Readonly<ShallowRef<E | null>>,
  behavior: (root: E, options?: O) => Handle<V>,
  options?: () => O | undefined,
  model?: Ref<V | undefined>,
) {
  let handle: Handle<V> | undefined
  let listeners: AbortController | undefined
  /** The last value the model and the behavior agreed on. */
  let kept: V | undefined

  /** Value in. A model that was never given a value leaves the pattern its own. */
  const write = () => {
    if (!handle || !model || model.value === undefined) return
    if (!same(handle.value, model.value)) handle.value = model.value
    kept = handle.value
  }

  /** Value out. A choice says both `input` and `change`; the model hears it once. */
  const hear = () => {
    if (!handle || !model) return
    const next = handle.value as V
    if (!same(next, kept)) {
      kept = next
      model.value = next
    }
    // A value the reader changed and this component's owner did not accept is put back.
    void nextTick(write)
  }

  const detach = () => {
    listeners?.abort()
    handle?.()
    handle = undefined
  }

  const attach = () => {
    detach()
    const element = root.value
    if (!element) return
    const given = options?.()
    // A function among the options is called through the latest ones, so a new one does not attach again.
    const stable = given && Object.fromEntries(Object.entries(given).map(([name, value]) => [
      name,
      typeof value === 'function' ? (...parameters: unknown[]) => (options!() as Record<string, (...parameters: unknown[]) => unknown>)[name](...parameters) : value,
    ])) as O
    handle = behavior(element, stable)
    write()
    kept = handle.value
    listeners = new AbortController()
    for (const type of ['input', 'change']) element.addEventListener(type, hear, { signal: listeners.signal })
  }

  onMounted(attach)
  onBeforeUnmount(detach)
  // The behavior reads the options once, when it attaches: their signature stands for them.
  watch(() => signature(options?.()), attach, { flush: 'post' })
  // After the render, so that a value set together with new rows finds its row.
  if (model) watch(model, write, { flush: 'post', deep: true })
  // Rows written again from data carry the first value's attributes; the model goes over them.
  onUpdated(write)

  return () => handle?.value
}
