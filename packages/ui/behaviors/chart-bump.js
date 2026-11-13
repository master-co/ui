/**
 * Chart form: a bump. At each label the series are ranked by their values, the highest first unless `ascending`,
 * and each series is a line through its ranks, so who led, who overtook whom and when is read at a glance. The
 * ranks are written beside the plot and each series' name at its last rank. A series is one point of the chart.
 */

/** @typedef {import('./chart-core.js').ChartKit} ChartKit */
/** @typedef {import('./chart-core.js').ChartMark} ChartMark */

/** @param {ChartKit} kit */
function form({ config, layout, shown, format, nameAxis, round, percent, real, width }) {
  const labels = config.labels ?? []
  const count = Math.max(2, labels.length, ...shown.map((series) => series.values?.length ?? 0))
  const places = Math.max(1, shown.length)
  // The rank of every series at every label: 1 for the highest value, or the lowest when ascending.
  /** @type {Map<number, (number | null)[]>} */
  const ranks = new Map(shown.map((series) => [series.index, []]))
  for (let step = 0; step < count; step++) {
    const order = shown.filter((series) => real(series.values?.[step])).sort((a, b) => (config.ascending ? 1 : -1) * (/** @type {number} */ (a.values?.[step]) - /** @type {number} */ (b.values?.[step])))
    for (const series of shown) /** @type {(number | null)[]} */ (ranks.get(series.index))[step] = order.includes(series) ? order.indexOf(series) + 1 : null
  }
  const at = (/** @type {number} */ rank) => (rank - 0.5) / places
  const middle = (/** @type {number} */ index) => index / (count - 1)
  nameAxis(Array.from({ length: count }, (_, index) => labels[index] ?? ''), middle, { edges: true })
  for (let rank = 1; rank <= places; rank++) layout.ticks.push({ text: String(rank), classes: 'chart-tick chart-tick-y', x: '0', y: percent(at(rank)), at: null })

  shown.forEach((series, index) => {
    const own = /** @type {(number | null)[]} */ (ranks.get(series.index))
    const points = own.map((rank, step) => (rank === null ? null : { step, rank, x: middle(step) * 100, y: at(rank) * 100 })).filter((point) => point !== null)
    if (!points.length) return
    // From rank to rank the line leaves and arrives level, so a change of rank is one clear turn.
    let d = `M${round(points[0].x)} ${round(points[0].y)}`
    for (let step = 1; step < points.length; step++) {
      const half = (points[step - 1].x + points[step].x) / 2
      d += `C${round(half)} ${round(points[step - 1].y)} ${round(half)} ${round(points[step].y)} ${round(points[step].x)} ${round(points[step].y)}`
    }
    if (points.length === 1) d += 'h0'
    /** @type {ChartMark[]} */
    const marks = [
      { kind: 'path', classes: 'chart-hit chart-hit-line', d },
      { kind: 'path', classes: 'chart-line', category: series.category, d },
      ...points.map((point) => /** @type {ChartMark} */ ({ kind: 'path', classes: 'chart-knot', category: series.category, name: labels[point.step] ?? '', value: `${point.rank} (${format(/** @type {number} */ (series.values?.[point.step]))})`, d: `M${round(point.x)} ${round(point.y)}h0` })),
    ]
    const end = points[points.length - 1]
    if (end.step === count - 1) layout.values.push({ text: series.name, classes: 'chart-value chart-value-across', x: '100%', y: percent(end.y / 100) })
    layout.tail = Math.max(layout.tail, width(series.name))
    layout.points.push({
      index,
      label: series.name,
      text: `${series.name}: ${points.map((point) => [labels[point.step], point.rank].filter((part) => part !== undefined && part !== '').join(' ')).join(', ')}`,
      current: config.current === index,
      // The readout stands by the line's last rank, beside the name it says more about.
      x: end.x / 100,
      y: end.y / 100,
      reach: 0,
      hit: null,
      cursor: null,
      marks,
    })
  })
  layout.radial = true
}

export const chartBump = Object.assign(form, { types: ['bump'], palette: /** @type {const} */ ('always') })
