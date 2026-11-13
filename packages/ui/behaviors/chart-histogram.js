/**
 * Chart form: a histogram. The readings of the first series are sorted into bins between round numbers, and
 * each bin is a bar as tall as the count of readings in it, so the shape of the readings is read: where most
 * lie, how far they spread, whether they lean. Bins touch, since the scale under them runs on without a break.
 */

/** @typedef {import('./chart-core.js').ChartKit} ChartKit */

/** @param {ChartKit} kit */
function form({ config, layout, shown, format, tickFormat, valueAxis, scale, percent, clamp, real }) {
  const series = shown[0]
  const readings = (series?.values ?? []).filter(real)
  // About as many bins as Sturges' rule gives for the count of readings, between five and twenty.
  const wanted = config.bins ?? clamp(Math.ceil(Math.log2(Math.max(1, readings.length))) + 1, 5, 20)
  const across = scale(readings.length ? Math.min(...readings) : 0, readings.length ? Math.max(...readings) : 1, wanted, config.xMin, config.xMax)
  const edges = across.ticks
  const counts = Array.from({ length: Math.max(1, edges.length - 1) }, () => 0)
  // A reading on an edge belongs to the bin that begins there; the last bin holds its upper edge too.
  for (const reading of readings) {
    let bin = edges.findIndex((edge, index) => index + 1 < edges.length && reading >= edge && reading < edges[index + 1])
    if (bin === -1 && reading === edges[edges.length - 1]) bin = counts.length - 1
    if (bin !== -1) counts[bin]++
  }
  const axis = scale(0, Math.max(1, ...counts), config.ticks ?? 4, 0, config.max)
  const at = (/** @type {number} */ number) => clamp(axis.at(number), 0, 1)
  const write = tickFormat(edges, config.xFormat)
  valueAxis(axis)
  valueAxis(across, { across: true, format: write, lines: false })

  counts.forEach((count, index) => {
    const from = clamp(across.at(edges[index]), 0, 1)
    const to = clamp(across.at(edges[index + 1] ?? edges[index]), 0, 1)
    const label = `${write(edges[index])}–${write(edges[index + 1] ?? edges[index])}`
    const text = format(count)
    layout.points.push({
      index,
      label,
      text: `${label}: ${text}`,
      current: config.current === index,
      x: (from + to) / 2,
      y: 1 - at(count),
      reach: (to - from) / 2,
      hit: { x: percent(from), y: '0', width: percent(to - from), height: '100%' },
      cursor: null,
      marks: [{ kind: 'bar', classes: 'chart-bar chart-bar-bin', category: series?.category, name: series?.name ?? '', value: text, x: percent(from), y: percent(1 - at(count)), width: percent(to - from), height: percent(at(count)) }],
    })
  })
}

export const chartHistogram = Object.assign(form, { types: ['histogram'], palette: /** @type {const} */ ('never') })
