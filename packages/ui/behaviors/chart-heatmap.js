/**
 * Chart form: a heatmap. Each series is a row and each label a column, and the cell where they meet is as dark
 * as its value between the lowest and the highest: the hours of a week, the months of several years. Tone is the
 * only channel, so a heatmap shows where the high and the low values lie, not what they are; each cell says its
 * value in words and in the readout.
 */

/** @typedef {import('./chart-core.js').ChartKit} ChartKit */

/** @param {ChartKit} kit */
function form({ config, layout, shown, format, nameAxis, percent, clamp, real }) {
  const labels = config.labels ?? []
  const columns = Math.max(labels.length, ...shown.map((series) => series.values?.length ?? 0), 0)
  const rows = shown.length
  const numbers = shown.flatMap((series) => (series.values ?? []).filter(real))
  const low = config.min ?? (numbers.length ? Math.min(...numbers) : 0)
  const high = config.max ?? (numbers.length ? Math.max(...numbers) : 1)
  const wide = 1 / Math.max(1, columns)
  const tall = 1 / Math.max(1, rows)
  nameAxis(Array.from({ length: columns }, (_, index) => labels[index] ?? ''), (index) => (index + 0.5) * wide)
  nameAxis(shown.map((series) => series.name), (index) => (index + 0.5) * tall, { across: true })

  let index = 0
  shown.forEach((series, row) => {
    for (let column = 0; column < columns; column++) {
      const number = series.values?.[column]
      if (!real(number)) continue
      // The lowest value keeps a trace of ink, so a cell that holds a value is told from one that holds none.
      const tone = Math.round(8 + 92 * (high > low ? clamp((number - low) / (high - low), 0, 1) : 1))
      const text = format(number)
      const label = [series.name, labels[column]].filter(Boolean).join(', ')
      layout.points.push({
        index: index++,
        label: labels[column] ?? '',
        text: `${label}: ${text}`,
        current: false,
        x: (column + 0.5) * wide,
        y: row * tall,
        reach: wide / 2,
        hit: null,
        cursor: null,
        marks: [{ kind: 'bar', classes: 'chart-cell', category: series.category, name: series.name, value: text, tone, x: percent(column * wide), y: percent(row * tall), width: percent(wide), height: percent(tall) }],
      })
    }
  })
}

export const chartHeatmap = Object.assign(form, { types: ['heatmap'], palette: /** @type {const} */ ('never') })
