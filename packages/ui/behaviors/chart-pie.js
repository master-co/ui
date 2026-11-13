/**
 * Chart form: a pie and a donut. Each series is a slice, its share of the sum of their values, kept a constant
 * gap from its neighbors with its corners turned. A donut has a hole, `hole` of its radius, and keeps its middle
 * for one figure.
 */

/** @typedef {import('./chart-core.js').ChartKit} ChartKit */
/** @typedef {import('./chart-core.js').ChartMark} ChartMark */

const tau = Math.PI * 2

/** @param {ChartKit} kit */
function form({ type, config, layout, shown, format, legend, sector, numbers, clamp, real }) {
  // A square, with the slices drawn around its middle. A donut keeps a place there for the readout.
  layout.classes = 'chart-plot chart-plot-radial'
  layout.radial = true
  layout.stretch = false
  layout.viewBox = '-50 -50 100 100'
  if (type === 'donut') layout.center ??= { value: '' }
  const items = shown.filter((series) => real(series.value) && series.value > 0)
  const total = items.reduce((sum, series) => sum + /** @type {number} */ (series.value), 0)
  const percentage = numbers(config.locale, { style: 'percent', maximumFractionDigits: 1 })
  const share = (/** @type {number} */ value) => percentage.format(total ? value / total : 0)
  const outer = 50
  const inner = type === 'donut' ? outer * clamp(config.hole ?? 0.7, 0.2, 0.92) : 0
  let angle = -Math.PI / 2
  items.forEach((series, index) => {
    const sweep = (/** @type {number} */ (series.value) / total) * tau
    const text = format(/** @type {number} */ (series.value))
    const middle = angle + sweep / 2
    const reach = inner ? (inner + outer) / 2 : outer * 0.62
    layout.points.push({
      index,
      label: '',
      text: `${series.name}: ${text} (${share(/** @type {number} */ (series.value))})`,
      current: config.current === index,
      x: items.length > 1 ? 0.5 + (reach * Math.cos(middle)) / 100 : 0.5,
      y: items.length > 1 ? 0.5 + (reach * Math.sin(middle)) / 100 : inner ? (50 - reach) / 100 : 0.5,
      reach: 0,
      hit: null,
      cursor: null,
      marks: [{ kind: 'slice', classes: 'chart-slice', category: series.category, name: series.name, value: text, d: sector(inner, outer, angle, angle + sweep, items.length > 1 ? 1.1 : 0, 1.8) }],
    })
    angle += sweep
  })
  legend((series, visible) => (visible && real(series.value) ? { value: share(Math.max(0, series.value)) } : {}))
}

export const chartPie = Object.assign(form, { types: ['pie', 'donut'], palette: /** @type {const} */ ('always') })
