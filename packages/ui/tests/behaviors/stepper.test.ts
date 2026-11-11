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
