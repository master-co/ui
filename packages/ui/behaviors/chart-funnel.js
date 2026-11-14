/**
 * Chart form: a funnel. Each series is a stage of one flow, in order: as wide as its value against the widest
 * stage's, which is the first in a flow that only thins, and narrowing to the width of the stage after it, so
 * where the flow thins is where the shape steps in. Its name stands beside it, and its value and what is left of
 * the first stage after it.
 */

/** @typedef {import('./chart-core.js').ChartKit} ChartKit */

/** @param {ChartKit} kit */
function form({ config, layout, shown, format, nameAxis, round, percent, real, width, numbers }) {
  const stages = shown.filter((series) => real(series.value) && series.value >= 0)
  const count = stages.length
  // The widest stage fills the plot; what is left is counted against the first stage, where the flow begins.
  const widest = Math.max(...stages.map((series) => /** @type {number} */ (series.value)), 0) || 1
  const first = /** @type {number} */ (stages[0]?.value) || widest
  const share = numbers(config.locale, { style: 'percent', maximumFractionDigits: 0 })
  const tall = 1 / Math.max(1, count)
  // A sliver of the plot parts each stage from the next.
  const gap = count > 1 ? 0.014 : 0
  nameAxis(stages.map((series) => series.name), (index) => (index + 0.5) * tall, { across: true })

  stages.forEach((series, index) => {
    const value = /** @type {number} */ (series.value)
    const top = value / widest
    const next = stages[index + 1]
    const foot = next ? /** @type {number} */ (next.value) / widest : top
    const from = index * tall + gap / 2
    const to = (index + 1) * tall - gap / 2
    const x = (/** @type {number} */ part, /** @type {1 | -1} */ side) => round(50 + side * part * 50)
    const d = `M${x(top, -1)} ${round(from * 100)}H${x(top, 1)}L${x(foot, 1)} ${round(to * 100)}H${x(foot, -1)}Z`
    const text = `${format(value)} (${share.format(value / first)})`
    layout.values.push({ text, classes: 'chart-value chart-value-across', x: '100%', y: percent((index + 0.5) * tall) })
    layout.tail = Math.max(layout.tail, width(text))
    layout.points.push({
      index,
      label: '',
      text: `${series.name}: ${text}`,
      current: config.current === index,
      x: 0.5,
      y: (index + 0.5) * tall,
      reach: 0,
      hit: null,
      cursor: null,
      // Each stage is a step lighter than the one before, so the flow reads from full ink to a tint.
      marks: [{ kind: 'path', classes: 'chart-stage', category: series.category, name: series.name, value: text, tone: Math.round(100 - (count > 1 ? (index / (count - 1)) * 62 : 0)), d }],
    })
  })
  layout.radial = true
}

export const chartFunnel = Object.assign(form, { types: ['funnel'], palette: /** @type {const} */ ('never') })
