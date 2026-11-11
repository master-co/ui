'use client'
import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { combobox } from '@master/ui/behaviors/combobox.js'
import { useBehavior } from './use-behavior'

export interface ComboboxOption {
  /** What choosing the option gives `onValueChange`. */
  value: string
  /** What the option says, and what the field holds once it is chosen. */
  label: string
  description?: string
  disabled?: boolean
}

export interface ComboboxProps extends Omit<ComponentProps<'input'>, 'value' | 'defaultValue' | 'role'> {
  options: ComboboxOption[]
  /** The value of the chosen option; null while the field holds text no option was chosen for. */
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
  /** False when `options` are already the matches, from a server or a search of your own. */
  filter?: boolean
  /** The name of the list, for assistive technology. */
  listLabel: string
  /** The name of the button that opens the list. */
  toggleLabel: string
  /** What the list says when no option matches. */
  empty?: ReactNode
}

/**
 * A combobox. Name the field with `aria-label`, or give it an `id` a label points at; every other prop of
 * an input goes to the field, so `onChange` hears what is typed.
 */
export function Combobox({ options, value, defaultValue, onValueChange, filter = true, listLabel, toggleLabel, empty, className, ...field }: ComboboxProps) {
  const id = useId()
  const ref = useBehavior(combobox, { filter }, { value, defaultValue, onValueChange })
  const [first] = useState(value ?? defaultValue)
  return (
    <div className={`combobox ${className ?? ''}`} ref={ref}>
      <div className="input-group">
        <input className="input-group-field" role="combobox" aria-expanded="false" aria-controls={`${id}list`} aria-autocomplete="list" autoComplete="off" defaultValue={options.find(option => option.value === first)?.label} {...field} />
        <button type="button" className="combobox-toggle" tabIndex={-1} aria-label={toggleLabel} />
      </div>
      <div id={`${id}list`} popover="manual" className="listbox" role="listbox" aria-label={listLabel}>
        {options.map(option => (
          <div className="listbox-option" role="option" key={option.value} data-value={option.value} aria-checked={option.value === first} aria-disabled={option.disabled || undefined}>
            {option.description
              ? <span className="listbox-body"><span>{option.label}</span><span className="listbox-description">{option.description}</span></span>
              : option.label}
          </div>
        ))}
        {empty !== undefined && <div className="listbox-empty">{empty}</div>}
      </div>
    </div>
  )
}
