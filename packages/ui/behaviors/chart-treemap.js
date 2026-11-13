/**
 * Chart form: a treemap. Each series is a tile whose area is its value's share of the whole, laid out so the
 * tiles stay as near to squares as their sizes allow, the largest first. It holds more parts than a pie can, and
 * a small part stays a tile a reader can point at. A tile says its name, and its value where it has room; every
 * tile says both in words and in the readout.
 */

/** @typedef {import('./chart-core.js').ChartKit} ChartKit */

/**
 * Tiles in a box, by the squarified layout: rows are filled along the box's shorter side for as long as adding
 * a tile keeps the row's tiles nearer to squares.
 * @param {number[]} areas The tiles' areas, largest first, summing to the box's.
 * @param {{ x: number, y: number, width: number, height: number }} box
 */
function squarify(areas, box) {
  /** @type {{ x: number, y: number, width: number, height: number }[]} */
  const tiles = []
  let { x, y, width, height } = box
  let start = 0
  /** The worst ratio of a side to the other among a row of tiles laid along a side of this length. */
  const worst = (/** @type {number[]} */ row, /** @type {number} */ side) => {
    const sum = row.reduce((total, area) => total + area, 0)
    return Math.max(...row.map((area) => Math.max((side * side * area) / (sum * sum), (sum * sum) / (side * side * area))))
  }
  while (start < areas.length) {
    const side = Math.min(width, height)
    let end = start + 1
    while (end < areas.length && worst(areas.slice(start, end + 1), side) <= worst(areas.slice(start, end), side)) end++
    const row = areas.slice(start, end)
    const sum = row.reduce((total, area) => total + area, 0)
    const thick = side ? sum / side : 0
    let along = 0
    for (const area of row) {
      const length = thick ? area / thick : 0
      tiles.push(width >= height ? { x, y: y + along, width: thick, height: length } : { x: x + along, y, width: length, height: thick })
      along += length
    }
    if (width >= height) (x += thick), (width -= thick)
    else (y += thick), (height -= thick)
    start = end
  }
  return tiles
}

/** @param {ChartKit} kit */
function form({ config, layout, shown, format, percent, real, width, numbers }) {
  const items = shown.filter((series) => real(series.value) && series.value > 0).sort((a, b) => /** @type {number} */ (b.value) - /** @type {number} */ (a.value))
  const total = items.reduce((sum, series) => sum + /** @type {number} */ (series.value), 0)
  const share = numbers(config.locale, { style: 'percent', maximumFractionDigits: 1 })
  // The plot is taken as twice as wide as it is tall, about what it is in a card, so the tiles come out near squares.
  const aspect = 2
  const tiles = squarify(items.map((series) => (/** @type {number} */ (series.value) / total) * aspect), { x: 0, y: 0, width: aspect, height: 1 })

  items.forEach((series, index) => {
    const tile = tiles[index]
    const x = tile.x / aspect
    const wide = tile.width / aspect
    const value = /** @type {number} */ (series.value)
    const text = `${format(value)} (${share.format(value / total)})`
    // A name is written only on a tile that holds it in a plot 20rem wide and 10rem tall, the least a card gives it.
    const fits = wide * 320 >= width(series.name) * 7 + 22 && tile.height * 160 >= 26
    if (fits) layout.values.push({ text: series.name, classes: 'chart-value chart-value-tile', x: percent(x), y: percent(tile.y) })
    if (fits && tile.height * 160 >= 46 && wide * 320 >= width(format(value)) * 7 + 22) layout.values.push({ text: format(value), classes: 'chart-value chart-value-tile chart-value-quiet', x: percent(x), y: percent(tile.y) })
    layout.points.push({
      index,
      label: '',
      text: `${series.name}: ${text}`,
      current: config.current === index,
      x: x + wide / 2,
      y: tile.y,
      reach: wide / 2,
      hit: null,
      cursor: null,
      marks: [{ kind: 'bar', classes: 'chart-tile', category: series.category, name: series.name, value: text, x: percent(x), y: percent(tile.y), width: percent(wide), height: percent(tile.height) }],
    })
  })
}

export const chartTreemap = Object.assign(form, { types: ['treemap'], palette: /** @type {const} */ ('never') })
