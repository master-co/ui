'use client'
import { useState, type ChangeEvent, type ComponentProps } from 'react'
import { signature, signaturePath } from '@master/ui/behaviors/signature.js'
import { useBehavior } from './use-behavior'

/** One stroke: the points it passed through, in the units of the viewBox, each with the pressure there. */
export type SignatureStroke = [x: number, y: number, pressure: number][]

export interface SignatureProps extends Omit<ComponentProps<'fieldset'>, 'defaultValue' | 'onChange' | 'name' | 'ref'> {
  /** What is being signed: the legend of the group. */
  label: string
  /** The strokes drawn. */
  value?: SignatureStroke[]
  defaultValue?: SignatureStroke[]
  /** Called as a stroke is drawn, and when Undo or Clear takes strokes back. */
  onValueChange?: (value: SignatureStroke[]) => void
  /** The name a form submits the drawing under, as an SVG document. */
  name?: string
  /** The drawing's viewBox: the pad's proportions and the units of a stroke. */
  viewBox?: string
  /** The drawing's name, as an image. */
  padLabel?: string
  /** Where to sign, until the first stroke. */
  placeholder?: string
  undoLabel?: string
  clearLabel?: string
  /** The label of the typed name, the keyboard's way to sign. */
  typedLabel?: string
  /** The typed name. */
  typed?: string
  defaultTyped?: string
  onTypedChange?: (typed: string) => void
  /** The name a form submits the typed name under. */
  typedName?: string
  /** A signature is required: the typed name is, until something is drawn. */
  required?: boolean
  readOnly?: boolean
  invalid?: boolean
  /** What the status says when the pad is signed, when it is emptied and when Undo takes a stroke back. */
  messages?: { drawn?: string, cleared?: string, undone?: string }
}

/** A pad to sign in and a name to type instead. `disabled` disables the whole group. */
export function Signature({ label, value, defaultValue, onValueChange, name, viewBox = '0 0 400 160', padLabel = 'Your drawn signature', placeholder = 'Sign here', undoLabel = 'Undo', clearLabel = 'Clear', typedLabel = 'Or type your full name', typed, defaultTyped, onTypedChange, typedName, required, readOnly, invalid, messages, className, ...root }: SignatureProps) {
  const ref = useBehavior(signature, { drawn: messages?.drawn, cleared: messages?.cleared, undone: messages?.undone }, { value, defaultValue, onValueChange })
  const [first] = useState(() => value ?? defaultValue ?? [])
  const empty = first.length === 0
  const field = typed === undefined
    ? { defaultValue: defaultTyped }
    : { value: typed }
  return (
    <fieldset className={['signature', readOnly && 'signature-readonly', className].filter(Boolean).join(' ')} ref={ref} {...root}>
      <legend className="signature-label">{label}</legend>
      <div className="signature-pad">
        <svg className="signature-ink" viewBox={viewBox} role="img" aria-label={padLabel}>
          {first.map((stroke, index) => <path className="signature-stroke" d={signaturePath(stroke)} key={index} />)}
        </svg>
        <span className="signature-line" aria-hidden="true" />
        <span className="signature-placeholder" aria-hidden="true">{placeholder}</span>
        <div className="signature-actions">
          <button type="button" className="btn btn-sm btn-quiet signature-undo" aria-disabled={empty || undefined}>{undoLabel}</button>
          <button type="button" className="btn btn-sm btn-quiet signature-clear" aria-disabled={empty || undefined}>{clearLabel}</button>
        </div>
      </div>
      <label className="field">
        {typedLabel}
        <input className="input signature-name" name={typedName} autoComplete="name" required={required} readOnly={readOnly} aria-invalid={invalid || undefined} {...field} onChange={(event: ChangeEvent<HTMLInputElement>) => onTypedChange?.(event.target.value)} />
      </label>
      {/*
        A hidden field's value is its attribute, which React writes back on every render, a default as well as a
        value: the behavior fills it. So the first render carries no drawing here, where Svelte's and Vue's do,
        and a form sent before the page has hydrated sends none.
      */}
      <input type="hidden" className="signature-value" name={name} />
      <span className="signature-status" role="status" />
    </fieldset>
  )
}
