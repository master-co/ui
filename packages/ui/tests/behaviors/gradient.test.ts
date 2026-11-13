import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { gradient, gradientCss, gradientStops, gradientValue } from '../../behaviors/gradient.js'

const markup = `<div class="gradient">
  <div class="gradient-preview" aria-hidden="true"></div>
  <div class="gradient-bar"></div>
  <div class="gradient-fields">
    <div class="gradient-offset">
      <input type="range" class="slider" min="0" max="100" step="1" aria-label="Position">
      <input type="number" class="input input-sm" min="0" max="100" step="1" aria-label="Position in percent">
    </div>
    <fieldset class="gradient-type">
      <legend>Type</legend>
      <div class="segmented segmented-sm" role="radiogroup" aria-label="Type">
        <label class="segmented-item"><input type="radio" class="segmented-input" name="type" value="linear">Linear</label>
        <label class="segmented-item"><input type="radio" class="segmented-input" name="type" value="radial">Radial</label>
        <label class="segmented-item"><input type="radio" class="segmented-input" name="type" value="conic">Conic</label>
      </div>
    </fieldset>
    <div class="gradient-center">
      <input type="number" class="input input-sm" min="0" max="100" aria-label="Center X">
      <input type="number" class="input input-sm" min="0" max="100" aria-label="Center Y">
    </div>
    <button type="button" class="btn btn-sm gradient-add">Add</button>
    <button type="button" class="btn btn-sm gradient-remove">Remove</button>
    <button type="button" class="btn btn-sm gradient-reverse">Reverse</button>
  </div>
  <pre class="gradient-css"></pre>
</div>`

const value = { type: 'linear' as const, angle: 90, center: [50, 50] as [number, number], stops: [{ id: 'a', offset: 0, color: '#ff0000' }, { id: 'b', offset: 100, color: '#0000ff' }] }

function setup(options = {}) {
  const page = dom(markup)
  const heard: string[] = []
  for (const type of ['input', 'change']) page.document.body.addEventListener(type, (event) => { if (event.target === page.one('.gradient')) heard.push(type) })
  const handle = gradient(page.one('.gradient'), { value, ...options })
  const stops = () => page.all<HTMLElement>('.gradient-stop')
  const stop = (id: string) => page.one<HTMLElement>(`.gradient-stop[data-id="${id}"]`)
  return { ...page, handle, heard, stops, stop }
}

test('gradientCss: the stops in order, interpolated in OKLab, with a fallback, for each type', () => {
  assert.equal(gradientCss(value).css, 'linear-gradient(in oklab 90deg, #ff0000 0%, #0000ff 100%)')
  assert.equal(gradientCss(value).fallback, 'linear-gradient(90deg, #ff0000 0%, #0000ff 100%)')
  assert.equal(gradientCss({ ...value, type: 'radial', center: [30, 70] }).fallback, 'radial-gradient(circle at 30% 70%, #ff0000 0%, #0000ff 100%)')
  assert.equal(gradientCss({ ...value, type: 'conic', angle: 45 }).css, 'conic-gradient(in oklab from 45deg at 50% 50%, #ff0000 0%, #0000ff 100%)')
  assert.match(gradientCss(value).text, /^background-image: linear-gradient\(90deg[^\n]*\nbackground-image: linear-gradient\(in oklab 90deg/)
})

test('gradientValue: at least two stops, numbers in range, colors as sRGB, and a known type', () => {
  const settled = gradientValue({ type: 'spiral' as any, angle: -90, center: [150, -3], stops: [{ id: 'x', offset: 140, color: 'rgb(255 0 0 / 50%)' }] })
  assert.equal(settled.type, 'linear')
  assert.equal(settled.angle, 270)
  assert.deepEqual(settled.center, [100, 0])
  assert.equal(settled.stops.length, 2)
  assert.equal(settled.stops[0].offset, 100)
  assert.equal(settled.stops[0].color, '#ff000080')
})

test('gradientStops: two stops at one offset keep their order, for a hard edge', () => {
  const stops = [{ id: 'a', offset: 50, color: '#000' }, { id: 'b', offset: 0, color: '#fff' }, { id: 'c', offset: 50, color: '#f00' }]
  assert.deepEqual(gradientStops(stops).map(stop => stop.id), ['b', 'a', 'c'])
})

test('gradient: writes a handle for each stop, marks the one in hand and paints the gradient', () => {
  const { one, stops, stop } = setup()
  assert.equal(stops().length, 2)
  assert.equal(stop('a').getAttribute('aria-current'), 'true')
  assert.equal(stop('a').getAttribute('tabindex'), '0')
  assert.equal(stop('b').getAttribute('tabindex'), '-1')
  assert.equal(stop('b').getAttribute('aria-valuenow'), '100')
  assert.equal(stop('b').style.getPropertyValue('--gradient-offset'), '100')
  assert.match(one<HTMLElement>('.gradient').style.getPropertyValue('--gradient'), /in oklab/)
  assert.match(one('.gradient-css').textContent!, /background-image/)
  assert.equal(one<HTMLButtonElement>('.gradient-remove').disabled, true, 'two stops are the least')
})

test('gradient: keys move a stop past another, which keeps its id and its focus, and say change once', () => {
  const { handle, stop, key, heard, document } = setup()
  stop('a').focus()
  key(stop('a'), 'End')
  assert.deepEqual(handle.value.stops.map(each => [each.id, each.offset]), [['a', 100], ['b', 100]])
  key(stop('a'), 'ArrowRight')
  assert.equal(handle.value.stops[0].offset, 100, 'not past 100')
  key(stop('b'), 'Home')
  assert.equal(document.activeElement, stop('a'), 'focus stays where it was')
  assert.deepEqual(heard, ['input', 'change', 'input', 'change'])
})

test('gradient: add takes the color of the stop in hand ten points on; remove hands focus to a neighbor', () => {
  const { handle, click, one, stops, document } = setup()
  click(one('.gradient-add'))
  assert.equal(stops().length, 3)
  const added = handle.value.stops[2]
  assert.deepEqual([added.offset, added.color], [10, '#ff0000'])
  assert.equal(document.activeElement?.getAttribute('data-id'), added.id)
  click(one('.gradient-remove'))
  assert.equal(stops().length, 2)
  assert.equal(document.activeElement?.getAttribute('data-id'), 'b', 'the next stop on the bar')
})

test('gradient: Delete removes a stop only while there are more than two', () => {
  const { handle, key, stop } = setup()
  key(stop('a'), 'Delete')
  assert.equal(handle.value.stops.length, 2)
})

test('gradient: reverse turns the stops round; the controls set type, offset and centre', () => {
  const { handle, click, one, all, type } = setup()
  click(one('.gradient-reverse'))
  assert.deepEqual(handle.value.stops.map(stop => [stop.id, stop.offset]), [['b', 0], ['a', 100]])
  const radial = all<HTMLInputElement>('.gradient-type input')[1]
  radial.checked = true
  radial.dispatchEvent(new Event('change', { bubbles: true }))
  assert.equal(handle.value.type, 'radial')
  type(one<HTMLInputElement>('.gradient-offset input[type="number"]'), '40')
  assert.equal(handle.value.stops.find(stop => stop.id === 'a')!.offset, 40)
  type(all<HTMLInputElement>('.gradient-center input')[1], '25')
  assert.deepEqual(handle.value.center, [50, 25])
  handle.value = { ...handle.value, type: 'linear' }
  assert.equal(all<HTMLInputElement>('.gradient-center input')[0].disabled, true, 'a linear gradient has no centre')
})

test('gradient: a value set from outside is shown and says nothing; read-only moves nothing', () => {
  const { handle, heard, one, key, stop, stops } = setup()
  handle.value = { ...value, stops: [...value.stops, { id: 'c', offset: 50, color: '#00ff00' }] }
  assert.equal(stops().length, 3)
  assert.deepEqual(heard, [])
  one('.gradient').setAttribute('aria-readonly', 'true')
  key(stop('c'), 'Home')
  assert.equal(handle.value.stops[2].offset, 50)
})

test('gradient: detach removes the listeners, and attaching twice is safe', () => {
  const page = setup()
  const again = gradient(page.one('.gradient'), { value })
  again()
  page.key(page.stop('a'), 'End')
  assert.equal(page.handle.value.stops[0].offset, 0)
  assert.deepEqual(page.errors, [])
})

test('gradient: the color picker of the stop in hand shows its color and changes it', () => {
  const page = dom(markup.replace('<div class="gradient-fields">', `<div class="gradient-fields">
    <div class="gradient-color">
      <div class="color-picker">
        <div class="color-picker-area"><div class="color-picker-thumb" role="slider" tabindex="0" aria-label="Lightness and chroma"></div></div>
        <input type="range" class="slider color-picker-hue" min="0" max="360" aria-label="Hue">
        <input type="range" class="slider color-picker-alpha" min="0" max="100" aria-label="Opacity">
        <div class="color-picker-fields"><input class="input input-sm color-picker-text" aria-label="Color"></div>
      </div>
    </div>`))
  const handle = gradient(page.one('.gradient'), { value })
  const text = page.one<HTMLInputElement>('.color-picker-text')
  assert.equal(text.value, '#ff0000', 'the picker shows the stop in hand')
  page.type(text, '#00ff00')
  text.dispatchEvent(new page.window.Event('change', { bubbles: true }))
  assert.equal(handle.value.stops[0].color, '#00ff00')
  page.key(page.one('.gradient-stop[data-id="b"]'), 'ArrowLeft')
  page.one<HTMLElement>('.gradient-stop[data-id="b"]').focus()
  assert.equal(text.value, '#0000ff', 'taking another stop in hand shows its color')
  assert.deepEqual(page.errors, [])
})
