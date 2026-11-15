'use client'
import { useRef, useState, type ComponentProps, type CSSProperties } from 'react'
import { dial } from '@master/ui/behaviors/dial.js'
import { useBehavior } from './use-behavior'

/** A word or figure in the rim, at a value. Without a label it shows the value. */
export interface DialMark {
  value: number
  label?: string
}

export interface DialProps extends Omit<ComponentProps<'div'>, 'defaultValue' | 'children' | 'onChange' | 'role' | 'ref'> {
  /** The number. */
  value?: number
  defaultValue?: number
  /** Called as the dial turns. */
  onValueChange?: (value: number) => void
  /** Called once a drag ends, or a key or the wheel turned it. */
  onValueCommit?: (value: number) => void
  /** The least and the greatest value: 0 and 100, or 0 and 360 round a full circle. */
  min?: number
  max?: number
  /** How far an arrow key turns the value, and what a drag rounds it to. */
  step?: number
  /** How far PageUp and PageDown turn it; a tenth of the range by default. */
  page?: number
  /** The whole circle, for an angle that comes round again. */
  full?: boolean
  /** The name of the dial: what it sets. */
  label: string
  /** The words for a value, shown in the middle and given to assistive technology. */
  text?: (value: number) => string
  /** The name a form submits the value under. Without it there is no field. */
  name?: string
  /** How many equal steps to mark with ticks. */
  ticks?: number
  /** Words or figures in the rim, at their values. */
  marks?: DialMark[]
  /** Let a wheel turn the dial while Alt (Option) is held. */
  wheel?: boolean
  disabled?: boolean
}

/** A value set by turning a thumb around a circle. */
export function Dial({ value, defaultValue, onValueChange, onValueCommit, min = 0, max, step = 1, page, full, label, text, name, ticks, marks, wheel = false, disabled, className, style, ...root }: DialProps) {
  const greatest = max ?? (full ? 360 : 100)
  const [first] = useState(value ?? defaultValue ?? min)
  /** The value the dial holds: what `text` is written for, since a `text` given later is not for the first value. */
  const held = useRef(first)
  const ref = useBehavior(dial, { step, page, text, wheel }, {
    value,
    defaultValue,
    onValueChange: (next: number) => { held.current = next; onValueChange?.(next) },
    // The dial says change once a drag ends or a key or the wheel turned it, after the value has come out.
    on: { change: (event) => { if (event.target === event.currentTarget) onValueCommit?.(Number((event.currentTarget as Element).getAttribute('aria-valuenow'))) } },
  })
  return (
    <div className={['dial', full && 'dial-full', className].filter(Boolean).join(' ')} role="slider" tabIndex={disabled ? -1 : 0} aria-label={label} aria-valuenow={first} aria-valuemin={min} aria-valuemax={greatest} aria-valuetext={text?.(value ?? held.current)} aria-disabled={disabled || undefined} style={{ '--dial-value': first, '--dial-min': min, '--dial-max': greatest, ...style } as CSSProperties} ref={ref} {...root}>
      {ticks !== undefined && <span className="dial-ticks" style={{ '--dial-ticks': ticks } as CSSProperties} />}
      {marks?.map(mark => <span className="dial-mark" key={mark.value} style={{ '--dial-at': mark.value } as CSSProperties}>{mark.label ?? String(mark.value)}</span>)}
      <span className="dial-value">{text ? text(value ?? held.current) : String(value ?? held.current)}</span>
      <span className="dial-thumb" />
      {/* React writes a field's value with every render, so it writes the value the dial holds. */}
      {name !== undefined && <input type="hidden" name={name} value={value ?? held.current} disabled={disabled} />}
    </div>
  )
}
