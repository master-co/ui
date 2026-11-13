/**
 * Chart form: rings. Each series is a ring inside the one before, filled from the top to its share of `max` on a
 * track of its own tint, with round ends.
 */

/** @typedef {import('./chart-core.js').ChartKit} ChartKit */
/** @typedef {import('./chart-core.js').ChartMark} ChartMark */

const tau = Math.PI * 2

/** @param {ChartKit} kit */
function form({ config, layout, shown, format, legend, pen, circle, round, clamp, real }) {
  layout.classes = 'chart-plot chart-plot-radial'
  layout.radial = true
  layout.stretch = false
  layout.viewBox = '-50 -50 100 100'
  layout.center ??= { value: '' }
  const items = shown.filter((series) => real(series.value))
  const count = Math.max(1, items.length)
  const space = 2.4
  const thick = Math.min(8, (38 - (count - 1) * space) / count)
  items.forEach((series, index) => {
    const full = series.max ?? config.max ?? 100
    const share = clamp(/** @type {number} */ (series.value) / (full || 1), 0, 1)
    const r = round(50 - thick / 2 - index * (thick + space), 3)
    // A round end reaches half the ring's width past the path's end: the path is drawn that much shorter at both.
    const cap = thick / 2 / r
    const from = -Math.PI / 2 + cap
    const to = Math.max(from, -Math.PI / 2 + share * tau - cap)
    const path = pen()
    if (to - from > 1e-6) path.arc(0, 0, r, from, to)
    else path.to(r * Math.cos(from), r * Math.sin(from))
    const text = format(/** @type {number} */ (series.value))
    /** @type {ChartMark[]} */
    const marks = [{ kind: 'track', classes: 'chart-track', category: series.category, d: circle(r), stroke: round(thick, 3) }]
    if (share > 0) marks.push({ kind: 'arc', classes: 'chart-arc', category: series.category, name: series.name, value: text, d: share >= 1 ? circle(r) : to - from > 1e-6 ? path.d : `${path.d}h0`, stroke: round(thick, 3) })
    else marks[0] = { ...marks[0], name: series.name, value: text }
    layout.points.push({ index, label: '', text: `${series.name}: ${text} / ${format(full)}`, current: config.current === index, x: 0.5, y: (50 - r) / 100, reach: 0, hit: null, cursor: null, marks })
  })
  legend((series) => (real(series.value) ? { value: format(series.value) } : {}))
}

export const chartRings = Object.assign(form, { types: ['rings'], palette: /** @type {const} */ ('always') })
