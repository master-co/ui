/**
 * Chart form: a waterfall. The first value is where the count begins and each one after it is a step up or down
 * from where the last left off, so the bars walk from the opening figure to the closing one. A step up and a step
 * down are told apart by a status ink and by the sign written with their value; `total` names a closing bar that
 * stands on the baseline at the sum.
 */

/** @typedef {import('./chart-core.js').ChartKit} ChartKit */
/** @typedef {import('./chart-core.js').ChartMark} ChartMark */

/** @param {ChartKit} kit */
function form({ config, layout, shown, format, valueAxis, nameAxis, scale, round, percent, clamp, real }) {
  const series = shown[0]
  // A step with no value is missing, not a step of nothing: it draws no bar and the count stands where it was.
  const steps = (series?.values ?? []).map((number) => (real(number) ? number : null))
  const labels = [...(config.labels ?? []).slice(0, steps.length), ...(config.total && steps.length ? [config.total] : [])]
  // Each bar's two ends: the opening and the closing bar stand on the baseline, a step between them floats.
  /** @type {{ from: number, to: number, whole: boolean, step: number, missing: boolean }[]} */
  const bars = []
  let level = 0
  steps.forEach((step, index) => {
    bars.push({ from: index ? level : 0, to: level + (step ?? 0), whole: index === 0, step: step ?? 0, missing: step === null })
    level += step ?? 0
  })
  if (config.total && steps.length) bars.push({ from: 0, to: level, whole: true, step: level, missing: false })
  const count = bars.length
  const drawn = bars.filter((bar) => !bar.missing)
  const axis = scale(Math.min(0, ...drawn.map((bar) => Math.min(bar.from, bar.to))), Math.max(0, ...drawn.map((bar) => Math.max(bar.from, bar.to)), drawn.length ? 0 : 1), config.ticks ?? 4, config.min, config.max)
  const at = (/** @type {number} */ number) => clamp(axis.at(number), 0, 1)
  const band = 1 / Math.max(1, count)
  const middle = (/** @type {number} */ index) => (index + 0.5) * band
  const thick = Math.min(band * 0.62, 0.16)
  valueAxis(axis)
  nameAxis(Array.from({ length: count }, (_, index) => labels[index] ?? ''), middle)

  // A hairline carries each bar's end to the next bar, so the eye follows the count from one to the other, across
  // a missing step at the level the count stood at.
  let links = ''
  bars.forEach((bar, index) => {
    const next = bars.findIndex((other, after) => after > index && !other.missing)
    if (!bar.missing && next !== -1) links += `M${round((middle(index) + thick / 2) * 100)} ${round((1 - at(bar.to)) * 100)}H${round((middle(next) - thick / 2) * 100)}`
  })
  if (links) layout.paths.push({ kind: 'link', classes: 'chart-link', d: links })

  bars.forEach((bar, index) => {
    const low = at(Math.min(bar.from, bar.to))
    const high = at(Math.max(bar.from, bar.to))
    const signed = `${bar.step > 0 && !bar.whole ? '+' : ''}${format(bar.step)}`
    // A step of nothing went neither up nor down: it is a tick of ink, not of a status.
    const classes = `chart-bar${bar.to < bar.from ? ' chart-bar-down' : ''}${bar.whole || !bar.step ? '' : bar.step < 0 ? ' chart-bar-fall' : ' chart-bar-rise'}`
    const label = labels[index] ?? ''
    const said = bar.missing ? '' : bar.whole ? signed : `${signed} (${format(bar.to)})`
    if (config.values && !bar.missing) layout.values.push({ text: signed, classes: 'chart-value', x: percent(middle(index)), y: percent(1 - high) })
    layout.points.push({
      index,
      label,
      text: [label, said].filter(Boolean).join(': '),
      current: config.current === index,
      x: middle(index),
      y: 1 - high,
      reach: thick / 2,
      hit: { x: percent(index * band), y: '0', width: percent(band), height: '100%' },
      cursor: null,
      marks: bar.missing ? [] : [{ kind: 'bar', classes, category: bar.whole ? series?.category : undefined, name: series?.name ?? '', value: said, x: percent(middle(index) - thick / 2), y: percent(1 - high), width: percent(thick), height: percent(Math.max(high - low, 0.006)) }],
    })
  })
}

export const chartWaterfall = Object.assign(form, { types: ['waterfall'], palette: /** @type {const} */ ('never') })
