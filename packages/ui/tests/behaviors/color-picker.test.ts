import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { colorPicker, colorPickerState } from '../../behaviors/color-picker.js'

/**
 * The color picker holds one color in OKLCH and publishes it as four numbers on the root, the thumb's
 * aria values, the two native sliders and the text in the format chosen. happy-dom has no layout, so a test
 * gives the field the box a press is measured against: 370 by 200, at 100 from the left and 50 from the top,
 * so a pixel across is .001 of chroma and a pixel down is half a percent of lightness.
 */
const markup = ({ value = 'oklch(62% 0.19 260)', format = 'oklch', thumb = '', alpha = true, root = '' } = {}) => `<div class="color-picker" style="${root}">
  <div class="color-picker-area">
    <div class="color-picker-thumb" role="slider" tabindex="0" aria-label="Lightness and chroma" ${thumb}></div>
  </div>
  <span class="swatch swatch-lg color-picker-swatch"></span>
  <input type="range" class="slider color-picker-hue" min="0" max="360" step="any" aria-label="Hue">
  ${alpha ? '<input type="range" class="slider color-picker-alpha" min="0" max="100" step="any" aria-label="Opacity">' : ''}
  <div class="color-picker-fields">
    <select class="select select-sm color-picker-format" aria-label="Format">
      <option value="hex"${format === 'hex' ? ' selected' : ''}>Hex</option>
      <option value="rgb"${format === 'rgb' ? ' selected' : ''}>RGB</option>
      <option value="oklch"${format === 'oklch' ? ' selected' : ''}>OKLCH</option>
    </select>
    <input class="input input-sm color-picker-text" name="accent" value="${value}" aria-label="Accent color">
  </div>
</div>`

function setup(options: Parameters<typeof markup>[0] = {}) {
  const page = dom(markup(options))
  const root = page.one<HTMLElement>('.color-picker')
  const area = page.one<HTMLElement>('.color-picker-area')
  const thumb = page.one<HTMLElement>('.color-picker-thumb')
  const hue = page.one<HTMLInputElement>('.color-picker-hue')
  const alpha = page.all<HTMLInputElement>('.color-picker-alpha')[0]
  const text = page.one<HTMLInputElement>('.color-picker-text')
  const format = page.one<HTMLSelectElement>('.color-picker-format')
  area.getBoundingClientRect = () => ({ left: 100, top: 50, right: 470, bottom: 250, width: 370, height: 200, x: 100, y: 50 }) as DOMRect
  const captured: number[] = []
  area.setPointerCapture = (id: number) => { captured.push(id) }
  const heard: string[] = []
  root.addEventListener('input', (event: any) => heard.push(`input:${event.target.className.split(' ').at(-1)}`))
  root.addEventListener('change', (event: any) => heard.push(`change:${event.target.className.split(' ').at(-1)}`))
  const number = (name: string) => Number(root.style.getPropertyValue(`--color-picker-${name}`))
  const channels = () => ({ l: number('lightness'), c: number('chroma'), h: number('hue'), a: number('alpha') })
  /** Change a native control the way the reader does: its value, then the events it sends. */
  const set = (control: HTMLInputElement | HTMLSelectElement, value: string, commit = true) => {
    control.value = value
    control.dispatchEvent(new page.window.Event('input', { bubbles: true }) as unknown as Event)
    if (commit) control.dispatchEvent(new page.window.Event('change', { bubbles: true }) as unknown as Event)
  }
  return { ...page, root, area, thumb, hue, alpha, text, format, captured, heard, channels, set }
}

test('color picker: attaching publishes the color the text holds, and says nothing', () => {
  const { root, thumb, hue, alpha, text, format, channels, heard, errors } = setup()
  const picker = colorPicker(root)
  assert.deepEqual(channels(), { l: 0.62, c: 0.19, h: 260, a: 1 })
  assert.equal(thumb.getAttribute('aria-valuenow'), '62')
  assert.equal(thumb.getAttribute('aria-valuemin'), '0')
  assert.equal(thumb.getAttribute('aria-valuemax'), '100')
  assert.equal(thumb.getAttribute('aria-valuetext'), 'Lightness 62%, chroma 0.19')
  assert.equal(hue.value, '260')
  assert.equal(alpha.value, '100')
  assert.equal(text.value, 'oklch(62% 0.19 260)')
  assert.equal(format.value, 'oklch')
  assert.equal(picker.value, 'oklch(62% 0.19 260)')
  assert.deepEqual(heard, [])
  assert.deepEqual(errors, [])
})

test('color picker: the format is the one the value is written in, and hex is written back exactly', () => {
  const { root, text, format, channels } = setup({ value: '#3B82F6', format: 'oklch' })
  const picker = colorPicker(root)
  assert.equal(format.value, 'hex', 'the select follows the value')
  assert.equal(text.value, '#3b82f6')
  assert.equal(picker.value, '#3b82f6')
  const { l, c, h } = channels()
  assert.ok(Math.abs(l - 0.6231) < 0.001 && Math.abs(c - 0.188) < 0.001 && Math.abs(h - 259.81) < 0.1, JSON.stringify(channels()))
})

test('color picker: ArrowUp and ArrowDown make the color lighter and darker by 1%', () => {
  const { root, thumb, key, channels, heard } = setup()
  colorPicker(root)
  assert.equal(key(thumb, 'ArrowUp'), true, 'a key the behavior handles is prevented')
  assert.equal(channels().l, 0.63)
  assert.equal(thumb.getAttribute('aria-valuenow'), '63')
  assert.deepEqual(heard, ['input:color-picker-thumb', 'change:color-picker-thumb'])
  assert.equal(key(thumb, 'ArrowDown'), true)
  assert.equal(key(thumb, 'ArrowDown'), true)
  assert.equal(channels().l, 0.61)
})

test('color picker: ArrowRight adds .005 of chroma and ArrowLeft takes it away', () => {
  const { root, thumb, key, channels, text } = setup()
  colorPicker(root)
  assert.equal(key(thumb, 'ArrowRight'), true)
  assert.equal(channels().c, 0.195)
  assert.equal(text.value, 'oklch(62% 0.195 260)', 'the text follows')
  assert.equal(key(thumb, 'ArrowLeft'), true)
  assert.equal(key(thumb, 'ArrowLeft'), true)
  assert.equal(channels().c, 0.185)
  assert.equal(thumb.getAttribute('aria-valuetext'), 'Lightness 62%, chroma 0.185')
})

test('color picker: right to left, ArrowLeft adds chroma, toward the end of the line', () => {
  const { root, thumb, key, channels } = setup({ root: 'direction: rtl' })
  colorPicker(root)
  assert.equal(key(thumb, 'ArrowLeft'), true)
  assert.equal(channels().c, 0.195)
  assert.equal(key(thumb, 'ArrowRight'), true)
  assert.equal(key(thumb, 'ArrowRight'), true)
  assert.equal(channels().c, 0.185)
})

test('color picker: Shift makes an arrow\'s step ten times larger', () => {
  const { root, thumb, key, channels } = setup()
  colorPicker(root)
  assert.equal(key(thumb, 'ArrowUp', { shiftKey: true }), true)
  assert.equal(channels().l, 0.72)
  assert.equal(key(thumb, 'ArrowRight', { shiftKey: true }), true)
  assert.equal(channels().c, 0.24)
})

test('color picker: PageUp and PageDown move the lightness by 10%, and stop at its ends', () => {
  const { root, thumb, key, channels, heard } = setup()
  colorPicker(root)
  assert.equal(key(thumb, 'PageUp'), true)
  assert.equal(channels().l, 0.72)
  for (let press = 0; press < 5; press++) key(thumb, 'PageUp')
  assert.equal(channels().l, 1)
  heard.length = 0
  assert.equal(key(thumb, 'PageUp'), true, 'a key at the end is still the field\'s, so the page does not scroll')
  assert.deepEqual(heard, [], 'and says nothing, since nothing changed')
  assert.equal(key(thumb, 'PageDown'), true)
  assert.equal(channels().l, 0.9)
})

test('color picker: Home takes the chroma to none and End to the end of the field', () => {
  const { root, thumb, key, channels, text } = setup()
  colorPicker(root)
  assert.equal(key(thumb, 'Home'), true)
  assert.equal(channels().c, 0)
  assert.equal(channels().h, 260, 'a grey keeps its hue')
  assert.equal(text.value, 'oklch(62% 0 260)')
  assert.equal(key(thumb, 'End'), true)
  assert.equal(channels().c, 0.37)
})

test('color picker: keys it does not handle, and keys with a modifier, are left alone', () => {
  const { root, thumb, key, channels, heard } = setup()
  colorPicker(root)
  assert.equal(key(thumb, 'Enter'), false)
  assert.equal(key(thumb, 'a'), false)
  assert.equal(key(thumb, 'ArrowUp', { metaKey: true }), false)
  assert.equal(key(thumb, 'ArrowUp', { altKey: true }), false)
  assert.deepEqual(channels(), { l: 0.62, c: 0.19, h: 260, a: 1 })
  assert.deepEqual(heard, [])
})

test('color picker: a press on the field moves the thumb under the pointer, a drag follows, a release says change', () => {
  const { root, area, thumb, pointer, document, captured, channels, heard } = setup()
  colorPicker(root)
  pointer(area, 'pointerdown', { pointerId: 3, clientX: 100 + 185, clientY: 50 + 40 })
  assert.deepEqual(captured, [3], 'the field holds the pointer')
  assert.equal(document.activeElement, thumb, 'the thumb takes focus, so the keys go on from there')
  assert.deepEqual(channels(), { l: 0.8, c: 0.185, h: 260, a: 1 })
  pointer(area, 'pointermove', { pointerId: 3, clientX: 100 + 370 + 60, clientY: 50 + 300 })
  assert.deepEqual(channels(), { l: 0, c: 0.37, h: 260, a: 1 }, 'past the field the color stops at its edge')
  assert.deepEqual(heard, ['input:color-picker-thumb', 'input:color-picker-thumb'])
  pointer(area, 'pointerup', { pointerId: 3 })
  pointer(area, 'lostpointercapture', { pointerId: 3 })
  assert.deepEqual(heard, ['input:color-picker-thumb', 'input:color-picker-thumb', 'change:color-picker-thumb'], 'change once')
  pointer(area, 'pointermove', { pointerId: 3, clientX: 200, clientY: 100 })
  assert.equal(channels().l, 0, 'a pointer let go moves nothing')
})

test('color picker: a drag reads the field\'s box once, as it begins, not on every move', () => {
  const { root, area, pointer, channels } = setup()
  colorPicker(root)
  const read = area.getBoundingClientRect
  let reads = 0
  area.getBoundingClientRect = () => { reads++; return read() }
  pointer(area, 'pointerdown', { pointerId: 4, clientX: 100 + 185, clientY: 50 + 40 })
  for (let move = 1; move <= 5; move++) pointer(area, 'pointermove', { pointerId: 4, clientX: 100 + 185 + move * 10, clientY: 50 + 40 })
  assert.equal(reads, 1)
  assert.equal(channels().c, 0.235, 'the moves still follow the pointer')
  pointer(area, 'pointerup', { pointerId: 4 })
  pointer(area, 'pointerdown', { pointerId: 5, clientX: 100 + 185, clientY: 50 + 40 })
  assert.equal(reads, 2, 'the next press reads it again')
})

test('color picker: a second finger while one holds the field takes nothing from it', () => {
  const { root, area, pointer, channels, heard } = setup()
  colorPicker(root)
  pointer(area, 'pointerdown', { pointerId: 1, isPrimary: true, clientX: 100 + 185, clientY: 50 + 40 })
  pointer(area, 'pointerdown', { pointerId: 2, isPrimary: false, clientX: 100, clientY: 250 })
  assert.deepEqual(channels(), { l: 0.8, c: 0.185, h: 260, a: 1 }, 'the second finger does not move the color')
  pointer(area, 'pointermove', { pointerId: 2, clientX: 110, clientY: 240 })
  pointer(area, 'pointermove', { pointerId: 1, clientX: 100 + 370, clientY: 50 + 40 })
  assert.equal(channels().c, 0.37, 'the first finger still moves it')
  pointer(area, 'pointerup', { pointerId: 2 })
  pointer(area, 'pointerup', { pointerId: 1 })
  assert.deepEqual(heard, ['input:color-picker-thumb', 'input:color-picker-thumb', 'change:color-picker-thumb'])
})

test('color picker: right to left, chroma grows from the right edge of the field', () => {
  const { root, area, pointer, channels } = setup({ root: 'direction: rtl' })
  colorPicker(root)
  pointer(area, 'pointerdown', { pointerId: 1, clientX: 470 - 100, clientY: 150 })
  assert.equal(channels().c, 0.1)
  assert.equal(channels().l, 0.5)
})

test('color picker: a press with another button, or on a disabled thumb, does nothing', () => {
  const { root, area, thumb, pointer, key, channels, heard } = setup({ thumb: 'aria-disabled="true"' })
  colorPicker(root)
  pointer(area, 'pointerdown', { pointerId: 1, clientX: 120, clientY: 60 })
  assert.equal(key(thumb, 'ArrowUp'), false)
  assert.equal(key(thumb, 'Home'), false)
  assert.deepEqual(channels(), { l: 0.62, c: 0.19, h: 260, a: 1 })
  thumb.removeAttribute('aria-disabled')
  pointer(area, 'pointerdown', { pointerId: 2, button: 2, clientX: 120, clientY: 60 })
  assert.deepEqual(channels(), { l: 0.62, c: 0.19, h: 260, a: 1 })
  assert.deepEqual(heard, [])
})

test('color picker: a disabled thumb leaves the tab order while it is disabled, and detaching gives back the page\'s tabindex', async () => {
  const { root, thumb } = setup({ thumb: 'aria-disabled="true"' })
  const detach = colorPicker(root)
  assert.equal(thumb.getAttribute('tabindex'), '-1', 'disabled as it attaches')
  thumb.removeAttribute('aria-disabled')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(thumb.getAttribute('tabindex'), '0', 'enabled again')
  thumb.setAttribute('aria-disabled', 'true')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(thumb.getAttribute('tabindex'), '-1', 'disabled while attached')
  thumb.setAttribute('aria-disabled', 'false')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(thumb.getAttribute('tabindex'), '0', 'aria-disabled="false" is enabled')
  thumb.setAttribute('aria-disabled', 'true')
  await new Promise((resolve) => setTimeout(resolve, 0))
  detach()
  assert.equal(thumb.getAttribute('tabindex'), '0', 'the tabindex the page wrote')
  thumb.removeAttribute('aria-disabled')
  await new Promise((resolve) => setTimeout(resolve, 0))
  thumb.setAttribute('aria-disabled', 'true')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(thumb.getAttribute('tabindex'), '0', 'detached, the script no longer follows it')
})

test('color picker: the hue and the opacity sliders move the color, and the text follows', () => {
  const { root, hue, alpha, text, set, channels, heard } = setup()
  const picker = colorPicker(root)
  set(hue, '30')
  assert.equal(channels().h, 30)
  assert.equal(text.value, 'oklch(62% 0.19 30)')
  set(alpha, '40')
  assert.equal(channels().a, 0.4)
  assert.equal(text.value, 'oklch(62% 0.19 30 / 40%)')
  assert.equal(picker.value, 'oklch(62% 0.19 30 / 40%)')
  assert.deepEqual(heard, ['input:color-picker-hue', 'change:color-picker-hue', 'input:color-picker-alpha', 'change:color-picker-alpha'])
})

test('color picker: the root hears the new value from a slider before anyone else listening there', () => {
  const { root, hue, set } = setup()
  const values: string[] = []
  root.addEventListener('input', () => values.push(picker.value))
  const picker = colorPicker(root)
  set(hue, '120')
  assert.deepEqual(values, ['oklch(62% 0.19 120)'])
})

test('color picker: a typed color is taken as soon as it is one, and written in the format chosen when committed', () => {
  const { root, text, format, set, channels } = setup({ value: '#000000', format: 'hex' })
  const picker = colorPicker(root)
  set(text, '#ff', false)
  assert.equal(channels().l, 0, 'half a color is not taken')
  set(text, '#f00', false)
  assert.ok(Math.abs(channels().l - 0.628) < 0.001, 'a color is, while it is typed')
  assert.equal(text.value, '#f00', 'and the text is left as it is typed')
  assert.equal(picker.value, '#ff0000')
  text.dispatchEvent(new Event('change', { bubbles: true }))
  assert.equal(text.value, '#ff0000', 'committed, it is written again')
  set(text, 'oklch(70% 0.1 200)')
  assert.equal(format.value, 'hex', 'a color typed in another format keeps the one chosen')
  assert.match(text.value, /^#[\da-f]{6}$/)
  assert.deepEqual(channels(), { l: 0.7, c: 0.1, h: 200, a: 1 })
})

test('color picker: text that is not a color is put back when committed', () => {
  const { root, text, set, channels } = setup()
  colorPicker(root)
  set(text, 'tomato')
  assert.equal(text.value, 'oklch(62% 0.19 260)')
  assert.deepEqual(channels(), { l: 0.62, c: 0.19, h: 260, a: 1 })
})

test('color picker: the format select writes the color again in hex, rgb() or oklch()', () => {
  const { root, text, format, set, heard } = setup({ value: 'oklch(62.3% 0.188 259.8 / 50%)' })
  const picker = colorPicker(root)
  set(format, 'rgb')
  assert.equal(text.value, 'rgb(59 130 246 / 50%)')
  set(format, 'hex')
  assert.equal(text.value, '#3b82f680')
  assert.equal(picker.value, '#3b82f680')
  set(format, 'oklch')
  assert.equal(text.value, 'oklch(62.3% 0.188 259.8 / 50%)', 'the color held does not drift through the formats')
  assert.deepEqual(heard.filter(type => type.startsWith('input')), ['input:color-picker-format', 'input:color-picker-format', 'input:color-picker-format'])
})

test('color picker: a color past sRGB is fitted for hex and rgb(), and kept for oklch()', () => {
  const { root, format, text, set } = setup({ value: 'oklch(70% 0.3 150)' })
  colorPicker(root)
  set(format, 'rgb')
  const [r, g, b] = text.value.match(/\d+/g)!.map(Number)
  assert.ok(r! >= 0 && g! <= 255 && b! >= 0, text.value)
  assert.ok(g! > r! && g! > b!, `a green stays green: ${text.value}`)
  set(format, 'oklch')
  assert.equal(text.value, 'oklch(70% 0.3 150)')
})

test('color picker: without an opacity slider the color is opaque', () => {
  const { root, text, set, channels } = setup({ value: '#3b82f680', alpha: false })
  const picker = colorPicker(root)
  assert.equal(channels().a, 1)
  assert.equal(picker.value, '#3b82f6')
  set(text, 'rgb(0 0 0 / 50%)')
  assert.equal(channels().a, 1)
  assert.equal(text.value, '#000000')
})

test('color picker: setting the value chooses the color and its format, and says nothing', () => {
  const { root, text, format, hue, channels, heard } = setup()
  const picker = colorPicker(root)
  picker.value = 'rgb(255 0 0)'
  assert.equal(format.value, 'rgb')
  assert.equal(text.value, 'rgb(255 0 0)')
  assert.equal(picker.value, 'rgb(255 0 0)')
  assert.equal(Math.round(Number(hue.value)), 29)
  const before = channels()
  picker.value = 'not a color'
  assert.deepEqual(channels(), before, 'text that is not a color changes nothing')
  picker.value = '#808080'
  assert.equal(channels().c, 0)
  assert.equal(Math.round(channels().h), 29, 'a grey keeps the hue held')
  assert.deepEqual(heard, [])
})

test('color picker: without a text field it starts from the numbers on the root', () => {
  const page = dom(`<div class="color-picker" style="--color-picker-lightness: .5; --color-picker-chroma: .1; --color-picker-hue: 40">
  <div class="color-picker-area"><div class="color-picker-thumb" role="slider" tabindex="0" aria-label="Color"></div></div>
</div>`)
  const picker = colorPicker(page.one('.color-picker'))
  assert.match(picker.value, /^#[\da-f]{6}$/, 'with no select to say otherwise, the value is hex')
  assert.equal(page.one<HTMLElement>('.color-picker').style.getPropertyValue('--color-picker-hue'), '40')
  assert.equal(page.one('.color-picker-thumb').getAttribute('aria-valuetext'), 'Lightness 50%, chroma 0.1')
})

test('color picker: valueText says what the thumb holds in the page\'s words', () => {
  const { root, thumb } = setup()
  colorPicker(root, { valueText: (lightness, chroma) => `明度 ${lightness}%、彩度 ${chroma}` })
  assert.equal(thumb.getAttribute('aria-valuetext'), '明度 62%、彩度 0.19')
})

test('color picker: colorPickerState gives a renderer the first state of a value', () => {
  const state = colorPickerState('#3B82F6')!
  assert.equal(state.value, '#3b82f6')
  assert.equal(state.format, 'hex')
  assert.deepEqual(Object.keys(state.properties), ['--color-picker-lightness', '--color-picker-chroma', '--color-picker-hue', '--color-picker-alpha'])
  assert.equal(state.valueText, 'Lightness 62.3%, chroma 0.188')
  assert.equal(colorPickerState('rgb(0 0 0 / 50%)', { opaque: true })!.value, 'rgb(0 0 0)')
  assert.equal(colorPickerState('nope'), undefined)
})

test('color picker: detach removes the listeners, and attaching twice keeps one set', () => {
  const { root, thumb, hue, key, set, channels, heard } = setup()
  colorPicker(root)
  const detach = colorPicker(root)
  key(thumb, 'ArrowUp')
  assert.equal(channels().l, 0.63)
  assert.deepEqual(heard, ['input:color-picker-thumb', 'change:color-picker-thumb'], 'one set of listeners')
  detach()
  assert.equal(key(thumb, 'ArrowUp'), false)
  set(hue, '10')
  assert.equal(channels().l, 0.63)
  assert.equal(channels().h, 260)
})

test('color picker: a form\'s reset gives the picker back the color it started with, and says nothing', async () => {
  const page = dom(`<form>${markup()}</form>`)
  const root = page.one<HTMLElement>('.color-picker')
  const thumb = page.one<HTMLElement>('.color-picker-thumb')
  const hue = page.one<HTMLInputElement>('.color-picker-hue')
  const text = page.one<HTMLInputElement>('.color-picker-text')
  colorPicker(root)
  hue.value = '120'
  hue.dispatchEvent(new page.window.Event('input', { bubbles: true }) as unknown as Event)
  page.key(thumb, 'ArrowUp')
  assert.equal(root.style.getPropertyValue('--color-picker-hue'), '120')
  const heard: string[] = []
  root.addEventListener('input', () => heard.push('input'))
  root.addEventListener('change', () => heard.push('change'))
  page.one<HTMLFormElement>('form').reset()
  await new Promise(resolve => setTimeout(resolve))
  assert.equal(root.style.getPropertyValue('--color-picker-hue'), '260')
  assert.equal(root.style.getPropertyValue('--color-picker-lightness'), '0.62')
  assert.equal(thumb.getAttribute('aria-valuenow'), '62')
  assert.equal(hue.value, '260', 'the hue slider says the color again, not its own first value')
  assert.equal(text.value, 'oklch(62% 0.19 260)')
  assert.deepEqual(heard, [])
})

test('color picker: a move writes only what changed, and the hue it did not move is left alone', () => {
  const { root, area, thumb, pointer, window } = setup()
  colorPicker(root)
  const observer = new window.MutationObserver(() => {})
  observer.observe(thumb, { attributes: true })
  pointer(area, 'pointerdown', { button: 0, pointerId: 1, isPrimary: true, clientX: 200, clientY: 100 })
  pointer(area, 'pointermove', { pointerId: 1, clientX: 200, clientY: 120 })
  const names = observer.takeRecords().map((record: any) => record.attributeName)
  observer.disconnect()
  assert.ok(!names.includes('aria-valuemin') && !names.includes('aria-valuemax'), `the ends are not written again: ${names}`)
  assert.ok(names.includes('aria-valuenow'))
})
