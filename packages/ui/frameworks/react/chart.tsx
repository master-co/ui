'use client'
import { useMemo, useState, type ComponentProps, type CSSProperties } from 'react'
import { chart, chartLayout, type ChartConfig, type ChartLayout, type ChartMark, type ChartPoint, type ChartSeries } from '@master/ui/behaviors/chart.js'
import { useBehavior } from './use-behavior'

export type { ChartConfig, ChartSeries }

export interface ChartProps extends Omit<ComponentProps<'figure'>, 'defaultValue'>, Omit<ChartConfig, 'hidden'> {
  /** The names of the hidden series, as the legend's unchecked boxes say. None by default. */
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
}

const style = (properties: Record<string, string | number>) => properties as CSSProperties
/** A share of the plot, as short as the behavior writes it. */
const share = (number: number) => Number(number.toFixed(4))

const mark = (item: ChartMark, index: number) => {
  const shared = { 'className': item.category ? `${item.classes} category-${item.category}` : item.classes, 'data-name': item.name, 'data-value': item.name === undefined ? undefined : item.value ?? '' }
  if (item.kind === 'bar') return <rect {...shared} x={item.x} y={item.y} width={item.width} height={item.height} key={index} />
  if (item.kind === 'dot') return <circle {...shared} cx={item.cx} cy={item.cy} r={item.r || undefined} key={index} />
  return <path {...shared} d={item.d} strokeWidth={item.stroke || undefined} pathLength={item.kind === 'arc' ? 1 : undefined} key={index} />
}

const hit = (area: NonNullable<ChartPoint['hit']>) => 'd' in area
  ? <path className="chart-hit" d={area.d} />
  : 'r' in area
    ? <circle className="chart-hit" cx={area.cx} cy={area.cy} r={area.r} />
    : <rect className="chart-hit" x={area.x} y={area.y} width={area.width} height={area.height} />

const entry = (key: ChartLayout['legend'][number]) => (
  <><span className={key.mark} />{key.name}{key.value === undefined ? null : <span className="chart-key-value">{key.value}</span>}</>
)

/**
 * A chart: lines, areas, bars, a pie, a donut, rings, a radar or a scatter, in one SVG. React writes it from
 * `chartLayout()`, the same layout the behavior writes, so it is in the first HTML; the behavior shows the
 * readout of the point under the pointer or the keys, and says which series the legend hides.
 */
export function Chart({ type, label, labels, series, stacked, horizontal, curve, min, max, ticks, format, tickFormat, xMin, xMax, xTicks, xFormat, dots, values, current, legend, toggle, legendLabel, hole, center, locale, value, defaultValue, onValueChange, className, ...root }: ChartProps) {
  const [first] = useState(() => value ?? defaultValue ?? [])
  const [hidden, setHidden] = useState(first)
  const layout = useMemo(
    () => chartLayout({ type, label, labels, series, stacked, horizontal, curve, min, max, ticks, format, tickFormat, xMin, xMax, xTicks, xFormat, dots, values, current, legend, toggle, legendLabel, hole, center, locale, hidden }),
    [type, label, labels, series, stacked, horizontal, curve, min, max, ticks, format, tickFormat, xMin, xMax, xTicks, xFormat, dots, values, current, legend, toggle, legendLabel, hole, center, locale, hidden],
  )
  const ref = useBehavior(chart, { hidden: first, draw: setHidden }, { value, defaultValue, onValueChange })

  // The first point is the stop in the tab order of the first render; the behavior moves it from there.
  const points = layout.points.map((point, index) => (
    <g className="chart-point" role="listitem" aria-label={point.text} aria-current={point.current ? 'true' : undefined} data-label={point.label} tabIndex={index ? -1 : 0} style={style({ '--chart-x': share(point.x), '--chart-y': share(point.y), '--chart-reach': share(point.reach), '--chart-index': point.index })} key={point.index}>
      {point.hit ? hit(point.hit) : null}
      {point.cursor ? <line className="chart-cursor" x1={point.cursor.x1} y1={point.cursor.y1} x2={point.cursor.x2} y2={point.cursor.y2} /> : null}
      {point.marks.map(mark)}
    </g>
  ))
  const paths = layout.paths.map((path, index) => <path className={path.category ? `${path.classes} category-${path.category}` : path.classes} d={path.d} key={index} />)

  return (
    <figure className={className ? `chart ${className}` : 'chart'} ref={ref} {...root}>
      <div className="chart-body" style={style({ '--chart-gutter': layout.gutter, '--chart-tail': layout.tail })}>
        <svg className={layout.classes} role="list" aria-label={layout.label || undefined}>
          <g aria-hidden="true">
            {layout.grid.map((line, index) => <line className={line.base ? 'chart-grid chart-grid-base' : 'chart-grid'} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} key={index} />)}
            {layout.ticks.map((tick, index) => <text className={tick.classes} x={tick.x} y={tick.y} style={tick.at ? style({ '--chart-x': tick.at[0], '--chart-y': tick.at[1] }) : undefined} key={index}>{tick.text}</text>)}
          </g>
          <svg className="chart-canvas" viewBox={layout.viewBox} preserveAspectRatio={layout.stretch ? 'none' : undefined} aria-hidden={layout.stretch ? 'true' : undefined} role={layout.stretch ? undefined : 'presentation'}>{paths}{layout.radial ? points : null}</svg>
          {layout.radial ? null : points}
          {layout.values.length ? <g aria-hidden="true">{layout.values.map((written, index) => <text className={written.classes} x={written.x} y={written.y} key={index}>{written.text}</text>)}</g> : null}
        </svg>
        {layout.center ? (
          <div className="chart-center">
            {layout.center.value ? <p className="chart-center-value">{layout.center.value}</p> : null}
            {layout.center.label ? <p className="chart-center-label">{layout.center.label}</p> : null}
          </div>
        ) : null}
        <div className="chart-tip" aria-hidden="true" hidden />
      </div>
      {!layout.legend.length ? null : layout.toggle ? (
        <div className="chart-legend" role="group" aria-label={layout.legendLabel}>
          {layout.legend.map(key => (
            <label className={key.category ? `chart-key category-${key.category}` : 'chart-key'} key={key.name}>
              <input type="checkbox" className="chart-key-input" value={key.name} defaultChecked={!key.hidden} />{entry(key)}
            </label>
          ))}
        </div>
      ) : (
        <ul className="chart-legend" aria-label={layout.legendLabel}>
          {layout.legend.map(key => <li className={key.category ? `chart-key category-${key.category}` : 'chart-key'} key={key.name}>{entry(key)}</li>)}
        </ul>
      )}
    </figure>
  )
}
