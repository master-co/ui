/**
 * Chart form: a scatter. Each point of a series is a dot placed by its `x` and its `y`, on two scales that fit
 * the dots between round numbers. A point with a `size` is a bubble: its area, not its radius, is its size, and
 * the pointer lands on the room around a dot, not only on the dot.
 */

/** @typedef {import('./chart-core.js').ChartKit} ChartKit */

/** @param {ChartKit} kit */
function form({ config, layout, shown, format, tickFormat, legend, valueAxis, scale, round, percent, clamp, real }) {
  const dots = shown.flatMap((series) => (series.points ?? []).filter((point) => real(point.x) && real(point.y)).map((point) => ({ series, point })))
  const extent = (/** @type {'x' | 'y'} */ key) => (dots.length ? [Math.min(...dots.map((dot) => dot.point[key])), Math.max(...dots.map((dot) => dot.point[key]))] : [0, 1])
  const [lowX, highX] = extent('x')
  const [lowY, highY] = extent('y')
  const x = scale(lowX, highX, config.xTicks ?? 5, config.xMin, config.xMax)
  const y = scale(lowY, highY, config.ticks ?? 4, config.min, config.max)
  valueAxis(y)
  valueAxis(x, { across: true, format: tickFormat(x.ticks, config.xFormat) })
  // The plot's own edges are the lowest hairline of each scale: only the one under the dots is the baseline.
  for (const line of layout.grid) line.base = line.y1 === '100%' && line.y2 === '100%'
  layout.grid = layout.grid.filter((line) => !(line.x1 === '0%' && line.x2 === '0%'))

  // A bubble's area is its size: the largest is 20px in radius, and none is smaller than a dot.
  const sizes = dots.map((dot) => dot.point.size).filter(real)
  const largest = Math.max(0, ...sizes)
  const radius = (/** @type {number | undefined} */ size) => (real(size) && largest > 0 ? round(Math.max(4, 20 * Math.sqrt(Math.max(0, size) / largest)), 1) : undefined)

  dots.forEach(({ series, point }, index) => {
    const cx = clamp(x.at(point.x), 0, 1)
    const cy = 1 - clamp(y.at(point.y), 0, 1)
    const size = radius(point.size)
    const text = `${(config.xFormat ?? format)(point.x)}, ${format(point.y)}${size === undefined ? '' : `, ${format(/** @type {number} */ (point.size))}`}`
    layout.points.push({
      index,
      label: point.label ?? '',
      text: `${[point.label, series.name].filter(Boolean).join(', ')}: ${text}`,
      current: config.current === index,
      x: cx,
      y: cy,
      reach: 0,
      hit: { cx: percent(cx), cy: percent(cy), r: Math.max(12, (size ?? 0) + 4) },
      cursor: null,
      marks: [{ kind: 'dot', classes: size === undefined ? 'chart-dot' : 'chart-dot chart-dot-bubble', category: series.category, name: series.name, value: text, cx: percent(cx), cy: percent(cy), r: size ?? 4, size }],
    })
  })
  // Large bubbles are drawn first, so a small one over a large one can still be reached.
  if (sizes.length) layout.points.sort((a, b) => (b.marks[0].size ?? 0) - (a.marks[0].size ?? 0)).forEach((point, index) => (point.index = index))

  legend(() => ({ mark: 'chart-key-mark chart-key-dot' }))
}

export const chartScatter = Object.assign(form, { types: ['scatter'] })
