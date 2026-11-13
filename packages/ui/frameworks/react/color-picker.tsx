'use client'
import { Fragment, useId, useState, type ComponentProps, type CSSProperties, type ElementType, type ReactNode } from 'react'
import { colorPicker, colorPickerState } from '@master/ui/behaviors/color-picker.js'
import { useBehavior } from './use-behavior'

export interface ColorPickerLabels {
  /** The field's thumb. `Lightness and chroma` by default. */
  field?: string
  /** `Hue` by default. */
  hue?: string
  /** `Opacity` by default. */
  alpha?: string
  /** The select of the format. `Format` by default. */
  format?: string
}

export interface ColorPickerProps extends Omit<ComponentProps<'div'>, 'defaultValue' | 'children'> {
  /** The color, in hex, rgb() or oklch(); the format it is written in is the one the picker writes. */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** What the color is: the name of the text field. */
  label: string
  /** The name the text field submits with a form. */
  name?: string
  /** An opacity slider. Without it the color is opaque. True by default. */
  alpha?: boolean
  disabled?: boolean
  /**
   * The button that opens the picker in a popover: spread what it is given on a button of your own, and put a
   * `swatch color-picker-swatch` in it to show the color. Leave it out and the picker stands inline.
   */
  trigger?: (attributes: { popoverTarget: string }) => ReactNode
  /** What the controls are called, in the page's words. */
  labels?: ColorPickerLabels
  /** What the field's thumb says it holds, from the lightness in percent and the chroma. */
  valueText?: (lightness: number, chroma: number) => string
}

/**
 * A color picker. The behavior holds the color and moves every part; this component draws the first value
 * into the first render and passes the value in and out.
 */
export function ColorPicker({ value, defaultValue, onValueChange, label, name, alpha = true, disabled, trigger, labels = {}, valueText, className, style, ...root }: ColorPickerProps) {
  const id = useId()
  // The first value is drawn into the first render; after that the behavior writes every part.
  const [first] = useState(() => colorPickerState(value ?? defaultValue ?? '', { valueText, opaque: !alpha }) ?? colorPickerState('#000000')!)
  const ref = useBehavior(colorPicker, { valueText }, { value, defaultValue, onValueChange })
  // Opened from a button, the parts stand in a popover beside it; inline, they stand in the root.
  const Column = (trigger ? 'div' : Fragment) as ElementType
  const column = trigger ? { id: `${id}popover`, popover: 'auto', className: 'popover color-picker-popover' } : {}
  return (
    <div className={className ? `color-picker ${className}` : 'color-picker'} ref={ref} style={{ ...first.properties, ...style } as CSSProperties} {...root}>
      {trigger?.({ popoverTarget: `${id}popover` })}
      <Column {...column}>
        <div className="color-picker-area">
          <div className="color-picker-thumb" role="slider" tabIndex={0} aria-label={labels.field ?? 'Lightness and chroma'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={first.valueNow} aria-valuetext={first.valueText} aria-disabled={disabled || undefined} />
        </div>
        <span className="swatch swatch-lg color-picker-swatch" />
        <input type="range" className="slider color-picker-hue" min={0} max={360} defaultValue={first.hue} aria-label={labels.hue ?? 'Hue'} disabled={disabled} />
        {alpha && <input type="range" className="slider color-picker-alpha" min={0} max={100} defaultValue={first.alpha * 100} aria-label={labels.alpha ?? 'Opacity'} disabled={disabled} />}
        <div className="color-picker-fields">
          <select className="select select-sm color-picker-format" defaultValue={first.format} aria-label={labels.format ?? 'Format'} disabled={disabled}>
            <option value="hex">Hex</option>
            <option value="rgb">RGB</option>
            <option value="oklch">OKLCH</option>
          </select>
          <input className="input input-sm color-picker-text" name={name} defaultValue={first.value} aria-label={label} spellCheck={false} autoComplete="off" disabled={disabled} />
        </div>
      </Column>
    </div>
  )
}
