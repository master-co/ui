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
/** The behavior finds its field as it attaches. One line and several are two elements, so it attaches again when `multiline` changes. */
const fielded = (root: HTMLElement, options?: { blur?: 'save' | 'cancel', multiline?: boolean }) => editable(root, { blur: options?.blur })

export function Editable({ value, defaultValue, onValueChange, label, multiline, busy, blur, disabled, className, ...field }: EditableProps) {
  const id = useId()
  // The first value is drawn into the first render; after that the behavior writes the preview and the field.
  const [first] = useState(() => value ?? defaultValue ?? '')
  const ref = useBehavior(fielded, { blur, multiline }, { value, defaultValue, onValueChange })
  const shared = { className: 'editable-field', 'aria-label': label, disabled, hidden: true }
  return (
    <div className={className ? `editable ${className}` : 'editable'} ref={ref} aria-busy={busy || undefined}>
      <button type="button" className="editable-preview" id={`${id}preview`} aria-labelledby={`${id}name ${id}preview`} disabled={disabled}>
        {first || (field.placeholder ? <span className="editable-placeholder">{field.placeholder}</span> : null)}
        <svg className="icon editable-pencil" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.6556 12.4849L3.2844 10.1793A0.7 0.7 0 0 1 3.4647 9.8686L10.505 2.8283A0.7 0.7 0 0 1 11.495 2.8283L13.1717 4.505A0.7 0.7 0 0 1 13.1717 5.495L6.1314 12.5353A0.7 0.7 0 0 1 5.8207 12.7156L3.5151 13.3444A0.7 0.7 0 0 1 2.6556 12.4849Z" /><path d="M9.6667 3.6667L12.3333 6.3333" /></svg>
      </button>
      <span id={`${id}name`} hidden>{label}</span>
      {multiline
        ? <textarea {...(field as ComponentProps<'textarea'>)} {...shared} defaultValue={first} />
        : <input {...(field as ComponentProps<'input'>)} {...shared} defaultValue={first} />}
    </div>
  )
}
