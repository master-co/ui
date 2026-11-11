'use client'
import { useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from 'react'
import { splitter } from '@master/ui/behaviors/splitter.js'
import { useBehavior } from './use-behavior'

export interface SplitterProps extends Omit<ComponentProps<'div'>, 'defaultValue' | 'children'> {
  /** The first and the second pane. */
  start: ReactNode
  end: ReactNode
  /** The first pane's size, in percent of the container. */
  value?: number
  defaultValue?: number
  /** Called as the handle moves. */
  onValueChange?: (value: number) => void
  /** Called once a drag ends or a key moved the handle. */
  onValueCommit?: (value: number) => void
  /** The least and the greatest size, in percent. */
  min?: number
  max?: number
  /** How far an arrow key moves the handle, in percent. */
  step?: number
  /** Stack the panes, with a handle that moves up and down. */
  stacked?: boolean
  /** The name of the handle: what it resizes. */
  label: string
  disabled?: boolean
}

/** Two panes and the handle between them. */
export function Splitter({ start, end, value, defaultValue = 50, onValueChange, onValueCommit, min = 0, max = 100, step = 5, stacked, label, disabled, className, style, ...root }: SplitterProps) {
  const [first] = useState(value ?? defaultValue)
  const size = useRef(first)
  const ref = useBehavior(splitter, { step }, {
    value,
    defaultValue,
    onValueChange: (next: number) => { size.current = next; onValueChange?.(next) },
    // The handle says change once a drag ends or a key moved it. A field in a pane says change too.
    on: { change: (event) => { if ((event.target as Element).parentElement === event.currentTarget && (event.target as Element).classList.contains('splitter-handle')) onValueCommit?.(size.current) } },
  })
  return (
    <div className={className ? `splitter ${className}` : 'splitter'} style={{ '--splitter-size': `${first}%`, ...style } as CSSProperties} ref={ref} {...root}>
      <div className="splitter-pane">{start}</div>
      <div className="splitter-handle" role="separator" tabIndex={disabled ? -1 : 0} aria-label={label} aria-valuenow={Math.round(first)} aria-valuemin={min} aria-valuemax={max} aria-orientation={stacked ? 'horizontal' : undefined} aria-disabled={disabled || undefined} />
      <div className="splitter-pane">{end}</div>
    </div>
  )
}
