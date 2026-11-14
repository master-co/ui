'use client'
import { useId, useState, type ComponentProps } from 'react'
import { editable } from '@master/ui/behaviors/editable.js'
import { useBehavior } from './use-behavior'

type Field = Omit<ComponentProps<'input'>, 'value' | 'defaultValue' | 'hidden'> & Omit<ComponentProps<'textarea'>, 'value' | 'defaultValue' | 'hidden'>

export interface EditableProps extends Omit<Field, 'children'> {
  /** The saved value. */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** What the value is, read with it by assistive technology: the field's name. */
  label: string
  /** A textarea, for a value of several lines. */
  multiline?: boolean
  /** The value is on its way: the preview waits. */
  busy?: boolean
  /** What leaving the field does. `'save'` by default. */
  blur?: 'save' | 'cancel'
}

/**
 * An editable value. Every prop of a field goes to the field, so `required`, `maxLength` and `placeholder`
 * are its constraints and what the preview says while the value is empty.
 */
export function Editable({ value, defaultValue, onValueChange, label, multiline, busy, blur, disabled, className, ...field }: EditableProps) {
  const id = useId()
  // The first value is drawn into the first render; after that the behavior writes the preview and the field.
  const [first] = useState(() => value ?? defaultValue ?? '')
  const ref = useBehavior(editable, { blur }, { value, defaultValue, onValueChange })
  const shared = { className: 'editable-field', 'aria-label': label, disabled, hidden: true }
  return (
    <div className={className ? `editable ${className}` : 'editable'} ref={ref} aria-busy={busy || undefined}>
      <button type="button" className="editable-preview" id={`${id}preview`} aria-labelledby={`${id}name ${id}preview`} disabled={disabled}>
        {first || (field.placeholder ? <span className="editable-placeholder">{field.placeholder}</span> : null)}
      </button>
      <span id={`${id}name`} hidden>{label}</span>
      {multiline
        ? <textarea {...(field as ComponentProps<'textarea'>)} {...shared} defaultValue={first} />
        : <input {...(field as ComponentProps<'input'>)} {...shared} defaultValue={first} />}
    </div>
  )
}
