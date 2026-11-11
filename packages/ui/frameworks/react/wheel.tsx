'use client'
import { Fragment, useState, type ComponentProps } from 'react'
import { wheel } from '@master/ui/behaviors/wheel.js'
import { useBehavior } from './use-behavior'

export interface WheelColumn {
  /** The name of the column, for assistive technology. */
  label: string
  options: (string | { value: string, label: string, disabled?: boolean })[]
  /** Fixed text after the column that rests on the mark: the colon of a time, a unit. */
  separator?: string
}

export interface WheelProps extends Omit<ComponentProps<'div'>, 'defaultValue' | 'role'> {
  columns: WheelColumn[]
  /** The value of each column, in the order of the columns. */
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
}

/** Columns that turn. Name the group with `aria-label` or `aria-labelledby`. */
export function Wheel({ columns, value, defaultValue, onValueChange, className, ...root }: WheelProps) {
  const ref = useBehavior(wheel, undefined, { value, defaultValue, onValueChange })
  const [first] = useState(value ?? defaultValue ?? [])
  return (
    <div className={`wheel ${className ?? ''}`} role="group" ref={ref} {...root}>
      {columns.map((column, at) => (
        <Fragment key={column.label}>
          <div className="wheel-column" role="listbox" aria-label={column.label} tabIndex={0}>
            {column.options.map((option) => {
              const { value: own, label, disabled = false } = typeof option === 'string' ? { value: option, label: option } : option
              return <div className="wheel-option" role="option" key={own} data-value={own} aria-selected={own === first[at]} aria-disabled={disabled || undefined}>{label}</div>
            })}
          </div>
          {column.separator !== undefined && <span className="wheel-separator" aria-hidden="true">{column.separator}</span>}
        </Fragment>
      ))}
    </div>
  )
}
