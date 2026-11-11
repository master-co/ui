'use client'
import { useState, type ComponentProps } from 'react'
import { listbox } from '@master/ui/behaviors/listbox.js'
import { useBehavior } from './use-behavior'

export interface ListboxOption {
  /** What choosing the option gives `onValueChange`. */
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export interface ListboxProps extends Omit<ComponentProps<'div'>, 'defaultValue' | 'role'> {
  options: ListboxOption[]
  /** The value of the chosen option, null for none; a list of them when `multiple`. */
  value?: string | string[] | null
  defaultValue?: string | string[] | null
  onValueChange?: (value: string | string[] | null) => void
  /** Any number of options may be chosen. */
  multiple?: boolean
}

/** A listbox that stands in the page. Name it with `aria-label` or `aria-labelledby`. */
export function Listbox({ options, value, defaultValue, onValueChange, multiple, className, ...root }: ListboxProps) {
  const ref = useBehavior(listbox, undefined, { value, defaultValue, onValueChange })
  const [first] = useState(() => [value ?? defaultValue ?? []].flat())
  return (
    <div className={`listbox ${className ?? ''}`} role="listbox" tabIndex={0} aria-multiselectable={multiple || undefined} ref={ref} {...root}>
      {options.map(option => (
        <div className="listbox-option" role="option" key={option.value} data-value={option.value} aria-checked={first.includes(option.value)} aria-disabled={option.disabled || undefined}>
          {option.description
            ? <span className="listbox-body"><span>{option.label}</span><span className="listbox-description">{option.description}</span></span>
            : option.label}
        </div>
      ))}
    </div>
  )
}
