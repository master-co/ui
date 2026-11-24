'use client'
import { useState, type ComponentProps } from 'react'
import { tags } from '@master/ui/behaviors/tags.js'
import { useBehavior } from './use-behavior'

export interface TagsProps extends Omit<ComponentProps<'input'>, 'value' | 'defaultValue' | 'name' | 'max'> {
  /** The values, in order. */
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  /** The name each value is submitted with, in a hidden input of its chip. */
  name?: string
  /** How many values the field holds at most. */
  max?: number
  /** Keys that add a value as Enter does. `[',']` by default. */
  delimiters?: string[]
  /** Says whether a value may be added. */
  validate?: (value: string) => boolean
  /** The accessible name of a chip's remove button. `Remove <value>` by default. */
  removeLabel?: (value: string) => string
}

/**
 * A tags field. Name the field with `aria-label`, or give it an `id` a label points at; every other prop of
 * an input goes to the field. React writes the chips from the value; the behavior turns what is typed into
 * values and moves focus between the chips.
 */
export function Tags({ value, defaultValue, onValueChange, name, max, delimiters, validate, removeLabel = (text: string) => `Remove ${text}`, className, ...field }: TagsProps) {
  const [shown, setShown] = useState(() => value ?? defaultValue ?? [])
  // The behavior keeps the values it asked for, so the chips may be written after it has said so.
  const draw = setShown
  const ref = useBehavior(tags, { max, delimiters, validate, removeLabel, draw, name }, { value, defaultValue, onValueChange })
  const values = value ?? shown
  return (
    <div className={className ? `tags input-group input-group-wrap ${className}` : 'tags input-group input-group-wrap'} ref={ref}>
      {values.map(each => (
        <span className="chip" data-value={each} key={each}>
          {each}
          {name && <input type="hidden" name={name} form={field.form} value={each} />}
          <button type="button" className="chip-remove" tabIndex={-1} aria-label={removeLabel(each)}><svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4L12 12" /><path d="M4 12L12 4" /></svg></button>
        </span>
      ))}
      <input className="input-group-field" autoComplete="off" {...field} />
    </div>
  )
}
