/**
 * Chart core: what every form of the chart shares, with no form of its own.
 *
 * A form is a module that lays one kind of chart out: `chart-cartesian.js` lines, areas and bars,
 * `chart-pie.js` a pie and a donut, and so on. `chartForms()` takes the forms a page draws, and from then on
 * `chartLayout()`, `chartMarkup()` and `chartCore()` know their types. `chart.js` is this module with every
 * form already taken: import that unless the page should carry only the forms it draws.
 *
 * `chartLayout()` turns series into what the drawing holds, as data: the scale and its ticks, each series' path,
 * and every point with its marks, its place and the sentence that says it. It reads no element and measures
 * nothing. The plot has no size of its own: what stands on a scale is placed by percentages of the plot, and the
 * paths are written once in a 100 by 100 box that stretches to it, so one layout fits any width and a server, a
 * framework and this script draw the same chart.
 *
 * `chartMarkup()` writes that layout as markup, for a server or a template: put it in an element with the class
 * `chart`. The words in it are escaped.
 *
 * `chartCore()` works a chart. Given series, it writes the chart into the root and writes it again when a series
 * is shown or hidden from the legend. Given none, it works the chart the page already holds. Either way a point
 * under the pointer, or reached with the arrow keys, shows its values in `chart-tip`, which the behavior fills
 * from what the point's marks carry (`data-name`, `data-value`) and places with `--chart-x`, `--chart-y` and
 * `--chart-reach`. Give `draw`, and it writes nothing: it calls `draw` with the names of the hidden series and a
 * renderer writes the same from `chartLayout()`.
 *
 * The value is the names of the hidden series. A legend's checkbox dispatches the `input` and `change` that say
 * it changed; setting the returned function's `value` dispatches nothing.
 */

/**
 * @typedef {'line' | 'area' | 'bar' | 'scatter' | 'pie' | 'donut' | 'rings' | 'radar' | 'waterfall' | 'range' | 'dumbbell' | 'slope' | 'bump' | 'marimekko' | 'histogram' | 'box' | 'heatmap' | 'funnel' | 'waffle' | 'treemap' | 'sunburst'} ChartType
 */

/**
 * @typedef {object} ChartSeries
 * @property {string} name What the series is called, in the legend and beside its values.
 * @property {(number | null)[]} [values] One value to a label: a line's, an area's, a bar's, a radar's, a slope's, a bump's, a marimekko's, a waterfall's steps or a heatmap's row. `null` leaves a gap. For a histogram or a box, the raw readings.
 * @property {(number | null)[]} [low] The lower end of what a value may be, one to a label: with `high`, a band around a line or a whisker on a bar.
 * @property {(number | null)[]} [high] The upper end.
 * @property {([number, number] | null)[]} [ranges] A range chart's spans, one to a label: where each begins and ends.
 * @property {number} [value] The one value of a slice, a ring, a stage of a funnel, a share of a waffle or a tile of a treemap.
 * @property {number} [max] What a ring is full at. The chart's `max`, or 100, by default.
 * @property {{ x: number, y: number, size?: number, label?: string }[]} [points] A scatter's points; with `size`, bubbles.
 * @property {{ name: string, value: number }[]} [children] A sunburst's parts of this part.
 * @property {string} [category] A palette name for its category class, such as `blue` for `category-blue`.
 * @property {'line' | 'area' | 'bar'} [type] Another mark for this series than the chart's, such as a line over bars.
 */

/**
 * @typedef {object} ChartConfig
 * @property {ChartType} [type] `bar` by default.
 * @property {string} [label] What the chart shows and in what unit: the plot's accessible name.
 * @property {string[]} [labels] The names along the scale, around a radar or of a heatmap's columns.
 * @property {ChartSeries[]} [series]
 * @property {string[]} [hidden] The names of the series left out, as the legend's unchecked boxes say.
 * @property {boolean | 'percent' | 'stream'} [stacked] Bars, or areas, stand on each other instead of side by side. `percent` makes every stack a whole; `stream` centers stacked areas on a middle line.
 * @property {boolean} [horizontal] Bars, ranges, dumbbells and boxes run across, one row to a label.
 * @property {'bar' | 'lollipop'} [mark] How a bar is drawn: `lollipop` is a stem with a dot at its end.
 * @property {'smooth' | 'linear' | 'step'} [curve] How a line goes from point to point. `smooth` never overshoots a value.
 * @property {number} [min] Where the scale starts. 0, or the lowest value below it, by default; a scatter, a range and a box start near their lowest.
 * @property {number} [max] Where the scale ends. A round number above the highest value by default.
 * @property {number} [ticks] About how many steps the scale is marked in. 4 by default.
 * @property {boolean} [axis] Whether the scale's figures are written. False leaves its hairlines alone, for a small chart whose bars are read against each other.
 * @property {(value: number) => string} [format] How a value is written beside its name.
 * @property {(value: number) => string} [tickFormat] How a tick is written. Compact once the scale reaches 10,000 by default.
 * @property {number} [xMin] A scatter's scale across, as `min`.
 * @property {number} [xMax]
 * @property {number} [xTicks]
 * @property {(value: number) => string} [xFormat]
 * @property {boolean} [dots] A line's points are always marked, not only the one under the pointer.
 * @property {boolean} [values] Every bar's value is written at its end.
 * @property {number} [current] The index of the point that is the point of the chart: it is marked `aria-current`.
 * @property {boolean} [legend] Whether a legend is written. With two series or more by default.
 * @property {boolean} [toggle] Whether the legend's entries are checkboxes that show and hide a series. True by default.
 * @property {string} [legendLabel] The legend's accessible name. `Series` by default.
 * @property {number} [hole] A donut's hole, as a share of its radius. .7 by default.
 * @property {{ value: string, label?: string }} [center] What stands in a donut's hole or within rings.
 * @property {string} [total] A waterfall's closing bar: its name. Without one the chart ends on its last step.
 * @property {number} [bins] About how many bins a histogram sorts its readings into. Chosen from their count by default.
 * @property {boolean} [ascending] In a bump chart, the lowest value ranks first.
 * @property {{ min?: string, q1?: string, median?: string, q3?: string, max?: string }} [words] The names of a box plot's five figures, in the page's language. `Min`, `Q1`, `Median`, `Q3` and `Max` by default.
 * @property {string} [locale] A BCP 47 tag for the numbers. `en-US` by default.
 */

/**
 * @typedef {object} ChartMark One mark of a point.
 * @property {'bar' | 'dot' | 'line' | 'path' | 'slice' | 'track' | 'arc'} kind A bar is a rectangle, a dot a circle and a line a straight stroke, all placed on the plot; the others are paths in the canvas.
 * @property {string} classes Its classes, as the contract names them.
 * @property {string} [category] Its category's palette name.
 * @property {string} [name] The series it belongs to, for the readout.
 * @property {string} [value] Its value as text, for the readout.
 * @property {string} [x] A bar's place, as percentages of the plot.
 * @property {string} [y]
 * @property {string} [width]
 * @property {string} [height]
 * @property {string | number} [cx] A dot's center: percentages of the plot, or units of a radial canvas.
 * @property {string | number} [cy]
 * @property {number} [r] A dot's radius: pixels on the plot, units in a radial canvas. The stylesheet's own takes its place where CSS sets one.
 * @property {string} [x1] A line's ends, as percentages of the plot.
 * @property {string} [y1]
 * @property {string} [x2]
 * @property {string} [y2]
 * @property {string} [d] A path.
 * @property {number} [stroke] A ring's width, in the canvas' units.
 * @property {number} [tone] How much of its color the mark takes, in percent: it is passed on as `--chart-tone`.
 * @property {number} [size] A bubble's radius in pixels: it is passed on as `--chart-dot`.
 */

/**
 * @typedef {object} ChartPoint What one step of the scale, one slice, one ring, one tile or one dot holds.
 * @property {number} index
 * @property {string} label Its name: the readout's title.
 * @property {string} text The sentence that says it: its accessible name.
 * @property {boolean} current
 * @property {number} x Where the readout stands, as a share of the plot (of its square, in a radial chart).
 * @property {number} y
 * @property {number} reach How far the point's marks stand from its place, as a share of the plot: to either side of `x`, or above and below `y` for bars that run across.
 * @property {{ x: string, y: string, width: string, height: string } | { cx: string, cy: string, r: number } | { d: string } | null} hit What the pointer lands on, when it is more than the marks.
 * @property {{ x1: string, y1: string, x2: string, y2: string } | null} cursor The hairline through the point.
 * @property {ChartMark[]} marks
 */

/**
 * @typedef {object} ChartLayout
 * @property {ChartType} type
 * @property {string} label
 * @property {string} classes The plot's classes.
 * @property {boolean} radial The points stand in the canvas, not on the plot.
 * @property {string} viewBox The canvas' box.
 * @property {boolean} stretch The canvas stretches to the plot instead of keeping its shape.
 * @property {number} gutter How many digits wide the labels beside the plot are.
 * @property {number} tail How many digits wide what is written after the plot is.
 * @property {boolean} foot Whether labels stand under the plot.
 * @property {{ x1: string, y1: string, x2: string, y2: string, base: boolean }[]} grid
 * @property {{ text: string, classes: string, x: string, y: string, at: [number, number] | null }[]} ticks
 * @property {{ kind: string, classes: string, d: string, category?: string, tone?: number }[]} paths What is drawn in the canvas and belongs to no point: a line, an area, a web.
 * @property {ChartPoint[]} points
 * @property {{ text: string, classes: string, x: string, y: string }[]} values What is written on the plot: a bar's value, a line's name at its end, a tile's name.
 * @property {{ name: string, category?: string, mark: string, hidden: boolean, value?: string }[]} legend
 * @property {boolean} toggle
 * @property {string} legendLabel
 * @property {{ value: string, label?: string } | null} center What stands in the middle; with an empty value, the place alone.
 * @property {string[]} hidden
 */

/**
 * @typedef {ChartSeries & { index: number }} ChartEntry A series with its place among all of them and the category it was given.
 */

/**
 * @typedef {ReturnType<typeof scale>} ChartScale
 */

/**
 * @typedef {object} ChartKit What a form lays a chart out with.
 * @property {ChartType} type
 * @property {ChartConfig} config
 * @property {ChartLayout} layout The layout to fill.
 * @property {ChartEntry[]} all Every series, hidden ones too.
 * @property {ChartEntry[]} shown The series that are drawn.
 * @property {(value: number) => string} format How a value is written.
 * @property {(ticks: number[], own?: (value: number) => string) => (value: number) => string} tickFormat How a scale's ticks are written: in full, or compact once the scale reaches 10,000.
 * @property {(describe?: (series: ChartEntry, shown: boolean) => { mark?: string, value?: string }) => void} legend Writes the legend's entries, when the chart has one.
 * @property {(axis: ChartScale, options?: { across?: boolean, format?: (value: number) => string, lines?: boolean }) => void} valueAxis Writes a scale's hairlines and figures: up the plot, or across it.
 * @property {(labels: string[], middle: (index: number) => number, options?: { across?: boolean, edges?: boolean }) => void} nameAxis Writes the names along the other side, thinned so that a dozen at most stand under the plot.
 * @property {typeof scale} scale
 * @property {typeof curve} curve
 * @property {typeof runs} runs
 * @property {typeof pen} pen
 * @property {typeof sector} sector
 * @property {typeof circle} circle
 * @property {typeof round} round
 * @property {typeof percent} percent
 * @property {typeof clamp} clamp
 * @property {typeof real} real
 * @property {typeof width} width
 * @property {typeof numbers} numbers
 */

/**
 * @typedef {((kit: ChartKit) => void) & { types: string[], palette?: 'always' | 'several' | 'never' }} ChartForm A form: the function
 * that lays out the types it names. `palette` says when series with no category take one from the fixed order:
 * `several`, the default, when the chart has two or more; `always` for the parts of a whole; `never` for a form
 * whose marks are steps of one ink.
 */

/** The order unnamed series take their categories in: told apart with every common kind of color blindness. */
const palette = ['blue', 'orange', 'teal', 'violet', 'amber', 'pink', 'green', 'sky']

/** @type {Map<string, ChartForm>} */
const forms = new Map()

/**
 * Take the forms a page draws. Returns every type that can be drawn now.
 * @param {...ChartForm} given
 */
export function chartForms(...given) {
  for (const form of given) for (const type of form.types) forms.set(type, form)
  return [...forms.keys()]
}

/** @type {WeakMap<Element, { controller: AbortController, options: object }>} */
const attached = new WeakMap()

const tau = Math.PI * 2
const epsilon = 1e-9

/** @param {number} number @param {number} [digits] */
const round = (number, digits = 2) => Number(number.toFixed(digits))
/** A share of the plot as a percentage. @param {number} share */
const percent = (share) => `${round(share * 100, 3)}%`
/** @param {number} number @param {number} low @param {number} high */
const clamp = (number, low, high) => Math.min(high, Math.max(low, number))
/** @param {unknown} value @returns {value is number} */
const real = (value) => typeof value === 'number' && Number.isFinite(value)

/** @param {unknown} text */
function escape(text) {
  return String(text).replace(/[&<>"]/g, (character) => (character === '&' ? '&amp;' : character === '<' ? '&lt;' : character === '>' ? '&gt;' : '&quot;'))
}

/** How wide a label is, in digits: a letter of a wide script counts as two and a point or a comma as half. @param {string} text */
function width(text) {
  let total = 0
  for (const character of text) total += /[.,:;'|\s]/.test(character) ? 0.5 : (character.codePointAt(0) ?? 0) > 0x2e7f ? 2 : 1
  return Math.ceil(total)
}

/** @param {string | undefined} locale @param {Intl.NumberFormatOptions} options */
function numbers(locale, options) {
  try {
    return new Intl.NumberFormat(locale ?? 'en-US', options)
  } catch {
    return new Intl.NumberFormat('en-US', options)
  }
}

/**
 * A scale from a round number to a round number, with a tick at each round step between them.
 * @param {number} low @param {number} high @param {number} count @param {number} [from] @param {number} [to]
 */
function scale(low, high, count, from, to) {
  if (real(from)) low = from
  if (real(to)) high = to
  if (!(high > low)) high = low + (Math.abs(low) || 1)
  const steps = Math.max(1, count)
  const power = 10 ** Math.floor(Math.log10((high - low) / steps))
  // The round step that marks the scale in the number of steps asked for, or the nearest to it: of two as near,
  // the finer. A quarter (25, 250) is a step only where it is a whole number.
  let step = power
  let off = Infinity
  for (const candidate of power >= 10 ? [1, 2, 2.5, 5, 10] : [1, 2, 5, 10]) {
    const size = candidate * power
    const marks = (real(to) ? to / size : Math.ceil(high / size - epsilon)) - (real(from) ? from / size : Math.floor(low / size + epsilon))
    if (Math.abs(marks - steps) < off - epsilon) (step = size), (off = Math.abs(marks - steps))
  }
  const exact = (/** @type {number} */ number) => Number(number.toPrecision(12))
  const start = real(from) ? from : exact(Math.floor(low / step + epsilon) * step)
  const end = real(to) ? to : exact(Math.ceil(high / step - epsilon) * step)
  const ticks = []
  for (let index = Math.ceil(start / step - epsilon); exact(index * step) <= end + epsilon; index++) ticks.push(exact(index * step))
  return { start, end, ticks, at: (/** @type {number} */ value) => (value - start) / (end - start) }
}

/** @param {number[][]} points Each an x and a y. @param {string} curve The commands that go on from the first point. */
function curve(points, curve) {
  let path = ''
  if (curve === 'step') {
    for (let index = 1; index < points.length; index++) {
      const [x, y] = points[index]
      path += `H${round((points[index - 1][0] + x) / 2)}V${round(y)}H${round(x)}`
    }
    return path
  }
  if (curve !== 'smooth' || points.length < 3) {
    for (let index = 1; index < points.length; index++) path += `L${round(points[index][0])} ${round(points[index][1])}`
    return path
  }
  // A monotone cubic: the tangent at each point is held under both of its slopes, so the line never passes a value.
  const count = points.length
  const run = []
  const slope = []
  for (let index = 0; index < count - 1; index++) {
    run.push(points[index + 1][0] - points[index][0])
    slope.push((points[index + 1][1] - points[index][1]) / (run[index] || epsilon))
  }
  const tangent = new Array(count)
  for (let index = 1; index < count - 1; index++) {
    const between = (slope[index - 1] * run[index] + slope[index] * run[index - 1]) / (run[index - 1] + run[index] || epsilon)
    tangent[index] = (Math.sign(slope[index - 1]) + Math.sign(slope[index])) * Math.min(Math.abs(slope[index - 1]), Math.abs(slope[index]), 0.5 * Math.abs(between)) || 0
  }
  tangent[0] = (3 * slope[0] - tangent[1]) / 2
  tangent[count - 1] = (3 * slope[count - 2] - tangent[count - 2]) / 2
  for (let index = 0; index < count - 1; index++) {
    const third = run[index] / 3
    const [x0, y0] = points[index]
    const [x1, y1] = points[index + 1]
    path += `C${round(x0 + third)} ${round(y0 + tangent[index] * third)} ${round(x1 - third)} ${round(y1 - tangent[index + 1] * third)} ${round(x1)} ${round(y1)}`
  }
  return path
}

/** The runs of points between gaps. @template T @param {(T | null)[]} points @returns {T[][]} */
function runs(points) {
  /** @type {T[][]} */
  const result = []
  /** @type {T[]} */
  let current = []
  for (const point of points) {
    if (point) current.push(point)
    else if (current.length) (result.push(current), (current = []))
  }
  if (current.length) result.push(current)
  return result
}

/** A path being written: lines and arcs, as an SVG `d`. */
function pen() {
  let d = ''
  /** @type {number | null} */
  let x = null
  let y = 0
  const to = (/** @type {number} */ nextX, /** @type {number} */ nextY) => {
    if (x === null) d += `M${round(nextX, 3)} ${round(nextY, 3)}`
    else if (Math.abs(x - nextX) > 1e-6 || Math.abs(y - nextY) > 1e-6) d += `L${round(nextX, 3)} ${round(nextY, 3)}`
    x = nextX
    y = nextY
  }
  return {
    to,
    /** An arc of a circle from one angle to another. @param {number} cx @param {number} cy @param {number} r @param {number} a0 @param {number} a1 @param {boolean} [back] */
    arc(cx, cy, r, a0, a1, back = false) {
      to(cx + r * Math.cos(a0), cy + r * Math.sin(a0))
      if (!(r > epsilon)) return
      let sweep = back ? a0 - a1 : a1 - a0
      if (sweep < 0) sweep = (sweep % tau) + tau
      if (sweep < 1e-6) return
      x = cx + r * Math.cos(a1)
      y = cy + r * Math.sin(a1)
      d += `A${round(r, 3)} ${round(r, 3)} 0 ${sweep >= Math.PI ? 1 : 0} ${back ? 0 : 1} ${round(x, 3)} ${round(y, 3)}`
    },
    close: () => (d += 'Z'),
    get d() {
      return d
    },
  }
}

/** A whole circle, as two halves. @param {number} r */
const circle = (r) => `M0 ${-r}A${r} ${r} 0 1 1 0 ${r}A${r} ${r} 0 1 1 0 ${-r}`
/** The same circle drawn the other way round, which cuts a hole in the one around it. @param {number} r */
const hole = (r) => `M0 ${-r}A${r} ${r} 0 1 0 0 ${r}A${r} ${r} 0 1 0 0 ${-r}`

/**
 * Where a corner of radius `corner` touches the edge from one point to the next and the circle of radius `r`.
 * @param {number} x0 @param {number} y0 @param {number} x1 @param {number} y1 @param {number} r @param {number} corner
 */
function tangents(x0, y0, x1, y1, r, corner) {
  const x01 = x0 - x1
  const y01 = y0 - y1
  const offset = corner / Math.hypot(x01, y01)
  const ox = offset * y01
  const oy = -offset * x01
  const x11 = x0 + ox
  const y11 = y0 + oy
  const x10 = x1 + ox
  const y10 = y1 + oy
  const dx = x10 - x11
  const dy = y10 - y11
  const d2 = dx * dx + dy * dy
  const inner = r - corner
  const cross = x11 * y10 - x10 * y11
  const root = (dy < 0 ? -1 : 1) * Math.sqrt(Math.max(0, inner * inner * d2 - cross * cross))
  let cx = (cross * dy - dx * root) / d2
  let cy = (-cross * dx - dy * root) / d2
  const otherX = (cross * dy + dx * root) / d2
  const otherY = (-cross * dx + dy * root) / d2
  const midX = (x11 + x10) / 2
  const midY = (y11 + y10) / 2
  if ((cx - midX) ** 2 + (cy - midY) ** 2 > (otherX - midX) ** 2 + (otherY - midY) ** 2) (cx = otherX), (cy = otherY)
  return { cx, cy, x01: -ox, y01: -oy, x11: cx * (r / inner - 1), y11: cy * (r / inner - 1) }
}

/**
 * A slice: the part of a ring between two angles, kept `gap` from the slice beside it along its whole edge and
 * turned at its corners. With no inner radius its edges meet at a point, the gap's width from the center.
 * @param {number} r0 @param {number} r1 @param {number} a0 @param {number} a1 @param {number} gap @param {number} corner
 */
function sector(r0, r1, a0, a1, gap, corner) {
  const path = pen()
  const sweep = a1 - a0
  if (sweep > tau - 1e-6) return r0 > epsilon ? `${circle(round(r1, 3))}${hole(round(r0, 3))}` : circle(round(r1, 3))
  const half = gap / 2
  const outer = Math.asin(Math.min(1, half / r1))
  if (sweep - outer * 2 <= 1e-4) return ''
  const a01 = a0 + outer
  const a11 = a1 - outer
  const holed = r0 > epsilon
  const inside = holed ? Math.asin(Math.min(1, half / r0)) : 0
  const open = holed && sweep - inside * 2 > 1e-4
  const middle = (a0 + a1) / 2
  // Without a hole, or where the gap closes the inner edge, the two edges meet on the line through the middle.
  const reach = open ? r0 : Math.max(r0, half / Math.sin(Math.min(Math.PI / 2, sweep / 2)))
  const a00 = open ? a0 + inside : middle
  const a10 = open ? a1 - inside : middle
  const x01 = r1 * Math.cos(a01)
  const y01 = r1 * Math.sin(a01)
  const x11 = r1 * Math.cos(a11)
  const y11 = r1 * Math.sin(a11)
  const x00 = reach * Math.cos(a00)
  const y00 = reach * Math.sin(a00)
  const x10 = reach * Math.cos(a10)
  const y10 = reach * Math.sin(a10)

  const most = Math.max(0, Math.min(corner, (r1 - reach) / 2))
  let outerCorner = most
  let innerCorner = most
  if (most > epsilon && sweep < Math.PI) {
    // A narrow slice has less room for a corner than its width: hold each to what its end of the slice can turn.
    const sx = x00 - x01
    const sy = y00 - y01
    const tx = x10 - x11
    const ty = y10 - y11
    const t = ty * sx - tx * sy
    if (t * t > 1e-12) {
      const s = (tx * (y01 - y11) - ty * (x01 - x11)) / t
      const ix = x01 + s * sx
      const iy = y01 + s * sy
      const ax = x01 - ix
      const ay = y01 - iy
      const bx = x11 - ix
      const by = y11 - iy
      const k = 1 / Math.sin(Math.acos(clamp((ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by)), -1, 1)) / 2)
      const length = Math.hypot(ix, iy)
      innerCorner = Math.max(0, Math.min(most, (reach - length) / (k - 1)))
      outerCorner = Math.max(0, Math.min(most, (r1 - length) / (k + 1)))
    } else outerCorner = innerCorner = 0
  }

  if (outerCorner > 1e-3) {
    const t0 = tangents(x00, y00, x01, y01, r1, outerCorner)
    const t1 = tangents(x11, y11, x10, y10, r1, outerCorner)
    path.to(t0.cx + t0.x01, t0.cy + t0.y01)
    // Corners that have met are one turn; otherwise a corner, the rim and the other corner.
    if (outerCorner < most) path.arc(t0.cx, t0.cy, outerCorner, Math.atan2(t0.y01, t0.x01), Math.atan2(t1.y01, t1.x01))
    else {
      path.arc(t0.cx, t0.cy, outerCorner, Math.atan2(t0.y01, t0.x01), Math.atan2(t0.y11, t0.x11))
      path.arc(0, 0, r1, Math.atan2(t0.cy + t0.y11, t0.cx + t0.x11), Math.atan2(t1.cy + t1.y11, t1.cx + t1.x11))
      path.arc(t1.cx, t1.cy, outerCorner, Math.atan2(t1.y11, t1.x11), Math.atan2(t1.y01, t1.x01))
    }
  } else path.arc(0, 0, r1, a01, a11)

  if (!open) path.to(x10, y10)
  else if (innerCorner > 1e-3) {
    const t0 = tangents(x10, y10, x11, y11, r0, -innerCorner)
    const t1 = tangents(x01, y01, x00, y00, r0, -innerCorner)
    path.to(t0.cx + t0.x01, t0.cy + t0.y01)
    if (innerCorner < most) path.arc(t0.cx, t0.cy, innerCorner, Math.atan2(t0.y01, t0.x01), Math.atan2(t1.y01, t1.x01))
    else {
      path.arc(t0.cx, t0.cy, innerCorner, Math.atan2(t0.y01, t0.x01), Math.atan2(t0.y11, t0.x11))
      path.arc(0, 0, r0, Math.atan2(t0.cy + t0.y11, t0.cx + t0.x11), Math.atan2(t1.cy + t1.y11, t1.cx + t1.x11), true)
      path.arc(t1.cx, t1.cy, innerCorner, Math.atan2(t1.y11, t1.x11), Math.atan2(t1.y01, t1.x01))
    }
  } else path.arc(0, 0, r0, a10, a00, true)
  path.close()
  return path.d
}

/**
 * What a chart draws, as data.
 * @param {ChartConfig} [config]
 * @returns {ChartLayout}
 */
export function chartLayout(config = {}) {
  const type = /** @type {ChartType} */ (config.type ?? 'bar')
  const form = forms.get(type)
  if (!form) throw new Error(`No form draws a "${type}" chart. Pass its module to chartForms(), or import chart.js, which has every form.`)
  const given = config.series ?? []
  // A chart of one series is ink. Several series, and the parts of a whole, are told apart by category.
  const colored = form.palette === 'always' || (form.palette !== 'never' && given.length > 1)
  /** @type {ChartEntry[]} */
  const all = given.map((series, index) => ({ ...series, index, category: series.category ?? (colored ? palette[index % palette.length] : undefined) }))
  const hiddenNames = new Set(config.hidden ?? [])
  const shown = all.filter((series) => !hiddenNames.has(series.name))
  const whole = numbers(config.locale, { maximumFractionDigits: 2 })
  const format = config.format ?? ((/** @type {number} */ value) => whole.format(value))

  /** @type {ChartLayout} */
  const layout = {
    type,
    label: config.label ?? '',
    classes: 'chart-plot',
    radial: false,
    viewBox: '0 0 100 100',
    stretch: true,
    gutter: 0,
    tail: 0,
    foot: false,
    grid: [],
    ticks: [],
    paths: [],
    points: [],
    values: [],
    legend: [],
    toggle: config.toggle ?? true,
    legendLabel: config.legendLabel ?? 'Series',
    center: config.center ?? null,
    hidden: all.filter((series) => hiddenNames.has(series.name)).map((series) => series.name),
  }

  /** @type {ChartKit['tickFormat']} */
  const tickFormat = (ticks, own) => {
    if (own) return own
    const compact = ticks.some((tick) => Math.abs(tick) >= 10000)
    const formatter = numbers(config.locale, compact ? { notation: 'compact', maximumFractionDigits: 1 } : { maximumFractionDigits: 6 })
    return (value) => formatter.format(value)
  }

  /** @type {ChartKit['legend']} */
  const legend = (describe) => {
    if (!(config.legend ?? all.length > 1)) return
    layout.legend = all.map((series) => ({ name: series.name, category: series.category, mark: 'chart-key-mark', hidden: hiddenNames.has(series.name), ...describe?.(series, !hiddenNames.has(series.name)) }))
  }

  /** @type {ChartKit['valueAxis']} */
  const valueAxis = (axis, options = {}) => {
    const write = options.format ?? tickFormat(axis.ticks, config.tickFormat)
    for (const [order, step] of axis.ticks.entries()) {
      const share = clamp(axis.at(step), 0, 1)
      const base = step === 0 || (axis.start > 0 && step === axis.start) || (axis.end < 0 && step === axis.end)
      if (options.across) {
        if (options.lines !== false) layout.grid.push({ x1: percent(share), y1: '0', x2: percent(share), y2: '100%', base })
        if (config.axis !== false) layout.ticks.push({ text: write(step), classes: `chart-tick chart-tick-x${share < 0.005 ? ' chart-tick-start' : share > 0.995 ? ' chart-tick-end' : ''}${axis.ticks.length > 4 && order % 2 ? ' chart-tick-minor' : ''}`, x: percent(share), y: '100%', at: null })
      } else {
        if (options.lines !== false) layout.grid.push({ x1: '0', y1: percent(1 - share), x2: '100%', y2: percent(1 - share), base })
        if (config.axis !== false) layout.ticks.push({ text: write(step), classes: 'chart-tick chart-tick-y', x: '0', y: percent(1 - share), at: null })
      }
    }
  }

  /** @type {ChartKit['nameAxis']} */
  const nameAxis = (labels, middle, options = {}) => {
    const count = labels.length
    const every = options.across ? 1 : Math.ceil(count / 12)
    const kept = Math.ceil(count / every)
    for (let index = 0; index < count; index++) {
      const text = labels[index] ?? ''
      if (!text || index % every) continue
      // Beside the plot a long name is cut; the point still says it whole.
      if (options.across) layout.ticks.push({ text: [...text].length > 18 ? `${[...text].slice(0, 17).join('')}…` : text, classes: 'chart-tick chart-tick-y', x: '0', y: percent(middle(index)), at: null })
      else {
        const edge = options.edges ? (index === 0 ? ' chart-tick-start' : index === count - 1 ? ' chart-tick-end' : '') : ''
        const minor = kept > 7 && (index / every) % 2 === 1 ? ' chart-tick-minor' : ''
        layout.ticks.push({ text, classes: `chart-tick chart-tick-x${edge}${minor}`, x: percent(middle(index)), y: '100%', at: null })
      }
    }
  }

  form({ type, config, layout, all, shown, format, tickFormat, legend, valueAxis, nameAxis, scale, curve, runs, pen, sector, circle, round, percent, clamp, real, width, numbers })

  for (const point of layout.points) (point.x = round(point.x, 4)), (point.y = round(point.y, 4)), (point.reach = round(point.reach, 4))
  layout.foot = layout.ticks.some((tick) => tick.classes.includes('chart-tick-x'))
  layout.gutter = Math.max(layout.gutter, ...layout.ticks.filter((tick) => tick.classes.includes('chart-tick-y')).map((tick) => width(tick.text)))
  return layout
}

/** @param {string} classes @param {string | undefined} category */
const classed = (classes, category) => (category ? `${classes} category-${category}` : classes)

/**
 * An element as markup. Its attributes are escaped; one that is undefined or false is left out, and one that is
 * true is written bare. With nothing inside it closes itself.
 * @param {string} tag @param {Record<string, unknown>} attributes @param {string} [inside]
 */
function element(tag, attributes, inside) {
  let open = `<${tag}`
  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined || value === null || value === false) continue
    open += value === true ? ` ${name}` : ` ${name}="${escape(value)}"`
  }
  return inside === undefined ? `${open}/>` : `${open}>${inside}</${tag}>`
}

/** @param {ChartLayout} layout */
function plotMarkup(layout) {
  const named = (/** @type {ChartMark} */ mark) => (mark.name === undefined ? {} : { 'data-name': mark.name, 'data-value': mark.value ?? '' })
  const mark = (/** @type {ChartMark} */ mark) => {
    const classes = classed(mark.classes, mark.category)
    // What only this mark knows, a share of its color or a bubble's size, goes on as a custom property.
    const style = [mark.tone === undefined ? '' : `--chart-tone: ${mark.tone}%`, mark.size === undefined ? '' : `--chart-dot: ${mark.size}px`].filter(Boolean).join('; ') || undefined
    if (mark.kind === 'bar') return element('rect', { class: classes, x: mark.x, y: mark.y, width: mark.width, height: mark.height, style, ...named(mark) })
    if (mark.kind === 'dot') return element('circle', { class: classes, cx: mark.cx, cy: mark.cy, r: mark.r, style, ...named(mark) })
    if (mark.kind === 'line') return element('line', { class: classes, x1: mark.x1, y1: mark.y1, x2: mark.x2, y2: mark.y2, ...named(mark) })
    return element('path', { class: classes, d: mark.d, 'stroke-width': mark.stroke, pathLength: mark.kind === 'arc' ? 1 : undefined, style, ...named(mark) })
  }
  const points = layout.points.map((point) => {
    const hit = !point.hit ? '' : 'd' in point.hit ? element('path', { class: 'chart-hit', d: point.hit.d }) : 'r' in point.hit ? element('circle', { class: 'chart-hit', cx: point.hit.cx, cy: point.hit.cy, r: point.hit.r }) : element('rect', { class: 'chart-hit', x: point.hit.x, y: point.hit.y, width: point.hit.width, height: point.hit.height })
    const cursor = point.cursor ? element('line', { class: 'chart-cursor', ...point.cursor }) : ''
    const place = `--chart-x: ${point.x}; --chart-y: ${point.y}; --chart-reach: ${point.reach}; --chart-index: ${point.index}`
    return element('g', { class: 'chart-point', role: 'listitem', 'aria-label': point.text, 'aria-current': point.current ? 'true' : undefined, 'data-label': point.label, style: place }, hit + cursor + point.marks.map(mark).join(''))
  }).join('')
  const grid = layout.grid.map((line) => element('line', { class: line.base ? 'chart-grid chart-grid-base' : 'chart-grid', x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2 })).join('')
  const ticks = layout.ticks.map((tick) => element('text', { class: tick.classes, x: tick.x, y: tick.y, style: tick.at ? `--chart-x: ${tick.at[0]}; --chart-y: ${tick.at[1]}` : undefined }, escape(tick.text))).join('')
  const paths = layout.paths.map((path) => element('path', { class: classed(path.classes, path.category), d: path.d, style: path.tone === undefined ? undefined : `--chart-tone: ${path.tone}%` })).join('')
  const values = layout.values.map((value) => element('text', { class: value.classes, x: value.x, y: value.y }, escape(value.text))).join('')
  const canvas = element('svg', { class: 'chart-canvas', viewBox: layout.viewBox, preserveAspectRatio: layout.stretch ? 'none' : undefined, ...(layout.radial ? { role: 'presentation' } : { 'aria-hidden': 'true' }) }, paths + (layout.radial ? points : ''))
  return element('svg', { class: layout.classes, role: 'list', 'aria-label': layout.label || undefined }, element('g', { 'aria-hidden': 'true' }, grid + ticks) + canvas + (layout.radial ? '' : points) + (values ? element('g', { 'aria-hidden': 'true' }, values) : ''))
}

/** @param {ChartLayout} layout */
function bodyMarkup(layout) {
  const center = !layout.center ? '' : element('div', { class: 'chart-center' }, (layout.center.value ? element('p', { class: 'chart-center-value' }, escape(layout.center.value)) : '') + (layout.center.label ? element('p', { class: 'chart-center-label' }, escape(layout.center.label)) : ''))
  return plotMarkup(layout) + center + element('div', { class: 'chart-tip', 'aria-hidden': 'true', hidden: true }, '')
}

/** @param {ChartLayout} layout */
function legendMarkup(layout) {
  return layout.legend.map((key) => {
    const entry = element('span', { class: key.mark }, '') + escape(key.name) + (key.value === undefined ? '' : element('span', { class: 'chart-key-value' }, escape(key.value)))
    const classes = classed('chart-key', key.category)
    return layout.toggle ? element('label', { class: classes }, element('input', { type: 'checkbox', class: 'chart-key-input', value: key.name, checked: !key.hidden }) + entry) : element('li', { class: classes }, entry)
  }).join('')
}

/**
 * A chart as markup: what stands inside the element with the class `chart`.
 * @param {ChartConfig | ChartLayout} chart A chart's series and options, or the layout made from them.
 */
export function chartMarkup(chart) {
  const layout = 'points' in chart && 'paths' in chart ? /** @type {ChartLayout} */ (chart) : chartLayout(/** @type {ChartConfig} */ (chart))
  const legend = !layout.legend.length ? '' : layout.toggle
    ? element('div', { class: 'chart-legend', role: 'group', 'aria-label': layout.legendLabel }, legendMarkup(layout))
    : element('ul', { class: 'chart-legend', 'aria-label': layout.legendLabel }, legendMarkup(layout))
  return element('div', { class: 'chart-body', style: `--chart-gutter: ${layout.gutter}; --chart-tail: ${layout.tail}` }, bodyMarkup(layout)) + legend
}

/**
 * @typedef {object} ChartOptions
 * @property {(hidden: string[]) => void} [draw] Takes over the writing: called with the names of the hidden series.
 */

/**
 * Work a chart: its readout, its keys and its legend.
 * @param {HTMLElement} root The element with the class `chart`.
 * @param {ChartConfig & ChartOptions} [options] With `series`, the chart is written from them.
 */
export function chartCore(root, options = {}) {
  const before = attached.get(root)
  before?.controller.abort()
  // Found again with nothing to draw from, as `attach()` finds it, a chart keeps the series it was given.
  if (before && options.series === undefined && !options.draw) options = before.options
  const controller = new AbortController()
  attached.set(root, { controller, options })
  const { signal } = controller
  const { draw, ...config } = options
  const writes = !draw && config.series !== undefined
  let hidden = [...(config.hidden ?? [])]
  /** @type {Element | null} */
  let shown = null

  const points = () => /** @type {SVGElement[]} */ ([...root.querySelectorAll('.chart-point')])
  const boxes = () => /** @type {HTMLInputElement[]} */ ([...root.querySelectorAll('.chart-key-input')])
  const tip = () => /** @type {HTMLElement | null} */ (root.querySelector('.chart-tip'))

  /** One point is a stop in the tab order: the one last visited, or the first. @param {Element} [stop] */
  function rove(stop) {
    const all = points()
    const next = stop && all.includes(/** @type {SVGElement} */ (stop)) ? stop : all.find((point) => point.getAttribute('tabindex') === '0') ?? all[0]
    for (const point of all) point.setAttribute('tabindex', point === next ? '0' : '-1')
  }

  function write() {
    if (!writes) return
    const layout = chartLayout({ ...config, hidden })
    const document = root.ownerDocument
    let body = /** @type {HTMLElement | null} */ (root.querySelector('.chart-body'))
    if (!body) {
      body = document.createElement('div')
      body.className = 'chart-body'
      root.prepend(body)
    }
    body.style.setProperty('--chart-gutter', String(layout.gutter))
    body.style.setProperty('--chart-tail', String(layout.tail))
    body.innerHTML = bodyMarkup(layout)
    shown = null
    // A legend is kept while it names the same series, so a checkbox keeps the focus through the writing.
    const legend = root.querySelector('.chart-legend')
    const names = boxes().map((box) => box.value).join('\n')
    if (!layout.legend.length) legend?.remove()
    else if (!legend || !layout.toggle || names !== layout.legend.map((key) => key.name).join('\n')) {
      const next = document.createElement(layout.toggle ? 'div' : 'ul')
      next.className = 'chart-legend'
      if (layout.toggle) next.setAttribute('role', 'group')
      next.setAttribute('aria-label', layout.legendLabel)
      next.innerHTML = legendMarkup(layout)
      if (legend) legend.replaceWith(next)
      else root.append(next)
    } else for (const box of boxes()) box.checked = !hidden.includes(box.value)
    rove()
  }

  /** Fill the readout from a point's marks and stand it by the point. @param {Element} point */
  function show(point) {
    const readout = tip()
    if (!readout) return
    if (shown !== point || readout.hidden) {
      const document = root.ownerDocument
      const part = (/** @type {string} */ tag, /** @type {string} */ classes, /** @type {string} */ text = '') => {
        const element = document.createElement(tag)
        element.className = classes
        element.textContent = text
        return element
      }
      const rows = [...point.querySelectorAll('[data-name]')].map((mark) => {
        const category = [...mark.classList].find((name) => name.startsWith('category-'))
        const row = part('p', category ? `chart-tip-row ${category}` : 'chart-tip-row')
        row.append(part('span', 'chart-tip-key'), part('span', 'chart-tip-name', mark.getAttribute('data-name') ?? ''), part('span', 'chart-tip-value', mark.getAttribute('data-value') ?? ''))
        return row
      })
      const label = point.getAttribute('data-label')
      readout.replaceChildren(...(label ? [part('p', 'chart-tip-title', label)] : []), ...rows)
      for (const name of ['--chart-x', '--chart-y', '--chart-reach']) readout.style.setProperty(name, /** @type {SVGElement} */ (point).style.getPropertyValue(name) || '0')
      shown = point
    }
    readout.hidden = false
  }

  function hide() {
    const readout = tip()
    if (readout) readout.hidden = true
  }

  const pointOf = (/** @type {EventTarget | null} */ target) => {
    const point = target instanceof Element ? target.closest('.chart-point') : null
    return point && root.contains(point) ? point : null
  }

  root.addEventListener('pointerover', (event) => {
    const point = pointOf(event.target)
    if (!point) return
    const focused = pointOf(root.ownerDocument.activeElement)
    // A finger has no hover: the point it is on takes the focus, which marks it as the pointer would.
    if (event.pointerType === 'touch') /** @type {SVGElement} */ (point).focus({ preventScroll: true })
    else if (focused && focused !== point) /** @type {SVGElement} */ (focused).blur()
    show(point)
  }, { signal })
  root.addEventListener('pointerdown', (event) => {
    // A finger that goes on along the chart is followed from point to point.
    if (pointOf(event.target) && event.target instanceof Element && event.target.hasPointerCapture?.(event.pointerId)) event.target.releasePointerCapture(event.pointerId)
  }, { signal })
  root.addEventListener('pointerleave', () => {
    const focused = pointOf(root.ownerDocument.activeElement)
    if (focused) show(focused)
    else hide()
  }, { signal })
  root.addEventListener('pointerout', (event) => {
    if (!pointOf(event.target) || pointOf(event.relatedTarget)) return
    const focused = pointOf(root.ownerDocument.activeElement)
    if (focused) show(focused)
    else hide()
  }, { signal })
  // A press is not a way into the chart: the keys are, and a pressed point would keep its readout open.
  root.addEventListener('mousedown', (event) => {
    if (pointOf(event.target)) event.preventDefault()
  }, { signal })
  root.addEventListener('focusin', (event) => {
    const point = pointOf(event.target)
    if (!point) return
    rove(point)
    show(point)
  }, { signal })
  root.addEventListener('focusout', (event) => {
    if (pointOf(event.target) && !pointOf(event.relatedTarget)) hide()
  }, { signal })
  root.addEventListener('keydown', (event) => {
    const point = pointOf(event.target)
    if (!point || event.altKey || event.ctrlKey || event.metaKey) return
    const all = points()
    const index = all.indexOf(/** @type {SVGElement} */ (point))
    const next = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? all[index + 1]
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? all[index - 1]
        : event.key === 'Home' ? all[0]
          : event.key === 'End' ? all[all.length - 1]
            : null
    if (event.key === 'Escape' && tip() && !/** @type {HTMLElement} */ (tip()).hidden) {
      event.preventDefault()
      return hide()
    }
    if (next === null) return
    event.preventDefault()
    if (next && next !== point) {
      rove(next)
      next.focus()
    }
  }, { signal })
  root.addEventListener('change', (event) => {
    if (!(event.target instanceof Element) || !event.target.matches('.chart-key-input')) return
    hidden = boxes().filter((box) => !box.checked).map((box) => box.value)
    if (draw) draw([...hidden])
    else write()
  }, { signal })

  write()
  rove()

  // A renderer may write the points again at any time. Whatever it wrote, one point is still a stop in the tab
  // order, and a readout that is open says what its point says now.
  if (typeof MutationObserver === 'function') {
    const observer = new MutationObserver((records) => {
      if (records.every((record) => record.target instanceof Element && record.target.closest('.chart-tip'))) return
      rove()
      const readout = tip()
      if (!readout || readout.hidden || !shown) return
      const point = shown
      shown = null
      if (root.contains(point)) show(point)
      else hide()
    })
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-name', 'data-value', 'data-label'] })
    signal.addEventListener('abort', () => observer.disconnect())
  }

  const detach = () => {
    controller.abort()
    hide()
    if (attached.get(root)?.controller === controller) attached.delete(root)
  }
  return /** @type {(() => void) & { value: string[] }} */ (Object.defineProperty(detach, 'value', {
    enumerable: true,
    get: () => (boxes().length ? boxes().filter((box) => !box.checked).map((box) => box.value) : [...hidden]),
    set(/** @type {string[]} */ value) {
      const next = [...(value ?? [])]
      if (next.length === hidden.length && next.every((name) => hidden.includes(name))) return
      hidden = next
      for (const box of boxes()) box.checked = !hidden.includes(box.value)
      if (draw) draw([...hidden])
      else write()
    },
  }))
}
