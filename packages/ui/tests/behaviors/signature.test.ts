import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { signature, signaturePath, signatureSvg } from '../../behaviors/signature.js'

/**
 * The signature's behavior turns pointer moves on the pad into strokes in the drawing's units, writes each as a
 * path, carries the drawing into the form as SVG and says when the pad was signed or emptied. happy-dom has no
 * layout, so a test gives the drawing the box a pointer is placed against: 400 by 160 at 100 from the left and
 * 50 from the top, the size of its viewBox, so a pointer at (300, 130) is at (200, 80) in the drawing.
 */
type State = '' | 'disabled' | 'readonly'

const markup = (root: State = '', name = 'required') => `<form>
<fieldset class="signature${root === 'readonly' ? ' signature-readonly' : ''}"${root === 'disabled' ? ' disabled' : ''}>
  <legend class="signature-label">Sign the agreement</legend>
  <div class="signature-pad">
    <svg class="signature-ink" viewBox="0 0 400 160" role="img" aria-label="Your drawn signature"></svg>
    <span class="signature-line" aria-hidden="true"></span>
    <span class="signature-placeholder" aria-hidden="true">Sign here</span>
    <div class="signature-actions">
      <button type="button" class="btn btn-sm btn-quiet signature-undo">Undo</button>
      <button type="button" class="btn btn-sm btn-quiet signature-clear">Clear</button>
    </div>
  </div>
  <label class="field">Or type your full name
    <input class="input signature-name" name="signer" ${name}>
  </label>
  <input type="hidden" class="signature-value" name="signature">
  <span class="signature-status" role="status"></span>
</fieldset>
</form>`

function setup(root?: State, name?: string) {
  const page = dom(markup(root, name))
  const element = page.one<HTMLElement>('.signature')
  const pad = page.one<HTMLElement>('.signature-pad')
  const ink = page.one<SVGSVGElement & HTMLElement>('.signature-ink')
  ink.getBoundingClientRect = () => ({ left: 100, top: 50, right: 500, bottom: 210, width: 400, height: 160, x: 100, y: 50 }) as DOMRect
  const captured: number[] = []
  pad.setPointerCapture = (id: number) => { captured.push(id) }
  const value = page.one<HTMLInputElement>('.signature-value')
  const heard: string[] = []
  element.addEventListener('input', (event: Event) => { if (event.target === value) heard.push('input') })
  element.addEventListener('change', (event: Event) => { if (event.target === value) heard.push('change') })
  const strokes = () => page.all('.signature-stroke')
  const status = () => page.one('.signature-status').textContent
  /** Draw a stroke through these points of the page, a millisecond apart, with the mouse unless said otherwise. */
  const stroke = (points: [number, number][], init: Record<string, unknown> = {}) => {
    const base = { pointerId: 1, isPrimary: true, button: 0, pointerType: 'mouse', ...init }
    points.forEach(([clientX, clientY], index) => page.pointer(pad, index === 0 ? 'pointerdown' : 'pointermove', { ...base, clientX, clientY }))
    page.pointer(pad, 'pointerup', { ...base, clientX: points.at(-1)![0], clientY: points.at(-1)![1] })
  }
  return { ...page, root: element, pad, ink, value, captured, heard, strokes, status, stroke }
}

test('signature: a pointer draws a stroke in the units of the viewBox, says input as it goes and change at its end', () => {
  const { root, captured, heard, strokes, value, stroke, errors } = setup()
  const handle = signature(root)
  assert.deepEqual(handle.value, [])
  stroke([[150, 100], [200, 110], [260, 130]])
  assert.deepEqual(captured, [1], 'the pad keeps the pointer that draws')
  assert.equal(strokes().length, 1)
  assert.match(strokes()[0].getAttribute('d')!, /^M[\d. -]+Q.*A.*Z$/, 'a filled outline with round ends')
  assert.deepEqual(handle.value[0].map(([x, y]) => [x, y]), [[50, 50], [100, 60], [160, 80]])
  assert.deepEqual(heard, ['input', 'input', 'input', 'change'])
  assert.match(value.value, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 400 160" width="400" height="160" fill="currentColor"><path d="M/)
  assert.equal(handle.svg, value.value, 'svg is the document the form submits')
  assert.deepEqual(errors, [])
})

test('signature: a mouse that moves slowly draws a heavier line than one that moves fast; a pen gives its own pressure', () => {
  const { root, pad, pointer } = setup()
  const handle = signature(root)
  const base = { pointerId: 1, isPrimary: true, button: 0, pointerType: 'mouse' }
  pointer(pad, 'pointerdown', { ...base, clientX: 120, clientY: 100 })
  // happy-dom stamps events with the time they are made: these two are made a few milliseconds apart at most.
  for (let x = 121; x < 130; x++) pointer(pad, 'pointermove', { ...base, clientX: x, clientY: 100 })
  pointer(pad, 'pointermove', { ...base, clientX: 330, clientY: 100 })
  pointer(pad, 'pointerup', base)
  const [slow] = handle.value
  assert.ok(slow.at(-1)![2] < slow.at(-2)![2], 'a long jump in no time thins the line')

  pointer(pad, 'pointerdown', { ...base, pointerId: 2, pointerType: 'pen', pressure: .9, clientX: 150, clientY: 120 })
  pointer(pad, 'pointermove', { ...base, pointerId: 2, pointerType: 'pen', pressure: .9, clientX: 200, clientY: 120 })
  pointer(pad, 'pointerup', { ...base, pointerId: 2, pointerType: 'pen' })
  assert.deepEqual(handle.value[1].map(point => point[2]), [.9, .9])
})

test('signature: the first stroke is announced, and the placeholder and buttons follow the drawing', () => {
  const { root, all, stroke, status } = setup()
  signature(root)
  const buttons = all<HTMLButtonElement>('.signature-undo, .signature-clear')
  assert.deepEqual(buttons.map(button => button.getAttribute('aria-disabled')), ['true', 'true'], 'nothing to take back yet')
  stroke([[150, 100], [200, 110]])
  assert.equal(status(), 'Signature drawn')
  assert.deepEqual(buttons.map(button => button.getAttribute('aria-disabled')), [null, null])
  stroke([[220, 100], [260, 110]])
  assert.equal(status(), 'Signature drawn', 'a second stroke is not news')
})

test('signature: Undo (Enter or Space on the button) takes back the last stroke, and Clear every stroke', () => {
  const { root, one, click, stroke, strokes, heard, status, value } = setup()
  const handle = signature(root)
  stroke([[150, 100], [200, 110]])
  stroke([[220, 100], [260, 110]])
  stroke([[280, 100], [320, 110]])
  heard.length = 0

  click(one('.signature-undo'))
  assert.equal(strokes().length, 2)
  assert.equal(handle.value.length, 2)
  assert.deepEqual(heard, ['input', 'change'])
  assert.equal(status(), 'Last stroke removed')
  click(one('.signature-undo'))
  assert.equal(status(), 'Last stroke removed ', 'the same words again are made news')

  click(one('.signature-clear'))
  assert.equal(strokes().length, 0)
  assert.deepEqual(handle.value, [])
  assert.equal(value.value, '', 'an empty pad submits nothing')
  assert.equal(status(), 'Signature cleared')
  assert.equal(one('.signature-clear').getAttribute('aria-disabled'), 'true')

  heard.length = 0
  click(one('.signature-clear'))
  click(one('.signature-undo'))
  assert.deepEqual(heard, [], 'an empty pad has nothing to take back')
})

test('signature: undoing the only stroke empties the pad', () => {
  const { root, one, click, stroke, status } = setup()
  const handle = signature(root)
  stroke([[150, 100], [200, 110]])
  click(one('.signature-undo'))
  assert.deepEqual(handle.value, [])
  assert.equal(status(), 'Signature cleared')
})

test('signature: the drawing answers a required typed name, which is required again once the pad is empty', () => {
  const { root, one, click, stroke } = setup()
  const name = one<HTMLInputElement>('.signature-name')
  const detach = signature(root)
  assert.equal(name.required, true)
  stroke([[150, 100], [200, 110]])
  assert.equal(name.required, false, 'the drawing signs')
  click(one('.signature-clear'))
  assert.equal(name.required, true)
  stroke([[150, 100], [200, 110]])
  detach()
  assert.equal(name.required, true, 'detaching gives the attribute back')
})

test('signature: a typed name that is not required stays so', () => {
  const { root, one, stroke, click } = setup('', '')
  const name = one<HTMLInputElement>('.signature-name')
  signature(root)
  stroke([[150, 100], [200, 110]])
  click(one('.signature-clear'))
  assert.equal(name.required, false)
})

test('signature: nothing draws on a disabled fieldset or a read-only signature', () => {
  for (const state of ['disabled', 'readonly'] as const) {
    const { root, stroke, strokes, heard } = setup(state)
    const handle = signature(root)
    stroke([[150, 100], [200, 110]])
    assert.equal(strokes().length, 0, state)
    assert.deepEqual(handle.value, [])
    assert.deepEqual(heard, [])
  }
})

test('signature: a read-only signature shows the value it is given and keeps it from Clear', () => {
  const { root, one, click, strokes } = setup('readonly')
  const handle = signature(root)
  handle.value = [[[50, 50, .5], [100, 60, .5]]]
  assert.equal(strokes().length, 1)
  click(one('.signature-clear'))
  assert.equal(strokes().length, 1)
})

test('signature: a second finger, another button or a press on Undo draws nothing', () => {
  const { root, pad, one, pointer, strokes } = setup()
  signature(root)
  pointer(pad, 'pointerdown', { pointerId: 3, isPrimary: false, button: 0, clientX: 150, clientY: 100 })
  pointer(pad, 'pointerdown', { pointerId: 4, isPrimary: true, button: 2, clientX: 150, clientY: 100 })
  pointer(one('.signature-undo'), 'pointerdown', { pointerId: 5, isPrimary: true, button: 0, clientX: 150, clientY: 100 })
  assert.equal(strokes().length, 0)
})

test('signature: a tap is a dot', () => {
  const { root, stroke, strokes } = setup()
  const handle = signature(root)
  stroke([[200, 100]])
  assert.equal(handle.value[0].length, 1)
  assert.match(strokes()[0].getAttribute('d')!, /^M[\d.]+ [\d.]+a.*Z$/)
})

test('signature: setting the value draws it, reuses the paths there and dispatches nothing', () => {
  const { root, heard, strokes, value, status } = setup()
  const handle = signature(root)
  handle.value = [[[50, 50, .5], [100, 60, .5]], [[150, 50, .5], [200, 60, .5]]]
  assert.equal(strokes().length, 2)
  const [first] = strokes()
  handle.value = [[[50, 50, .5], [100, 60, .5]]]
  assert.equal(strokes().length, 1)
  assert.equal(strokes()[0], first, 'the path stays')
  assert.match(value.value, /^<svg/)
  assert.deepEqual(heard, [])
  assert.equal(status(), '', 'and says nothing')
  handle.value = []
  assert.equal(strokes().length, 0)
  assert.equal(value.value, '')
})

test('signature: paths a server drew from the first value stay when the behavior attaches and the value arrives', () => {
  const first = [[[50, 50, .5], [100, 60, .5]]] as [number, number, number][][]
  const page = dom(markup().replace('role="img" aria-label="Your drawn signature">', `role="img" aria-label="Your drawn signature"><path class="signature-stroke" d="${signaturePath(first[0])}"></path>`))
  const path = page.one('.signature-stroke')
  const handle = signature(page.one('.signature'))
  assert.equal(page.one('.signature-stroke'), path)
  handle.value = first
  assert.equal(page.all('.signature-stroke').length, 1)
  assert.equal(page.one('.signature-stroke'), path)
})

test('signature: the path and the SVG document can be made without a page, for a server', () => {
  assert.equal(signaturePath([]), '')
  assert.equal(signatureSvg([]), '')
  const svg = signatureSvg([[[10, 10, .5], [40, 20, .5]]], { viewBox: '0 0 300 100' })
  assert.match(svg, /viewBox="0 0 300 100" width="300" height="100"/)
  assert.ok(signaturePath([[10, 10, 1], [40, 20, 1]], 4) !== signaturePath([[10, 10, 1], [40, 20, 1]], 2), 'the weight widens the outline')
})

test('signature: detach removes the listeners', () => {
  const { root, stroke, strokes } = setup()
  const detach = signature(root)
  detach()
  stroke([[150, 100], [200, 110]])
  assert.equal(strokes().length, 0)
})

test('signature: attaching twice keeps one set of listeners', () => {
  const { root, stroke, heard } = setup()
  signature(root)
  signature(root)
  stroke([[150, 100], [200, 110]])
  assert.deepEqual(heard, ['input', 'input', 'change'])
})

test('signature: a stroke reads the layout and the weight once as it begins, not at every move', () => {
  const { root, ink, stroke } = setup()
  signature(root)
  let boxes = 0
  const box = ink.getBoundingClientRect
  ink.getBoundingClientRect = () => { boxes++; return box() }
  let styles = 0
  const original = (globalThis as any).getComputedStyle
  ;(globalThis as any).getComputedStyle = (...args: any[]) => { styles++; return original(...args) }
  try {
    stroke([[120, 60], [140, 80], [160, 90], [180, 100], [200, 120]])
  } finally {
    ;(globalThis as any).getComputedStyle = original
  }
  assert.equal(boxes, 1, 'the drawing\'s box is read as the stroke begins')
  assert.equal(styles, 1, 'and its weight')
})
