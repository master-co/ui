import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { chart, chartLayout, chartMarkup } from '../../behaviors/chart.js'
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

test('chartLayout: nothing to draw is still a layout', () => {
  for (const type of ['line', 'area', 'bar', 'pie', 'donut', 'rings', 'radar', 'scatter'] as const) {
    const layout = chartLayout({ type })
    assert.equal(layout.points.length, type === 'radar' ? 3 : 0, type)
    assert.doesNotMatch(JSON.stringify(layout), /NaN|Infinity|undefined%/, type)
  }
  assert.equal(chartLayout({ type: 'nothing' as never }).type, 'bar')
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
    ] as const
    for (const config of charts) assert.deepEqual(check(`<figure class="chart">${chartMarkup(config)}</figure>`, index, { knows: known, strict: true }), [], config.type)
  } finally { preset.dispose() }

  const markup = chartMarkup({ type: 'bar', label: 'A "quoted" <label>', labels: ['<b>'], series: [{ name: 'x & y', values: [1] }, { name: '<i>', values: [2] }] })
  assert.doesNotMatch(markup, /<b>|<i>|"quoted"/)
  assert.match(markup, /aria-label="A &quot;quoted&quot; &lt;label&gt;"/)
  assert.match(markup, /data-name="x &amp; y"/)
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
