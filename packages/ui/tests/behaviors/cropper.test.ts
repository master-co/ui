import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { cropper, cropperFit } from '../../behaviors/cropper.js'

/** happy-dom catches what a listener throws and reports it on the window; a test must not pass over it. */
const thrown: unknown[] = []
afterEach(() => assert.deepEqual(thrown.splice(0), [], 'a listener threw'))

/**
 * The cropper's behavior writes four shares of the picture to the root and says what it did. happy-dom has
 * no layout, so a test gives the picture the box a drag is measured against: a 1000 by 500 picture drawn
 * 500 by 250, at 100 from the left and 50 from the top, so a pixel on the screen is two of the picture. A
 * panned box is 200 by 200, at 100 from the left and the top.
 *
 * The crop starts at 100, 100, 400 by 200. A step is a hundredth of the longer side, 10, and the least size a
 * tenth of the shorter one, 50.
 */
const handles = ['top left', 'top', 'top right', 'right', 'bottom right', 'bottom', 'bottom left', 'left']
  .map(edges => `<span class="cropper-handle ${edges.split(' ').map(edge => `cropper-handle-${edge}`).join(' ')}"></span>`).join('\n    ')

const markup = ({ root = '--cropper-x: .1; --cropper-y: .2; --cropper-width: .4; --cropper-height: .4', box = '', modifiers = '', id = 'crop', after = '' } = {}) => `<div class="${`cropper ${modifiers}`.trim()}" id="${id}" style="${root}">
  <img class="cropper-image" src="/demo/tide.svg" alt="The tide" width="1000" height="500">
  <div class="cropper-box" role="application" tabindex="0" aria-label="Crop the photo" ${box}>
    ${modifiers.includes('cropper-pan') ? '' : handles}
  </div>
  <p class="cropper-status" role="status"></p>
</div>
${after}`

function setup(options: Parameters<typeof markup>[0] = {}) {
  const page = dom(markup(options))
  page.window.addEventListener('error', (event: any) => thrown.push(event.error ?? event.message))
  const root = page.one<HTMLElement>('.cropper')
  const box = page.one<HTMLElement>('.cropper-box')
  const image = page.one<HTMLElement>('.cropper-image')
  const rect = (left: number, top: number, width: number, height: number) => () => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top })
  image.getBoundingClientRect = rect(100, 50, 500, 250) as any
  box.getBoundingClientRect = rect(100, 100, 200, 200) as any
  const captured: number[] = []
  root.setPointerCapture = (id: number) => { captured.push(id) }
  const heard: string[] = []
  root.addEventListener('input', (event: any) => { if (event.target === box) heard.push('input') })
  root.addEventListener('change', (event: any) => { if (event.target === box) heard.push('change') })
  const shares = () => ['x', 'y', 'width', 'height'].map(name => root.style.getPropertyValue(`--cropper-${name}`))
  const status = () => page.one('.cropper-status').textContent
  const wheel = (init: Record<string, unknown>) => {
    // happy-dom's WheelEvent has no pointer and no modifier keys: a mouse event of that type, with the wheel's delta.
    const { deltaY = 0, deltaMode = 0, ...mouse } = init
    const event = new page.window.MouseEvent('wheel', { bubbles: true, cancelable: true, ...mouse })
    Object.defineProperties(event, { deltaY: { value: deltaY }, deltaMode: { value: deltaMode } })
    root.dispatchEvent(event)
    return event.defaultPrevented
  }
  const settle = () => new Promise(resolve => setTimeout(resolve, 0))
  return { ...page, root, box, image, captured, heard, shares, status, wheel, settle }
}

/** The handle that moves exactly these edges. */
function only(page: ReturnType<typeof setup>, ...edges: string[]) {
  return page.all<HTMLElement>('.cropper-handle').find(element => ['top', 'bottom', 'left', 'right'].every(edge => element.classList.contains(`cropper-handle-${edge}`) === edges.includes(edge)))!
}

test('cropper: the arrows move the crop by a step, and each move says input and change', () => {
  const { root, box, key, heard } = setup()
  const crop = cropper(root)
  assert.deepEqual(crop.value, { x: 100, y: 100, width: 400, height: 200 })
  assert.equal(key(box, 'ArrowRight'), true, 'a key the behavior handles is prevented')
  assert.deepEqual(crop.value, { x: 110, y: 100, width: 400, height: 200 })
  assert.equal(root.style.getPropertyValue('--cropper-x'), '0.11')
  assert.deepEqual(heard, ['input', 'change'])
  key(box, 'ArrowDown')
  assert.deepEqual(crop.value, { x: 110, y: 110, width: 400, height: 200 })
  key(box, 'ArrowLeft')
  key(box, 'ArrowUp')
  assert.deepEqual(crop.value, { x: 100, y: 100, width: 400, height: 200 })
})

test('cropper: a key held down says input as it repeats, and change and the status once it is let go', () => {
  const { root, box, key, heard, status, window } = setup()
  const crop = cropper(root)
  key(box, 'ArrowRight')
  assert.deepEqual(heard, ['input', 'change'])
  const said = status()
  key(box, 'ArrowRight', { repeat: true })
  key(box, 'ArrowRight', { repeat: true })
  assert.deepEqual(crop.value, { x: 130, y: 100, width: 400, height: 200 })
  assert.deepEqual(heard, ['input', 'change', 'input', 'input'], 'a repeat has not ended')
  assert.equal(status(), said, 'the status waits too, so it is not read at every repeat')
  box.dispatchEvent(new window.KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }))
  assert.deepEqual(heard, ['input', 'change', 'input', 'input', 'change'])
  assert.notEqual(status(), said)
  box.dispatchEvent(new window.KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }))
  assert.equal(heard.length, 5, 'a key let go after nothing repeated says nothing more')
})

test('cropper: Shift moves the crop by ten steps, and the step is an option', () => {
  const { root, box, key } = setup()
  const crop = cropper(root)
  key(box, 'ArrowRight', { shiftKey: true })
  assert.equal(crop.value!.x, 200)
  const again = cropper(root, { step: 3 })
  key(box, 'ArrowDown')
  assert.equal(again.value!.y, 103)
})

test('cropper: the crop stays inside the picture; a key at the edge is still prevented and says nothing', () => {
  const { root, box, key, heard } = setup()
  const crop = cropper(root)
  key(box, 'ArrowRight', { shiftKey: true })
  key(box, 'ArrowRight', { shiftKey: true })
  key(box, 'ArrowRight', { shiftKey: true })
  key(box, 'ArrowRight', { shiftKey: true })
  key(box, 'ArrowRight', { shiftKey: true })
  key(box, 'ArrowRight', { shiftKey: true })
  assert.equal(crop.value!.x, 600, 'its right edge is the picture\'s')
  heard.length = 0
  assert.equal(key(box, 'ArrowRight'), true)
  assert.equal(crop.value!.x, 600)
  assert.deepEqual(heard, [], 'no event without a change')
})

test('cropper: Alt with ArrowRight and ArrowDown makes the crop larger from its far edges, ArrowLeft and ArrowUp smaller', () => {
  const { root, box, key } = setup()
  const crop = cropper(root)
  assert.equal(key(box, 'ArrowRight', { altKey: true }), true)
  assert.deepEqual(crop.value, { x: 100, y: 100, width: 410, height: 200 })
  key(box, 'ArrowDown', { altKey: true })
  assert.deepEqual(crop.value, { x: 100, y: 100, width: 410, height: 210 })
  key(box, 'ArrowLeft', { altKey: true, shiftKey: true })
  key(box, 'ArrowUp', { altKey: true })
  assert.deepEqual(crop.value, { x: 100, y: 100, width: 310, height: 200 })
})

test('cropper: the crop keeps its least size, a tenth of the picture\'s shorter side or min', () => {
  const { root, box, key } = setup()
  const crop = cropper(root)
  for (let time = 0; time < 8; time++) key(box, 'ArrowUp', { altKey: true, shiftKey: true })
  assert.equal(crop.value!.height, 50)
  const again = cropper(root, { min: 120 })
  assert.equal(again.value!.height, 120, 'a larger least size holds the crop to it')
  key(box, 'ArrowUp', { altKey: true })
  assert.equal(again.value!.height, 120)
})

test('cropper: at a ratio Alt with an arrow sizes both ways, about the middle of the other edge', () => {
  const { root, box, key } = setup()
  const crop = cropper(root, { ratio: 2 })
  key(box, 'ArrowRight', { altKey: true })
  assert.deepEqual(crop.value, { x: 100, y: 98, width: 410, height: 205 })
  key(box, 'ArrowUp', { altKey: true })
  key(box, 'ArrowUp', { altKey: true })
  assert.equal(crop.value!.width / crop.value!.height, 2)
  assert.equal(root.style.getPropertyValue('--cropper-ratio'), '2', 'the ratio is the root\'s')
})

test('cropper: + and - are a panned cropper\'s, and keys held with Control or Command are left alone', () => {
  const { root, box, key, heard } = setup()
  cropper(root)
  for (const name of ['+', '-', '=', 'Enter', ' ', 'Home', 'a']) assert.equal(key(box, name), false, name)
  assert.equal(key(box, 'ArrowRight', { ctrlKey: true }), false)
  assert.equal(key(box, 'ArrowRight', { metaKey: true }), false)
  assert.deepEqual(heard, [])
})

test('cropper: after a change the status says the crop in pixels, in the words describe gives', () => {
  const { root, box, key, status } = setup()
  cropper(root)
  key(box, 'ArrowRight', { altKey: true })
  assert.equal(status(), '410 by 200 pixels, 100 from the left and 100 from the top')
  cropper(root, { describe: crop => `${crop.width} × ${crop.height}` })
  key(box, 'ArrowDown', { altKey: true })
  assert.equal(status(), '410 × 210')
})

test('cropper: a drag of the box moves it, and says change once when it ends', () => {
  const { root, box, pointer, captured, heard, document } = setup()
  const crop = cropper(root)
  pointer(box, 'pointerdown', { pointerId: 3, clientX: 300, clientY: 150 })
  assert.deepEqual(captured, [3], 'the frame captures the pointer')
  assert.equal(document.activeElement, box, 'the box takes focus, so the keys go on from there')
  pointer(box, 'pointermove', { pointerId: 3, clientX: 310, clientY: 160 })
  assert.deepEqual(crop.value, { x: 120, y: 120, width: 400, height: 200 })
  pointer(box, 'pointermove', { pointerId: 3, clientX: 900, clientY: 900 })
  assert.deepEqual(crop.value, { x: 600, y: 300, width: 400, height: 200 }, 'it stays inside the picture')
  assert.deepEqual(heard, ['input', 'input'])
  pointer(box, 'pointerup', { pointerId: 3, clientX: 900, clientY: 900 })
  pointer(root, 'lostpointercapture', { pointerId: 3 })
  assert.deepEqual(heard, ['input', 'input', 'change'])
  pointer(box, 'pointermove', { pointerId: 3, clientX: 300, clientY: 150 })
  assert.equal(crop.value!.x, 600, 'a move after the pointer is released does nothing')
})

test('cropper: a corner\'s handle moves its two edges and keeps the corner across from it', () => {
  const page = setup()
  const crop = cropper(page.root)
  const corner = only(page, 'top', 'left')
  page.pointer(corner, 'pointerdown', { pointerId: 1, clientX: 150, clientY: 100 })
  page.pointer(corner, 'pointermove', { pointerId: 1, clientX: 130, clientY: 80 })
  assert.deepEqual(crop.value, { x: 60, y: 60, width: 440, height: 240 })
  page.pointer(corner, 'pointermove', { pointerId: 1, clientX: 400, clientY: 400 })
  assert.deepEqual(crop.value, { x: 450, y: 250, width: 50, height: 50 }, 'it stops at the least size')
  page.pointer(corner, 'pointerup', { pointerId: 1 })
  assert.deepEqual(page.heard, ['input', 'input', 'change'])
})

test('cropper: an edge\'s handle moves that edge alone', () => {
  const page = setup()
  const crop = cropper(page.root)
  const edge = only(page, 'bottom')
  page.pointer(edge, 'pointerdown', { pointerId: 1, clientX: 250, clientY: 200 })
  page.pointer(edge, 'pointermove', { pointerId: 1, clientX: 900, clientY: 260 })
  assert.deepEqual(crop.value, { x: 100, y: 100, width: 400, height: 320 })
  page.pointer(edge, 'pointermove', { pointerId: 1, clientX: 250, clientY: 900 })
  assert.deepEqual(crop.value, { x: 100, y: 100, width: 400, height: 400 }, 'it stops at the picture\'s edge')
})

test('cropper: at a ratio a corner keeps the proportions, and an edge sizes the box about its middle', () => {
  const page = setup()
  const crop = cropper(page.root, { ratio: 2 })
  const corner = only(page, 'bottom', 'right')
  page.pointer(corner, 'pointerdown', { pointerId: 1, clientX: 350, clientY: 200 })
  page.pointer(corner, 'pointermove', { pointerId: 1, clientX: 450, clientY: 180 })
  assert.deepEqual(crop.value, { x: 100, y: 100, width: 600, height: 300 })
  page.pointer(corner, 'pointermove', { pointerId: 1, clientX: 900, clientY: 900 })
  assert.deepEqual(crop.value, { x: 100, y: 100, width: 800, height: 400 }, 'as large as the room below it allows')
  page.pointer(corner, 'pointerup', { pointerId: 1 })

  crop.value = { x: 100, y: 100, width: 400, height: 200 }
  const edge = only(page, 'right')
  page.pointer(edge, 'pointerdown', { pointerId: 2, clientX: 350, clientY: 150 })
  page.pointer(edge, 'pointermove', { pointerId: 2, clientX: 400, clientY: 150 })
  assert.deepEqual(crop.value, { x: 100, y: 75, width: 500, height: 250 })
})

test('cropper: a drag across the picture outside the box draws a new one from where it started', () => {
  const { root, pointer, heard } = setup()
  const crop = cropper(root)
  pointer(root, 'pointerdown', { pointerId: 1, clientX: 550, clientY: 250 })
  pointer(root, 'pointermove', { pointerId: 1, clientX: 548, clientY: 249 })
  assert.deepEqual(crop.value, { x: 100, y: 100, width: 400, height: 200 }, 'nothing until it has gone a few pixels')
  pointer(root, 'pointermove', { pointerId: 1, clientX: 500, clientY: 225 })
  assert.deepEqual(crop.value, { x: 800, y: 350, width: 100, height: 50 })
  pointer(root, 'pointerup', { pointerId: 1 })
  assert.deepEqual(heard, ['input', 'change'])
})

test('cropper: a press on the picture outside the box, without a drag, brings the box there', () => {
  const { root, pointer, heard, status } = setup()
  const crop = cropper(root)
  pointer(root, 'pointerdown', { pointerId: 1, clientX: 500, clientY: 250 })
  pointer(root, 'pointerup', { pointerId: 1, clientX: 500, clientY: 250 })
  assert.deepEqual(crop.value, { x: 600, y: 300, width: 400, height: 200 }, 'its middle there, as far as the picture lets it go')
  assert.deepEqual(heard, ['input', 'change'])
  assert.match(status(), /^400 by 200 pixels/)
  pointer(root, 'pointerdown', { pointerId: 2, clientX: 550, clientY: 250 })
  pointer(root, 'pointercancel', { pointerId: 2 })
  assert.equal(crop.value!.x, 600, 'a cancelled press does not')
})

test('cropper: only the first pointer of a box drives it, and only its main button', () => {
  const { root, box, pointer, heard } = setup()
  const crop = cropper(root)
  pointer(box, 'pointerdown', { pointerId: 1, clientX: 300, clientY: 150, button: 2 })
  pointer(box, 'pointermove', { pointerId: 1, clientX: 310, clientY: 160 })
  assert.equal(crop.value!.x, 100, 'another button')
  pointer(box, 'pointerdown', { pointerId: 1, clientX: 300, clientY: 150 })
  pointer(box, 'pointerdown', { pointerId: 2, clientX: 400, clientY: 150 })
  pointer(box, 'pointermove', { pointerId: 2, clientX: 420, clientY: 150 })
  assert.equal(crop.value!.x, 100, 'a second pointer')
  pointer(box, 'pointermove', { pointerId: 1, clientX: 310, clientY: 150 })
  assert.equal(crop.value!.x, 120)
  pointer(box, 'pointerup', { pointerId: 2 })
  pointer(box, 'pointerup', { pointerId: 1 })
  assert.deepEqual(heard, ['input', 'change'])
})

test('cropper: a primary pointer starts afresh, even when the release of the last one was never heard', () => {
  const { root, box, pointer } = setup()
  const crop = cropper(root)
  pointer(box, 'pointerdown', { pointerId: 1, clientX: 300, clientY: 150, isPrimary: true })
  pointer(box, 'pointerdown', { pointerId: 2, clientX: 300, clientY: 150, isPrimary: true })
  pointer(box, 'pointermove', { pointerId: 2, clientX: 310, clientY: 150 })
  assert.equal(crop.value!.x, 120)
})

test('cropper: a control the page placed in the frame keeps its own pointer', () => {
  const page = setup()
  const crop = cropper(page.root)
  const button = page.document.createElement('button')
  page.root.append(button)
  page.pointer(button, 'pointerdown', { pointerId: 1, clientX: 550, clientY: 250 })
  page.pointer(button, 'pointerup', { pointerId: 1, clientX: 550, clientY: 250 })
  assert.equal(crop.value!.x, 100)
})

test('cropper: a disabled box takes no key and no pointer', () => {
  const { root, box, key, pointer, captured, heard } = setup({ box: 'aria-disabled="true"' })
  const crop = cropper(root)
  assert.equal(key(box, 'ArrowRight'), false)
  assert.equal(key(box, 'ArrowRight', { altKey: true }), false)
  pointer(box, 'pointerdown', { pointerId: 1, clientX: 300, clientY: 150 })
  pointer(box, 'pointermove', { pointerId: 1, clientX: 310, clientY: 160 })
  pointer(box, 'pointerup', { pointerId: 1 })
  assert.deepEqual(captured, [])
  assert.deepEqual(crop.value, { x: 100, y: 100, width: 400, height: 200 })
  assert.deepEqual(heard, [])
})

test('cropper: attached with a ratio the box does not have, it fits the box about its middle and says so', async () => {
  const { root, heard, settle } = setup()
  const crop = cropper(root, { ratio: 1 })
  assert.deepEqual(heard, [], 'not while it attaches')
  await settle()
  assert.deepEqual(crop.value, { x: 159, y: 59, width: 283, height: 283 }, 'the same area, square')
  assert.deepEqual(heard, ['input', 'change'])
  cropper(root, { ratio: 1 })
  await settle()
  assert.deepEqual(heard, ['input', 'change'], 'a box at the ratio is left as it is')
  cropper(root, { ratio: 0 })
  await settle()
  assert.equal(root.style.getPropertyValue('--cropper-ratio'), '', 'a free crop has no ratio')
})

test('cropper: the ratio written on the root in markup is the one it keeps', async () => {
  const { root, box, key, settle } = setup({ root: '--cropper-x: .1; --cropper-y: .2; --cropper-width: .4; --cropper-height: .4; --cropper-ratio: 16 / 9' })
  const crop = cropper(root)
  await settle()
  key(box, 'ArrowRight', { altKey: true })
  assert.ok(Math.abs(crop.value!.width / crop.value!.height - 16 / 9) < .02)
})

test('cropper: without the four properties the crop is the whole picture, or the largest at the ratio', () => {
  const free = setup({ root: '' })
  assert.deepEqual(cropper(free.root).value, { x: 0, y: 0, width: 1000, height: 500 })
  assert.deepEqual(free.shares(), ['0', '0', '1', '1'], 'written where the stylesheet reads them')
  const square = setup({ root: '' })
  assert.deepEqual(cropper(square.root, { ratio: 1 }).value, { x: 250, y: 0, width: 500, height: 500 })
})

test('cropper: panned, a drag moves the picture under the box and the crop the other way', () => {
  const { root, box, pointer, heard } = setup({ root: '', modifiers: 'cropper-pan cropper-round' })
  const crop = cropper(root)
  assert.deepEqual(crop.value, { x: 250, y: 0, width: 500, height: 500, zoom: 1 }, 'the largest square, in the middle')
  pointer(box, 'pointerdown', { pointerId: 1, clientX: 200, clientY: 200 })
  pointer(box, 'pointermove', { pointerId: 1, clientX: 180, clientY: 260 })
  assert.deepEqual(crop.value, { x: 300, y: 0, width: 500, height: 500, zoom: 1 }, 'a picture as tall as the crop does not move up and down')
  pointer(box, 'pointerup', { pointerId: 1 })
  assert.deepEqual(heard, ['input', 'change'])
})

test('cropper: panned, two fingers zoom about the point between them and pan with it', () => {
  const { root, box, pointer, heard } = setup({ root: '', modifiers: 'cropper-pan' })
  const crop = cropper(root)
  pointer(box, 'pointerdown', { pointerId: 1, clientX: 150, clientY: 200 })
  pointer(box, 'pointerdown', { pointerId: 2, clientX: 250, clientY: 200 })
  pointer(box, 'pointermove', { pointerId: 1, clientX: 100, clientY: 200 })
  pointer(box, 'pointermove', { pointerId: 2, clientX: 300, clientY: 200 })
  assert.deepEqual(crop.value, { x: 375, y: 125, width: 250, height: 250, zoom: 2 })
  pointer(box, 'pointerup', { pointerId: 2 })
  pointer(box, 'pointermove', { pointerId: 1, clientX: 120, clientY: 220 })
  assert.deepEqual(crop.value, { x: 350, y: 100, width: 250, height: 250, zoom: 2 }, 'the finger left pans')
  pointer(box, 'pointerup', { pointerId: 1 })
  assert.deepEqual(heard.filter(type => type === 'change'), ['change'], 'one change, when the last finger lifts')
  for (let time = 0; time < 4; time++) {
    pointer(box, 'pointerdown', { pointerId: 1, clientX: 199, clientY: 200 })
    pointer(box, 'pointerdown', { pointerId: 2, clientX: 201, clientY: 200 })
    pointer(box, 'pointermove', { pointerId: 2, clientX: 300, clientY: 200 })
    pointer(box, 'pointerup', { pointerId: 1 })
    pointer(box, 'pointerup', { pointerId: 2 })
  }
  assert.equal(crop.value!.zoom, 4, 'it stops at the greatest zoom')
})

test('cropper: panned, the wheel zooms with Control or Command held, and says change once it rests', async () => {
  const { root, wheel, heard } = setup({ root: '', modifiers: 'cropper-pan' })
  const crop = cropper(root)
  assert.equal(wheel({ deltaY: -250, clientX: 200, clientY: 200 }), false, 'the wheel alone scrolls the page')
  assert.equal(crop.value!.zoom, 1)
  assert.equal(wheel({ deltaY: -250, clientX: 200, clientY: 200, ctrlKey: true }), true)
  assert.deepEqual(crop.value, { x: 375, y: 125, width: 250, height: 250, zoom: 2 })
  assert.equal(wheel({ deltaY: 250, clientX: 100, clientY: 100, metaKey: true }), true)
  assert.deepEqual(crop.value, { x: 375, y: 0, width: 500, height: 500, zoom: 1 }, 'about the pointer, kept inside the picture')
  assert.deepEqual(heard, ['input', 'input'])
  await new Promise(resolve => setTimeout(resolve, 300))
  assert.deepEqual(heard, ['input', 'input', 'change'])
})

test('cropper: panned, a turn of the wheel reads the box once, at its first event', async () => {
  const { root, box, wheel, heard } = setup({ root: '', modifiers: 'cropper-pan' })
  cropper(root)
  const read = box.getBoundingClientRect
  let reads = 0
  box.getBoundingClientRect = () => { reads++; return read() }
  for (let turn = 0; turn < 4; turn++) wheel({ deltaY: -40, clientX: 200, clientY: 200, ctrlKey: true })
  assert.equal(reads, 1)
  await new Promise(resolve => setTimeout(resolve, 300))
  assert.deepEqual(heard, ['input', 'input', 'input', 'input', 'change'])
  wheel({ deltaY: -40, clientX: 200, clientY: 200, ctrlKey: true })
  assert.equal(reads, 2, 'the next turn reads it again')
})

test('cropper: panned, a range input whose aria-controls names the root zooms between its min and its max', () => {
  const page = setup({ root: '', modifiers: 'cropper-pan', after: '<input type="range" class="slider" min="1" max="3" step="any" value="1" aria-controls="crop" aria-label="Zoom">' })
  const crop = cropper(page.root)
  const slider = page.one<HTMLInputElement>('.slider')
  page.type(slider, '2')
  assert.deepEqual(crop.value, { x: 375, y: 125, width: 250, height: 250, zoom: 2 })
  assert.deepEqual(page.heard, ['input'], 'the box says the input the range input made')
  slider.dispatchEvent(new page.window.Event('change', { bubbles: true }))
  assert.deepEqual(page.heard, ['input', 'change'])
  assert.match(page.status(), /zoomed to 200%$/)
  page.key(page.box, '+')
  assert.equal(crop.value!.zoom, 2.5)
  assert.equal(slider.value, '2.5', 'a zoom from elsewhere moves the range input')
  page.key(page.box, '+')
  page.key(page.box, '+')
  assert.equal(crop.value!.zoom, 3, 'the max of the range input is the greatest zoom')
})

test('cropper: panned, the arrows move the crop, Alt with an arrow zooms, and so do + and -', () => {
  const { root, box, key } = setup({ root: '', modifiers: 'cropper-pan' })
  const crop = cropper(root)
  key(box, 'ArrowRight')
  assert.deepEqual(crop.value, { x: 260, y: 0, width: 500, height: 500, zoom: 1 })
  assert.equal(key(box, 'ArrowLeft', { altKey: true }), true)
  assert.deepEqual(crop.value, { x: 265, y: 5, width: 490, height: 490, zoom: 1.02 })
  key(box, 'ArrowRight', { altKey: true })
  assert.equal(crop.value!.zoom, 1)
  assert.equal(key(box, '+'), true)
  assert.equal(crop.value!.zoom, 1.25)
  key(box, '-')
  assert.equal(crop.value!.zoom, 1)
  assert.equal(key(box, '-'), true, 'still prevented at the least zoom')
  assert.equal(crop.value!.zoom, 1)
})

test('cropper: panned, a crop given with a zoom that its width does not say is zoomed about its middle', () => {
  const { root } = setup({ root: '', modifiers: 'cropper-pan' })
  const crop = cropper(root)
  crop.value = { ...crop.value!, zoom: 2 }
  assert.deepEqual(crop.value, { x: 375, y: 125, width: 250, height: 250, zoom: 2 })
  crop.value = { x: 0, y: 0, width: 400, height: 100 }
  assert.deepEqual(crop.value, { x: 0, y: 0, width: 400, height: 400, zoom: 1.25 }, 'its height is the box\'s proportions')
})

test('cropper: it writes the four properties and the ratio, and nothing else', () => {
  const { root, box, key, pointer } = setup()
  cropper(root, { ratio: 2 })
  key(box, 'ArrowRight')
  pointer(box, 'pointerdown', { pointerId: 1, clientX: 300, clientY: 150 })
  pointer(box, 'pointermove', { pointerId: 1, clientX: 310, clientY: 150 })
  pointer(box, 'pointerup', { pointerId: 1 })
  assert.deepEqual(root.getAttribute('style')!.split(';').map(part => part.split(':')[0]!.trim()).filter(Boolean).sort(), ['--cropper-height', '--cropper-ratio', '--cropper-width', '--cropper-x', '--cropper-y'])
  assert.equal(root.getAttribute('class'), 'cropper')
  assert.deepEqual(box.getAttributeNames().sort(), ['aria-label', 'class', 'role', 'tabindex'])
})

test('cropper: detach removes the listeners', () => {
  const { root, box, key, pointer, wheel, heard } = setup()
  const detach = cropper(root)
  detach()
  assert.equal(key(box, 'ArrowRight'), false)
  pointer(box, 'pointerdown', { pointerId: 1, clientX: 300, clientY: 150 })
  pointer(box, 'pointermove', { pointerId: 1, clientX: 310, clientY: 160 })
  pointer(box, 'pointerup', { pointerId: 1 })
  assert.equal(wheel({ deltaY: -100, ctrlKey: true }), false)
  assert.equal(root.style.getPropertyValue('--cropper-x'), '0.1')
  assert.deepEqual(heard, [])
  detach()
})

test('cropper: attaching twice leaves one behavior', () => {
  const { root, box, key, heard } = setup()
  const first = cropper(root)
  const second = cropper(root)
  key(box, 'ArrowRight')
  assert.equal(second.value!.x, 110, 'one step, not two')
  assert.deepEqual(heard, ['input', 'change'])
  first()
  key(box, 'ArrowRight')
  assert.equal(second.value!.x, 120, 'the first detach is spent; the second behavior still listens')
  second()
  assert.equal(key(box, 'ArrowRight'), false)
})

test('cropper: a root without a picture or a box attaches nothing', () => {
  const { one } = dom('<div class="cropper"><img class="cropper-image" width="10" height="10" alt=""></div>')
  const detach = cropper(one('.cropper'))
  assert.equal(detach.value, null)
  detach()
})

test('cropperFit: a crop inside the picture, at the least size, at a ratio or at a panned box\'s proportions', () => {
  const picture = { width: 1000, height: 500 }
  assert.deepEqual(cropperFit(picture), { x: 0, y: 0, width: 1000, height: 500 })
  assert.deepEqual(cropperFit(picture, null, { ratio: 1 }), { x: 250, y: 0, width: 500, height: 500 })
  assert.deepEqual(cropperFit(picture, { x: 900, y: -20, width: 300, height: 10 }), { x: 700, y: 0, width: 300, height: 50 })
  assert.deepEqual(cropperFit(picture, { x: 0, y: 0, width: 2000, height: 1000 }, { ratio: 2 }), { x: 0, y: 0, width: 1000, height: 500 })
  assert.deepEqual(cropperFit(picture, { x: 100, y: 100, width: 400, height: 100 }, { ratio: 1, fit: true }), { x: 200, y: 50, width: 200, height: 200 })
  assert.deepEqual(cropperFit(picture, null, { pan: true, ratio: 2, zoom: [1, 3] }), { x: 0, y: 0, width: 1000, height: 500, zoom: 1 })
  assert.deepEqual(cropperFit(picture, { x: 0, y: 0, width: 10, height: 5 }, { pan: true, ratio: 2, zoom: [1, 4] }), { x: 0, y: 0, width: 250, height: 125, zoom: 4 })
})

test('cropper: a key held down while focus leaves the box says its change as focus goes', () => {
  const { root, box, key, heard, window } = setup()
  cropper(root)
  key(box, 'ArrowRight')
  key(box, 'ArrowRight', { repeat: true })
  assert.deepEqual(heard, ['input', 'change', 'input'])
  box.dispatchEvent(new window.FocusEvent('blur'))
  assert.deepEqual(heard, ['input', 'change', 'input', 'change'], 'the keyup will be heard elsewhere')
  box.dispatchEvent(new window.KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }))
  assert.equal(heard.length, 4)
})
