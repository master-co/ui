'use client'
import { useState, type ComponentProps } from 'react'
import { stepper } from '@master/ui/behaviors/stepper.js'
import { useBehavior } from './use-behavior'

export interface StepperProps extends Omit<ComponentProps<'input'>, 'value' | 'defaultValue' | 'type'> {
  /** The number; null while the field is empty. */
  value?: number | null
  defaultValue?: number | null
  onValueChange?: (value: number | null) => void
  /** The names of the two buttons, which show only an icon. */
  decrementLabel: string
  incrementLabel: string
  /**
   * Write the figure with `Intl.NumberFormat` while the field is not focused: a unit, a currency, grouping.
   * The field keeps the plain number. Read when the stepper attaches, as `locale` is.
   */
  format?: Intl.NumberFormatOptions
  /** The locale the figure is written in. The page's by default. */
  locale?: string
}

/**
 * A number between two buttons. Name the field with `aria-label`, or give it an `id` a label points at;
 * `min`, `max`, `step` and every other prop of an input go to the field. A label with the `stepper-scrub`
 * class steps the number as it is dragged sideways.
 */
export function Stepper({ value, defaultValue, onValueChange, decrementLabel, incrementLabel, format, locale, className, ...field }: StepperProps) {
  const ref = useBehavior(stepper, { format, locale }, { value, defaultValue, onValueChange })
  const [first] = useState(value ?? defaultValue)
  // The first figure is drawn into the first render, so the HTML a server sends shows it.
  const [written] = useState(() => (format && typeof first === 'number' ? new Intl.NumberFormat(locale, format).format(first) : undefined))
  const input = <input className="input-group-field stepper-field" type="number" defaultValue={first ?? undefined} aria-valuetext={written} {...field} />
  return (
    <div className={className ? `input-group stepper ${className}` : 'input-group stepper'} ref={ref}>
      <button type="button" className="btn btn-square" value="-1" tabIndex={-1} aria-label={decrementLabel}>
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /></svg>
      </button>
      {format
        ? (
            <span className="stepper-value">
              {input}
              <span className="stepper-display" aria-hidden="true">{written}</span>
            </span>
          )
        : input}
      <button type="button" className="btn btn-square" value="1" tabIndex={-1} aria-label={incrementLabel}>
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  )
}
