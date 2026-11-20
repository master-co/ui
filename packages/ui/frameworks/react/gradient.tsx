'use client'
import { useId, useState, type ComponentProps, type CSSProperties } from 'react'
import { colorPickerState } from '@master/ui/behaviors/color-picker.js'
import { gradient, gradientCss, gradientStops, gradientValue, type GradientValue } from '@master/ui/behaviors/gradient.js'
import { useBehavior } from './use-behavior'

export type { GradientValue }

/** What the controls are called, in the page's words. */
export interface GradientLabels {
  add?: string
  remove?: string
  reverse?: string
  color?: string
  position?: string
  type?: string
  linear?: string
  radial?: string
  conic?: string
  angle?: string
  center?: string
  centerX?: string
  centerY?: string
  css?: string
}

export interface GradientProps extends Omit<ComponentProps<'div'>, 'defaultValue' | 'children' | 'ref'> {
  value?: GradientValue
  defaultValue?: GradientValue
  onValueChange?: (value: GradientValue) => void
  /** The gradient is shown and cannot be changed. */
  readOnly?: boolean
  disabled?: boolean
  labels?: GradientLabels
}

const icon = (...paths: string[]) => <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths.map(d => <path key={d} d={d} />)}</svg>

/**
 * A gradient editor. React writes the controls and a handle for each stop from the value, so the first HTML
 * holds the gradient; the behavior moves every state and asks for the stops again when they change.
 */
export function Gradient({ value, defaultValue, onValueChange, readOnly, disabled, labels = {}, className, style, ...root }: GradientProps) {
  const id = useId()
  const [first] = useState(() => gradientValue(value ?? defaultValue))
  const [shown, setShown] = useState(first)
  const words = { add: 'Add a stop', remove: 'Remove', reverse: 'Reverse', color: 'Color of the stop', position: 'Position', type: 'Type', linear: 'Linear', radial: 'Radial', conic: 'Conic', angle: 'Angle', center: 'Centre', centerX: 'Centre across, in percent', centerY: 'Centre down, in percent', css: 'The gradient as CSS', ...labels }
  const ref = useBehavior(gradient, { value: first, draw: setShown }, { value, defaultValue, onValueChange })
  const css = gradientCss(first)
  const color = colorPickerState(first.stops[0]!.color)!
  return (
    <div className={className ? `gradient ${className}` : 'gradient'} ref={ref} aria-readonly={readOnly || undefined} aria-disabled={disabled || undefined} style={{ '--gradient': css.css, '--gradient-fallback': css.fallback, ...style } as CSSProperties} {...root}>
      <div className="gradient-preview" aria-hidden="true" />
      <div className="gradient-bar">
        {gradientStops(shown.stops).map((stop, index, all) => (
          <span className="gradient-stop" role="slider" data-id={stop.id} aria-label={`Stop ${index + 1} of ${all.length}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={stop.offset} style={{ '--gradient-offset': stop.offset, '--gradient-color': stop.color } as CSSProperties} key={stop.id} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-xs">
        <button type="button" className="btn btn-sm gradient-add">{icon('M3 8L13 8', 'M8 3L8 13')}{words.add}</button>
        <button type="button" className="btn btn-sm gradient-remove">{icon('M3 8L13 8')}{words.remove}</button>
        <button type="button" className="btn btn-sm btn-quiet gradient-reverse">{icon('M8 1.6667L8 14.3333', 'M5.6667 6.3298L5.6667 11.45A0.55 0.55 0 0 1 5.1167 12L2.5566 12A0.55 0.55 0 0 1 2.0647 11.204L4.6248 6.0839A0.55 0.55 0 0 1 5.6667 6.3298Z', 'M10.3333 6.3298L10.3333 11.45A0.55 0.55 0 0 0 10.8833 12L13.4434 12A0.55 0.55 0 0 0 13.9353 11.204L11.3752 6.0839A0.55 0.55 0 0 0 10.3333 6.3298Z')}{words.reverse}</button>
      </div>
      <div className="gradient-fields">
        <fieldset className="gradient-color">
          <legend className="mb(6) text-xs font-medium fg-text-muted">{words.color}</legend>
          <div className="color-picker" style={color.properties as CSSProperties}>
            <div className="color-picker-area">
              <div className="color-picker-thumb" role="slider" tabIndex={0} aria-label="Lightness and chroma" aria-valuemin={0} aria-valuemax={100} aria-valuenow={color.valueNow} aria-valuetext={color.valueText} />
            </div>
            <span className="swatch swatch-lg color-picker-swatch" />
            <input type="range" className="slider color-picker-hue" min={0} max={360} defaultValue={color.hue} aria-label="Hue" />
            <input type="range" className="slider color-picker-alpha" min={0} max={100} defaultValue={color.alpha * 100} aria-label="Opacity" />
            <div className="color-picker-fields">
              <select className="select select-sm color-picker-format" defaultValue="hex" aria-label="Format">
                <option value="hex">Hex</option>
                <option value="rgb">RGB</option>
                <option value="oklch">OKLCH</option>
              </select>
              <input className="input input-sm color-picker-text" defaultValue={color.value} aria-label={words.color} spellCheck={false} autoComplete="off" />
            </div>
          </div>
        </fieldset>
        <div className="flex flex-col gap-md min-w(0)">
          <fieldset className="gradient-offset">
            <legend className="mb(6) text-xs font-medium fg-text-muted">{words.position}</legend>
            <input type="range" className="slider" min={0} max={100} step={1} defaultValue={first.stops[0]!.offset} aria-label={words.position} />
            <input type="number" className="input input-sm w(72)" min={0} max={100} step={0.1} defaultValue={first.stops[0]!.offset} aria-label={`${words.position}, %`} />
          </fieldset>
          <fieldset className="gradient-type">
            <legend className="mb(6) text-xs font-medium fg-text-muted">{words.type}</legend>
            <div className="segmented segmented-sm" role="radiogroup" aria-label={words.type}>
              {(['linear', 'radial', 'conic'] as const).map(type => (
                <label className="segmented-item" key={type}><input type="radio" className="segmented-input" name={`${id}type`} value={type} defaultChecked={first.type === type} />{words[type]}</label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap items-start gap-lg">
            <fieldset className="gradient-angle">
              <legend className="mb(6) text-xs font-medium fg-text-muted">{words.angle}</legend>
              <div className="dial dial-sm dial-full" role="slider" tabIndex={0} aria-label={words.angle} aria-valuenow={first.angle} aria-valuemin={0} aria-valuemax={360} aria-valuetext={`${first.angle}°`} style={{ '--dial-value': first.angle } as CSSProperties}>
                <span className="dial-value">{`${first.angle}°`}</span>
                <span className="dial-thumb" />
              </div>
            </fieldset>
            <fieldset className="gradient-center">
              <legend className="mb(6) text-xs font-medium fg-text-muted">{words.center}</legend>
              <input type="number" className="input input-sm w(72)" min={0} max={100} defaultValue={first.center[0]} aria-label={words.centerX} />
              <input type="number" className="input input-sm w(72)" min={0} max={100} defaultValue={first.center[1]} aria-label={words.centerY} />
            </fieldset>
          </div>
        </div>
      </div>
      <pre className="code-block gradient-css" aria-label={words.css}>{css.text}</pre>
    </div>
  )
}
