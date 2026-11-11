'use client'
import { useState, type ComponentProps } from 'react'
import { compare } from '@master/ui/behaviors/compare.js'
import { useBehavior } from './use-behavior'

export interface CompareProps extends Omit<ComponentProps<'figure'>, 'defaultValue'> {
  /** How much of the second picture shows, from 0 to 100. */
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  /** The name of the handle: what moving it shows. */
  label: string
}

/** Two pictures and the line between them. The children are the two images, `compare-before` and `compare-after`. */
export function Compare({ value, defaultValue = 50, onValueChange, label, className, children, ...root }: CompareProps) {
  const ref = useBehavior(compare, undefined, { value, defaultValue, onValueChange })
  const [first] = useState(value ?? defaultValue)
  return (
    <figure className={className ? `compare ${className}` : 'compare'} ref={ref} {...root}>
      {children}
      <input type="range" className="compare-range" min={0} max={100} defaultValue={first} aria-label={label} />
    </figure>
  )
}
