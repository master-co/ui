import { useId, type ComponentProps, type ReactNode } from 'react'

export interface FieldProps extends Omit<ComponentProps<'div'>, 'children'> {
  label: ReactNode
  /** Guidance under the control. */
  hint?: ReactNode
  /** What is wrong with the value. The stylesheet shows it while the control is invalid. */
  error?: ReactNode
  /** The control: spread what it is given on an input, a select, a textarea or a component that takes them. */
  children: (control: { id: string, 'aria-describedby'?: string, 'aria-invalid'?: true }) => ReactNode
}

/** A label, its control, a hint and an error, joined by their ids. */
export function Field({ label, hint, error, className, children, ...root }: FieldProps) {
  const id = useId()
  const described = [hint !== undefined && `${id}hint`, error !== undefined && `${id}error`].filter(Boolean).join(' ')
  return (
    <div className={`field ${className ?? ''}`} {...root}>
      <label htmlFor={id}>{label}</label>
      {children({ id, 'aria-describedby': described || undefined, 'aria-invalid': error !== undefined && error !== false && error !== null ? true : undefined })}
      {hint !== undefined && <span className="field-hint" id={`${id}hint`}>{hint}</span>}
      {error !== undefined && <span className="field-error" id={`${id}error`}>{error}</span>}
    </div>
  )
}
