/**
 * Chart form: a marimekko. Each label is a column as wide as its share of the grand total, and each series is a
 * part of the column as tall as its share of it, so both how large a group is and what it is made of are read
 * from one drawing. The scale up the plot is shares of a column, from none to all of it.
 */

/** @typedef {import('./chart-core.js').ChartKit} ChartKit */
/** @typedef {import('./chart-core.js').ChartMark} ChartMark */

/** @param {ChartKit} kit */
function form({ config, layout, shown, format, legend, valueAxis, nameAxis, scale, percent, real, numbers }) {
  const labels = config.labels ?? []
  const count = Math.max(labels.length, ...shown.map((series) => series.values?.length ?? 0), 0)
  const value = (/** @type {typeof shown[number]} */ series, /** @type {number} */ index) => {
    const number = series.values?.[index]
    return real(number) && number > 0 ? number : 0
  }
  const totals = Array.from({ length: count }, (_, index) => shown.reduce((sum, series) => sum + value(series, index), 0))
  const grand = totals.reduce((sum, total) => sum + total, 0)
  const share = numbers(config.locale, { style: 'percent', maximumFractionDigits: 0 })
  const exact = numbers(config.locale, { style: 'percent', maximumFractionDigits: 1 })
  valueAxis(scale(0, 100, 4, 0, 100), { format: (step) => share.format(step / 100) })

  // The columns share the plot's width by their totals, less a gap between each two.
  const gap = count > 1 ? 0.012 : 0
  const room = 1 - gap * (count - 1)
  /** @type {number[]} */
  const starts = []
  /** @type {number[]} */
  const widths = []
  let cursor = 0
  totals.forEach((total) => {
    const width = grand ? (total / grand) * room : room / Math.max(1, count)
    starts.push(cursor)
    widths.push(width)
    cursor += width + gap
  })
  nameAxis(Array.from({ length: count }, (_, index) => labels[index] ?? ''), (index) => starts[index] + widths[index] / 2)

  for (let index = 0; index < count; index++) {
    /** @type {ChartMark[]} */
    const marks = []
    /** @type {string[]} */
    const said = []
    let level = 0
    const drawn = shown.filter((series) => value(series, index) > 0)
    drawn.forEach((series, order) => {
      const part = totals[index] ? value(series, index) / totals[index] : 0
      const text = `${format(value(series, index))} (${exact.format(part)})`
      marks.push({ kind: 'bar', classes: `chart-bar${order === drawn.length - 1 ? '' : ' chart-bar-inner'}`, category: series.category, name: series.name, value: text, x: percent(starts[index]), y: percent(1 - level - part), width: percent(widths[index]), height: percent(part) })
      said.push(`${series.name} ${text}`)
      level += part
    })
    const label = labels[index] ?? ''
    layout.points.push({
      index,
      label: [label, grand ? `${format(totals[index])} (${exact.format(totals[index] / grand)})` : ''].filter(Boolean).join(': '),
      text: [label, said.join(', ')].filter(Boolean).join(': '),
      current: config.current === index,
      x: starts[index] + widths[index] / 2,
      y: 0,
      reach: widths[index] / 2,
      hit: { x: percent(starts[index]), y: '0', width: percent(widths[index]), height: '100%' },
      cursor: null,
      // A stack is read from its top, as it is seen.
      marks: marks.reverse(),
    })
  }
  legend()
}

export const chartMarimekko = Object.assign(form, { types: ['marimekko'], palette: /** @type {const} */ ('always') })
