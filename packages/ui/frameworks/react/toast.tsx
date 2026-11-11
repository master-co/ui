'use client'
import { useSyncExternalStore, type ComponentProps, type CSSProperties, type ReactNode } from 'react'

export interface ToastMessage {
  title?: ReactNode
  description?: ReactNode
  /** Colors the icon; give the icon itself in `icon`, with the classes `icon toast-icon`. */
  status?: 'info' | 'success' | 'warning' | 'danger'
  icon?: ReactNode
  /** How long the toast stays, in milliseconds. 6000 by default; `false` keeps it until it is dismissed. */
  duration?: number | false
}

interface Shown extends ToastMessage { id: number }

let shown: Shown[] = []
let count = 0
const listeners = new Set<() => void>()
const none: Shown[] = []
function publish(next: Shown[]) {
  shown = next
  listeners.forEach(listener => listener())
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
const remove = (id: number) => publish(shown.filter(toast => toast.id !== id))

/**
 * Show a toast in the `Toaster` of the page. Returns a function that removes it.
 * @example toast({ title: 'Deployed to production', status: 'success' })
 */
export function toast(message: ToastMessage | string) {
  // A server has no page to show a toast in, and what it queued would reach every reader.
  if (typeof document === 'undefined') return () => {}
  const id = ++count
  publish([...shown, { id, ...(typeof message === 'string' ? { description: message } : message) }])
  return () => remove(id)
}

export interface ToasterProps extends ComponentProps<'div'> {
  /** The name of the region, for assistive technology. */
  label?: string
  /** The name of the button that dismisses a toast. */
  dismissLabel?: string
}

/** The stack that shows the toasts. Render it once, anywhere in the page. */
export function Toaster({ label = 'Notifications', dismissLabel = 'Dismiss', className, ...root }: ToasterProps) {
  const toasts = useSyncExternalStore(subscribe, () => shown, () => none)
  return (
    <div className={`toast-region ${className ?? ''}`} role="region" aria-label={label} aria-live="polite" {...root}>
      {toasts.map(({ id, title, description, status, icon, duration = 6000 }) => (
        <dialog
          open
          className={`toast ${duration === false ? '' : 'toast-timed'} ${status ? `toast-${status}` : ''}`}
          key={id}
          aria-labelledby={`toast-${id}`}
          style={duration === false ? undefined : { '--toast-duration': `${duration}ms` } as CSSProperties}
          // A dismissed toast leaves through its transition before it is removed; an expired one has left already.
          onClose={() => setTimeout(() => remove(id), 300)}
          onAnimationEnd={event => event.animationName === 'toast-expire' && event.target === event.currentTarget && remove(id)}
        >
          {icon}
          <div className="toast-body">
            {title !== undefined && <p className="toast-title" id={`toast-${id}`}>{title}</p>}
            {description !== undefined && <p className="toast-description" id={title === undefined ? `toast-${id}` : undefined}>{description}</p>}
          </div>
          <form method="dialog" className="toast-close">
            <button className="btn btn-quiet btn-square btn-sm" aria-label={dismissLabel}>
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </form>
        </dialog>
      ))}
    </div>
  )
}
