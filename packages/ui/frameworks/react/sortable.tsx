'use client'
import { useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { sortable, type SortableMessages } from '@master/ui/behaviors/sortable.js'
import { useBehavior } from './use-behavior'

export interface SortableItem {
  /** What the item stands for in the order. */
  value: string
  /** What the item is called: its handle is named "Move <label>", and the status says it. */
  label: string
}

export interface SortableProps<T extends SortableItem> extends Omit<ComponentProps<'ol'>, 'children' | 'defaultValue' | 'ref'> {
  items: T[]
  /** The order, as the items' values. The order of `items` by default. */
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  /** What an item shows beside its handle. */
  children: (item: T) => ReactNode
  /** Classes of each item, such as `list-row` in a `list`. */
  itemClassName?: string
  /** The accessible name of a handle. `Move <label>` by default. */
  handleLabel?: (item: T) => string
  /** What the status region says, in the page's language. */
  messages?: SortableMessages
  /** Every handle off: the items stay where they are, as while the page works on them. */
  disabled?: boolean
}

/**
 * A list the reader puts in order. React writes the items in the order it holds; the behavior carries them
 * with the pointer and the keys, and asks React to move one when it is dropped.
 */
export function Sortable<T extends SortableItem>({ items, value, defaultValue, onValueChange, children, itemClassName, handleLabel = item => `Move ${item.label}`, messages, disabled = false, className, ...root }: SortableProps<T>) {
  const [kept, setKept] = useState(() => value ?? defaultValue ?? items.map(item => item.value))
  const order = value ?? kept
  const shown = [...items].sort((a, b) => rank(order, a.value) - rank(order, b.value))
  const latest = useRef(shown)
  latest.current = shown
  // A move waits for the render that puts the item in its place, so a view transition pictures it there.
  const waiting = useRef<(() => void)[]>([])
  useLayoutEffect(() => {
    waiting.current.splice(0).forEach(done => done())
  })

  const move = (from: number, to: number) => new Promise<void>((done) => {
    const next = latest.current.map(item => item.value)
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved!)
    waiting.current.push(done)
    setKept(next)
    onValueChange?.(next)
  })
  const ref = useBehavior(sortable, { messages, move })

  return (
    <>
      <ol className={className ? `sortable ${className}` : 'sortable'} ref={ref} {...root}>
        {shown.map(item => (
          <li className={itemClassName ? `sortable-item ${itemClassName}` : 'sortable-item'} data-value={item.value} key={item.value}>
            <button type="button" className="sortable-handle" aria-pressed="false" aria-label={handleLabel(item)} disabled={disabled}><svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="6" cy="4" r="1" fill="currentColor" stroke="none" /><circle cx="10" cy="4" r="1" fill="currentColor" stroke="none" /><circle cx="6" cy="8" r="1" fill="currentColor" stroke="none" /><circle cx="10" cy="8" r="1" fill="currentColor" stroke="none" /><circle cx="6" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="10" cy="12" r="1" fill="currentColor" stroke="none" /></svg></button>
            {children(item)}
          </li>
        ))}
      </ol>
      <p className="sortable-status" role="status" />
    </>
  )
}

/** Where a value stands in an order; one the order leaves out goes after it. */
function rank(order: string[], value: string) {
  const index = order.indexOf(value)
  return index < 0 ? order.length : index
}
