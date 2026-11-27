/**
 * Chart form: a slope. Each series is a straight line from its value at one label to its value at the next, so
 * what rose, what fell and what crossed is read from the slopes alone. There is no scale to read: each line's
 * value is written at its first end and its name and value at its last, nudged apart where they would meet.
 * A series is one point of the chart: under the pointer the others step back.
 */

/** @typedef {import('./chart-core.js').ChartKit} ChartKit */
/** @typedef {import('./chart-core.js').ChartMark} ChartMark */

/** @param {ChartKit} kit */
function form({ config, layout, shown, format, nameAxis, scale, round, percent, clamp, real, width }) {
  const labels = config.labels ?? []
  const count = Math.max(2, labels.length, ...shown.map((series) => series.values?.length ?? 0))
  const numbers = shown.flatMap((series) => (series.values ?? []).filter(real))
  const axis = scale(numbers.length ? Math.min(...numbers) : 0, numbers.length ? Math.max(...numbers) : 1, 4, config.min, config.max)
  // The lines keep clear of the plot's top and foot, so the labels at their ends have room.
  const at = (/** @type {number} */ number) => 0.06 + 0.88 * (1 - clamp(axis.at(number), 0, 1))
  const middle = (/** @type {number} */ index) => index / (count - 1)
  nameAxis(Array.from({ length: count }, (_, index) => labels[index] ?? ''), middle, { edges: true })
  for (let index = 0; index < count; index++) layout.grid.push({ x1: percent(middle(index)), y1: '0', x2: percent(middle(index)), y2: '100%', base: false })

  /**
   * Labels down one side, each as near its line's end as the ones above it allow. Labels pushed past the lowest
   * end a line can have go back up, as far as the ones below them need, so none is pushed off the plot.
   * @param {{ y: number, text: string }[]} ends
   */
  const spread = (ends) => {
    const sorted = [...ends].sort((a, b) => a.y - b.y)
    const apart = 0.075
    for (let index = 1; index < sorted.length; index++) sorted[index].y = Math.max(sorted[index].y, sorted[index - 1].y + apart)
    const foot = at(axis.start)
    if (sorted.length && sorted[sorted.length - 1].y > foot) {
      sorted[sorted.length - 1].y = foot
      for (let index = sorted.length - 2; index >= 0; index--) sorted[index].y = Math.min(sorted[index].y, sorted[index + 1].y - apart)
    }
    return sorted
  }
  /** @type {{ y: number, text: string }[]} */
  const first = []
  /** @type {{ y: number, text: string }[]} */
  const last = []

  shown.forEach((series, index) => {
    const points = Array.from({ length: count }, (_, step) => {
      const number = series.values?.[step]
      return real(number) ? { step, number, x: middle(step), y: at(number) } : null
    }).filter((point) => point !== null)
    if (!points.length) return
    const d = `M${points.map((point) => `${round(point.x * 100)} ${round(point.y * 100)}`).join('L')}${points.length === 1 ? 'h0' : ''}`
    /** @type {ChartMark[]} */
    const marks = [
      { kind: 'path', classes: 'chart-hit chart-hit-line', d },
      { kind: 'path', classes: 'chart-line', category: series.category, d },
      ...points.map((point) => /** @type {ChartMark} */ ({ kind: 'path', classes: 'chart-knot', category: series.category, name: labels[point.step] ?? '', value: format(point.number), d: `M${round(point.x * 100)} ${round(point.y * 100)}h0` })),
    ]
    const start = points[0]
    const end = points[points.length - 1]
    if (start.step === 0) first.push({ y: start.y, text: format(start.number) })
    if (end.step === count - 1) last.push({ y: end.y, text: `${format(end.number)}  ${series.name}` })
    // A line a missing value ends early is named after its last point, so no series is left unnamed.
    else layout.values.push({ text: `${format(end.number)}  ${series.name}`, classes: 'chart-value chart-value-across', x: percent(end.x), y: percent(end.y) })
    layout.points.push({
      index,
      label: series.name,
      text: `${series.name}: ${points.map((point) => [labels[point.step], format(point.number)].filter(Boolean).join(' ')).join(', ')}`,
      current: config.current === index,
      // The readout stands by the line's last end, beside the name it says more about.
      x: end.x,
      y: end.y,
      reach: 0,
      hit: null,
      cursor: null,
      marks,
    })
  })
  for (const end of spread(first)) layout.values.push({ text: end.text, classes: 'chart-value chart-value-before', x: '0', y: percent(end.y) })
  for (const end of spread(last)) layout.values.push({ text: end.text, classes: 'chart-value chart-value-across', x: '100%', y: percent(end.y) })
  layout.gutter = Math.max(0, ...first.map((end) => width(end.text)))
  layout.tail = Math.max(0, ...last.map((end) => width(end.text)))
  // The points stand in the canvas, where a line can be a path; it stretches, and their strokes do not.
  layout.radial = true
}

export const chartSlope = Object.assign(form, { types: ['slope'] })
