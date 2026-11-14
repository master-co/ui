/**
 * Chart form: a sunburst. Each series is a slice of an inner ring, its share of the whole, and its `children`
 * are the slices of an outer ring over it, so a whole, its parts and the parts of each part are read from the
 * middle outward. A part's children take its color in lighter steps. The middle is kept for the readout.
 */

/** @typedef {import('./chart-core.js').ChartKit} ChartKit */

const tau = Math.PI * 2

/** @param {ChartKit} kit */
function form({ config, layout, shown, format, legend, sector, numbers, real }) {
  layout.classes = 'chart-plot chart-plot-radial'
  layout.radial = true
  layout.stretch = false
  layout.viewBox = '-50 -50 100 100'
  layout.center ??= { value: '' }
  // A part is the sum of its children, unless it gives a value of its own.
  const parts = shown.map((series) => {
    const children = (series.children ?? []).filter((child) => real(child.value) && child.value > 0)
    return { series, children, value: real(series.value) && series.value > 0 ? series.value : children.reduce((sum, child) => sum + child.value, 0) }
  }).filter((part) => part.value > 0)
  const total = parts.reduce((sum, part) => sum + part.value, 0)
  const share = numbers(config.locale, { style: 'percent', maximumFractionDigits: 1 })
  const gap = parts.length > 1 ? 1.1 : 0
  let angle = -Math.PI / 2
  let index = 0

  for (const part of parts) {
    const sweep = (part.value / total) * tau
    const text = format(part.value)
    const middle = angle + sweep / 2
    layout.points.push({
      index,
      label: '',
      text: `${part.series.name}: ${text} (${share.format(part.value / total)})`,
      current: config.current === index++,
      x: 0.5 + (28 * Math.cos(middle)) / 100,
      y: 0.5 + (28 * Math.sin(middle)) / 100,
      reach: 0,
      hit: null,
      cursor: null,
      marks: [{ kind: 'slice', classes: 'chart-slice', category: part.series.category, name: part.series.name, value: text, d: sector(21, 34.4, angle, angle + sweep, gap, 1.6) }],
    })
    // The children share the part's own sweep, in the order they are given, each a step lighter than the last.
    const sum = part.children.reduce((all, child) => all + child.value, 0)
    let from = angle
    part.children.forEach((child, order) => {
      const turn = (child.value / sum) * sweep
      const value = format(child.value)
      const half = from + turn / 2
      layout.points.push({
        index,
        label: '',
        text: `${part.series.name}, ${child.name}: ${value} (${share.format(child.value / total)})`,
        current: config.current === index++,
        x: 0.5 + (43 * Math.cos(half)) / 100,
        y: 0.5 + (43 * Math.sin(half)) / 100,
        reach: 0,
        hit: null,
        cursor: null,
        marks: [{ kind: 'slice', classes: 'chart-slice', category: part.series.category, name: child.name, value, tone: Math.round(78 - (part.children.length > 1 ? (order / (part.children.length - 1)) * 44 : 0)), d: sector(35.6, 50, from, from + turn, gap, 1.6) }],
      })
      from += turn
    })
    angle += sweep
  }
  legend((series, visible) => {
    const part = parts.find((each) => each.series === series)
    return visible && part ? { value: share.format(part.value / total) } : {}
  })
}

export const chartSunburst = Object.assign(form, { types: ['sunburst'], palette: /** @type {const} */ ('always') })
