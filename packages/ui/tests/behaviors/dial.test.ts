import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { dial } from '../../behaviors/dial.js'

/**
 * The dial's behavior passes one number on: to aria-valuenow and --dial-value on the root, to the text of
 * dial-value and to the hidden input a form submits. happy-dom has no layout and no stylesheet, so a test
 * gives the root its box, 120 by 120 at 100 from the left and 50 from the top, with its middle at (160, 110),
 * and a full circle says so with its modifier or with --dial-sweep in a style.
 */
const markup = (attributes = 'aria-valuenow="40"', style = '', classes = 'dial', label = '40%') => `<form>
<div class="${classes}" role="slider" tabindex="0" aria-label="Volume" ${attributes} style="${style}">
  <span class="dial-value">${label}</span>
  <span class="dial-thumb"></span>
  <input type="hidden" name="volume" value="40">
</div>
</form>`

function setup(attributes?: string, style?: string, classes?: string, label?: string) {
  const page = dom(markup(attributes, style, classes, label))
  const root = page.one<HTMLElement>('.dial')
  root.getBoundingClientRect = () => ({ left: 100, top: 50, right: 220, bottom: 170, width: 120, height: 120, x: 100, y: 50 }) as DOMRect
  const captured: number[] = []
  root.setPointerCapture = (id: number) => { captured.push(id) }
  const heard: string[] = []
  root.addEventListener('input', () => heard.push('input'))
  root.addEventListener('change', () => heard.push('change'))
  const now = () => root.getAttribute('aria-valuenow')
  const drawn = () => root.style.getPropertyValue('--dial-value')
  const shown = () => page.one('.dial-value').textContent
  const field = page.one<HTMLInputElement>('input[type="hidden"]')
  /** A point on a circle around the middle, at an angle clockwise from the top. */
  const toward = (degrees: number, distance = 50) => ({
    clientX: 160 + distance * Math.sin(degrees * Math.PI / 180),
    clientY: 110 - distance * Math.cos(degrees * Math.PI / 180),
  })
  return { ...page, root, captured, heard, now, drawn, shown, field, toward }
}

test('dial: attaching draws the first value everywhere it is read, and says nothing', () => {
  const { root, heard, now, drawn, shown, field } = setup('aria-valuenow="40"', '', 'dial', '')
  field.value = ''
  dial(root)
  assert.equal(now(), '40')
  assert.equal(drawn(), '40', 'the custom property is written for a browser without typed attr()')
  assert.equal(shown(), '40')
  assert.equal(field.value, '40')
  assert.deepEqual(heard, [])
})

test('dial: ArrowUp and ArrowRight turn the value up by a step, ArrowDown and ArrowLeft down', () => {
  const { root, key, heard, now, drawn, shown, field } = setup()
  dial(root)
  assert.equal(key(root, 'ArrowUp'), true, 'a key the behavior handles is prevented')
  assert.equal(now(), '41')
  assert.equal(drawn(), '41')
  assert.equal(shown(), '41%', 'the label keeps the words around the number')
  assert.equal(field.value, '41', 'the form gets the value')
  assert.deepEqual(heard, ['input', 'change'])
  assert.equal(key(root, 'ArrowRight'), true)
  assert.equal(now(), '42')
  assert.equal(key(root, 'ArrowDown'), true)
  assert.equal(key(root, 'ArrowLeft'), true)
  assert.equal(key(root, 'ArrowLeft'), true)
  assert.equal(now(), '39')
})

test('dial: from right to left the arrows turn the same way, since a dial turns clockwise in every direction', () => {
  const { root, key, now } = setup('aria-valuenow="40"', 'direction: rtl')
  dial(root)
  key(root, 'ArrowRight')
  assert.equal(now(), '41')
  key(root, 'ArrowLeft')
  key(root, 'ArrowLeft')
  assert.equal(now(), '39')
})

test('dial: PageUp and PageDown turn by a tenth of the range, or by the page given', () => {
  const { root, key, now } = setup('aria-valuenow="40" aria-valuemin="0" aria-valuemax="200"')
  const detach = dial(root)
  assert.equal(key(root, 'PageUp'), true)
  assert.equal(now(), '60')
  assert.equal(key(root, 'PageDown'), true)
  assert.equal(key(root, 'PageDown'), true)
  assert.equal(now(), '20')
  detach()
  dial(root, { page: 5 })
  key(root, 'PageUp')
  assert.equal(now(), '25')
})

test('dial: Home and End move to aria-valuemin and aria-valuemax', () => {
  const { root, key, heard, now } = setup('aria-valuenow="40" aria-valuemin="10" aria-valuemax="90"')
  dial(root)
  assert.equal(key(root, 'Home'), true)
  assert.equal(now(), '10')
  assert.equal(key(root, 'End'), true)
  assert.equal(now(), '90')
  assert.deepEqual(heard, ['input', 'change', 'input', 'change'])
})

test('dial: without aria-valuemin and aria-valuemax the ends are 0 and 100', () => {
  const { root, key, now } = setup()
  dial(root)
  key(root, 'Home')
  assert.equal(now(), '0')
  key(root, 'End')
  assert.equal(now(), '100')
})

test('dial: a knob stops at its ends, still prevents the key, and says nothing when nothing changed', () => {
  const { root, key, heard, now } = setup('aria-valuenow="99"')
  dial(root)
  assert.equal(key(root, 'ArrowUp'), true)
  assert.equal(now(), '100')
  assert.equal(key(root, 'ArrowUp'), true)
  assert.equal(key(root, 'PageUp'), true)
  assert.equal(key(root, 'End'), true)
  assert.equal(now(), '100')
  assert.deepEqual(heard, ['input', 'change'], 'no event without a change')
})

test('dial: round a full circle the value comes round, and End is the last step before it does', () => {
  const { root, key, now, drawn } = setup('aria-valuenow="358" aria-valuemin="0" aria-valuemax="360"', '', 'dial dial-full', '358°')
  dial(root)
  key(root, 'ArrowUp')
  assert.equal(now(), '359')
  key(root, 'ArrowUp')
  assert.equal(now(), '0', 'the greatest value is the least again')
  assert.equal(drawn(), '0')
  key(root, 'ArrowDown')
  assert.equal(now(), '359')
  key(root, 'PageUp')
  assert.equal(now(), '35')
  key(root, 'End')
  assert.equal(now(), '359')
  key(root, 'Home')
  assert.equal(now(), '0')
})

test('dial: a sweep of the whole circle in the stylesheet comes round too, without the modifier', () => {
  const { root, key, now } = setup('aria-valuenow="359" aria-valuemax="360"', '--dial-start: 0deg; --dial-sweep: 360deg')
  dial(root)
  key(root, 'ArrowUp')
  assert.equal(now(), '0')
})

test('dial: the step is an option, and the value stays on a step with its decimals', () => {
  const { root, key, now, shown } = setup('aria-valuenow="0.5" aria-valuemin="0" aria-valuemax="1"', '', 'dial', '0.5')
  dial(root, { step: 0.1 })
  key(root, 'ArrowUp')
  key(root, 'ArrowUp')
  assert.equal(now(), '0.7', 'no floating point dust')
  assert.equal(shown(), '0.7')
  key(root, 'PageUp')
  assert.equal(now(), '0.8', 'a tenth of the range is one step here')
})

test('dial: text writes the label and aria-valuetext', () => {
  const { root, key, shown } = setup('aria-valuenow="90" aria-valuemax="360"', '', 'dial dial-full', '90°')
  dial(root, { text: (value: number) => `${value}°` })
  assert.equal(root.getAttribute('aria-valuetext'), '90°')
  key(root, 'ArrowUp')
  assert.equal(shown(), '91°')
  assert.equal(root.getAttribute('aria-valuetext'), '91°')
})

test('dial: without text, aria-valuetext keeps its words around the new number', () => {
  const { root, key } = setup('aria-valuenow="40" aria-valuetext="40 percent"')
  dial(root)
  key(root, 'ArrowUp')
  assert.equal(root.getAttribute('aria-valuetext'), '41 percent')
})

test('dial: keys it does not handle, and keys held with a modifier, are left alone', () => {
  const { root, key, heard, now } = setup()
  dial(root)
  for (const name of ['Enter', ' ', 'Tab', 'Escape', 'a']) assert.equal(key(root, name), false, name)
  assert.equal(key(root, 'ArrowUp', { ctrlKey: true }), false)
  assert.equal(key(root, 'ArrowUp', { metaKey: true }), false)
  assert.equal(key(root, 'End', { altKey: true }), false)
  assert.equal(now(), '40')
  assert.deepEqual(heard, [])
})

test('dial: a press on the track moves the value there, and a drag follows the pointer round the knob', () => {
  const { root, pointer, toward, captured, heard, now, shown } = setup()
  dial(root)
  // The knob runs 270 degrees from 225: the top, 0 degrees, is halfway.
  pointer(root, 'pointerdown', { pointerId: 3, ...toward(0) })
  assert.deepEqual(captured, [3], 'the dial captures the pointer')
  assert.equal(now(), '50')
  assert.equal(shown(), '50%')
  pointer(root, 'pointermove', { pointerId: 3, ...toward(90) })
  assert.equal(now(), '83', 'a quarter turn on is a third of the range')
  pointer(root, 'pointermove', { pointerId: 3, ...toward(0) })
  pointer(root, 'pointermove', { pointerId: 3, ...toward(270) })
  assert.equal(now(), '17')
  assert.deepEqual(heard, ['input', 'input', 'input', 'input'])
  pointer(root, 'pointerup', { pointerId: 3 })
  pointer(root, 'lostpointercapture', { pointerId: 3 })
  assert.deepEqual(heard, ['input', 'input', 'input', 'input', 'change'], 'change once, when the drag ends')
  pointer(root, 'pointermove', { pointerId: 3, ...toward(0) })
  assert.equal(now(), '17', 'a move after the pointer is released does nothing')
})

test('dial: a press on the thumb turns from where it was taken, without a jump', () => {
  const { root, pointer, toward, heard, now, one } = setup('aria-valuenow="50"')
  dial(root)
  // The thumb of 50 stands at the top; the pointer takes it 6 degrees to its right.
  pointer(one('.dial-thumb'), 'pointerdown', { pointerId: 1, ...toward(6) })
  assert.equal(now(), '50', 'taking the thumb does not move it')
  pointer(root, 'pointermove', { pointerId: 1, ...toward(33) })
  assert.equal(now(), '60', 'it turns by as much as the pointer did')
  pointer(root, 'pointerup', { pointerId: 1 })
  assert.deepEqual(heard, ['input', 'change'])
})

test('dial: in the gap at the foot of a knob the value is the nearer end, and a drag does not jump through it', () => {
  const { root, pointer, toward, now } = setup('aria-valuenow="50"')
  dial(root)
  pointer(root, 'pointerdown', { pointerId: 1, ...toward(170) })
  assert.equal(now(), '100', 'right of the foot is the greatest end')
  pointer(root, 'pointerup', { pointerId: 1 })
  pointer(root, 'pointerdown', { pointerId: 1, ...toward(190) })
  assert.equal(now(), '0', 'left of it the least')
  pointer(root, 'pointerup', { pointerId: 1 })

  pointer(root, 'pointerdown', { pointerId: 2, ...toward(120) })
  assert.equal(now(), '94')
  pointer(root, 'pointermove', { pointerId: 2, ...toward(160) })
  assert.equal(now(), '100')
  pointer(root, 'pointermove', { pointerId: 2, ...toward(200) })
  assert.equal(now(), '100', 'through the gap it stays at the end it reached')
  pointer(root, 'pointermove', { pointerId: 2, ...toward(240) })
  assert.equal(now(), '100', 'and past it, until the pointer comes back')
  pointer(root, 'pointermove', { pointerId: 2, ...toward(110) })
  assert.equal(now(), '91')
})

test('dial: round a full circle a drag comes round through the top', () => {
  const { root, pointer, toward, now } = setup('aria-valuenow="350" aria-valuemax="360"', '', 'dial dial-full', '350°')
  dial(root)
  pointer(root, 'pointerdown', { pointerId: 1, ...toward(350) })
  assert.equal(now(), '350')
  pointer(root, 'pointermove', { pointerId: 1, ...toward(359.6) })
  assert.equal(now(), '0', '360 is 0')
  pointer(root, 'pointermove', { pointerId: 1, ...toward(12) })
  assert.equal(now(), '12')
})

test('dial: the middle of the dial and a dial that is not laid out take no angle', () => {
  const { root, pointer, toward, heard, now } = setup()
  dial(root)
  pointer(root, 'pointerdown', { pointerId: 1, ...toward(90, 4) })
  assert.equal(now(), '40', 'a press on the figure in the middle does not move the value')
  pointer(root, 'pointermove', { pointerId: 1, ...toward(0) })
  assert.equal(now(), '50', 'a drag out of the middle does')
  pointer(root, 'pointerup', { pointerId: 1 })
  assert.deepEqual(heard, ['input', 'change'])
  root.getBoundingClientRect = () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }) as DOMRect
  pointer(root, 'pointerdown', { pointerId: 2, ...toward(90) })
  pointer(root, 'pointermove', { pointerId: 2, ...toward(180) })
  pointer(root, 'pointerup', { pointerId: 2 })
  assert.equal(now(), '50')
  assert.deepEqual(heard, ['input', 'change'])
})

test('dial: a drag reads the dial\'s box and its angles once, as it begins, not on every move', () => {
  const { root, pointer, toward, now, window } = setup()
  dial(root)
  const box = root.getBoundingClientRect
  let boxes = 0
  root.getBoundingClientRect = () => { boxes++; return box() }
  const style = window.getComputedStyle
  let styles = 0
  ;(globalThis as any).getComputedStyle = (element: Element, pseudo?: string) => { if (element === root) styles++; return style.call(window, element, pseudo) }
  try {
    pointer(root, 'pointerdown', { pointerId: 5, ...toward(0) })
    const [atPress, stylesAtPress] = [boxes, styles]
    for (const degrees of [10, 20, 30, 40, 50]) pointer(root, 'pointermove', { pointerId: 5, ...toward(degrees) })
    assert.equal(boxes, atPress)
    assert.equal(styles, stylesAtPress)
    assert.equal(now(), '69', 'the moves still follow the pointer')
    pointer(root, 'pointerup', { pointerId: 5 })
  } finally {
    ;(globalThis as any).getComputedStyle = style
  }
})

test('dial: only the pointer that holds the dial turns it, and a press and release without a change says nothing', () => {
  const { root, pointer, toward, heard, now } = setup('aria-valuenow="50"')
  dial(root)
  pointer(root, 'pointermove', { pointerId: 1, ...toward(90) })
  assert.equal(now(), '50', 'a move without a press')
  pointer(root, 'pointerdown', { pointerId: 1, button: 2, ...toward(90) })
  assert.equal(now(), '50', 'a press of another button')
  pointer(root, 'pointerdown', { pointerId: 1, ...toward(0) })
  pointer(root, 'pointermove', { pointerId: 2, ...toward(90) })
  assert.equal(now(), '50', 'a second pointer')
  pointer(root, 'pointerup', { pointerId: 2 })
  pointer(root, 'pointerup', { pointerId: 1 })
  assert.deepEqual(heard, [], 'the press landed on the value it had')
  pointer(root, 'pointerdown', { pointerId: 1, ...toward(0) })
  pointer(root, 'pointermove', { pointerId: 1, ...toward(90) })
  pointer(root, 'pointercancel', { pointerId: 1 })
  assert.deepEqual(heard, ['input', 'change'], 'a cancelled drag ends')
})

test('dial: a second finger while one turns the dial takes nothing from it', () => {
  const { root, pointer, toward, heard, now } = setup('aria-valuenow="50"')
  dial(root)
  pointer(root, 'pointerdown', { pointerId: 1, isPrimary: true, ...toward(0) })
  pointer(root, 'pointermove', { pointerId: 1, ...toward(45) })
  assert.equal(now(), '67')
  pointer(root, 'pointerdown', { pointerId: 2, isPrimary: false, ...toward(270) })
  assert.equal(now(), '67', 'the second finger does not move the value')
  pointer(root, 'pointermove', { pointerId: 2, ...toward(300) })
  pointer(root, 'pointermove', { pointerId: 1, ...toward(90) })
  assert.equal(now(), '83', 'the first finger still turns it')
  pointer(root, 'pointerup', { pointerId: 2 })
  pointer(root, 'pointerup', { pointerId: 1 })
  assert.deepEqual(heard, ['input', 'input', 'change'])
})

test('dial: a drag works when the pointer cannot be captured', () => {
  const { root, pointer, toward, now } = setup()
  root.setPointerCapture = () => { throw new Error('NotFoundError') }
  dial(root)
  pointer(root, 'pointerdown', { pointerId: 1, ...toward(0) })
  assert.equal(now(), '50')
})

test('dial: the wheel turns the dial only when asked, and only while Alt is held', () => {
  const { root, window, heard, now } = setup()
  const wheel = ({ altKey = false, ...init }: Record<string, unknown>) => {
    const event = new window.WheelEvent('wheel', { bubbles: true, cancelable: true, ...init })
    // happy-dom's WheelEvent takes no modifier keys.
    Object.defineProperty(event, 'altKey', { value: altKey })
    root.dispatchEvent(event)
    return event.defaultPrevented
  }
  const detach = dial(root)
  assert.equal(wheel({ deltaY: -100, altKey: true }), false, 'without the option the page scrolls')
  assert.equal(now(), '40')
  detach()
  dial(root, { wheel: true })
  assert.equal(wheel({ deltaY: -100 }), false, 'without Alt the page scrolls')
  assert.equal(now(), '40')
  assert.equal(wheel({ deltaY: -100, altKey: true }), true)
  assert.equal(now(), '41', 'a notch away from the reader is a step up')
  assert.deepEqual(heard, ['input', 'change'])
  wheel({ deltaY: -240, altKey: true })
  assert.equal(now(), '42', 'a notch is one step however far it scrolls')
  wheel({ deltaY: 20, altKey: true })
  assert.equal(now(), '42', 'a trackpad gathers its small moves into a step')
  wheel({ deltaY: 30, altKey: true })
  assert.equal(now(), '41')
  wheel({ deltaY: 3, deltaMode: 1, altKey: true })
  assert.equal(now(), '40', 'a wheel that scrolls by lines turns a step with each event')
})

test('dial: a disabled dial takes no key, no pointer and no wheel', () => {
  const { root, key, pointer, toward, window, captured, heard, now } = setup('aria-valuenow="40" aria-disabled="true"')
  dial(root, { wheel: true })
  assert.equal(key(root, 'ArrowUp'), false)
  assert.equal(key(root, 'Home'), false)
  pointer(root, 'pointerdown', { pointerId: 1, ...toward(0) })
  pointer(root, 'pointermove', { pointerId: 1, ...toward(90) })
  pointer(root, 'pointerup', { pointerId: 1 })
  const turned = new window.WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -100 })
  Object.defineProperty(turned, 'altKey', { value: true })
  root.dispatchEvent(turned)
  assert.deepEqual(captured, [])
  assert.equal(now(), '40')
  assert.deepEqual(heard, [])
})

test('dial: value reads the number and sets it on a step within the ends, and setting it says nothing', () => {
  const { root, heard, now, shown, field } = setup()
  const handle = dial(root)
  assert.equal(handle.value, 40)
  handle.value = 72.4
  assert.equal(handle.value, 72)
  assert.equal(now(), '72')
  assert.equal(shown(), '72%')
  assert.equal(field.value, '72')
  handle.value = 140
  assert.equal(handle.value, 100, 'it stops at aria-valuemax')
  handle.value = Number.NaN
  assert.equal(handle.value, 100)
  assert.deepEqual(heard, [])
})

test('dial: the hidden input is what a form submits', () => {
  const { root, key, one, window } = setup()
  dial(root)
  key(root, 'End')
  assert.equal(new window.FormData(one('form')).get('volume'), '100')
})

test('dial: it sets what it passes on and nothing else', () => {
  const { root, key } = setup()
  dial(root)
  key(root, 'ArrowUp')
  assert.equal(root.getAttribute('class'), 'dial')
  assert.deepEqual(root.getAttributeNames().sort(), ['aria-label', 'aria-valuenow', 'class', 'role', 'style', 'tabindex'])
  assert.equal(root.getAttribute('style'), '--dial-value: 41;')
})

test('dial: detach removes the listeners', () => {
  const { root, key, pointer, toward, heard, now } = setup()
  const detach = dial(root)
  detach()
  assert.equal(key(root, 'ArrowUp'), false)
  assert.equal(key(root, 'End'), false)
  pointer(root, 'pointerdown', { pointerId: 1, ...toward(0) })
  pointer(root, 'pointermove', { pointerId: 1, ...toward(90) })
  pointer(root, 'pointerup', { pointerId: 1 })
  assert.equal(now(), '40')
  assert.deepEqual(heard, [])
  detach()
})

test('dial: attaching twice leaves one behavior', () => {
  const { root, key, heard, now } = setup()
  const first = dial(root)
  const second = dial(root)
  key(root, 'ArrowUp')
  assert.equal(now(), '41', 'one step, not two')
  assert.deepEqual(heard, ['input', 'change'])
  first()
  key(root, 'ArrowUp')
  assert.equal(now(), '42', 'the first detach is spent; the second behavior still listens')
  second()
  assert.equal(key(root, 'ArrowUp'), false)
})

test('dial: a dial without a label or a field still turns', () => {
  const { one, key } = dom('<div class="dial" role="slider" tabindex="0" aria-label="Volume" aria-valuenow="3"><span class="dial-thumb"></span></div>')
  const root = one<HTMLElement>('.dial')
  dial(root)
  assert.equal(key(root, 'ArrowUp'), true)
  assert.equal(root.getAttribute('aria-valuenow'), '4')
})

test('dial: a press gives the dial focus without scrolling the page, so the keys go on from it', () => {
  const { root, pointer, toward, document, key, now } = setup()
  dial(root)
  const asked: unknown[] = []
  const original = root.focus.bind(root)
  root.focus = (options?: FocusOptions) => { asked.push(options); original(options) }
  pointer(root, 'pointerdown', { pointerId: 1, pointerType: 'touch', ...toward(0) })
  pointer(root, 'pointerup', { pointerId: 1 })
  assert.equal(document.activeElement, root)
  assert.deepEqual(asked, [{ preventScroll: true }])
  const value = Number(now())
  key(root, 'ArrowUp')
  assert.equal(Number(now()), value + 1)
  pointer(root, 'pointerdown', { pointerId: 2, ...toward(0) })
  assert.equal(asked.length, 1, 'a dial that has focus is not focused again')
})

test('dial: a disabled dial takes no focus from a press', () => {
  const { root, pointer, toward, document } = setup('aria-disabled="true"')
  dial(root)
  pointer(root, 'pointerdown', { pointerId: 1, ...toward(0) })
  assert.notEqual(document.activeElement, root)
})
