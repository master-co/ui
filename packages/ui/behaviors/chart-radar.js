/**
 * Chart form: a radar. A spoke to each label, a ring at each tick, and each series an outline around the middle
 * with a wash of the same color.
 */

/** @typedef {import('./chart-core.js').ChartKit} ChartKit */
/** @typedef {import('./chart-core.js').ChartMark} ChartMark */

const tau = Math.PI * 2

/** @param {ChartKit} kit */
function form({ config, layout, shown, format, tickFormat, legend, scale, pen, round, clamp, real }) {
  // A square in the middle of a plot of full width, so the names around it have room beside it.
  layout.classes = 'chart-plot chart-plot-radar'
  layout.radial = true
  layout.stretch = false
  layout.viewBox = '-50 -50 100 100'
  const labels = config.labels ?? []
  const count = Math.max(labels.length, ...shown.map((series) => series.values?.length ?? 0), 3)
  let low = 0
  let high = 0
  for (const series of shown) for (const number of series.values ?? []) if (real(number)) (low = Math.min(low, number)), (high = Math.max(high, number))
  if (!shown.length) high = 1
  const axis = scale(low, high, config.ticks ?? 4, config.min, config.max)
  const tick = tickFormat(axis.ticks, config.tickFormat)
  const radius = 40
  const angle = (/** @type {number} */ index) => -Math.PI / 2 + (index / count) * tau
  const place = (/** @type {number} */ index, /** @type {number} */ share) => [radius * share * Math.cos(angle(index)), radius * share * Math.sin(angle(index))]
  const ring = (/** @type {number} */ share) => `M${Array.from({ length: count }, (_, index) => place(index, share).map((number) => round(number)).join(' ')).join('L')}Z`

  // The web: a ring at each tick above the lowest, and a spoke to each name.
  const levels = axis.ticks.filter((step) => step > axis.start)
  layout.paths.push({ kind: 'web', classes: 'chart-web', d: levels.map((step) => ring(axis.at(step))).join('') + Array.from({ length: count }, (_, index) => `M0 0L${place(index, 1).map((number) => round(number)).join(' ')}`).join('') })
  // The figures of the scale, up the first spoke. The outermost ring has none: the name at its end stands there.
  for (const step of levels.slice(0, -1)) layout.ticks.push({ text: tick(step), classes: 'chart-tick chart-tick-around chart-tick-scale', x: '50%', y: '50%', at: [0.5, round(0.5 - (radius * axis.at(step)) / 100, 4)] })
  for (let index = 0; index < count; index++) {
    const [x, y] = place(index, 1.16)
    const side = Math.cos(angle(index))
    layout.ticks.push({ text: labels[index] ?? '', classes: `chart-tick chart-tick-around${side > 0.2 ? ' chart-tick-start' : side < -0.2 ? ' chart-tick-end' : ''}`, x: '50%', y: '50%', at: [round(0.5 + x / 100, 4), round(0.5 + y / 100, 4)] })
  }
  for (const series of shown) {
    const points = Array.from({ length: count }, (_, index) => place(index, clamp(axis.at(real(series.values?.[index]) ? /** @type {number} */ (series.values?.[index]) : axis.start), 0, 1)))
    layout.paths.push({ kind: 'shape', classes: 'chart-shape', d: `M${points.map((point) => point.map((number) => round(number)).join(' ')).join('L')}Z`, category: series.category })
  }
  const half = Math.PI / count
  for (let index = 0; index < count; index++) {
    /** @type {ChartMark[]} */
    const marks = []
    /** @type {string[]} */
    const said = []
    let far = 0
    for (const series of shown) {
      const number = series.values?.[index]
      if (!real(number)) continue
      const share = clamp(axis.at(number), 0, 1)
      const [x, y] = place(index, share)
      const text = format(number)
      marks.push({ kind: 'dot', classes: 'chart-dot chart-dot-quiet', category: series.category, name: series.name, value: text, cx: round(x), cy: round(y), r: 1.5 })
      said.push(shown.length > 1 ? `${series.name} ${text}` : text)
      far = Math.max(far, share)
    }
    const wedge = pen()
    wedge.to(0, 0)
    wedge.arc(0, 0, radius * 1.08, angle(index) - half, angle(index) + half)
    wedge.close()
    const [x, y] = place(index, far)
    layout.points.push({
      index,
      label: labels[index] ?? '',
      text: [labels[index] ?? '', said.join(', ')].filter(Boolean).join(': '),
      current: config.current === index,
      x: 0.5 + x / 100,
      y: 0.5 + y / 100,
      reach: 0,
      hit: { d: wedge.d },
      cursor: null,
      marks,
    })
  }
  legend(() => ({ mark: 'chart-key-mark chart-key-line' }))
}

export const chartRadar = Object.assign(form, { types: ['radar'] })
