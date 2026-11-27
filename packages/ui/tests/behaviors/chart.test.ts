import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { chart, chartForms, chartLayout, chartMarkup } from '../../behaviors/chart.js'
import { check, createIndex } from '../../check/index.js'
import { contracts, utilities } from '../support.ts'

const week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const regions = [
  { name: 'Tokyo', values: [42, 58, 36, 71, 64, 22, 18] },
  { name: 'Osaka', values: [30, 44, 28, 49, 78, 91, 66] },
]

test('chartLayout: the scale runs between round numbers, with a tick at each round step', () => {
  const layout = chartLayout({ type: 'bar', labels: week, series: [regions[0]] })
  assert.deepEqual(layout.ticks.filter(tick => tick.classes.includes('chart-tick-y')).map(tick => tick.text), ['0', '20', '40', '60', '80'])
  assert.deepEqual(layout.grid.map(line => line.y1), ['100%', '75%', '50%', '25%', '0%'])
  assert.equal(layout.grid[0].base, true, 'the hairline at zero is the baseline')
  assert.equal(layout.gutter, 2, 'the room beside the plot is as wide as the widest figure')

  const fixed = chartLayout({ type: 'bar', labels: week, series: [regions[0]], max: 100 })
  assert.deepEqual(fixed.ticks.filter(tick => tick.classes.includes('chart-tick-y')).map(tick => tick.text), ['0', '25', '50', '75', '100'], 'a given end is kept, and a quarter is a round step of a hundred')
  assert.deepEqual(chartLayout({ type: 'bar', labels: week, series: [regions[0]], max: 100, ticks: 5 }).ticks.filter(tick => tick.classes.includes('chart-tick-y')).map(tick => tick.text), ['0', '20', '40', '60', '80', '100'])

  const large = chartLayout({ type: 'line', labels: ['a', 'b'], series: [{ name: 'Requests', values: [12000, 48000] }] })
  assert.deepEqual(large.ticks.filter(tick => tick.classes.includes('chart-tick-y')).map(tick => tick.text), ['0', '10K', '20K', '30K', '40K', '50K'], 'a scale that reaches 10,000 is written compact')

  const bare = chartLayout({ type: 'bar', labels: week, series: [regions[0]], axis: false })
  assert.equal(bare.gutter, 0, 'with no figures the plot takes the whole width')
  assert.equal(bare.grid.length, 5, 'the hairlines stay')

  const below = chartLayout({ type: 'bar', labels: ['a', 'b'], series: [{ name: 'Net', values: [12, -8] }] })
  assert.equal(below.grid.find(line => line.base)?.y1, '60%', 'the baseline is where zero is, not the foot of the plot')
  assert.match(below.points[1].marks[0].classes, /chart-bar-down/)
})

test('chartLayout: one series is ink, several take the categories in a fixed order, and a named category is kept', () => {
  assert.equal(chartLayout({ type: 'line', labels: week, series: [regions[0]] }).paths[0].category, undefined)
  const two = chartLayout({ type: 'line', labels: week, series: regions })
  assert.deepEqual(two.paths.map(path => path.category), ['blue', 'orange'])
  assert.deepEqual(two.legend.map(key => [key.name, key.category, key.mark]), [['Tokyo', 'blue', 'chart-key-mark chart-key-line'], ['Osaka', 'orange', 'chart-key-mark chart-key-line']])
  const named = chartLayout({ type: 'bar', labels: week, series: [{ ...regions[0], category: 'teal' }] })
  assert.equal(named.points[0].marks[0].category, 'teal')
  assert.equal(named.legend.length, 0, 'one series needs no legend')
  const hidden = chartLayout({ type: 'line', labels: week, series: regions, hidden: ['Tokyo'] })
  assert.deepEqual(hidden.paths.map(path => path.category), ['orange'], 'a series keeps its color when another is hidden')
  assert.deepEqual(hidden.legend.map(key => key.hidden), [true, false])
  assert.deepEqual(hidden.hidden, ['Tokyo'])
})

test('chartLayout: a line runs from edge to edge, a gap parts it, and each point says its values', () => {
  const layout = chartLayout({ type: 'line', label: 'Latency', labels: week, series: [regions[0], { name: 'Osaka', values: [30, 44, null, 49, 78, 91, 66] }], curve: 'linear' })
  assert.equal(layout.points.length, 7)
  assert.equal(layout.points[0].x, 0)
  assert.equal(layout.points[6].x, 1)
  assert.equal(layout.points[0].text, 'Mon: Tokyo 42, Osaka 30')
  assert.equal(layout.points[2].text, 'Wed: Tokyo 36', 'a missing value is not said')
  assert.equal(layout.points[2].marks.length, 1)
  assert.equal(layout.paths[1].d.match(/M/g)?.length, 2, 'the line breaks at the gap')
  assert.match(layout.paths[0].d, /^M0 58L16\.67 42L/)
  assert.deepEqual(layout.points[0].cursor, { x1: '0%', y1: '0', x2: '0%', y2: '100%' })
  assert.match(layout.ticks.find(tick => tick.text === 'Mon')!.classes, /chart-tick-start/)
  assert.match(layout.ticks.find(tick => tick.text === 'Sun')!.classes, /chart-tick-end/)
})

test('chartLayout: a smooth line never passes a value, and a step turns halfway', () => {
  const smooth = chartLayout({ type: 'line', labels: week, series: [{ name: 'Load', values: [0, 100, 100, 0, 0, 50, 50] }], max: 100 })
  const numbers = smooth.paths[0].d.match(/-?\d+(\.\d+)?/g)!.map(Number)
  const ys = numbers.filter((_, index) => index % 2 === 1)
  assert.ok(ys.every(y => y >= 0 && y <= 100), 'no control point leaves the scale')
  const step = chartLayout({ type: 'line', labels: ['a', 'b'], series: [{ name: 'Load', values: [0, 100] }], curve: 'step', max: 100 })
  assert.equal(step.paths[0].d, 'M0 100H50V0H100')
})

test('chartLayout: an area closes on the baseline, and a stacked one on the area under it', () => {
  const area = chartLayout({ type: 'area', labels: ['a', 'b', 'c'], series: [{ name: 'Web', values: [10, 20, 10] }], curve: 'linear', max: 20 })
  assert.deepEqual(area.paths.map(path => path.kind), ['area', 'line'])
  assert.equal(area.paths[0].d, 'M0 50L50 0L100 50L100 100L50 100L0 100Z')
  const stacked = chartLayout({ type: 'area', stacked: true, labels: ['a', 'b'], series: [{ name: 'Web', values: [10, 10] }, { name: 'App', values: [10, 30] }], curve: 'linear', max: 40 })
  assert.equal(stacked.paths[1].d, 'M0 50L100 0L100 75L0 75Z', 'the second area stands on the first')
  assert.match(stacked.paths[0].classes, /chart-area-stacked/)
  assert.equal(stacked.points[1].text, 'b: Web 10, App 30', 'a point says each value, not the running total')
})

test('chartLayout: bars stand in bands, side by side or stacked, and only the outermost of a stack is turned', () => {
  const grouped = chartLayout({ type: 'bar', labels: ['Q1', 'Q2'], series: [{ name: 'Plan', values: [40, 60] }, { name: 'Actual', values: [30, 80] }], max: 80 })
  const [plan, actual] = grouped.points[0].marks
  assert.equal(plan.height, '50%')
  assert.equal(plan.y, '50%')
  assert.ok(parseFloat(actual.x!) > parseFloat(plan.x!) + parseFloat(plan.width!), 'the second bar stands after the first, with a space')
  assert.equal(grouped.points[0].hit && 'width' in grouped.points[0].hit && grouped.points[0].hit.width, '50%', 'the pointer lands on the whole band')

  const stacked = chartLayout({ type: 'bar', stacked: true, labels: ['a'], series: [{ name: 'Low', values: [10] }, { name: 'High', values: [30] }, { name: 'None', values: [0] }], max: 40 })
  const marks = stacked.points[0].marks
  assert.deepEqual(marks.map(mark => mark.name), ['None', 'High', 'Low'], 'a stack is read from its top')
  assert.match(marks[2].classes, /chart-bar-inner/)
  assert.doesNotMatch(marks[1].classes, /chart-bar-inner/, 'a bar of nothing over it does not take the turned end')
  assert.equal(marks[1].y, '0%')
  assert.equal(marks[1].height, '75%')

  const across = chartLayout({ type: 'bar', horizontal: true, values: true, labels: ['/guide/installation', '/a'], series: [{ name: 'Visitors', values: [4820, 412] }] })
  assert.match(across.points[0].marks[0].classes, /chart-bar-across/)
  assert.equal(across.points[0].marks[0].x, '0%')
  assert.equal(across.gutter, 18, 'the names stand beside the rows, and a long one is cut')
  assert.equal(across.tail, 5)
  assert.deepEqual(across.values.map(value => value.text), ['4,820', '412'])
  assert.match(across.values[0].classes, /chart-value-across/)
})

test('chartLayout: a dozen names at most stand under the plot, and every other of many gives way', () => {
  const month = chartLayout({ type: 'bar', labels: Array.from({ length: 30 }, (_, index) => `Nov ${index + 1}`), series: [{ name: 'Requests', values: Array.from({ length: 30 }, (_, index) => index) }] })
  const names = month.ticks.filter(tick => tick.classes.includes('chart-tick-x'))
  assert.deepEqual(names.map(tick => tick.text).slice(0, 3), ['Nov 1', 'Nov 4', 'Nov 7'])
  assert.equal(names.length, 10)
  assert.equal(names.filter(tick => tick.classes.includes('chart-tick-minor')).length, 5)
  assert.equal(month.points.length, 30, 'every bar is still a point')
})

test('chartLayout: a pie\'s slices are shares of the whole, parted by a gap and turned at their corners', () => {
  const pie = chartLayout({ type: 'pie', label: 'Browsers', series: [{ name: 'Chrome', value: 75 }, { name: 'Safari', value: 25 }, { name: 'None', value: 0 }] })
  assert.equal(pie.classes, 'chart-plot chart-plot-radial')
  assert.equal(pie.radial, true)
  assert.equal(pie.points.length, 2, 'a slice of nothing is not drawn')
  assert.equal(pie.points[0].text, 'Chrome: 75 (75%)')
  assert.deepEqual(pie.legend.map(key => key.value), ['75%', '25%', '0%'])
  assert.deepEqual(pie.points.map(point => point.marks[0].category), ['blue', 'orange'])
  assert.match(pie.points[0].marks[0].d!, /^M[\d.-]+ [\d.-]+A1\.8 1\.8/, 'the slice begins with its turned corner')
  assert.ok(pie.points[0].x > 0.5 && pie.points[1].x < 0.5, 'the readout stands on the slice')

  const whole = chartLayout({ type: 'donut', series: [{ name: 'All', value: 10 }], hole: 0.6 })
  assert.equal(whole.points[0].marks[0].d, 'M0 -50A50 50 0 1 1 0 50A50 50 0 1 1 0 -50M0 -30A30 30 0 1 0 0 30A30 30 0 1 0 0 -30', 'one slice is a whole ring, its hole drawn the other way')
  assert.deepEqual(whole.center, { value: '' }, 'a donut keeps its middle for the readout')
})

test('chartLayout: rings fill from the top to their share, each inside the one before', () => {
  const rings = chartLayout({ type: 'rings', series: [{ name: 'Move', value: 50 }, { name: 'Stand', value: 12, max: 12 }, { name: 'Rest', value: 0 }], center: { value: '50%', label: 'Move' } })
  assert.deepEqual(rings.points.map(point => point.marks.map(mark => mark.kind)), [['track', 'arc'], ['track', 'arc'], ['track']])
  assert.equal(rings.points[0].text, 'Move: 50 / 100')
  assert.equal(rings.points[1].marks[1].d, rings.points[1].marks[0].d, 'a full ring is the whole circle')
  assert.equal(rings.points[2].marks[0].name, 'Rest', 'a ring of nothing is still read from its track')
  const [outer, inner] = rings.points.map(point => Number(/A([\d.]+)/.exec(point.marks[0].d!)![1]))
  assert.ok(inner < outer)
  assert.deepEqual(rings.center, { value: '50%', label: 'Move' })
})

test('chartLayout: a radar has a spoke to each name, a shape to each series and a point to each spoke', () => {
  const radar = chartLayout({ type: 'radar', max: 100, labels: ['Speed', 'Size', 'Docs', 'Safety'], series: [{ name: '2.4', values: [100, 50, 0, 50] }, { name: '2.3', values: [50, 50, 50, 50] }] })
  assert.equal(radar.classes, 'chart-plot chart-plot-radar')
  assert.deepEqual(radar.paths.map(path => path.kind), ['web', 'shape', 'shape'])
  assert.equal(radar.paths[1].d, 'M0 -40L20 0L0 0L-20 0Z')
  assert.equal(radar.points.length, 4)
  assert.equal(radar.points[0].text, 'Speed: 2.4 100, 2.3 50')
  assert.ok(radar.points[0].hit && 'd' in radar.points[0].hit)
  const names = radar.ticks.filter(tick => !tick.classes.includes('chart-tick-scale'))
  assert.deepEqual(names.map(tick => tick.text), ['Speed', 'Size', 'Docs', 'Safety'])
  assert.match(names[1].classes, /chart-tick-start/, 'a name to the right begins at its place')
  assert.match(names[3].classes, /chart-tick-end/)
  assert.deepEqual(radar.ticks.filter(tick => tick.classes.includes('chart-tick-scale')).map(tick => tick.text), ['25', '50', '75'])
})

test('chartLayout: a scatter scales both ways around its points, and every dot is a point', () => {
  const scatter = chartLayout({ type: 'scatter', series: [{ name: 'API', points: [{ x: 12, y: 38, label: 'GET /users' }, { x: 81, y: 171 }] }] })
  assert.equal(scatter.points.length, 2)
  assert.equal(scatter.points[0].text, 'GET /users, API: 12, 38')
  assert.equal(scatter.points[0].label, 'GET /users')
  assert.ok(scatter.points[0].hit && 'r' in scatter.points[0].hit && scatter.points[0].hit.r === 12, 'the pointer lands on more than the dot')
  assert.deepEqual(scatter.ticks.filter(tick => tick.classes.includes('chart-tick-x')).map(tick => tick.text), ['0', '20', '40', '60', '80', '100'])
  assert.equal(scatter.legend.length, 0)
  assert.equal(chartLayout({ type: 'scatter', series: [{ name: 'A', points: [] }, { name: 'B', points: [] }] }).legend[0].mark, 'chart-key-mark chart-key-dot')
})

test('chartForms: the core draws only the forms it is given', async () => {
  const core = await import('../../behaviors/chart-core.js')
  const { chartCartesian } = await import('../../behaviors/chart-cartesian.js')
  assert.equal(typeof core.chartCore, 'function')
  assert.deepEqual(chartCartesian.types, ['line', 'area', 'bar'])
  assert.ok(core.chartForms(chartCartesian).includes('line'), 'taking a form returns the types that can be drawn')
})

test('chartLayout: stacks as shares of a whole, and a stream around its middle', () => {
  const whole = chartLayout({ type: 'bar', stacked: 'percent', labels: ['a', 'b'], series: [{ name: 'Free', values: [1, 3] }, { name: 'Pro', values: [3, 1] }] })
  assert.deepEqual(whole.ticks.filter(tick => tick.classes.includes('chart-tick-y')).map(tick => tick.text), ['0%', '25%', '50%', '75%', '100%'])
  assert.equal(whole.points[0].text, 'a: Free 1 (25%), Pro 3 (75%)', 'a value is said with its share')
  assert.deepEqual(whole.points[0].marks.map(mark => [mark.name, mark.y, mark.height]), [['Pro', '0%', '75%'], ['Free', '75%', '25%']])

  const stream = chartLayout({ type: 'area', stacked: 'stream', labels: ['a', 'b', 'c'], series: [{ name: 'Rock', values: [2, 4, 2] }, { name: 'Jazz', values: [2, 4, 2] }], curve: 'linear' })
  assert.deepEqual(stream.paths.map(path => path.kind), ['area', 'area'], 'a stream has no edges between its layers')
  assert.equal(stream.ticks.some(tick => tick.classes.includes('chart-tick-y')), false, 'and no scale: its thickness is the value')
  assert.equal(stream.paths[0].d, 'M0 50L50 50L100 50L100 75L50 100L0 75Z', 'the first layer hangs under the middle line')
  assert.equal(stream.points[1].marks[0].cy, '75%', 'a point is marked in the middle of its layer')
})

test('chartLayout: what a value may be is a band around a line and a whisker on a bar', () => {
  const line = chartLayout({ type: 'line', labels: ['a', 'b'], series: [{ name: 'Sessions', values: [10, 20], low: [5, 10], high: [15, 30] }], curve: 'linear', max: 40 })
  assert.deepEqual(line.paths.map(path => path.kind), ['band', 'line'])
  assert.equal(line.paths[0].d, 'M0 62.5L100 25L100 75L0 87.5Z')
  assert.equal(line.points[0].text, 'a: 10 (5–15)')
  const bar = chartLayout({ type: 'bar', labels: ['a'], series: [{ name: 'Score', values: [20], low: [10], high: [30] }], max: 40 })
  const whisker = bar.points[0].marks.find(mark => mark.classes === 'chart-whisker')!
  assert.deepEqual([whisker.kind, whisker.y1, whisker.y2], ['line', '75%', '25%'])
  assert.equal(bar.points[0].y, 0.25, 'the readout clears the whisker, not only the bar')
})

test('chartLayout: a lollipop is a stem with a dot at the value', () => {
  const layout = chartLayout({ type: 'bar', mark: 'lollipop', labels: ['a', 'b'], series: [{ name: 'Median', values: [10, 20] }], max: 20 })
  assert.deepEqual(layout.points[1].marks.map(mark => [mark.kind, mark.classes]), [['line', 'chart-stem'], ['dot', 'chart-dot']])
  assert.deepEqual([layout.points[1].marks[0].y1, layout.points[1].marks[0].y2, layout.points[1].marks[1].cy], ['100%', '0%', '0%'])
  assert.equal(layout.points[1].marks[1].value, '20', 'the dot carries the value for the readout')
})

test('chartLayout: a bubble is as large in area as its size, and the largest are drawn first', () => {
  const layout = chartLayout({ type: 'scatter', series: [{ name: 'Markets', points: [{ x: 1, y: 1, size: 25, label: 'Small' }, { x: 2, y: 2, size: 100, label: 'Large' }] }] })
  assert.deepEqual(layout.points.map(point => [point.label, point.marks[0].size, point.marks[0].classes]), [['Large', 20, 'chart-dot chart-dot-bubble'], ['Small', 10, 'chart-dot chart-dot-bubble']])
  assert.equal(layout.points[1].text, 'Small, Markets: 1, 1, 25')
  assert.ok(layout.points[0].hit && 'r' in layout.points[0].hit && layout.points[0].hit.r === 24)
})

test('chartLayout: a waterfall walks from its first figure to its sum', () => {
  const layout = chartLayout({ type: 'waterfall', total: 'June', values: true, labels: ['January', 'Sales', 'Refunds'], series: [{ name: 'Cash', values: [400, 200, -100] }], max: 800 })
  assert.deepEqual(layout.points.map(point => point.text), ['January: 400', 'Sales: +200 (600)', 'Refunds: -100 (500)', 'June: 500'])
  assert.deepEqual(layout.points.map(point => point.marks[0].classes), ['chart-bar', 'chart-bar chart-bar-rise', 'chart-bar chart-bar-down chart-bar-fall', 'chart-bar'])
  assert.deepEqual(layout.points.map(point => [point.marks[0].y, point.marks[0].height]), [['50%', '50%'], ['25%', '25%'], ['25%', '12.5%'], ['37.5%', '62.5%']])
  assert.equal(layout.paths[0].classes, 'chart-link')
  assert.equal(layout.paths[0].d.match(/M/g)?.length, 3, 'a hairline carries each bar\'s end to the next')
  assert.deepEqual(layout.values.map(value => value.text), ['400', '+200', '-100', '500'])
})

test('chartLayout: a range is a bar between two values and a dumbbell two dots on a stem; neither starts at zero', () => {
  const range = chartLayout({ type: 'range', labels: ['a', 'b'], series: [{ name: 'Tokyo', ranges: [[10, 20], [30, 15]] }], min: 10, max: 30 })
  assert.deepEqual(range.points.map(point => point.text), ['a: 10–20', 'b: 15–30'])
  assert.deepEqual(range.points.map(point => [point.marks[0].classes, point.marks[0].y, point.marks[0].height]), [['chart-bar chart-bar-floating', '50%', '50%'], ['chart-bar chart-bar-floating', '0%', '75%']])
  assert.equal(range.grid.some(line => line.base), false, 'a scale that does not start at zero has no baseline')

  const dumbbell = chartLayout({ type: 'dumbbell', horizontal: true, labels: ['Design'], series: [{ name: '2019', values: [60] }, { name: '2024', values: [80] }], min: 40, max: 80 })
  assert.deepEqual(dumbbell.points[0].marks.map(mark => [mark.kind, mark.classes, mark.cx ?? `${mark.x1} ${mark.x2}`]), [['line', 'chart-stem', '50% 100%'], ['dot', 'chart-dot', '50%'], ['dot', 'chart-dot', '100%']])
  assert.equal(dumbbell.points[0].text, 'Design: 2019 60, 2024 80')
  assert.deepEqual(dumbbell.legend.map(key => key.mark), ['chart-key-mark chart-key-dot', 'chart-key-mark chart-key-dot'])
})

test('chartLayout: a slope is a line to a series, named at its last end, and its labels are kept apart', () => {
  const layout = chartLayout({ type: 'slope', labels: ['2019', '2024'], series: [{ name: 'Chrome', values: [50, 60] }, { name: 'Edge', values: [10, 11] }, { name: 'Opera', values: [10, 10] }] })
  assert.equal(layout.radial, true, 'the points stand in the canvas, where a line is a path')
  assert.equal(layout.stretch, true)
  assert.deepEqual(layout.points.map(point => point.text), ['Chrome: 2019 50, 2024 60', 'Edge: 2019 10, 2024 11', 'Opera: 2019 10, 2024 10'])
  assert.deepEqual(layout.points[0].marks.map(mark => mark.classes), ['chart-hit chart-hit-line', 'chart-line', 'chart-knot', 'chart-knot'])
  assert.deepEqual(layout.points[0].marks.slice(2).map(mark => [mark.name, mark.value]), [['2019', '50'], ['2024', '60']])
  const last = layout.values.filter(value => value.classes.includes('chart-value-across'))
  assert.deepEqual(last.map(value => value.text), ['60  Chrome', '11  Edge', '10  Opera'])
  const ys = last.map(value => parseFloat(value.y))
  assert.ok(ys[2] - ys[1] >= 7.4, 'two ends that would meet are nudged apart')
  assert.ok(ys[2] <= 94, 'and the lowest is not pushed past the foot of the lines, off the plot')
  const crowded = chartLayout({ type: 'slope', labels: ['2019', '2024'], series: [50, 3, 2, 1, 0].map((value, at) => ({ name: `S${at}`, values: [value, value] })) })
  const feet = crowded.values.filter(value => value.classes.includes('chart-value-across')).map(value => parseFloat(value.y))
  assert.ok(Math.max(...feet) <= 94, `every label stays on the plot: ${feet}`)
  assert.ok(feet.every((y, at) => at === 0 || y - feet[at - 1] >= 7.4), `and they stay apart: ${feet}`)
  assert.equal(layout.gutter, 2)
  assert.equal(layout.tail, 9)
})

test('chartLayout: a bump ranks the series at each label', () => {
  const layout = chartLayout({ type: 'bump', labels: ['Q1', 'Q2'], series: [{ name: 'Atlas', values: [90, 100] }, { name: 'Beacon', values: [140, 80] }] })
  assert.deepEqual(layout.points.map(point => point.text), ['Atlas: Q1 2, Q2 1', 'Beacon: Q1 1, Q2 2'])
  assert.equal(layout.points[0].marks[1].d, 'M0 75C50 75 50 25 100 25', 'from rank to rank the line leaves and arrives level')
  assert.deepEqual(layout.ticks.filter(tick => tick.classes.includes('chart-tick-y')).map(tick => tick.text), ['1', '2'])
  assert.deepEqual(layout.values.map(value => [value.text, value.y]), [['Atlas', '25%'], ['Beacon', '75%']])
  assert.equal(layout.points[0].marks[2].value, '2 (90)', 'a knot says its rank and the value behind it')
  assert.equal(chartLayout({ type: 'bump', ascending: true, labels: ['Q1'], series: [{ name: 'Atlas', values: [90] }, { name: 'Beacon', values: [140] }] }).points[0].text, 'Atlas: Q1 1')
})

test('chartLayout: a marimekko\'s columns are as wide as their totals', () => {
  const layout = chartLayout({ type: 'marimekko', labels: ['Americas', 'Asia'], series: [{ name: 'Hardware', values: [30, 10] }, { name: 'Software', values: [30, 30] }] })
  const [first, second] = layout.points
  assert.ok(Math.abs(parseFloat(first.marks[0].width!) / parseFloat(second.marks[0].width!) - 1.5) < 0.01, '60 against 40')
  assert.equal(first.text, 'Americas: Hardware 30 (50%), Software 30 (50%)')
  assert.equal(first.label, 'Americas: 60 (60%)', 'the readout\'s title says the column\'s share of the whole')
  assert.deepEqual(second.marks.map(mark => [mark.name, mark.y, mark.height, mark.classes]), [['Software', '0%', '75%', 'chart-bar'], ['Hardware', '75%', '25%', 'chart-bar chart-bar-inner']])
})

test('chartLayout: a histogram sorts readings into bins between round numbers', () => {
  const layout = chartLayout({ type: 'histogram', bins: 4, series: [{ name: 'Requests', values: [0, 1, 9, 10, 11, 25, 39, 40] }] })
  assert.deepEqual(layout.points.map(point => point.text), ['0–10: 3', '10–20: 2', '20–30: 1', '30–40: 2'], 'an edge belongs to the bin it begins, and the last bin holds its upper edge')
  assert.deepEqual(layout.points.map(point => [point.marks[0].x, point.marks[0].width]), [['0%', '25%'], ['25%', '25%'], ['50%', '25%'], ['75%', '25%']])
  assert.equal(layout.points[0].marks[0].classes, 'chart-bar chart-bar-bin')
  assert.deepEqual(layout.ticks.filter(tick => tick.classes.includes('chart-tick-x')).map(tick => tick.text), ['0', '10', '20', '30', '40'])
})

test('chartLayout: a box plot is five figures, with a reading far from the others as a dot of its own', () => {
  const layout = chartLayout({ type: 'box', series: [{ name: 'Tokyo', values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 40] }], words: { median: 'Middle' } })
  assert.equal(layout.points[0].text, 'Tokyo: Min 1, Q1 3.25, Middle 5.5, Q3 7.75, Max 9')
  const marks = layout.points[0].marks
  assert.deepEqual(marks.filter(mark => mark.name).map(mark => [mark.name, mark.value]), [['Max', '9'], ['Q3', '7.75'], ['Middle', '5.5'], ['Q1', '3.25'], ['Min', '1']], 'the readout lists them from the top')
  assert.deepEqual(marks.filter(mark => mark.classes.includes('chart-dot-outlier')).length, 1)
  const whiskers = marks.filter(mark => mark.classes === 'chart-whisker' && mark.y1 !== mark.y2).map(mark => [mark.y1, mark.y2])
  const box = marks.find(mark => mark.classes === 'chart-box')!
  assert.equal(whiskers.length, 2, 'a whisker on either side of the box')
  assert.equal(whiskers[0][0], box.y, 'the upper whisker begins at the box\'s top')
  assert.ok(Math.abs(parseFloat(whiskers[1][1]!) - parseFloat(box.y!) - parseFloat(box.height!)) < 0.01, 'and the lower one ends at its foot, so neither shows through the box when it steps back')
  assert.deepEqual(layout.ticks.filter(tick => tick.classes.includes('chart-tick-x')).map(tick => tick.text), ['Tokyo'])
  assert.equal(layout.legend.length, 0)
})

test('chartLayout: a heatmap\'s cell is as dark as its value in the range', () => {
  const layout = chartLayout({ type: 'heatmap', labels: ['09', '12'], series: [{ name: 'Mon', values: [0, 10] }, { name: 'Tue', values: [5, null] }] })
  assert.deepEqual(layout.points.map(point => [point.text, point.marks[0].tone]), [['Mon, 09: 0', 8], ['Mon, 12: 10', 100], ['Tue, 09: 5', 54]], 'a cell with no value is not drawn')
  assert.deepEqual([layout.points[2].marks[0].x, layout.points[2].marks[0].y, layout.points[2].marks[0].width, layout.points[2].marks[0].height], ['0%', '50%', '50%', '50%'])
  assert.deepEqual(layout.ticks.map(tick => [tick.text, tick.classes]), [['09', 'chart-tick chart-tick-x'], ['12', 'chart-tick chart-tick-x'], ['Mon', 'chart-tick chart-tick-y'], ['Tue', 'chart-tick chart-tick-y']])
  assert.deepEqual(layout.points.map(point => point.current), [false, false, false])
  const marked = chartLayout({ type: 'heatmap', labels: ['09', '12'], series: [{ name: 'Mon', values: [0, 10] }, { name: 'Tue', values: [5, null] }], current: 1 })
  assert.deepEqual(marked.points.map(point => [point.index, point.current]), [[0, false], [1, true], [2, false]], 'current marks a cell, as it marks a point in every form')
})

test('chartLayout: a funnel\'s stage narrows to the stage after it', () => {
  const layout = chartLayout({ type: 'funnel', series: [{ name: 'Visits', value: 1000 }, { name: 'Paid', value: 250 }] })
  assert.deepEqual(layout.points.map(point => point.text), ['Visits: 1,000 (100%)', 'Paid: 250 (25%)'])
  assert.equal(layout.points[0].marks[0].d, 'M0 0.7H100L62.5 49.3H37.5Z')
  assert.equal(layout.points[1].marks[0].d, 'M37.5 50.7H62.5L62.5 99.3H37.5Z', 'the last stage keeps its width')
  assert.deepEqual(layout.points.map(point => point.marks[0].tone), [100, 38])
  assert.equal(layout.radial, true)
  assert.equal(layout.tail, 11)
  const growing = chartLayout({ type: 'funnel', series: [{ name: 'Visits', value: 800 }, { name: 'Returns', value: 1000 }, { name: 'Paid', value: 200 }] })
  assert.deepEqual(growing.points.map(point => point.text), ['Visits: 800 (100%)', 'Returns: 1,000 (125%)', 'Paid: 200 (25%)'], 'what is left is counted against the first stage')
  assert.equal(growing.points[1].marks[0].d.slice(0, 9), 'M0 34.03H', 'the widest stage still fills the plot')
})

test('chartLayout: a waffle fills a hundred cells exactly', () => {
  const layout = chartLayout({ type: 'waffle', series: [{ name: 'Chrome', value: 58.4 }, { name: 'Safari', value: 24.3 }, { name: 'Other', value: 17.3 }] })
  assert.deepEqual(layout.points.map(point => point.marks.length), [59, 24, 17], 'the cell left over goes to the largest fraction')
  assert.equal(layout.classes, 'chart-plot chart-plot-radial')
  assert.deepEqual([layout.points[0].marks[0].x, layout.points[0].marks[0].y, layout.points[0].marks[0].classes], ['0%', '90%', 'chart-unit'], 'it fills from the foot')
  assert.equal(layout.points[0].marks.filter(mark => mark.name).length, 1, 'one cell carries the series for the readout')
  assert.deepEqual(layout.legend.map(key => key.value), ['58.4%', '24.3%', '17.3%'])
})

test('chartLayout: a treemap\'s tiles share the plot by their values, the largest first', () => {
  const layout = chartLayout({ type: 'treemap', series: [{ name: 'icons', value: 10 }, { name: 'react-dom', value: 60 }, { name: 'editor', value: 30 }] })
  assert.deepEqual(layout.points.map(point => point.text), ['react-dom: 60 (60%)', 'editor: 30 (30%)', 'icons: 10 (10%)'])
  const areas = layout.points.map(point => parseFloat(point.marks[0].width!) * parseFloat(point.marks[0].height!) / 100)
  assert.deepEqual(areas.map(area => Math.round(area)), [60, 30, 10])
  assert.deepEqual([layout.points[0].marks[0].x, layout.points[0].marks[0].y, layout.points[0].marks[0].height], ['0%', '0%', '100%'])
  assert.deepEqual(layout.values.map(value => value.text), ['react-dom', '60', 'editor', '30', 'icons'], 'a tile with room for one line says its name alone')
  assert.equal(layout.points[0].marks[0].category, undefined, 'tiles are a wash of ink unless a series names a category')
})

test('chartLayout: a sunburst\'s children share their part\'s sweep', () => {
  const layout = chartLayout({ type: 'sunburst', series: [{ name: 'Mobile', children: [{ name: 'iOS', value: 30 }, { name: 'Android', value: 20 }] }, { name: 'Desktop', value: 50 }] })
  assert.deepEqual(layout.points.map(point => point.text), ['Mobile: 50 (50%)', 'Mobile, iOS: 30 (30%)', 'Mobile, Android: 20 (20%)', 'Desktop: 50 (50%)'])
  assert.deepEqual(layout.points.map(point => [point.marks[0].category, point.marks[0].tone]), [['blue', undefined], ['blue', 78], ['blue', 34], ['orange', undefined]])
  assert.deepEqual(layout.center, { value: '' })
  assert.deepEqual(layout.legend.map(key => [key.name, key.value]), [['Mobile', '50%'], ['Desktop', '50%']])
  const marked = chartLayout({ type: 'sunburst', series: [{ name: 'Mobile', children: [{ name: 'iOS', value: 30 }, { name: 'Android', value: 20 }] }, { name: 'Desktop', value: 50 }], current: 2 })
  assert.deepEqual(marked.points.map(point => [point.index, point.current]), [[0, false], [1, false], [2, true], [3, false]], 'current marks a slice, a part or a child')
})

test('chartLayout: nothing to draw is still a layout, in every form', () => {
  const types = ['line', 'area', 'bar', 'scatter', 'pie', 'donut', 'rings', 'radar', 'waterfall', 'range', 'dumbbell', 'slope', 'bump', 'marimekko', 'histogram', 'box', 'heatmap', 'funnel', 'waffle', 'treemap', 'sunburst'] as const
  assert.deepEqual([...chartForms()].sort(), [...types].sort(), 'chart.js has every form')
  for (const type of types) {
    for (const config of [{ type }, { type, labels: ['a'], series: [{ name: 'A' }] }, { type, series: [{ name: 'A', values: [], value: 0, points: [], ranges: [], children: [] }] }]) {
      const layout = chartLayout(config)
      assert.doesNotMatch(JSON.stringify(layout), /NaN|Infinity|undefined%/, type)
      assert.equal(typeof chartMarkup(layout), 'string', type)
    }
  }
  assert.throws(() => chartLayout({ type: 'nothing' as never }), /No form draws a "nothing" chart/, 'a type no form draws says which module to take')
})

test('chartMarkup: every chart satisfies the contract, and words are escaped', () => {
  const index = createIndex(contracts())
  const preset = utilities('library')
  try {
    const known = (name: string) => index.classes.has(name) || preset.has(name)
    const charts = [
      { type: 'line', label: 'Latency', labels: week, series: regions },
      { type: 'area', stacked: true, label: 'Sessions', labels: week, series: regions },
      { type: 'bar', stacked: true, values: true, label: 'Tickets', labels: week, series: regions, toggle: false },
      { type: 'bar', horizontal: true, values: true, label: 'Pages', labels: week, series: [regions[0]], current: 2 },
      { type: 'donut', label: 'Storage', series: [{ name: 'Photos', value: 4 }, { name: 'Video', value: 2 }], center: { value: '6 GB', label: 'Used' } },
      { type: 'rings', label: 'Goals', series: [{ name: 'Move', value: 72 }] },
      { type: 'radar', label: 'Scores', labels: ['a', 'b', 'c'], series: regions },
      { type: 'scatter', label: 'Size against time', series: [{ name: 'API', points: [{ x: 1, y: 2 }] }, { name: 'Pages', points: [{ x: 2, y: 1 }] }] },
      { type: 'scatter', label: 'Markets', series: [{ name: 'Markets', points: [{ x: 1, y: 2, size: 3 }] }] },
      { type: 'line', label: 'Forecast', labels: week, series: [{ ...regions[0], low: regions[0].values.map(value => value - 5), high: regions[0].values.map(value => value + 5) }] },
      { type: 'area', stacked: 'stream', label: 'Listening', labels: week, series: regions },
      { type: 'bar', mark: 'lollipop', label: 'Response', labels: week, series: [regions[0]] },
      { type: 'waterfall', label: 'Cash', total: 'End', values: true, labels: week, series: [{ name: 'Cash', values: [40, 10, -20, 5, -8, 12, 3] }] },
      { type: 'range', label: 'Temperature', labels: ['a', 'b'], series: [{ name: 'Tokyo', ranges: [[1, 4], [2, 6]] }] },
      { type: 'dumbbell', label: 'Pay', labels: week, series: regions },
      { type: 'slope', label: 'Share', labels: ['2019', '2024'], series: regions },
      { type: 'bump', label: 'Rank', labels: week, series: regions },
      { type: 'marimekko', label: 'Revenue', labels: week, series: regions },
      { type: 'histogram', label: 'Response time', series: [regions[0]] },
      { type: 'box', label: 'Latency', series: regions },
      { type: 'heatmap', label: 'Activity', labels: week, series: regions },
      { type: 'funnel', label: 'Sign-up', series: [{ name: 'Visits', value: 9 }, { name: 'Paid', value: 2 }] },
      { type: 'waffle', label: 'Browsers', series: [{ name: 'Chrome', value: 6 }, { name: 'Safari', value: 4 }] },
      { type: 'treemap', label: 'Bundle', series: [{ name: 'react-dom', value: 6, category: 'blue' }, { name: 'editor', value: 4 }] },
      { type: 'sunburst', label: 'Devices', series: [{ name: 'Mobile', children: [{ name: 'iOS', value: 3 }, { name: 'Android', value: 2 }] }, { name: 'Desktop', value: 5 }] },
    ] as const
    for (const config of charts) assert.deepEqual(check(`<figure class="chart">${chartMarkup(config)}</figure>`, index, { knows: known, strict: true }), [], config.type)
  } finally { preset.dispose() }

  const markup = chartMarkup({ type: 'bar', label: 'A "quoted" <label>', labels: ['<b>'], series: [{ name: 'x & y', values: [1] }, { name: '<i>', values: [2] }] })
  assert.doesNotMatch(markup, /<b>|<i>|"quoted"/)
  assert.match(markup, /aria-label="A &quot;quoted&quot; &lt;label&gt;"/)
  assert.match(markup, /data-name="x &amp; y"/)
})

test('chartLayout: names too long to stand side by side in a phone\'s plot thin out, and short ones stay', () => {
  const minor = (layout: ReturnType<typeof chartLayout>) => layout.ticks.filter(tick => tick.classes.includes('chart-tick-minor')).map(tick => tick.text)
  const months = ['January', 'Sales', 'Refunds', 'Payroll', 'Grants', 'Rent']
  assert.deepEqual(minor(chartLayout({ type: 'waterfall', total: 'June', labels: months, series: [{ name: 'Cash', values: [420, 310, -64, -280, 90, -110] }] })), ['Sales', 'Payroll', 'Rent'], 'seven names of seven letters would meet under a phone\'s plot')
  assert.deepEqual(minor(chartLayout({ type: 'bar', labels: week, series: [regions[0]] })), [], 'seven days of three letters all stand')
  assert.deepEqual(minor(chartLayout({ type: 'bar', labels: ['Control', 'A', 'B', 'C'], series: [{ name: 'Score', values: [52, 61, 58, 70] }] })), [])
})

test('chartLayout: a histogram\'s scale counts whole readings', () => {
  const few = chartLayout({ type: 'histogram', series: [{ name: 'Readings', values: [3, 7, 12, 14, 18, 22, 26] }] })
  assert.deepEqual(few.ticks.filter(tick => tick.classes.includes('chart-tick-y')).map(tick => tick.text), ['0', '1', '2'], 'no tick at half a reading')
  const more = chartLayout({ type: 'histogram', bins: 2, series: [{ name: 'Readings', values: [1, 2, 3, 4, 5, 6, 11] }] })
  assert.ok(more.ticks.filter(tick => tick.classes.includes('chart-tick-y')).every(tick => Number.isInteger(Number(tick.text))), 'every tick is a whole count')
})

test('chartLayout: a marimekko\'s name wider than its column is held to the plot\'s edge and gives way in a narrow plot', () => {
  const layout = chartLayout({ type: 'marimekko', labels: ['Americas', 'Europe', 'Other'], series: [{ name: 'Hardware', values: [400, 200, 10] }, { name: 'Software', values: [300, 300, 10] }] })
  const names = layout.ticks.filter(tick => tick.classes.includes('chart-tick-x'))
  assert.deepEqual(names.map(tick => [tick.text, tick.classes.includes('chart-tick-end') ? tick.x : 'middle']), [['Americas', 'middle'], ['Europe', 'middle'], ['Other', '100%']])
  assert.deepEqual(names.filter(tick => tick.classes.includes('chart-tick-minor')).map(tick => tick.text), ['Other'], 'and, wider than its column, it gives way in a narrow plot')
})

test('chartLayout: a waterfall\'s missing step draws nothing and a step of nothing is not a status', () => {
  const layout = chartLayout({ type: 'waterfall', total: 'Close', values: true, labels: ['Open', 'A', 'B', 'C'], series: [{ name: 'Cash', values: [100, 40, null, 0] }] })
  assert.deepEqual(layout.points.map(point => point.text), ['Open: 100', 'A: +40 (140)', 'B', 'C: 0 (140)', 'Close: 140'], 'a missing step says only its name')
  assert.equal(layout.points[2].marks.length, 0)
  assert.equal(layout.points[3].marks[0].classes, 'chart-bar', 'a step of nothing is ink, not the success ink')
  assert.deepEqual(layout.values.map(value => value.text), ['100', '+40', '0', '140'])
  assert.equal(layout.paths[0].d.match(/M/g)?.length, 3, 'the hairline runs across the missing step')
})

test('chartLayout: a series a missing value ends early is still named', () => {
  const bump = chartLayout({ type: 'bump', labels: ['2022', '2023', '2024'], series: [{ name: 'Atlas', values: [1, 2, 3] }, { name: 'Beacon', values: [3, 2, null] }] })
  assert.deepEqual(bump.values.map(value => [value.text, value.x]), [['Atlas', '100%'], ['Beacon', '50%']])
  const slope = chartLayout({ type: 'slope', labels: ['2019', '2022', '2024'], series: [{ name: 'Chrome', values: [50, 55, 60] }, { name: 'Edge', values: [10, 12, null] }] })
  assert.deepEqual(slope.values.filter(value => value.classes.includes('chart-value-across')).map(value => [value.text, value.x]), [['12  Edge', '50%'], ['60  Chrome', '100%']])
})

test('chartLayout: a radar\'s missing value parts its outline instead of standing at the middle', () => {
  const whole = chartLayout({ type: 'radar', max: 100, labels: ['A', 'B', 'C', 'D', 'E'], series: [{ name: 'One', values: [80, 70, 50, 60, 90] }] })
  assert.match(whole.paths[1].d, /Z$/)
  const parted = chartLayout({ type: 'radar', max: 100, labels: ['A', 'B', 'C', 'D', 'E'], series: [{ name: 'One', values: [80, 70, null, 60, 90] }] })
  const d = parted.paths[1].d
  assert.doesNotMatch(d, /Z/, 'the outline is not closed across the gap')
  assert.equal(d.match(/M/g)?.length, 1, 'one run, from the spoke after the gap round to the one before it')
  assert.equal(d.split('L').length, 4, 'four of the five spokes')
  assert.doesNotMatch(d, /(^|[ML])0 0(L|$)/, 'no vertex stands at the middle')
  assert.equal(parted.points[2].marks.length, 0)
})

function setup(options: Parameters<typeof chart>[1] = { type: 'line', label: 'Latency', labels: week, series: regions }) {
  const page = dom('<figure class="chart"></figure>')
  const root = page.one<HTMLElement>('.chart')
  const handle = chart(root, options)
  return { ...page, root, handle }
}

test('chart: given series, it writes the plot, the readout and the legend into the root', () => {
  const { root, one, all, errors } = setup()
  assert.equal(one('.chart-plot').getAttribute('role'), 'list')
  assert.equal(one('.chart-plot').getAttribute('aria-label'), 'Latency')
  assert.equal(all('.chart-point').length, 7)
  assert.equal(all('.chart-line').length, 2)
  assert.equal(one('.chart-tip').hidden, true)
  assert.equal(all('.chart-key-input').length, 2)
  assert.equal(root.querySelector('.chart-body')!.getAttribute('style'), '--chart-gutter: 3; --chart-tail: 0;')
  assert.deepEqual(all('.chart-point').map((point: Element) => point.getAttribute('tabindex')), ['0', '-1', '-1', '-1', '-1', '-1', '-1'], 'one point is a stop in the tab order')
  assert.deepEqual(errors, [])
})

test('chart: a point under the pointer shows its readout, filled from its marks, and leaving hides it', () => {
  const { one, all, pointer, errors } = setup()
  const points = all('.chart-point')
  pointer(points[3].querySelector('.chart-hit'), 'pointerover')
  const tip = one<HTMLElement>('.chart-tip')
  assert.equal(tip.hidden, false)
  assert.equal(one('.chart-tip-title').textContent, 'Thu')
  assert.deepEqual(all('.chart-tip-row').map((row: Element) => [row.className, row.querySelector('.chart-tip-name')!.textContent, row.querySelector('.chart-tip-value')!.textContent]), [
    ['chart-tip-row category-blue', 'Tokyo', '71'],
    ['chart-tip-row category-orange', 'Osaka', '49'],
  ])
  assert.equal(tip.style.getPropertyValue('--chart-x'), '0.5', 'the readout stands where the point says')
  assert.equal(tip.style.getPropertyValue('--chart-y'), '0.29')
  pointer(points[4].querySelector('.chart-hit'), 'pointerover')
  assert.equal(one('.chart-tip-title').textContent, 'Fri')
  pointer(points[4].querySelector('.chart-hit'), 'pointerout')
  assert.equal(tip.hidden, true)
  assert.deepEqual(errors, [])
})

test('chart: the arrow keys, Home and End move between points, and Escape hides the readout', () => {
  const { one, all, key, document, errors } = setup()
  const points = all<HTMLElement>('.chart-point')
  points[0].focus()
  assert.equal(one<HTMLElement>('.chart-tip').hidden, false, 'a point with the focus shows its readout')
  assert.equal(key(points[0], 'ArrowRight'), true)
  assert.equal(document.activeElement, points[1])
  assert.equal(one('.chart-tip-title').textContent, 'Tue')
  assert.deepEqual([points[0].getAttribute('tabindex'), points[1].getAttribute('tabindex')], ['-1', '0'], 'the stop moves with the focus')
  key(points[1], 'ArrowDown')
  assert.equal(document.activeElement, points[2])
  key(points[2], 'ArrowLeft')
  key(points[1], 'ArrowUp')
  assert.equal(document.activeElement, points[0])
  assert.equal(key(points[0], 'ArrowLeft'), true, 'the key is handled at the end, and the focus stays')
  assert.equal(document.activeElement, points[0])
  key(points[0], 'End')
  assert.equal(document.activeElement, points[6])
  key(points[6], 'ArrowRight')
  assert.equal(document.activeElement, points[6])
  key(points[6], 'Home')
  assert.equal(document.activeElement, points[0])
  assert.equal(key(points[0], 'Escape'), true)
  assert.equal(one<HTMLElement>('.chart-tip').hidden, true)
  assert.equal(document.activeElement, points[0], 'Escape keeps the focus')
  assert.equal(key(points[0], 'a'), false, 'another key is left alone')
  assert.deepEqual(errors, [])
})

test('chart: in a heatmap the up and down keys go to the cell above or below', () => {
  const { all, key, document, errors } = setup({ type: 'heatmap', label: 'Commits', labels: ['09', '12', '15'], series: [{ name: 'Mon', values: [1, 2, 3] }, { name: 'Tue', values: [4, null, 6] }, { name: 'Wed', values: [7, 8, 9] }] })
  const points = all<HTMLElement>('.chart-point')
  assert.equal(points.length, 8)
  points[1].focus()
  key(points[1], 'ArrowDown')
  assert.equal(points.indexOf(document.activeElement as HTMLElement), 6, 'a missing cell is passed over to the next in the column')
  assert.equal(points[6].getAttribute('aria-label'), 'Wed, 12: 8')
  key(points[6], 'ArrowUp')
  assert.equal(document.activeElement, points[1])
  assert.equal(key(points[1], 'ArrowUp'), true, 'the key is handled at the top, and the focus stays')
  assert.equal(document.activeElement, points[1])
  key(points[1], 'ArrowRight')
  assert.equal(document.activeElement, points[2], 'across, the arrows still go cell by cell')
  assert.deepEqual(errors, [])
})

test('chart: a legend\'s checkbox hides its series and the chart is written again; the value is the hidden names', () => {
  const { root, all, handle, errors } = setup()
  const heard: string[] = []
  root.addEventListener('change', () => heard.push(handle.value.join()))
  const boxes = all<HTMLInputElement>('.chart-key-input')
  assert.deepEqual(handle.value, [])
  boxes[0].checked = false
  boxes[0].dispatchEvent(new Event('change', { bubbles: true }))
  assert.deepEqual(handle.value, ['Tokyo'])
  assert.deepEqual(heard, ['Tokyo'], 'the checkbox\'s own change says it')
  assert.equal(all('.chart-line').length, 1)
  assert.equal(all('.chart-line')[0].getAttribute('class'), 'chart-line category-orange', 'the series that stays keeps its color')
  assert.equal(all('.chart-key-input')[0], boxes[0], 'the legend is kept, so the checkbox keeps the focus')
  assert.equal(all('.chart-point')[0].getAttribute('aria-label'), 'Mon: 30')

  handle.value = ['Osaka']
  assert.deepEqual(all<HTMLInputElement>('.chart-key-input').map(box => box.checked), [true, false], 'a value set from outside checks the boxes')
  assert.equal(all('.chart-line')[0].getAttribute('class'), 'chart-line category-blue')
  assert.deepEqual(heard, ['Tokyo'], 'and says nothing')
  assert.deepEqual(errors, [])
})

test('chart: with draw it writes nothing and hands over the hidden names', () => {
  const page = dom(`<figure class="chart">${chartMarkup({ type: 'line', labels: week, series: regions })}</figure>`)
  const root = page.one<HTMLElement>('.chart')
  const before = page.one('.chart-plot').innerHTML
  const drawn: string[][] = []
  const handle = chart(root, { draw: hidden => drawn.push(hidden) })
  assert.deepEqual(drawn, [], 'nothing is asked for while nothing changed')
  const box = page.all<HTMLInputElement>('.chart-key-input')[1]
  box.checked = false
  box.dispatchEvent(new Event('change', { bubbles: true }))
  assert.deepEqual(drawn, [['Osaka']])
  assert.equal(page.one('.chart-plot').innerHTML.replace(/ tabindex="-?\d"/g, ''), before, 'the plot is the renderer\'s to write')
  handle.value = []
  assert.deepEqual(drawn, [['Osaka'], []])
  assert.equal(box.checked, true)
  assert.deepEqual(page.errors, [])
})

test('chart: when a renderer writes the points again, one is still a stop and an open readout says what its point says now', async () => {
  const config = { type: 'pie' as const, label: 'Browsers', series: [{ name: 'Chrome', value: 58 }, { name: 'Safari', value: 24 }, { name: 'Firefox', value: 9 }] }
  const page = dom(`<figure class="chart">${chartMarkup(config)}</figure>`)
  const root = page.one<HTMLElement>('.chart')
  const settle = () => new Promise(resolve => setTimeout(resolve, 0))
  chart(root, { draw: (hidden) => { page.one('.chart-body').outerHTML = chartMarkup({ ...config, hidden }).replace(/<div class="chart-legend"[\s\S]*$/, '') } })
  const last = page.all<HTMLElement>('.chart-point')[2]
  page.key(page.all('.chart-point')[0], 'End')
  assert.equal(last.getAttribute('tabindex'), '0')
  const box = page.all<HTMLInputElement>('.chart-key-input')[2]
  box.checked = false
  box.dispatchEvent(new Event('change', { bubbles: true }))
  await settle()
  assert.deepEqual(page.all('.chart-point').map((point: Element) => point.getAttribute('tabindex')), ['0', '-1'], 'the stop went with its point, and the first takes it')

  page.pointer(page.all('.chart-point')[0], 'pointerover')
  assert.equal(page.one('.chart-tip-value').textContent, '58')
  page.all('.chart-point')[0].querySelector('.chart-slice')!.setAttribute('data-value', '61')
  await settle()
  assert.equal(page.one('.chart-tip-value').textContent, '61', 'the readout follows what the renderer wrote')
  assert.deepEqual(page.errors, [])
})

test('chart: a chart the page wrote is worked as it is, and detach removes the listeners', () => {
  const page = dom(`<figure class="chart">${chartMarkup({ type: 'donut', series: [{ name: 'Photos', value: 4, category: 'violet' }, { name: 'Video', value: 2 }], toggle: false })}</figure>`)
  const root = page.one<HTMLElement>('.chart')
  const detach = chart(root)
  const slice = page.one('.chart-slice')
  page.pointer(slice, 'pointerover')
  assert.equal(page.one<HTMLElement>('.chart-tip').hidden, false)
  assert.equal(page.all('.chart-tip-title').length, 0, 'a slice has no name over its row')
  assert.equal(page.one('.chart-tip-row').className, 'chart-tip-row category-violet')
  assert.equal(page.one('.chart-tip-value').textContent, '4')
  detach()
  assert.equal(page.one<HTMLElement>('.chart-tip').hidden, true)
  page.pointer(slice, 'pointerover')
  assert.equal(page.one<HTMLElement>('.chart-tip').hidden, true)
  assert.deepEqual(page.errors, [])
})

test('chart: attaching again replaces the first, and new series are written with a new legend', () => {
  const { root, all, errors } = setup()
  chart(root, { type: 'bar', labels: ['a', 'b'], series: [{ name: 'North', values: [1, 2] }, { name: 'South', values: [2, 1] }, { name: 'West', values: [3, 3] }] })
  assert.equal(all('.chart-point').length, 2)
  assert.deepEqual(all<HTMLInputElement>('.chart-key-input').map(box => box.value), ['North', 'South', 'West'])
  assert.equal(all('.chart-legend').length, 1)
  chart(root)
  const box = all<HTMLInputElement>('.chart-key-input')[2]
  box.checked = false
  box.dispatchEvent(new Event('change', { bubbles: true }))
  assert.equal(all('.chart-bar').length, 4, 'found again with no series, as attach() finds it, it keeps the ones it has')
  chart(root, { type: 'bar', labels: ['a'], series: [{ name: 'North', values: [1] }] })
  assert.equal(all('.chart-legend').length, 0, 'one series needs no legend')
  assert.deepEqual(errors, [])
})

test('chart: a point is written only when its place in the tab order changes, and detach gives the page its tabindex back', async () => {
  const page = dom(`<figure class="chart">${chartMarkup({ type: 'bar', labels: ['a', 'b', 'c'], series: [{ name: 'Sales', values: [1, 2, 3] }] })}</figure>`)
  const root = page.one<HTMLElement>('.chart')
  const points = page.all<HTMLElement>('.chart-point')
  points[1].setAttribute('tabindex', '0')
  const detach = chart(root)
  assert.deepEqual(points.map(point => point.getAttribute('tabindex')), ['-1', '0', '-1'], 'the stop the page gave stays')
  const writes: string[] = []
  new MutationObserver(records => records.forEach(record => writes.push(record.attributeName!))).observe(root, { attributes: true, subtree: true, attributeFilter: ['tabindex'] })
  points[0].setAttribute('data-label', 'A')
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.deepEqual(writes, [], 'a renderer\'s change that moves no stop writes no tabindex')
  detach()
  assert.deepEqual(points.map(point => point.getAttribute('tabindex')), [null, '0', null], 'each point is as the page wrote it')
  assert.deepEqual(page.errors, [])
})
