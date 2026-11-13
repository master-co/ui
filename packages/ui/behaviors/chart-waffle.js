/**
 * Chart form: a waffle. A square of a hundred cells, each one percent of the whole, filled row by row from the
 * foot with each series' share. A share is read by counting, which a reader does more truly than they judge the
 * angle of a slice; shares are rounded so that they fill the hundred exactly.
 */

/** @typedef {import('./chart-core.js').ChartKit} ChartKit */
/** @typedef {import('./chart-core.js').ChartMark} ChartMark */

/** @param {ChartKit} kit */
function form({ config, layout, shown, format, legend, percent, real, numbers }) {
  const items = shown.filter((series) => real(series.value) && series.value > 0)
  const total = items.reduce((sum, series) => sum + /** @type {number} */ (series.value), 0)
  const share = numbers(config.locale, { style: 'percent', maximumFractionDigits: 1 })
  // Whole cells by the largest remainder: every share rounded down, then the cells left over go to the largest fractions.
  const exact = items.map((series) => (total ? (/** @type {number} */ (series.value) / total) * 100 : 0))
  const cells = exact.map(Math.floor)
  const spare = items.length ? 100 - cells.reduce((sum, count) => sum + count, 0) : 0
  exact.map((value, index) => ({ index, rest: value - Math.floor(value) })).sort((a, b) => b.rest - a.rest).slice(0, spare).forEach(({ index }) => cells[index]++)

  layout.classes = 'chart-plot chart-plot-radial'
  let cell = 0
  items.forEach((series, index) => {
    const value = /** @type {number} */ (series.value)
    const text = `${format(value)} (${share.format(total ? value / total : 0)})`
    /** @type {ChartMark[]} */
    const marks = []
    let sumX = 0
    let sumY = 0
    for (let count = 0; count < cells[index]; count++, cell++) {
      const column = cell % 10
      const row = 9 - Math.floor(cell / 10)
      sumX += column + 0.5
      sumY += row + 0.5
      marks.push({ kind: 'bar', classes: 'chart-unit', category: series.category, ...(count ? {} : { name: series.name, value: text }), x: percent(column / 10), y: percent(row / 10), width: '10%', height: '10%' })
    }
    layout.points.push({
      index,
      label: '',
      text: `${series.name}: ${text}`,
      current: config.current === index,
      x: marks.length ? sumX / marks.length / 10 : 0.5,
      y: marks.length ? sumY / marks.length / 10 : 0.5,
      reach: 0,
      hit: null,
      cursor: null,
      marks,
    })
  })
  legend((series, visible) => (visible && real(series.value) ? { value: share.format(total ? Math.max(0, series.value) / total : 0) } : {}))
}

export const chartWaffle = Object.assign(form, { types: ['waffle'], palette: /** @type {const} */ ('always') })
