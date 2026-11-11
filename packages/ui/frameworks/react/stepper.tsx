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
}

/**
 * A number between two buttons. Name the field with `aria-label`, or give it an `id` a label points at;
 * `min`, `max`, `step` and every other prop of an input go to the field.
 */
export function Stepper({ value, defaultValue, onValueChange, decrementLabel, incrementLabel, className, ...field }: StepperProps) {
  const ref = useBehavior(stepper, undefined, { value, defaultValue, onValueChange })
  const [first] = useState(value ?? defaultValue)
  return (
    <div className={`input-group stepper ${className ?? ''}`} ref={ref}>
      <button type="button" className="btn btn-square" value="-1" tabIndex={-1} aria-label={decrementLabel}>
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /></svg>
      </button>
      <input className="input-group-field stepper-field" type="number" defaultValue={first ?? undefined} {...field} />
      <button type="button" className="btn btn-square" value="1" tabIndex={-1} aria-label={incrementLabel}>
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  )
}
