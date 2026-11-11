import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { splitter } from '../../behaviors/splitter.js'

/**
 * The splitter's behavior passes one number on: the first pane's size, to --splitter-size on the root and
 * to the handle's aria-valuenow. happy-dom has no layout, so a test gives the root the box a drag is
 * measured against: 400 by 200, at 100 from the left and 50 from the top.
 */
const markup = (handle = '', root = '--splitter-size: 36%') => `<div class="splitter" style="${root}">
  <div class="splitter-pane">Files</div>
  <div class="splitter-handle" role="separator" tabindex="0" aria-label="Resize the file list" aria-valuenow="36" aria-valuemin="15" aria-valuemax="85" ${handle}></div>
  <div class="splitter-pane">Editor</div>
</div>`

function setup(handleAttributes = '', rootStyle?: string) {
  const page = dom(markup(handleAttributes, rootStyle))
  const root = page.one('.splitter')
  const handle = page.one('.splitter-handle')
  root.getBoundingClientRect = () => ({ left: 100, top: 50, right: 500, bottom: 250, width: 400, height: 200, x: 100, y: 50 })
  const captured: number[] = []
  handle.setPointerCapture = (id: number) => { captured.push(id) }
  const heard: string[] = []
  root.addEventListener('input', (event: any) => { if (event.target === handle) heard.push('input') })
  root.addEventListener('change', (event: any) => { if (event.target === handle) heard.push('change') })
  const size = () => root.style.getPropertyValue('--splitter-size')
  const now = () => handle.getAttribute('aria-valuenow')
  return { ...page, root, handle, captured, heard, size, now }
}

test('splitter: ArrowRight makes the first pane larger by a step and ArrowLeft smaller', () => {
  const { root, handle, key, heard, size, now } = setup()
  splitter(root)
  assert.equal(key(handle, 'ArrowRight'), true, 'a key the behavior handles is prevented')
  assert.equal(size(), '41%')
  assert.equal(now(), '41')
  assert.deepEqual(heard, ['input', 'change'])
  assert.equal(key(handle, 'ArrowLeft'), true)
  assert.equal(key(handle, 'ArrowLeft'), true)
  assert.equal(size(), '31%')
  assert.equal(now(), '31')
})

test('splitter: a line between panes side by side leaves ArrowUp and ArrowDown alone', () => {
  const { root, handle, key, heard, size } = setup()
  splitter(root)
  assert.equal(key(handle, 'ArrowUp'), false)
  assert.equal(key(handle, 'ArrowDown'), false)
  assert.equal(size(), '36%')
  assert.deepEqual(heard, [])
})

test('splitter: between stacked panes ArrowDown makes the first pane larger and ArrowUp smaller', () => {
  const { root, handle, key, size, now } = setup('aria-orientation="horizontal"')
  splitter(root)
  assert.equal(key(handle, 'ArrowDown'), true)
  assert.equal(size(), '41%')
  assert.equal(key(handle, 'ArrowUp'), true)
  assert.equal(key(handle, 'ArrowUp'), true)
  assert.equal(now(), '31')
  assert.equal(key(handle, 'ArrowLeft'), false, 'the other axis is left alone')
  assert.equal(key(handle, 'ArrowRight'), false)
  assert.equal(now(), '31')
})

test('splitter: from right to left the first pane is on the right, so ArrowLeft makes it larger', () => {
  const { root, handle, key, now } = setup('', '--splitter-size: 36%; direction: rtl')
  splitter(root)
  key(handle, 'ArrowLeft')
  assert.equal(now(), '41')
  key(handle, 'ArrowRight')
  key(handle, 'ArrowRight')
  assert.equal(now(), '31')
})

test('splitter: Home and End move the handle to aria-valuemin and aria-valuemax', () => {
  const { root, handle, key, heard, size, now } = setup()
  splitter(root)
  assert.equal(key(handle, 'Home'), true)
  assert.equal(size(), '15%')
  assert.equal(now(), '15')
  assert.equal(key(handle, 'End'), true)
  assert.equal(size(), '85%')
  assert.equal(now(), '85')
  assert.deepEqual(heard, ['input', 'change', 'input', 'change'])
})

test('splitter: without aria-valuemin and aria-valuemax the ends are 0 and 100', () => {
  const { root, handle, key, now } = setup()
  handle.removeAttribute('aria-valuemin')
  handle.removeAttribute('aria-valuemax')
  splitter(root)
  key(handle, 'Home')
  assert.equal(now(), '0')
  key(handle, 'End')
  assert.equal(now(), '100')
})

test('splitter: a key stops at the limit, is still prevented, and says nothing when nothing changed', () => {
  const { root, handle, key, heard, size, now } = setup()
  handle.setAttribute('aria-valuenow', '83')
  root.style.setProperty('--splitter-size', '83%')
  splitter(root)
  assert.equal(key(handle, 'ArrowRight'), true)
  assert.equal(size(), '85%')
  assert.equal(now(), '85')
  assert.deepEqual(heard, ['input', 'change'])
  assert.equal(key(handle, 'ArrowRight'), true)
  assert.equal(key(handle, 'End'), true)
  assert.equal(size(), '85%')
  assert.deepEqual(heard, ['input', 'change'], 'no event without a change')
})

test('splitter: the step is an option', () => {
  const { root, handle, key, now } = setup()
  splitter(root, { step: 10 })
  key(handle, 'ArrowRight')
  assert.equal(now(), '46')
})

test('splitter: keys it does not handle, and keys held with a modifier, are left alone', () => {
  const { root, handle, key, heard, now } = setup()
  splitter(root)
  for (const name of ['Enter', ' ', 'Tab', 'PageDown', 'a']) assert.equal(key(handle, name), false, name)
  assert.equal(key(handle, 'ArrowRight', { ctrlKey: true }), false)
  assert.equal(key(handle, 'ArrowRight', { metaKey: true }), false)
  assert.equal(key(handle, 'End', { altKey: true }), false)
  assert.equal(now(), '36')
  assert.deepEqual(heard, [])
})

test('splitter: a drag writes the pointer\'s place in the root as a percentage, and says change once when it ends', () => {
  const { root, handle, pointer, captured, heard, size, now } = setup()
  splitter(root)
  pointer(handle, 'pointerdown', { pointerId: 7, clientX: 244 })
  assert.deepEqual(captured, [7], 'the handle captures the pointer')
  assert.equal(size(), '36%', 'pressing the handle does not move it')
  pointer(handle, 'pointermove', { pointerId: 7, clientX: 300 })
  assert.equal(size(), '50%')
  assert.equal(now(), '50')
  pointer(handle, 'pointermove', { pointerId: 7, clientX: 333 })
  assert.equal(size(), '58.25%')
  assert.equal(now(), '58', 'aria-valuenow is a whole number')
  assert.deepEqual(heard, ['input', 'input'])
  pointer(handle, 'pointerup', { pointerId: 7, clientX: 333 })
  pointer(handle, 'lostpointercapture', { pointerId: 7 })
  assert.deepEqual(heard, ['input', 'input', 'change'])
  pointer(handle, 'pointermove', { pointerId: 7, clientX: 400 })
  assert.equal(size(), '58.25%', 'a move after the pointer is released does nothing')
})

test('splitter: a drag stays between aria-valuemin and aria-valuemax', () => {
  const { root, handle, pointer, size, now } = setup()
  splitter(root)
  pointer(handle, 'pointerdown', { pointerId: 1, clientX: 244 })
  pointer(handle, 'pointermove', { pointerId: 1, clientX: 20 })
  assert.equal(size(), '15%')
  assert.equal(now(), '15')
  pointer(handle, 'pointermove', { pointerId: 1, clientX: 900 })
  assert.equal(size(), '85%')
  assert.equal(now(), '85')
})

test('splitter: between stacked panes a drag reads the pointer from the top', () => {
  const { root, handle, pointer, size } = setup('aria-orientation="horizontal"')
  splitter(root)
  pointer(handle, 'pointerdown', { pointerId: 1, clientX: 300, clientY: 122 })
  pointer(handle, 'pointermove', { pointerId: 1, clientX: 300, clientY: 150 })
  assert.equal(size(), '50%')
})

test('splitter: from right to left a drag reads the pointer from the right', () => {
  const { root, handle, pointer, size } = setup('', '--splitter-size: 36%; direction: rtl')
  splitter(root)
  pointer(handle, 'pointerdown', { pointerId: 1, clientX: 356 })
  pointer(handle, 'pointermove', { pointerId: 1, clientX: 400 })
  assert.equal(size(), '25%')
})

test('splitter: only the pointer that holds the handle moves it', () => {
  const { root, handle, pointer, heard, size } = setup()
  splitter(root)
  pointer(handle, 'pointermove', { pointerId: 1, clientX: 300 })
  assert.equal(size(), '36%', 'a move without a press')
  pointer(handle, 'pointerdown', { pointerId: 1, clientX: 244, button: 2 })
  pointer(handle, 'pointermove', { pointerId: 1, clientX: 300 })
  assert.equal(size(), '36%', 'a press of another button')
  pointer(handle, 'pointerdown', { pointerId: 1, clientX: 244 })
  pointer(handle, 'pointermove', { pointerId: 2, clientX: 300 })
  assert.equal(size(), '36%', 'a second pointer')
  pointer(handle, 'pointerup', { pointerId: 2 })
  pointer(handle, 'pointermove', { pointerId: 1, clientX: 300 })
  assert.equal(size(), '50%')
  pointer(handle, 'pointerup', { pointerId: 1 })
  assert.deepEqual(heard, ['input', 'change'])
})

test('splitter: a press and a release without a move says nothing, and a cancelled drag ends', () => {
  const { root, handle, pointer, heard, size } = setup()
  splitter(root)
  pointer(handle, 'pointerdown', { pointerId: 1, clientX: 244 })
  pointer(handle, 'pointerup', { pointerId: 1, clientX: 244 })
  assert.deepEqual(heard, [])
  pointer(handle, 'pointerdown', { pointerId: 1, clientX: 244 })
  pointer(handle, 'pointermove', { pointerId: 1, clientX: 300 })
  pointer(handle, 'pointercancel', { pointerId: 1 })
  assert.deepEqual(heard, ['input', 'change'])
  pointer(handle, 'pointermove', { pointerId: 1, clientX: 340 })
  assert.equal(size(), '50%')
})

test('splitter: a drag works when the pointer cannot be captured, and when the root has no box', () => {
  const { root, handle, pointer, size } = setup()
  handle.setPointerCapture = () => { throw new Error('NotFoundError') }
  splitter(root)
  pointer(handle, 'pointerdown', { pointerId: 1, clientX: 244 })
  pointer(handle, 'pointermove', { pointerId: 1, clientX: 300 })
  assert.equal(size(), '50%')
  root.getBoundingClientRect = () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 })
  pointer(handle, 'pointermove', { pointerId: 1, clientX: 300 })
  assert.equal(size(), '50%', 'no size is written from a root that is not laid out')
})

test('splitter: a disabled handle takes no key and no pointer', () => {
  const { root, handle, key, pointer, captured, heard, size, now } = setup('aria-disabled="true"')
  splitter(root)
  assert.equal(key(handle, 'ArrowRight'), false)
  assert.equal(key(handle, 'Home'), false)
  pointer(handle, 'pointerdown', { pointerId: 1, clientX: 244 })
  pointer(handle, 'pointermove', { pointerId: 1, clientX: 300 })
  pointer(handle, 'pointerup', { pointerId: 1 })
  assert.deepEqual(captured, [])
  assert.equal(size(), '36%')
  assert.equal(now(), '36')
  assert.deepEqual(heard, [])
})

test('splitter: it sets --splitter-size and aria-valuenow and nothing else', () => {
  const { root, handle, key } = setup()
  splitter(root)
  key(handle, 'ArrowRight')
  assert.equal(root.getAttribute('style'), '--splitter-size: 41%;')
  assert.equal(root.getAttribute('class'), 'splitter')
  assert.deepEqual(handle.getAttributeNames().sort(), ['aria-label', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow', 'class', 'role', 'tabindex'])
  assert.equal(handle.getAttribute('aria-valuemin'), '15')
  assert.equal(handle.getAttribute('aria-valuemax'), '85')
})

test('splitter: the handle is the root\'s own, not the one of a splitter in a pane', () => {
  const { one, all, key } = dom(`<div class="splitter" id="outer">
  <div class="splitter-pane">
    <div class="splitter" id="inner">
      <div class="splitter-pane"></div>
      <div class="splitter-handle" role="separator" tabindex="0" aria-label="Inner" aria-valuenow="50"></div>
      <div class="splitter-pane"></div>
    </div>
  </div>
  <div class="splitter-handle" role="separator" tabindex="0" aria-label="Outer" aria-valuenow="30"></div>
  <div class="splitter-pane"></div>
</div>`)
  const [inner, outer] = all('.splitter-handle')
  splitter(one('#outer'))
  assert.equal(key(inner, 'ArrowRight'), false)
  assert.equal(inner.getAttribute('aria-valuenow'), '50')
  assert.equal(key(outer, 'ArrowRight'), true)
  assert.equal(outer.getAttribute('aria-valuenow'), '35')
  assert.equal(one('#outer').style.getPropertyValue('--splitter-size'), '35%')
  assert.equal(one('#inner').style.getPropertyValue('--splitter-size'), '')
})

test('splitter: detach removes the listeners', () => {
  const { root, handle, key, pointer, heard, size, now } = setup()
  const detach = splitter(root)
  detach()
  assert.equal(key(handle, 'ArrowRight'), false)
  assert.equal(key(handle, 'End'), false)
  pointer(handle, 'pointerdown', { pointerId: 1, clientX: 244 })
  pointer(handle, 'pointermove', { pointerId: 1, clientX: 300 })
  pointer(handle, 'pointerup', { pointerId: 1 })
  assert.equal(size(), '36%')
  assert.equal(now(), '36')
  assert.deepEqual(heard, [])
  detach()
})

test('splitter: attaching twice leaves one behavior', () => {
  const { root, handle, key, heard, now } = setup()
  const first = splitter(root)
  const second = splitter(root)
  key(handle, 'ArrowRight')
  assert.equal(now(), '41', 'one step, not two')
  assert.deepEqual(heard, ['input', 'change'])
  first()
  key(handle, 'ArrowRight')
  assert.equal(now(), '46', 'the first detach is spent; the second behavior still listens')
  second()
  assert.equal(key(handle, 'ArrowRight'), false)
})

test('splitter: a root without a handle attaches nothing', () => {
  const { one } = dom('<div class="splitter"><div class="splitter-pane"></div></div>')
  const detach = splitter(one('.splitter'))
  assert.equal(typeof detach, 'function')
  detach()
})
