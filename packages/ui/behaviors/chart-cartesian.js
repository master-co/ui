/**
 * Chart form: lines, areas and bars, which share one scale and may stand in one chart.
 *
 * Bars stand in the middle of a band, side by side or stacked; a line with no bars runs from one edge of the plot
 * to the other. `stacked: 'percent'` makes every stack a whole, and `stacked: 'stream'` centers stacked areas on a
 * middle line, where their thickness is read and their height is not. A series with `low` and `high` carries what
 * its values may be: a band around a line, a whisker on a bar. `mark: 'lollipop'` draws a bar as a stem with a
 * dot at its end.
 */

/** @typedef {import('./chart-core.js').ChartKit} ChartKit */
/** @typedef {import('./chart-core.js').ChartMark} ChartMark */
/** @typedef {import('./chart-core.js').ChartEntry} ChartEntry */

/** @param {ChartKit} kit */
function form({ type, config, layout, shown, format, legend, valueAxis, nameAxis, scale, curve, runs, round, percent, clamp, real, width, numbers }) {
  const kindOf = (/** @type {ChartEntry} */ series) => series.type ?? (type === 'area' ? 'area' : type === 'bar' ? 'bar' : 'line')
  const labels = config.labels ?? []
  const count = Math.max(labels.length, ...shown.map((series) => series.values?.length ?? 0), 0)
  const bars = shown.filter((series) => kindOf(series) === 'bar')
  const lines = shown.filter((series) => kindOf(series) !== 'bar')
  const areas = lines.filter((series) => kindOf(series) === 'area')
  const across = !!config.horizontal && !lines.length
  const stacked = !!config.stacked
  const whole = config.stacked === 'percent'
  const stream = config.stacked === 'stream' && areas.length > 0 && !bars.length
  const lollipop = config.mark === 'lollipop' && !stacked
  const value = (/** @type {ChartEntry} */ series, /** @type {number} */ index) => {
    const number = series.values?.[index]
    return real(number) ? number : null
  }
  /** What a value may be, when its series says: its lower and upper end. */
  const limits = (/** @type {ChartEntry} */ series, /** @type {number} */ index) => {
    const low = series.low?.[index]
    const high = series.high?.[index]
    return !stacked && real(low) && real(high) ? [low, high] : null
  }

  // Where each value stands on the scale: a stacked bar and a stacked area begin where the one before ended.
  /** @type {Map<number, { from: number, to: number }[]>} */
  const spans = new Map()
  let low = 0
  let high = 0
  for (const series of shown) spans.set(series.index, [])
  for (let index = 0; index < count; index++) {
    // As shares of a whole, a stack is read against the sum of its own kind; a stream begins half its sum under the middle.
    const sum = (/** @type {ChartEntry[]} */ list) => list.reduce((total, series) => total + Math.abs(value(series, index) ?? 0), 0)
    const barSum = sum(bars)
    const areaSum = sum(areas)
    let above = 0
    let below = 0
    let level = stream ? -areaSum / 2 : 0
    for (const series of shown) {
      const kind = kindOf(series)
      const raw = value(series, index)
      const number = raw === null || !whole || kind === 'line' ? raw : ((kind === 'bar' ? barSum : areaSum) ? (raw / (kind === 'bar' ? barSum : areaSum)) * 100 : 0)
      let from = 0
      let to = number ?? 0
      if (number !== null && stacked && kind === 'bar') {
        from = number < 0 ? below : above
        to = from + number
        if (number < 0) below = to
        else above = to
      } else if (number !== null && stacked && kind === 'area') {
        from = level
        to = level += number
      }
      /** @type {{ from: number, to: number }[]} */ (spans.get(series.index))[index] = { from, to }
      if (number !== null) (low = Math.min(low, from, to)), (high = Math.max(high, from, to))
      const limit = limits(series, index)
      if (limit) (low = Math.min(low, ...limit)), (high = Math.max(high, ...limit))
    }
  }
  if (!shown.length || !count) high = 1
  const axis = whole ? scale(0, 100, 4, 0, 100) : stream ? scale(low, high, 4, low, high) : scale(low, high, config.ticks ?? 4, config.min, config.max)
  const base = clamp(axis.at(clamp(0, axis.start, axis.end)), 0, 1)
  const at = (/** @type {number} */ number) => clamp(axis.at(number), 0, 1)

  // Bars stand in the middle of a band; a line with no bars runs from one edge of the plot to the other.
  const banded = bars.length > 0 || count < 2
  const band = banded ? 1 / Math.max(1, count) : 1 / (count - 1)
  const middle = (/** @type {number} */ index) => (banded ? (index + 0.5) * band : index * band)
  const group = Math.min(band * (count > 24 ? 0.78 : count > 12 ? 0.72 : 0.62), 0.16)
  const slots = stacked ? 1 : Math.max(1, bars.length)
  const space = slots > 1 ? group * 0.07 : 0
  const thick = (group - space * (slots - 1)) / slots

  // A stream has no scale to read: its thickness is the value, wherever it stands.
  if (!stream) {
    const share = numbers(config.locale, { style: 'percent', maximumFractionDigits: 0 })
    valueAxis(axis, { across, format: whole ? (step) => share.format(step / 100) : undefined })
  }
  nameAxis(Array.from({ length: count }, (_, index) => labels[index] ?? ''), middle, { across, edges: !banded })

  // Areas under lines, so that a line is never covered by another series' wash.
  const shape = config.curve ?? 'smooth'
  /** @type {Map<number, (number[] | null)[]>} */
  const tops = new Map()
  /** @type {(number[] | null)[]} */
  let floor = Array.from({ length: count }, (_, index) => [middle(index) * 100, (1 - base) * 100])
  // A stream's first layer stands on the line half the sum under the middle, not on the baseline.
  if (stream && areas.length) floor = Array.from({ length: count }, (_, index) => [middle(index) * 100, (1 - at(/** @type {{ from: number, to: number }[]} */ (spans.get(areas[0].index))[index]?.from ?? 0)) * 100])
  /** The path between an upper edge and the edge under it, run by run. @param {(number[] | null)[]} top @param {(number[] | null)[]} under @param {string} return_ */
  const between = (top, under, return_) => {
    let d = ''
    for (let index = 0; index < count; index++) {
      if (!top[index]) continue
      const first = index
      while (index + 1 < count && top[index + 1]) index++
      const run = /** @type {number[][]} */ (top.slice(first, index + 1))
      const back = run.map((point, offset) => under[first + offset] ?? [point[0], (1 - base) * 100]).reverse()
      d += `M${round(run[0][0])} ${round(run[0][1])}${curve(run, shape)}L${round(back[0][0])} ${round(back[0][1])}${curve(back, return_)}Z`
    }
    return d
  }
  for (const series of lines) {
    const span = /** @type {{ from: number, to: number }[]} */ (spans.get(series.index))
    const top = Array.from({ length: count }, (_, index) => (value(series, index) === null ? null : [middle(index) * 100, (1 - at(span[index].to)) * 100]))
    tops.set(series.index, top)
    // What the values may be: a band between the upper and the lower end, behind the line.
    const upper = Array.from({ length: count }, (_, index) => {
      const limit = limits(series, index)
      return limit ? [middle(index) * 100, (1 - at(limit[1])) * 100] : null
    })
    if (upper.some(Boolean)) {
      const lower = Array.from({ length: count }, (_, index) => {
        const limit = limits(series, index)
        return limit ? [middle(index) * 100, (1 - at(limit[0])) * 100] : null
      })
      layout.paths.push({ kind: 'band', classes: 'chart-band', d: between(upper, lower, shape), category: series.category })
    }
    if (kindOf(series) !== 'area') continue
    layout.paths.push({ kind: 'area', classes: `chart-area${stacked && areas.length > 1 ? ' chart-area-stacked' : ''}`, d: between(top, floor, stacked ? shape : 'linear'), category: series.category })
    if (stacked) floor = top.map((point, index) => point ?? floor[index])
  }
  for (const series of lines) {
    // In a stream the layers are read by their thickness: an edge between them would say a value it does not hold.
    if (stream) continue
    const d = runs(/** @type {(number[] | null)[]} */ (tops.get(series.index))).map((run) => `M${round(run[0][0])} ${round(run[0][1])}${curve(run, shape)}${run.length === 1 ? 'h0' : ''}`).join('')
    layout.paths.push({ kind: 'line', classes: 'chart-line', d, category: series.category })
  }

  const share = numbers(config.locale, { style: 'percent', maximumFractionDigits: 1 })
  /** A value as it is said: with its share where stacks are wholes, and with what it may be where the series says. */
  const say = (/** @type {ChartEntry} */ series, /** @type {number} */ index, /** @type {number} */ number) => {
    const span = /** @type {{ from: number, to: number }[]} */ (spans.get(series.index))[index]
    const limit = limits(series, index)
    return `${format(number)}${whole && kindOf(series) !== 'line' ? ` (${share.format(Math.abs(span.to - span.from) / 100)})` : ''}${limit ? ` (${format(limit[0])}–${format(limit[1])})` : ''}`
  }

  for (let index = 0; index < count; index++) {
    const center = middle(index)
    /** @type {ChartMark[]} */
    const marks = []
    /** @type {string[]} */
    const said = []
    let far = across ? base : 1 - base
    bars.forEach((series, slot) => {
      const number = value(series, index)
      if (number === null) return
      const span = /** @type {{ from: number, to: number }[]} */ (spans.get(series.index))[index]
      const from = at(span.from)
      const to = at(span.to)
      // The bar furthest from the baseline in its stack is the one whose end is turned.
      const outer = !stacked || !bars.slice(slot + 1).some((later) => {
        const next = value(later, index)
        return next !== null && next !== 0 && next < 0 === number < 0
      })
      const start = center - group / 2 + (stacked ? 0 : slot * (thick + space))
      const length = Math.max(Math.abs(to - from), number === 0 && !stacked ? 0.006 : 0)
      const near = Math.min(from, to)
      const mid = start + thick / 2
      const text = say(series, index, number)
      const named = { category: series.category, name: series.name, value: text }
      if (lollipop) {
        // A stem from the baseline with a dot at the value: less ink than a bar, for many values or long ones.
        marks.push(across
          ? { kind: 'line', classes: 'chart-stem', category: series.category, x1: percent(from), y1: percent(mid), x2: percent(to), y2: percent(mid) }
          : { kind: 'line', classes: 'chart-stem', category: series.category, x1: percent(mid), y1: percent(1 - from), x2: percent(mid), y2: percent(1 - to) })
        marks.push({ kind: 'dot', classes: 'chart-dot', ...named, cx: percent(across ? to : mid), cy: percent(across ? mid : 1 - to), r: 4 })
      } else {
        const classes = `chart-bar${across ? ' chart-bar-across' : ''}${number < 0 ? ' chart-bar-down' : ''}${outer ? '' : ' chart-bar-inner'}`
        marks.push(across
          ? { kind: 'bar', classes, ...named, x: percent(near), y: percent(start), width: percent(length), height: percent(thick) }
          : { kind: 'bar', classes, ...named, x: percent(start), y: percent(1 - near - length), width: percent(thick), height: percent(length) })
      }
      const limit = limits(series, index)
      if (limit) {
        marks.push(across
          ? { kind: 'line', classes: 'chart-whisker', x1: percent(at(limit[0])), y1: percent(mid), x2: percent(at(limit[1])), y2: percent(mid) }
          : { kind: 'line', classes: 'chart-whisker', x1: percent(mid), y1: percent(1 - at(limit[0])), x2: percent(mid), y2: percent(1 - at(limit[1])) })
      }
      said.push(shown.length > 1 ? `${series.name} ${text}` : text)
      const end = limit ? Math.max(to, at(limit[1])) : Math.max(from, to)
      far = across ? Math.max(far, end) : Math.min(far, 1 - end)
      if (config.values && !stacked) {
        const written = format(number)
        layout.values.push(across
          ? ((layout.tail = Math.max(layout.tail, width(written))), { text: written, classes: 'chart-value chart-value-across', x: percent(end), y: percent(mid) })
          : { text: written, classes: 'chart-value', x: percent(mid), y: percent(1 - end) })
      }
    })
    // A stack is read from its top, as it is seen.
    if (stacked && !across) marks.reverse()
    for (const series of lines) {
      const point = /** @type {(number[] | null)[]} */ (tops.get(series.index))[index]
      const number = value(series, index)
      if (!point || number === null) continue
      const text = say(series, index, number)
      // A stream's point is marked in the middle of its layer, where the layer is.
      const span = /** @type {{ from: number, to: number }[]} */ (spans.get(series.index))[index]
      const cy = stream ? 1 - at((span.from + span.to) / 2) : point[1] / 100
      marks.push({ kind: 'dot', classes: `chart-dot${config.dots ? '' : ' chart-dot-quiet'}`, category: series.category, name: series.name, value: text, cx: percent(point[0] / 100), cy: percent(cy), r: 4 })
      said.push(shown.length > 1 ? `${series.name} ${text}` : text)
      far = Math.min(far, point[1] / 100)
    }
    const from = clamp(center - band / 2, 0, 1)
    const to = clamp(center + band / 2, 0, 1)
    const label = labels[index] ?? ''
    layout.points.push({
      index,
      label,
      text: [label, said.join(', ')].filter(Boolean).join(': '),
      current: config.current === index,
      x: across ? far : center,
      y: across ? center : far,
      reach: bars.length ? group / 2 : 0,
      hit: across ? { x: '0', y: percent(from), width: '100%', height: percent(to - from) } : { x: percent(from), y: '0', width: percent(to - from), height: '100%' },
      cursor: lines.length ? { x1: percent(center), y1: '0', x2: percent(center), y2: '100%' } : null,
      marks,
    })
  }

  legend((series) => (kindOf(series) === 'line' ? { mark: 'chart-key-mark chart-key-line' } : {}))
}

export const chartCartesian = Object.assign(form, { types: ['line', 'area', 'bar'] })
