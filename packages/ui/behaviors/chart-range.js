/**
 * Chart form: ranges and dumbbells.
 *
 * A `range` chart draws each of a series' `ranges` as a bar from where it begins to where it ends: the lowest and
 * the highest temperature of a day, the first and the last quartile of a pay band. A `dumbbell` chart reads the
 * `values` of two or more series at each label and joins them with a stem, so the gap between them is the mark.
 * Neither starts at zero: the scale fits the spans. With `horizontal`, the labels run down and the scale across.
 */

/** @typedef {import('./chart-core.js').ChartKit} ChartKit */
/** @typedef {import('./chart-core.js').ChartMark} ChartMark */

/** @param {ChartKit} kit */
function form({ type, config, layout, shown, format, legend, valueAxis, nameAxis, scale, percent, clamp, real }) {
  const labels = config.labels ?? []
  const dumbbell = type === 'dumbbell'
  const across = !!config.horizontal
  const count = Math.max(labels.length, ...shown.map((series) => (dumbbell ? series.values?.length : series.ranges?.length) ?? 0), 0)
  /** A series' span at a label: its range, or its one value as both ends. @returns {[number, number] | null} */
  const span = (/** @type {typeof shown[number]} */ series, /** @type {number} */ index) => {
    if (dumbbell) {
      const number = series.values?.[index]
      return real(number) ? [number, number] : null
    }
    const range = series.ranges?.[index]
    return range && real(range[0]) && real(range[1]) ? [Math.min(range[0], range[1]), Math.max(range[0], range[1])] : null
  }
  const ends = shown.flatMap((series) => Array.from({ length: count }, (_, index) => span(series, index) ?? [])).flat()
  const axis = scale(ends.length ? Math.min(...ends) : 0, ends.length ? Math.max(...ends) : 1, config.ticks ?? 4, config.min, config.max)
  const at = (/** @type {number} */ number) => clamp(axis.at(number), 0, 1)
  const band = 1 / Math.max(1, count)
  const middle = (/** @type {number} */ index) => (index + 0.5) * band
  const group = Math.min(band * 0.56, 0.14)
  const slots = dumbbell ? 1 : Math.max(1, shown.length)
  const space = slots > 1 ? group * 0.08 : 0
  const thick = (group - space * (slots - 1)) / slots
  valueAxis(axis, { across })
  nameAxis(Array.from({ length: count }, (_, index) => labels[index] ?? ''), middle, { across })
  // A scale that does not start at zero has no baseline: its first hairline is a hairline like the others.
  for (const line of layout.grid) line.base = axis.start <= 0 && line.base

  for (let index = 0; index < count; index++) {
    const center = middle(index)
    /** @type {ChartMark[]} */
    const marks = []
    /** @type {string[]} */
    const said = []
    let lowest = 1
    let highest = 0
    shown.forEach((series, slot) => {
      const ends = span(series, index)
      if (!ends) return
      const from = at(ends[0])
      const to = at(ends[1])
      lowest = Math.min(lowest, from)
      highest = Math.max(highest, to)
      const text = dumbbell ? format(ends[0]) : `${format(ends[0])}–${format(ends[1])}`
      said.push(shown.length > 1 ? `${series.name} ${text}` : text)
      if (dumbbell) return marks.push({ kind: 'dot', classes: 'chart-dot', category: series.category, name: series.name, value: text, cx: percent(across ? from : center), cy: percent(across ? center : 1 - from), r: 4 })
      const start = center - group / 2 + slot * (thick + space)
      marks.push(across
        ? { kind: 'bar', classes: 'chart-bar chart-bar-floating', category: series.category, name: series.name, value: text, x: percent(from), y: percent(start), width: percent(Math.max(to - from, 0.006)), height: percent(thick) }
        : { kind: 'bar', classes: 'chart-bar chart-bar-floating', category: series.category, name: series.name, value: text, x: percent(start), y: percent(1 - to), width: percent(thick), height: percent(Math.max(to - from, 0.006)) })
    })
    // The stem under a dumbbell's dots: the gap between its ends, in the ink of a line.
    if (dumbbell && marks.length > 1) {
      marks.unshift(across
        ? { kind: 'line', classes: 'chart-stem', x1: percent(lowest), y1: percent(center), x2: percent(highest), y2: percent(center) }
        : { kind: 'line', classes: 'chart-stem', x1: percent(center), y1: percent(1 - lowest), x2: percent(center), y2: percent(1 - highest) })
    }
    const label = labels[index] ?? ''
    layout.points.push({
      index,
      label,
      text: [label, said.join(', ')].filter(Boolean).join(': '),
      current: config.current === index,
      x: across ? highest : center,
      y: across ? center : 1 - highest,
      reach: group / 2,
      hit: across ? { x: '0', y: percent(index * band), width: '100%', height: percent(band) } : { x: percent(index * band), y: '0', width: percent(band), height: '100%' },
      cursor: null,
      marks,
    })
  }
  legend(() => (dumbbell ? { mark: 'chart-key-mark chart-key-dot' } : {}))
}

export const chartRange = Object.assign(form, { types: ['range', 'dumbbell'] })
