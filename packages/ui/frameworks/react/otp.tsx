'use client'
import { useState, type ComponentProps } from 'react'
import { otp } from '@master/ui/behaviors/otp.js'
import { useBehavior } from './use-behavior'

export interface OtpProps extends Omit<ComponentProps<'fieldset'>, 'defaultValue' | 'onChange'> {
  /** How many characters the code has. */
  length?: number
  /** The characters typed so far. */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Called with the code once every slot holds a character. */
  onComplete?: (code: string) => void
  /** What one character must match, as the `pattern` of each slot. A digit by default. */
  pattern?: string
  inputMode?: 'numeric' | 'text'
  /** The name of a slot, which has no visible label. */
  slotLabel?: (index: number) => string
  invalid?: boolean
}

/** A one-time code. Name the group with `aria-label` or `aria-labelledby`; `disabled` disables every slot. */
export function Otp({ length = 6, value, defaultValue, onValueChange, onComplete, pattern = '[0-9]', inputMode = 'numeric', slotLabel = index => `Digit ${index + 1}`, invalid, className, ...root }: OtpProps) {
  const ref = useBehavior(otp, undefined, {
    value,
    defaultValue,
    onValueChange,
    // The root's own change is the behavior's: every slot is filled. A slot's change bubbles through it too.
    on: { change: (event) => { if (event.target === event.currentTarget) onComplete?.((event as CustomEvent<{ value: string }>).detail.value) } },
  })
  const [first] = useState(value ?? defaultValue ?? '')
  return (
    <fieldset className={className ? `otp ${className}` : 'otp'} ref={ref} {...root}>
      {Array.from({ length }, (_, index) => (
        <input className="otp-slot" key={index} inputMode={inputMode} pattern={pattern} maxLength={1} autoComplete={index === 0 ? 'one-time-code' : 'off'} aria-label={slotLabel(index)} aria-invalid={invalid || undefined} defaultValue={first[index] ?? ''} />
      ))}
    </fieldset>
  )
}
