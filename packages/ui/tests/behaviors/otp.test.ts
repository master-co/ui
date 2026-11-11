import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { otp } from '../../behaviors/otp.js'

/**
 * The one-time code's behavior makes six inputs one field. happy-dom types nothing by itself, so a test
 * writes what an edit leaves in a slot and dispatches the event a browser would: `type()` for a value that
 * arrives whole, an InputEvent where the event carries the character, and a paste event whose clipboard the
 * test supplies, since the helper has none.
 */
const markup = (attributes = '', slot = 'inputmode="numeric" pattern="[0-9]" maxlength="1"') => `<fieldset class="otp" aria-label="Verification code" ${attributes}>
  <input class="otp-slot" ${slot} autocomplete="one-time-code" aria-label="Digit 1">
  <input class="otp-slot" ${slot} aria-label="Digit 2">
  <input class="otp-slot" ${slot} aria-label="Digit 3">
  <span class="otp-separator" aria-hidden="true"></span>
  <input class="otp-slot" ${slot} aria-label="Digit 4">
  <input class="otp-slot" ${slot} aria-label="Digit 5">
  <input class="otp-slot" ${slot} aria-label="Digit 6">
</fieldset>
<button type="button" id="elsewhere">Resend</button>`

function setup(options?: { pattern?: RegExp }, html = markup()) {
  const page = dom(html)
  const root = page.one('.otp')
  const slots = page.all('.otp-slot')
  const codes: unknown[] = []
  const inputs: number[] = []
  root.addEventListener('change', (event: any) => { if (event.target === root) codes.push(event.detail.value) })
  root.addEventListener('input', (event: any) => inputs.push(slots.indexOf(event.target) + 1))
  const detach = otp(root, options)
  const values = () => slots.map((slot) => slot.value || '·').join('')
  /** The number of the slot in focus, from 1; 0 when focus is elsewhere. */
  const focus = () => slots.indexOf(page.document.activeElement) + 1
  /** Give the slots a code without telling the behavior, as markup with values would. */
  const given = (code: string) => slots.forEach((slot, index) => { slot.value = code[index]?.trim() ?? '' })
  /** An edit the event describes: the character it put in and what the slot holds after it. */
  const edit = (slot: any, value: string, init: Record<string, unknown>) => {
    slot.value = value
    slot.dispatchEvent(new page.window.InputEvent('input', { bubbles: true, ...init }))
  }
  const before = (slot: any, data: string) => !slot.dispatchEvent(new page.window.InputEvent('beforeinput', { bubbles: true, cancelable: true, data, inputType: 'insertText' }))
  const paste = (slot: any, text: string) => {
    const event: any = new page.window.Event('paste', { bubbles: true, cancelable: true })
    event.clipboardData = { getData: () => text }
    slot.dispatchEvent(event)
    return event.defaultPrevented
  }
  return { ...page, root, slots, codes, inputs, detach, values, focus, given, edit, before, paste }
}

test('otp: a character fills the slot and moves focus to the next one', () => {
  const { slots, type, values, focus, codes } = setup()
  slots[0].focus()
  type(slots[0], '4')
  assert.equal(values(), '4·····')
  assert.equal(focus(), 2)
  type(slots[1], '2')
  assert.equal(focus(), 3)
  assert.deepEqual(codes, [], 'the code is not whole yet')
})

test('otp: when every slot is filled the root dispatches change with the code', () => {
  const { slots, type, codes, focus, document, root } = setup()
  const targets: unknown[] = []
  document.addEventListener('change', (event: any) => targets.push(event.target))
  slots[0].focus()
  for (const [index, digit] of [...'420913'].entries()) type(slots[index], digit)
  assert.deepEqual(codes, ['420913'])
  assert.deepEqual(targets, [root], 'it bubbles from the root')
  assert.equal(focus(), 6, 'the last slot keeps focus')
  type(slots[5], '7')
  assert.deepEqual(codes, ['420913', '420917'], 'a corrected code is said again')
})

test('otp: a character the slots do not allow is refused', () => {
  const { slots, type, edit, before, values, focus, given } = setup()
  given('4')
  slots[0].focus()
  assert.equal(before(slots[0], 'a'), true, 'before it reaches the slot, where the browser lets the script')
  assert.equal(before(slots[0], '7'), false)
  assert.equal(before(slots[0], '123456'), false, 'a code that arrives as one edit is let in')
  edit(slots[0], '4a', { data: 'a', inputType: 'insertText' })
  assert.equal(values(), '4·····', 'and after it, where the browser does not: the slot is as it was')
  assert.equal(focus(), 1)
  type(slots[1], 'x')
  assert.equal(values(), '4·····')
  assert.equal(focus(), 1)
})

test('otp: a character typed beside the one a slot holds replaces it', () => {
  const { slots, edit, values, focus, given } = setup()
  given('42')
  slots[0].focus()
  edit(slots[0], '47', { data: '7', inputType: 'insertText' })
  assert.equal(values(), '72····')
  assert.equal(focus(), 2)
  edit(slots[1], '92', { data: '9', inputType: 'insertText' })
  assert.equal(values(), '79····', 'on either side of it')
  assert.equal(focus(), 3)
})

test('otp: a slot that takes focus has its character selected', () => {
  const { slots, given, key } = setup()
  given('42')
  slots[1].focus()
  assert.deepEqual([slots[1].selectionStart, slots[1].selectionEnd], [0, 1])
  slots[1].setSelectionRange(1, 1)
  key(slots[1], 'ArrowLeft')
  assert.deepEqual([slots[0].selectionStart, slots[0].selectionEnd], [0, 1])
})

test('otp: Backspace clears the slot, and in an empty slot moves focus to the slot before and clears it', () => {
  const { slots, key, values, focus, given, inputs } = setup()
  given('420')
  slots[2].focus()
  assert.equal(key(slots[2], 'Backspace'), true, 'a key the behavior handles is prevented')
  assert.equal(values(), '42····')
  assert.equal(focus(), 3, 'the slot it cleared keeps focus')
  assert.equal(key(slots[2], 'Backspace'), true)
  assert.equal(values(), '4·····')
  assert.equal(focus(), 2)
  key(slots[1], 'Backspace')
  assert.equal(values(), '······')
  assert.equal(focus(), 1)
  assert.equal(key(slots[0], 'Backspace'), true)
  assert.equal(focus(), 1, 'there is no slot before the first')
  assert.deepEqual(inputs, [3, 2, 1], 'each slot it cleared says so')
})

test('otp: Delete clears the slot and keeps focus', () => {
  const { slots, key, values, focus, given } = setup()
  given('420')
  slots[1].focus()
  assert.equal(key(slots[1], 'Delete'), true)
  assert.equal(values(), '4·0···')
  assert.equal(focus(), 2)
})

test('otp: ArrowLeft and ArrowRight move focus to the slot before and after', () => {
  const { slots, key, focus } = setup()
  slots[2].focus()
  assert.equal(key(slots[2], 'ArrowRight'), true)
  assert.equal(focus(), 4, 'across the separator')
  assert.equal(key(slots[3], 'ArrowLeft'), true)
  assert.equal(key(slots[2], 'ArrowLeft'), true)
  assert.equal(focus(), 2)
  slots[0].focus()
  assert.equal(key(slots[0], 'ArrowLeft'), true)
  assert.equal(focus(), 1, 'the keys do not wrap')
  slots[5].focus()
  key(slots[5], 'ArrowRight')
  assert.equal(focus(), 6)
})

test('otp: in right-to-left text ArrowLeft goes to the slot after and ArrowRight to the slot before', () => {
  const { slots, key, focus } = setup(undefined, markup('style="direction: rtl"'))
  slots[2].focus()
  key(slots[2], 'ArrowLeft')
  assert.equal(focus(), 4)
  key(slots[3], 'ArrowRight')
  key(slots[2], 'ArrowRight')
  assert.equal(focus(), 2)
})

test('otp: Home and End move focus to the first and the last slot', () => {
  const { slots, key, focus } = setup()
  slots[2].focus()
  assert.equal(key(slots[2], 'End'), true)
  assert.equal(focus(), 6)
  assert.equal(key(slots[5], 'Home'), true)
  assert.equal(focus(), 1)
})

test('otp: a pasted whole code fills the slots from the first, wherever it lands', () => {
  const { slots, paste, values, focus, codes, inputs, given } = setup()
  given('99')
  slots[3].focus()
  assert.equal(paste(slots[3], '420913'), true, 'the paste is the script\'s to place')
  assert.equal(values(), '420913')
  assert.equal(focus(), 6)
  assert.deepEqual(codes, ['420913'], 'said once, not once a slot')
  assert.deepEqual(inputs, [1, 2, 3, 4, 5, 6], 'every slot it wrote says so')
})

test('otp: a pasted code keeps the characters the slots allow and no more than they hold', () => {
  const { slots, paste, values, codes } = setup()
  slots[0].focus()
  paste(slots[0], ' 420-913 ')
  assert.equal(values(), '420913')
  paste(slots[2], 'Your code is 771 204. It expires in 10 minutes.')
  assert.equal(values(), '771204')
  assert.deepEqual(codes, ['420913', '771204'])
})

test('otp: a pasted part of a code is spread from the slot that has focus', () => {
  const { slots, paste, values, focus, codes } = setup()
  slots[2].focus()
  paste(slots[2], '09')
  assert.equal(values(), '··09··')
  assert.equal(focus(), 5)
  slots[4].focus()
  paste(slots[4], '123')
  assert.equal(values(), '··0912', 'what does not fit is dropped')
  assert.equal(focus(), 6)
  assert.deepEqual(codes, [])
  assert.equal(paste(slots[0], 'no digits'), true)
  assert.equal(values(), '··0912', 'a paste with nothing the slots allow changes nothing')
})

test('otp: an autofilled code that arrives in the first slot is spread over the slots', () => {
  const { slots, type, edit, values, codes, focus } = setup()
  assert.ok(slots.every((slot) => !slot.hasAttribute('maxlength')), 'no maxlength cuts the code to one character')
  type(slots[0], '420913')
  assert.equal(values(), '420913')
  assert.deepEqual(codes, ['420913'])
  assert.equal(focus(), 0, 'a code filled in while focus is elsewhere does not take it')
  slots[0].focus()
  edit(slots[0], '4771204', { data: '771204', inputType: 'insertText' })
  assert.equal(values(), '771204', 'as the value of one edit, beside what the slot held')
  assert.equal(focus(), 6)
})

test('otp: a deletion from a keyboard that names no key empties the slot and goes back', () => {
  const { slots, key, edit, values, focus, given } = setup()
  given('42')
  slots[1].focus()
  assert.equal(key(slots[1], 'Unidentified'), false)
  edit(slots[1], '', { inputType: 'deleteContentBackward' })
  assert.equal(values(), '4·····')
  assert.equal(focus(), 1)
  edit(slots[0], '', { inputType: 'deleteByCut' })
  assert.equal(focus(), 1)
})

test('otp: pattern says what a character may be, as an option or on the slots', () => {
  const letters = setup({ pattern: /[a-z]/gi })
  letters.slots[0].focus()
  letters.type(letters.slots[0], 'K')
  letters.type(letters.slots[1], '7')
  assert.equal(letters.values(), 'K·····', 'the option wins over the slots\' own pattern')
  letters.paste(letters.slots[0], 'ab-CD-ef')
  assert.equal(letters.values(), 'abCDef')
  const own = setup(undefined, markup('', 'pattern="[A-Z0-9]" maxlength="1"'))
  own.slots[0].focus()
  own.paste(own.slots[0], 'x7-Q2-kM9R')
  assert.equal(own.values(), '7Q2M9R')
  const none = setup(undefined, markup('', 'maxlength="1"'))
  none.slots[0].focus()
  none.paste(none.slots[0], 'a1b2c3')
  assert.equal(none.values(), '123···', 'digits when nothing says otherwise')
})

test('otp: the keys and a code pass over a disabled slot', () => {
  const { slots, key, paste, type, values, focus, codes } = setup(undefined, markup().replace('aria-label="Digit 3"', 'aria-label="Digit 3" disabled'))
  slots[1].focus()
  key(slots[1], 'ArrowRight')
  assert.equal(focus(), 4)
  key(slots[3], 'Backspace')
  assert.equal(focus(), 2)
  type(slots[1], '5')
  assert.equal(focus(), 4)
  paste(slots[3], '42091')
  assert.equal(values(), '42·091')
  assert.deepEqual(codes, ['42091'], 'the code is what the slots that take one hold')
})

test('otp: a key with a modifier and a key the slots have no use for are left alone', () => {
  const { slots, key, focus, values, given, document } = setup()
  given('42')
  slots[1].focus()
  assert.equal(key(slots[1], 'Backspace', { metaKey: true }), false)
  assert.equal(key(slots[1], 'ArrowLeft', { altKey: true }), false)
  assert.equal(key(slots[1], 'a', { ctrlKey: true }), false)
  for (const name of ['ArrowUp', 'ArrowDown', 'Tab', 'Enter', '7']) assert.equal(key(slots[1], name), false)
  assert.equal(key(document.querySelector('#elsewhere'), 'Home'), false)
  assert.equal(focus(), 2)
  assert.equal(values(), '42····')
})

test('otp: detach removes the listeners and gives the slots their maxlength back', () => {
  const { slots, key, type, paste, detach, focus, values, codes } = setup()
  slots[0].focus()
  detach()
  assert.ok(slots.every((slot) => slot.getAttribute('maxlength') === '1'))
  type(slots[0], '4')
  assert.equal(focus(), 1)
  assert.equal(key(slots[0], 'ArrowRight'), false)
  assert.equal(key(slots[0], 'Backspace'), false)
  assert.equal(paste(slots[0], '420913'), false)
  assert.equal(values(), '4·····')
  assert.deepEqual(codes, [])
  const bare = setup(undefined, markup('', 'inputmode="numeric"'))
  bare.detach()
  assert.ok(bare.slots.every((slot) => !slot.hasAttribute('maxlength')), 'a slot that had none gets none')
})

test('otp: attaching twice detaches the first', () => {
  const { root, slots, paste, codes, key, focus } = setup()
  const second = otp(root)
  slots[0].focus()
  paste(slots[0], '420913')
  assert.deepEqual(codes, ['420913'], 'one behavior answers')
  slots[2].focus()
  key(slots[2], 'ArrowRight')
  assert.equal(focus(), 4, 'one step, not two')
  second()
  assert.ok(slots.every((slot) => slot.getAttribute('maxlength') === '1'), 'the second gives back what the first found')
})
