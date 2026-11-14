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

test('gradient: a press on a handle takes it in hand and says change only when a drag moved it', () => {
  const { stop, pointer, heard, handle } = setup()
  pointer(stop('b'), 'pointerdown', { button: 0, pointerId: 1 })
  pointer(stop('b'), 'pointerup', { button: 0, pointerId: 1 })
  assert.equal(stop('b').getAttribute('aria-current'), 'true')
  assert.deepEqual(heard, [], 'a press that moves nothing changes nothing')
  pointer(stop('b'), 'pointerdown', { button: 0, pointerId: 2 })
  pointer(stop('b'), 'pointermove', { pointerId: 2, clientX: 0 })
  pointer(stop('b'), 'pointerup', { pointerId: 2 })
  assert.equal(handle.value.stops[1].offset, 0)
  assert.deepEqual(heard, ['input', 'change'])
})

test('gradient: painting again leaves the attributes of a handle that did not change alone', () => {
  const { stop, key, window } = setup()
  const observer = new window.MutationObserver(() => {})
  observer.observe(stop('b'), { attributes: true })
  stop('a').focus()
  key(stop('a'), 'ArrowRight')
  assert.deepEqual(observer.takeRecords().map((record: any) => record.attributeName), [], 'the stop that stood still is not written')
  observer.disconnect()
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

test('gradient: the stop add writes is in hand when the gradient says it changed; a locked gradient adds none', () => {
  const { click, one, stop, document } = setup()
  const root = one<HTMLElement>('.gradient')
  const inHand: (string | null)[] = []
  root.addEventListener('change', () => inHand.push(document.querySelector('.gradient-stop[aria-current="true"]')!.getAttribute('data-id')))
  click(one('.gradient-add'))
  assert.deepEqual(inHand, ['stop-3'])
  root.setAttribute('aria-readonly', 'true')
  click(one('.gradient-add'))
  assert.equal(stop('stop-3').getAttribute('aria-current'), 'true', 'the stop in hand stays in hand')
  assert.equal(document.querySelectorAll('.gradient-stop').length, 3)
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

test('gradient: a control that says input as it moves and change at the end has the gradient say both', () => {
  const { one, heard } = setup()
  const number = one<HTMLInputElement>('.gradient-offset input[type="number"]')
  number.value = '30'
  number.dispatchEvent(new Event('input', { bubbles: true }))
  assert.deepEqual(heard, ['input'])
  number.dispatchEvent(new Event('change', { bubbles: true }))
  assert.deepEqual(heard, ['input', 'change'], 'the change that brings nothing new still ends the moves')
  number.dispatchEvent(new Event('change', { bubbles: true }))
  assert.deepEqual(heard, ['input', 'change'], 'a change with no move before it says nothing')
})

test('gradient: add gives the new stop an id no stop has, though a value given from outside used the next number', () => {
  const page = dom(markup)
  const handle = gradient(page.one('.gradient'), { value: { ...value, stops: [{ id: 'stop-3', offset: 0, color: '#ff0000' }, { id: 'b', offset: 100, color: '#0000ff' }] } })
  page.click(page.one('.gradient-add'))
  const ids = handle.value.stops.map(stop => stop.id)
  assert.equal(new Set(ids).size, 3, `every stop keeps an id of its own: ${ids}`)
  assert.equal(page.all('.gradient-stop').length, 3)
})

test('gradient: a drag reads the bar once as it begins, holds off a second finger and focuses without scrolling', () => {
  const { stop, pointer, one, handle, heard } = setup()
  const bar = one<HTMLElement>('.gradient-bar')
  let reads = 0
  bar.getBoundingClientRect = () => { reads++; return { left: 0, top: 0, width: 200, height: 20, right: 200, bottom: 20, x: 0, y: 0 } as DOMRect }
  const focused: unknown[] = []
  const original = stop('b').focus.bind(stop('b'))
  stop('b').focus = (options?: FocusOptions) => { focused.push(options); original(options) }
  pointer(stop('b'), 'pointerdown', { button: 0, pointerId: 1, isPrimary: true })
  assert.deepEqual(focused, [{ preventScroll: true }])
  pointer(stop('b'), 'pointermove', { pointerId: 1, clientX: 100 })
  pointer(stop('b'), 'pointermove', { pointerId: 1, clientX: 120 })
  assert.equal(reads, 1, 'the box is read once, not at every move')
  pointer(stop('a'), 'pointerdown', { button: 0, pointerId: 2, isPrimary: false })
  pointer(stop('a'), 'pointermove', { pointerId: 2, clientX: 180 })
  assert.equal(handle.value.stops.find(each => each.id === 'b')!.offset, 60, 'the second finger takes nothing')
  assert.equal(stop('b').getAttribute('aria-current'), 'true')
  pointer(stop('b'), 'lostpointercapture', { pointerId: 1 })
  assert.deepEqual(heard.slice(-1), ['change'], 'a lost capture ends the drag')
  pointer(stop('b'), 'pointermove', { pointerId: 1, clientX: 10 })
  assert.equal(handle.value.stops.find(each => each.id === 'b')!.offset, 60)
})

test('gradient: a move of a stop leaves the controls it does not change alone', () => {
  const { stop, key, one, window } = setup()
  const observer = new window.MutationObserver(() => {})
  observer.observe(one('.gradient-fields'), { attributes: true, subtree: true })
  stop('a').focus()
  key(stop('a'), 'ArrowRight')
  assert.deepEqual(observer.takeRecords().map((record: any) => `${record.target.className}:${record.attributeName}`), [], 'no control is written again')
  observer.disconnect()
})
