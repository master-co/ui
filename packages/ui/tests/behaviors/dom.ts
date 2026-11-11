import { Window } from 'happy-dom'

/**
 * A document for a behavior test. happy-dom has no popover API, so the helper adds the three methods and
 * teaches `matches` and `querySelector` callers the one pseudo-class behaviors ask about: `:popover-open`.
 * Everything a behavior reaches for as a global (document, getComputedStyle, the event classes) is set on
 * globalThis, the way a browser has it.
 */
export function dom(html: string) {
  const window = new Window({ url: 'https://ui.master.co/' })
  const document = window.document
  const open = new WeakSet<object>()
  const element = window.HTMLElement.prototype as any
  const matches = window.Element.prototype.matches
  element.showPopover = function () {
    if (open.has(this)) return
    open.add(this)
    this.dispatchEvent(new window.Event('toggle'))
  }
  element.hidePopover = function () {
    if (!open.has(this)) return
    open.delete(this)
    this.dispatchEvent(new window.Event('toggle'))
  }
  element.togglePopover = function () { open.has(this) ? this.hidePopover() : this.showPopover() }
  ;(window.Element.prototype as any).matches = function (selector: string) {
    if (selector === ':popover-open') return open.has(this)
    return matches.call(this, selector)
  }
  element.scrollIntoView = function () {}
  for (const name of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent', 'KeyboardEvent', 'MouseEvent', 'PointerEvent', 'InputEvent', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'AbortController', 'MutationObserver'] as const) {
    Object.defineProperty(globalThis, name, { value: name === 'window' ? window : (window as any)[name], configurable: true, writable: true })
  }
  document.body.innerHTML = html
  // happy-dom reports an exception thrown in a listener on the window instead of failing the caller, so a
  // broken handler would pass a test that only asserts what did not change. Collect them; assert `errors` is empty.
  const errors: unknown[] = []
  window.addEventListener('error', (event: any) => errors.push(event.error ?? event.message))

  const one = <T = any>(selector: string) => {
    const found = document.querySelector(selector)
    if (!found) throw new Error(`No element matches ${selector}`)
    return found as unknown as T
  }
  const all = <T = any>(selector: string) => [...document.querySelectorAll(selector)] as unknown as T[]
  /** Press a key on an element; returns whether the default was prevented. */
  const key = (target: any, name: string, init: Record<string, unknown> = {}) => {
    const event = new window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init })
    target.dispatchEvent(event)
    return event.defaultPrevented
  }
  const click = (target: any, init: Record<string, unknown> = {}) => target.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, ...init }))
  const pointer = (target: any, type: string, init: Record<string, unknown> = {}) => target.dispatchEvent(new window.PointerEvent(type, { bubbles: true, cancelable: true, ...init }))
  /** Set a field's value the way typing does: the value, then an input event. */
  const type = (target: any, value: string) => {
    target.value = value
    target.dispatchEvent(new window.Event('input', { bubbles: true }))
  }
  return { window, document, one, all, key, click, pointer, type, errors, isOpen: (target: any) => open.has(target) }
}
