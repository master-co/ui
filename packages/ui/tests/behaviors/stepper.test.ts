import { test, mock, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { stepper } from '../../behaviors/stepper.js'

/**
 * The stepper's behavior lends the two buttons the field's own stepDown() and stepUp(). The field is a
 * native number input and its arrow keys are the platform's: happy-dom does not step on a key, so the tests
 * assert that the behavior leaves those keys alone and follows the value they change. A hold is measured
 * with a mocked timer: 400ms before the first repeat, 60ms between repeats.
 */
const markup = (field = 'min="1" max="12" value="4"', less = 'value="-1"', more = 'value="1"') => `<div class="input-group stepper">
  <button type="button" class="btn btn-square" ${less} tabindex="-1" aria-label="Fewer seats"></button>
  <input class="input-group-field stepper-field" type="number" ${field} aria-label="Seats">
  <button type="button" class="btn btn-square" ${more} tabindex="-1" aria-label="More seats"></button>
</div>`

afterEach(() => mock.timers.reset())

/**
 * Let time pass, 20ms at a time: a mocked tick runs the timers that were due when it began, and a repeat
 * sets the next one only as it runs.
 */
const pass = (milliseconds: number) => {
  for (let passed = 0; passed < milliseconds; passed += 20) mock.timers.tick(20)
}

function setup(html = markup(), attach = true) {
  const page = dom(html)
  const root = page.one('.stepper')
  const field = page.one('.stepper-field')
  const [less, more] = page.all('.stepper button')
  const heard: string[] = []
  root.addEventListener('input', (event: any) => { if (event.target === field) heard.push('input') })
  root.addEventListener('change', (event: any) => { if (event.target === field) heard.push('change') })
  const detach = attach ? stepper(root) : () => {}
  /** A click as a pointer makes it: its detail counts the presses. */
  const tap = (button: any) => page.click(button, { detail: 1 })
  return { ...page, root, field, less, more, heard, detach, tap }
}

test('stepper: a button steps the field down or up and the field says so with input and change', () => {
  const { field, less, more, click, heard } = setup()
  click(more)
  assert.equal(field.value, '5')
  assert.deepEqual(heard, ['input', 'change'])
  click(less)
  click(less)
  assert.equal(field.value, '3')
  assert.deepEqual(heard, ['input', 'change', 'input', 'change', 'input', 'change'])
})

test('stepper: the events bubble from the field, as they do when it is typed in', () => {
  const { field, more, click, document } = setup()
  const targets: unknown[] = []
  document.addEventListener('input', (event: any) => targets.push(event.target))
  document.addEventListener('change', (event: any) => targets.push(event.target))
  click(more)
  assert.deepEqual(targets, [field, field])
})

test('stepper: a button steps by the field\'s step', () => {
  const { field, less, more, click } = setup(markup('min="0" max="1" step="0.25" value="0.5"'))
  click(more)
  assert.equal(field.value, '0.75')
  click(less)
  click(less)
  assert.equal(field.value, '0.25')
})

test('stepper: a button is disabled while the value stands at its limit', () => {
  const { field, less, more, click, heard } = setup(markup('min="1" max="3" value="2"'))
  assert.deepEqual([less.disabled, more.disabled], [false, false])
  click(more)
  assert.equal(field.value, '3')
  assert.deepEqual([less.disabled, more.disabled], [false, true])
  assert.equal(more.hasAttribute('disabled'), true, 'the attribute, which the stylesheet reads')
  click(less)
  assert.deepEqual([less.disabled, more.disabled], [false, false])
  click(less)
  assert.equal(field.value, '1')
  assert.deepEqual([less.disabled, more.disabled], [true, false])
  assert.equal(heard.length, 6)
})

test('stepper: the buttons are disabled at the limit the markup starts on', () => {
  assert.deepEqual(setup(markup('min="1" max="12" value="1"')).all('.stepper button').map((button) => button.disabled), [true, false])
  assert.deepEqual(setup(markup('min="1" max="12" value="12"')).all('.stepper button').map((button) => button.disabled), [false, true])
  assert.deepEqual(setup(markup('min="1" max="1" value="1"')).all('.stepper button').map((button) => button.disabled), [true, true])
  assert.deepEqual(setup(markup('value="0"')).all('.stepper button').map((button) => button.disabled), [false, false], 'a field without limits has none to reach')
  assert.deepEqual(setup(markup('min="1" max="12"')).all('.stepper button').map((button) => button.disabled), [false, false], 'an empty field has reached neither')
})

test('stepper: ArrowUp and ArrowDown are left to the field, and the buttons follow the value they leave', () => {
  const { field, less, more, key, type } = setup(markup('min="1" max="3" value="2"'))
  assert.equal(key(field, 'ArrowUp'), false, 'the number input steps by itself')
  assert.equal(key(field, 'ArrowDown'), false)
  type(field, '3')
  assert.deepEqual([less.disabled, more.disabled], [false, true])
  type(field, '1')
  assert.deepEqual([less.disabled, more.disabled], [true, false])
  type(field, '40')
  assert.deepEqual([less.disabled, more.disabled], [false, true], 'a typed value past the limit has reached it')
  type(field, '')
  assert.deepEqual([less.disabled, more.disabled], [false, false])
  field.value = '1'
  field.dispatchEvent(new Event('change', { bubbles: true }))
  assert.deepEqual([less.disabled, more.disabled], [true, false], 'a change is followed like an input')
})

test('stepper: a button held down repeats after a short delay and stops when the pointer lifts', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  const { field, more, pointer, tap, heard } = setup(markup('min="1" max="99" value="4"'))
  pointer(more, 'pointerdown')
  assert.equal(field.value, '4')
  mock.timers.tick(399)
  assert.equal(field.value, '4', 'not before the delay')
  mock.timers.tick(1)
  assert.equal(field.value, '5')
  pass(60)
  assert.equal(field.value, '6')
  pass(180)
  assert.equal(field.value, '9')
  assert.equal(heard.length, 10, 'each step says input and change')
  pointer(more, 'pointerup')
  tap(more)
  assert.equal(field.value, '9', 'the click that ends a hold is not one more step')
  pass(1000)
  assert.equal(field.value, '9')
  tap(more)
  assert.equal(field.value, '10', 'the next press steps again')
})

test('stepper: a press shorter than the delay is one step, when its click comes', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  const { field, less, pointer, tap } = setup()
  pointer(less, 'pointerdown')
  pass(120)
  pointer(less, 'pointerup')
  assert.equal(field.value, '4')
  tap(less)
  assert.equal(field.value, '3')
  pass(1000)
  assert.equal(field.value, '3')
})

test('stepper: a hold stops when the pointer leaves or is cancelled', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  for (const end of ['pointerleave', 'pointercancel']) {
    const { field, more, pointer } = setup(markup('min="1" max="99" value="4"'))
    pointer(more, 'pointerdown')
    pass(460)
    assert.equal(field.value, '6')
    pointer(more, end)
    pass(1000)
    assert.equal(field.value, '6', end)
  }
  const { field, more, pointer } = setup()
  pointer(more, 'pointerdown')
  pointer(more, 'pointerleave')
  pass(1000)
  assert.equal(field.value, '4', 'a pointer that left before the delay never stepped')
})

test('stepper: a hold stops at the limit, and a hold that ended without a click swallows none', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  const { field, less, more, pointer, click, tap, heard } = setup(markup('min="1" max="6" value="4"'))
  pointer(more, 'pointerdown')
  pass(2000)
  assert.equal(field.value, '6')
  assert.equal(more.disabled, true)
  assert.equal(heard.length, 4, 'two steps, and no more events at the limit')
  pointer(more, 'pointerup')
  click(less)
  assert.equal(field.value, '5', 'a click from a key right after it still steps')
  pointer(more, 'pointerdown')
  pass(400)
  assert.equal(field.value, '6')
  pointer(less, 'pointerdown')
  pointer(less, 'pointerup')
  tap(less)
  assert.equal(field.value, '5', 'and so does a press of the other button')
})

test('stepper: only the main button of a pointer holds', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  const { field, more, pointer } = setup()
  pointer(more, 'pointerdown', { button: 2 })
  pass(1000)
  assert.equal(field.value, '4')
})

test('stepper: a click with no pointer behind it steps even after a hold', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  const { field, more, pointer, click } = setup(markup('min="1" max="99" value="4"'))
  pointer(more, 'pointerdown')
  pass(400)
  pointer(more, 'pointerleave')
  click(more)
  assert.equal(field.value, '6', 'detail 0: a key or assistive technology pressed it')
})

test('stepper: without a value the button before the field steps down and the one after it up', () => {
  const { field, less, more, click } = setup(markup('min="1" max="12" value="4"', '', ''))
  click(more)
  click(more)
  assert.equal(field.value, '6')
  click(less)
  assert.equal(field.value, '5')
  field.value = '12'
  field.dispatchEvent(new Event('input', { bubbles: true }))
  assert.deepEqual([less.disabled, more.disabled], [false, true])
})

test('stepper: a disabled or read-only field is not stepped', () => {
  for (const state of ['disabled', 'readonly']) {
    const { field, more, click, heard } = setup(markup(`min="1" max="12" value="4" ${state}`))
    click(more)
    assert.equal(field.value, '4', state)
    assert.deepEqual(heard, [])
  }
})

test('stepper: detach removes the listeners, ends a hold and gives the buttons their disabled back', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  const { field, less, more, click, pointer, type, detach, heard } = setup(markup('min="1" max="12" value="1"'))
  assert.equal(less.disabled, true)
  pointer(more, 'pointerdown')
  detach()
  assert.equal(less.disabled, false)
  pass(2000)
  click(more)
  pointer(more, 'pointerdown')
  pass(2000)
  assert.equal(field.value, '1')
  type(field, '12')
  assert.equal(more.disabled, false)
  assert.deepEqual(heard, ['input'], 'only what the test typed')
})

test('stepper: attaching twice detaches the first', () => {
  const { root, field, more, click, heard } = setup()
  stepper(root)
  click(more)
  assert.equal(field.value, '5', 'one step, not two')
  assert.deepEqual(heard, ['input', 'change'])
})

test('stepper: a root without a field is left alone', () => {
  const { one, click } = dom('<div class="input-group stepper"><button type="button" class="btn">+</button></div>')
  const detach = stepper(one('.stepper'))
  click(one('button'))
  detach()
})

test('stepper: a disabled field keeps its buttons as the author left them', () => {
  const { one, all } = dom('<div class="stepper"><button type="button" disabled aria-label="Fewer">−</button><input class="stepper-field" type="number" value="2" aria-label="Seats" disabled><button type="button" disabled aria-label="More">+</button></div>')
  stepper(one('.stepper'))
  assert.deepEqual(all('button').map((button: any) => button.disabled), [true, true])
})

/** A stepper whose figure is formatted: the field and its display stacked in a stepper-value. */
const formatted = (field = 'min="0" step="250" value="1250"', label = '') => `${label}<div class="input-group stepper">
  <button type="button" class="btn btn-square" value="-1" tabindex="-1" aria-label="Lower the budget"></button>
  <span class="stepper-value">
    <input class="input-group-field stepper-field" id="budget" type="number" ${field} aria-label="Monthly budget">
    <span class="stepper-display" aria-hidden="true"></span>
  </span>
  <button type="button" class="btn btn-square" value="1" tabindex="-1" aria-label="Raise the budget"></button>
</div>`

test('stepper: format writes the figure into the display and the field\'s aria-valuetext, and the field keeps the number', () => {
  const { one, click, type } = dom(formatted())
  const field = one('.stepper-field')
  const display = one('.stepper-display')
  stepper(one('.stepper'), { format: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }, locale: 'en-US' })
  assert.equal(display.textContent, '$1,250')
  assert.equal(field.getAttribute('aria-valuetext'), '$1,250')
  assert.equal(field.value, '1250', 'the native value is the plain number')
  click(one('[aria-label="Raise the budget"]'))
  assert.equal(field.value, '1500')
  assert.equal(display.textContent, '$1,500', 'a step is written as it lands')
  type(field, '99000')
  assert.equal(display.textContent, '$99,000', 'and so is what is typed')
  type(field, '')
  assert.equal(display.textContent, '', 'an empty field shows its own placeholder')
  assert.equal(field.hasAttribute('aria-valuetext'), false)
})

test('stepper: a display without format groups the digits as the locale does', () => {
  const { one } = dom(formatted('value="1250000"'))
  stepper(one('.stepper'), { locale: 'de-DE' })
  assert.equal(one('.stepper-display').textContent, '1.250.000')
})

test('stepper: format may be a function, and a figure the same as the number is not said twice', () => {
  const { one } = dom(formatted('value="12"'))
  const handle = stepper(one('.stepper'), { format: value => `${value} px` })
  assert.equal(one('.stepper-display').textContent, '12 px')
  assert.equal(one('.stepper-field').getAttribute('aria-valuetext'), '12 px')
  const plain = dom(formatted('value="12"'))
  stepper(plain.one('.stepper'))
  assert.equal(plain.one('.stepper-display').textContent, '12')
  assert.equal(plain.one('.stepper-field').hasAttribute('aria-valuetext'), false)
  handle.value = 40
  assert.equal(one('.stepper-display').textContent, '40 px', 'a value set from outside is written too')
})

test('stepper: format without a display still says the figure', () => {
  const { one } = dom(markup('min="0" max="100" value="40"'))
  stepper(one('.stepper'), { format: { style: 'percent' }, locale: 'en-US' })
  assert.equal(one('.stepper-field').getAttribute('aria-valuetext'), '4,000%')
})

test('stepper: detach gives the display and the field the words they had', () => {
  const { one } = dom(formatted().replace('aria-label="Monthly budget"', 'aria-label="Monthly budget" aria-valuetext="Unset"').replace('aria-hidden="true"></span>', 'aria-hidden="true">1250</span>'))
  const detach = stepper(one('.stepper'), { format: { style: 'currency', currency: 'EUR' }, locale: 'en-GB' })
  assert.equal(one('.stepper-display').textContent, '€1,250.00')
  detach()
  assert.equal(one('.stepper-display').textContent, '1250')
  assert.equal(one('.stepper-field').getAttribute('aria-valuetext'), 'Unset')
})

/** A scrub: a press on a handle, moves along the line, and the lift. */
function scrubbing(html = formatted('min="0" max="5000" step="250" value="1250"', '<label class="stepper-scrub" for="budget">Budget</label>'), options = {}) {
  const page = dom(html)
  const root = page.one('.stepper')
  const field = page.one<HTMLInputElement>('.stepper-field')
  const heard: string[] = []
  root.addEventListener('input', () => heard.push('input'))
  root.addEventListener('change', () => heard.push('change'))
  const detach = stepper(root, { pixels: 4, ...options })
  // happy-dom leaves out the modifier keys and the movement a pointer event is made with; a browser fills them in.
  const at = (target: any, type: string, clientX: number, { shiftKey, movementX, ...init }: Record<string, unknown> = {}) => {
    const event = new page.window.PointerEvent(type, { bubbles: true, cancelable: true, clientX, pointerId: 1, isPrimary: true, button: 0, pointerType: 'pen', ...init })
    Object.defineProperties(event, { shiftKey: { value: Boolean(shiftKey) }, movementX: { value: movementX ?? 0 } })
    target.dispatchEvent(event)
  }
  /** Press the handle at 100, move to each x in turn, and lift where the last one was. */
  const drag = (handle: any, xs: number[], init: Record<string, unknown> = {}) => {
    at(handle, 'pointerdown', 100, init)
    for (const x of xs) at(handle, 'pointermove', x, init)
    at(handle, 'pointerup', xs.at(-1) ?? 100, init)
  }
  return { ...page, root, field, heard, detach, drag, at }
}

test('stepper: dragging a scrub label sideways steps the number, and says change once at the end', () => {
  const { one, field, heard, drag } = scrubbing()
  const label = one('.stepper-scrub')
  drag(label, [102, 104, 108])
  assert.equal(field.value, '1500', 'the first 3px only start the drag; then each 4px is one step of 250')
  assert.deepEqual(heard, ['input', 'change'])
  drag(label, [104, 106, 107])
  assert.equal(field.value, '1500', 'a step waits for the pixels it is owed')
  drag(label, [104, 108, 112, 116])
  assert.equal(field.value, '2250')
  heard.length = 0
  drag(label, [96, 92, 88])
  assert.equal(field.value, '1750', 'toward the start steps down')
  assert.deepEqual(heard, ['input', 'input', 'change'])
  assert.equal(one('.stepper-display').textContent, '1,750', 'the display follows')
})

test('stepper: Shift while scrubbing steps ten steps at a time, and a scrub stops at the limits', () => {
  const { one, field, drag } = scrubbing()
  drag(one('.stepper-scrub'), [104, 108], { shiftKey: true })
  assert.equal(field.value, '3750')
  drag(one('.stepper-scrub'), [104, 108, 112, 116, 120], { shiftKey: true })
  assert.equal(field.value, '5000', 'max holds')
})

test('stepper: a press that does not move 3px is a click, and a drag swallows the click that ends it', () => {
  const { one, field, heard, drag, click, document } = scrubbing()
  const label = one('.stepper-scrub')
  let clicks = 0
  document.addEventListener('click', (event: any) => { if (event.target === label) clicks++ })
  drag(label, [101, 102])
  click(label)
  assert.equal(field.value, '1250')
  assert.equal(clicks, 1, 'a press is still a click on the label')
  assert.deepEqual(heard, [])
  drag(label, [104, 108])
  click(label)
  assert.equal(clicks, 1, 'the click after a drag is swallowed, so the field is not focused')
  assert.equal(field.value, '1500')
})

test('stepper: a scrub handle in the well steps too, and in a right-to-left page toward the start is more', () => {
  const html = formatted('min="0" max="5000" step="250" value="1250"').replace('<span class="stepper-value">', '<span class="input-group-addon stepper-scrub" aria-hidden="true">USD</span><span class="stepper-value">')
  const { one, field, drag, root, window } = scrubbing(html)
  drag(one('.stepper-scrub'), [104, 108])
  assert.equal(field.value, '1500')
  const computed = window.getComputedStyle
  ;(globalThis as any).getComputedStyle = (element: Element) => element === root ? { direction: 'rtl' } : computed.call(window, element)
  try {
    drag(one('.stepper-scrub'), [96, 88])
    assert.equal(field.value, '2000', 'two steps up, dragged toward the start of a right-to-left line')
  } finally { (globalThis as any).getComputedStyle = computed }
})

test('stepper: with a mouse, a scrub locks the pointer and reads how far it moves', async () => {
  const { one, field, at, document } = scrubbing()
  const label = one('.stepper-scrub')
  let locked: Element | null = null
  label.requestPointerLock = () => { locked = label; return Promise.resolve() }
  Object.defineProperty(document, 'pointerLockElement', { get: () => locked, configurable: true })
  document.exitPointerLock = () => { locked = null }
  const mouse = { pointerType: 'mouse' }
  at(label, 'pointerdown', 100, mouse)
  at(label, 'pointermove', 104, mouse)
  assert.equal(locked, label)
  at(label, 'pointermove', 104, { ...mouse, movementX: 8 })
  assert.equal(field.value, '1750', 'under the lock the pointer stays put, and its movement counts')
  at(label, 'pointerup', 104, mouse)
  assert.equal(locked, null, 'the lift lets the pointer go')
})

test('stepper: a scrub does nothing to a disabled field, from another stepper\'s label, or once detached', () => {
  const disabled = scrubbing(formatted('min="0" step="250" value="1250" disabled', '<label class="stepper-scrub" for="budget">Budget</label>'))
  disabled.drag(disabled.one('.stepper-scrub'), [104, 112, 120])
  assert.equal(disabled.field.value, '1250')

  const other = scrubbing(formatted('min="0" step="250" value="1250"', '<label class="stepper-scrub" for="elsewhere">Other</label><input id="elsewhere" type="number">'))
  other.drag(other.one('.stepper-scrub'), [104, 112, 120])
  assert.equal(other.field.value, '1250')

  const { one, field, drag, detach, heard } = scrubbing()
  detach()
  drag(one('.stepper-scrub'), [104, 112, 120])
  assert.equal(field.value, '1250')
  assert.deepEqual(heard, [])
})
