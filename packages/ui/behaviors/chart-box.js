/**
 * Chart form: a box plot. Each series is a group of readings drawn as five figures: a box from the first
 * quartile to the third with a line at the median, and whiskers to the lowest and the highest reading within one
 * and a half boxes of it. A reading further out is a dot of its own. The scale fits the readings and does not
 * start at zero. `words` names the five figures in the page's language.
 */

/** @typedef {import('./chart-core.js').ChartKit} ChartKit */
/** @typedef {import('./chart-core.js').ChartMark} ChartMark */

/** @param {ChartKit} kit */
function form({ config, layout, shown, format, valueAxis, nameAxis, scale, percent, clamp, real }) {
  const words = { min: 'Min', q1: 'Q1', median: 'Median', q3: 'Q3', max: 'Max', ...config.words }
  const across = !!config.horizontal
  /** A share of the way through sorted readings, between the two nearest. @param {number[]} sorted @param {number} share */
  const quantile = (sorted, share) => {
    const place = (sorted.length - 1) * share
    const under = Math.floor(place)
    return sorted[under] + (sorted[Math.min(sorted.length - 1, under + 1)] - sorted[under]) * (place - under)
  }
  const groups = shown.map((series) => {
    const sorted = (series.values ?? []).filter(real).sort((a, b) => a - b)
    if (!sorted.length) return { series, sorted, q1: 0, median: 0, q3: 0, low: 0, high: 0, outliers: /** @type {number[]} */ ([]) }
    const q1 = quantile(sorted, 0.25)
    const q3 = quantile(sorted, 0.75)
    const fence = (q3 - q1) * 1.5
    const inside = sorted.filter((reading) => reading >= q1 - fence && reading <= q3 + fence)
    return { series, sorted, q1, median: quantile(sorted, 0.5), q3, low: inside[0], high: inside[inside.length - 1], outliers: sorted.filter((reading) => reading < q1 - fence || reading > q3 + fence) }
  })
  const all = groups.flatMap((group) => group.sorted)
  const axis = scale(all.length ? Math.min(...all) : 0, all.length ? Math.max(...all) : 1, config.ticks ?? 4, config.min, config.max)
  const at = (/** @type {number} */ number) => clamp(axis.at(number), 0, 1)
  const band = 1 / Math.max(1, groups.length)
  const middle = (/** @type {number} */ index) => (index + 0.5) * band
  const thick = Math.min(band * 0.5, 0.14)
  valueAxis(axis, { across })
  nameAxis(groups.map((group) => group.series.name), middle, { across })
  for (const line of layout.grid) line.base = axis.start <= 0 && line.base

  groups.forEach((group, index) => {
    const center = middle(index)
    const { series } = group
    /** A stroke along the scale at the group's middle, or across the box at one reading. @returns {ChartMark} */
    const line = (/** @type {string} */ classes, /** @type {number} */ from, /** @type {number} */ to, /** @type {number} */ half) => (across
      ? { kind: 'line', classes, category: series.category, x1: percent(at(from)), y1: percent(center - half), x2: percent(at(to)), y2: percent(center + half) }
      : { kind: 'line', classes, category: series.category, x1: percent(center - half), y1: percent(1 - at(from)), x2: percent(center + half), y2: percent(1 - at(to)) })
    /** @type {ChartMark[]} */
    const marks = []
    if (group.sorted.length) {
      marks.push(
        { ...line('chart-whisker', group.low, group.high, 0), name: words.max, value: format(group.high) },
        across
          ? { kind: 'bar', classes: 'chart-box', category: series.category, name: words.q3, value: format(group.q3), x: percent(at(group.q1)), y: percent(center - thick / 2), width: percent(Math.max(at(group.q3) - at(group.q1), 0.004)), height: percent(thick) }
          : { kind: 'bar', classes: 'chart-box', category: series.category, name: words.q3, value: format(group.q3), x: percent(center - thick / 2), y: percent(1 - at(group.q3)), width: percent(thick), height: percent(Math.max(at(group.q3) - at(group.q1), 0.004)) },
        { ...line('chart-median', group.median, group.median, thick / 2), name: words.median, value: format(group.median) },
        // The two lower figures have no mark of their own: the box's foot and the whisker's end say them.
        { kind: 'line', classes: 'chart-whisker', x1: '0', y1: '0', x2: '0', y2: '0', name: words.q1, value: format(group.q1) },
        { kind: 'line', classes: 'chart-whisker', x1: '0', y1: '0', x2: '0', y2: '0', name: words.min, value: format(group.low) },
        ...group.outliers.map((reading) => /** @type {ChartMark} */ ({ kind: 'dot', classes: 'chart-dot chart-dot-outlier', category: series.category, cx: percent(across ? at(reading) : center), cy: percent(across ? center : 1 - at(reading)), r: 2.5 })),
      )
    }
    const far = group.sorted.length ? at(Math.max(group.high, ...group.outliers)) : 0
    layout.points.push({
      index,
      label: series.name,
      text: group.sorted.length ? `${series.name}: ${words.min} ${format(group.low)}, ${words.q1} ${format(group.q1)}, ${words.median} ${format(group.median)}, ${words.q3} ${format(group.q3)}, ${words.max} ${format(group.high)}` : series.name,
      current: config.current === index,
      x: across ? far : center,
      y: across ? center : 1 - far,
      reach: thick / 2,
      hit: across ? { x: '0', y: percent(index * band), width: '100%', height: percent(band) } : { x: percent(index * band), y: '0', width: percent(band), height: '100%' },
      cursor: null,
      marks,
    })
  })
}

export const chartBox = Object.assign(form, { types: ['box'], palette: /** @type {const} */ ('never') })
