import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { tags } from '../../behaviors/tags.js'

/** happy-dom catches what a listener throws and reports it on the window; a test must not pass over it. */
const thrown: unknown[] = []
afterEach(() => assert.deepEqual(thrown.splice(0), [], 'a listener threw'))

/** The contract's example in a form, with a button outside it. */
const markup = `<form>
  <div class="tags input-group input-group-wrap">
    <span class="chip" data-value="design">design<input type="hidden" name="labels" value="design"><button type="button" class="chip-remove" tabindex="-1" aria-label="Remove design"></button></span>
    <span class="chip" data-value="research">research<input type="hidden" name="labels" value="research"><button type="button" class="chip-remove" tabindex="-1" aria-label="Remove research"></button></span>
    <input class="input-group-field" aria-label="Labels" autocomplete="off">
  </div>
</form>
<button type="button" id="elsewhere">Elsewhere</button>`

function setup(html = markup) {
  const page = dom(html)
  page.window.addEventListener('error', (event: any) => thrown.push(event.error ?? event.message))
  const root = page.one('.tags')
  const field = page.one<HTMLInputElement>('.input-group-field')
  const heard: string[] = []
  root.addEventListener('input', (event: any) => { if (event.target === root) heard.push('input') })
  root.addEventListener('change', (event: any) => { if (event.target === root) heard.push('change') })
  const chips = () => page.all('.chip').map(chip => chip.getAttribute('data-value'))
  const hidden = () => page.all<HTMLInputElement>('.chip input[type="hidden"]').map(input => `${input.name}=${input.value}`)
  const focused = () => page.document.activeElement
  const removeOf = (value: string) => page.one(`.chip[data-value="${value}"] .chip-remove`)
  /** Put the caret at a place in the field. */
  const caret = (at: number) => field.setSelectionRange(at, at)
  return { ...page, root, field, heard, chips, hidden, focused, removeOf, caret }
}

test('tags: Enter turns the text into a value, with a hidden input of the chips\' name, and empties the field', () => {
  const { root, field, type, key, chips, hidden, heard } = setup()
  const handle = tags(root)
  type(field, '  writing ')
  assert.equal(key(field, 'Enter'), true)
  assert.deepEqual(chips(), ['design', 'research', 'writing'])
  assert.deepEqual(hidden(), ['labels=design', 'labels=research', 'labels=writing'], 'a form submits every value')
  assert.equal(field.value, '')
  assert.deepEqual(heard, ['input', 'change'])
  assert.deepEqual(handle.value, ['design', 'research', 'writing'])
  const written = root.querySelector('.chip[data-value="writing"] .chip-remove')!
  assert.equal(written.getAttribute('aria-label'), 'Remove writing')
  assert.equal(written.getAttribute('tabindex'), '-1')
  assert.equal(written.getAttribute('type'), 'button')
})

test('tags: a comma adds as Enter does; Enter in an empty field is left to the form', () => {
  const { root, field, type, key, chips } = setup()
  tags(root)
  type(field, 'ux')
  assert.equal(key(field, ','), true)
  assert.deepEqual(chips(), ['design', 'research', 'ux'])
  assert.equal(key(field, 'Enter'), false, 'nothing to add: the form may submit')
})

test('tags: a value already there, past the limit or refused stays in the field, which says aria-invalid until it changes', () => {
  const { root, field, type, key, chips, heard } = setup()
  tags(root, { max: 3, validate: value => value !== 'nope' })
  type(field, 'design')
  key(field, 'Enter')
  assert.deepEqual(chips(), ['design', 'research'])
  assert.equal(field.value, 'design')
  assert.equal(field.getAttribute('aria-invalid'), 'true')
  type(field, 'nope')
  assert.equal(field.hasAttribute('aria-invalid'), false, 'typing clears it')
  key(field, 'Enter')
  assert.equal(field.getAttribute('aria-invalid'), 'true')
  type(field, 'third')
  key(field, 'Enter')
  type(field, 'fourth')
  key(field, 'Enter')
  assert.deepEqual(chips(), ['design', 'research', 'third'], 'max is 3')
  assert.equal(field.getAttribute('aria-invalid'), 'true')
  assert.deepEqual(heard, ['input', 'change'], 'only the value that was added is heard')
})

test('tags: pasted text with delimiters becomes as many values, and what follows the last stays in the field', () => {
  const { root, field, window, chips } = setup()
  tags(root)
  const paste = (text: string) => {
    const event = new window.Event('paste', { bubbles: true, cancelable: true }) as any
    event.clipboardData = { getData: () => text }
    field.dispatchEvent(event)
    return event.defaultPrevented
  }
  assert.equal(paste('plain'), false, 'one word is pasted as text')
  assert.equal(paste('ops, infra\nsecurity\tqa, half'), true)
  assert.deepEqual(chips(), ['design', 'research', 'ops', 'infra', 'security', 'qa'])
  assert.equal(field.value, 'half')
})

test('tags: pasted text joins the text at the caret, as it would in any field', () => {
  const { root, field, window, chips, type, caret } = setup()
  tags(root)
  const paste = (text: string) => {
    const event = new window.Event('paste', { bubbles: true, cancelable: true }) as any
    event.clipboardData = { getData: () => text }
    field.dispatchEvent(event)
  }
  type(field, 'dev')
  caret(3)
  paste('ops, infra')
  assert.deepEqual(chips(), ['design', 'research', 'devops'])
  assert.equal(field.value, 'infra')
  type(field, 'ab')
  caret(1)
  paste('x,y')
  assert.deepEqual(chips(), ['design', 'research', 'devops', 'ax'])
  assert.equal(field.value, 'yb', 'what stood after the caret follows the paste')
})

test('tags: Backspace in an empty field reaches the last value; Backspace there removes it and moves to the one before', () => {
  const { root, field, key, chips, focused, removeOf, heard } = setup()
  tags(root)
  field.focus()
  assert.equal(key(field, 'Backspace'), true)
  assert.equal(focused(), removeOf('research'))
  assert.deepEqual(chips(), ['design', 'research'], 'reaching a value does not remove it')
  assert.equal(key(removeOf('research'), 'Backspace'), true)
  assert.deepEqual(chips(), ['design'])
  assert.equal(focused(), removeOf('design'))
  assert.deepEqual(heard, ['input', 'change'])
  key(removeOf('design'), 'Backspace')
  assert.deepEqual(chips(), [])
  assert.equal(focused(), field, 'with no value left, the field')
})

test('tags: Backspace with text in the field is the field\'s own', () => {
  const { root, field, type, key, focused, caret } = setup()
  tags(root)
  type(field, 'ab')
  field.focus()
  caret(0)
  assert.equal(key(field, 'Backspace'), false)
  assert.equal(focused(), field)
})

test('tags: the arrows walk from the start of the field to the values and back; Home, End and Escape', () => {
  const { root, field, type, key, focused, removeOf, caret } = setup()
  tags(root)
  type(field, 'xy')
  field.focus()
  caret(1)
  assert.equal(key(field, 'ArrowLeft'), false, 'the caret is not at the start')
  caret(0)
  assert.equal(key(field, 'ArrowLeft'), true)
  assert.equal(focused(), removeOf('research'))
  key(removeOf('research'), 'ArrowLeft')
  assert.equal(focused(), removeOf('design'))
  key(removeOf('design'), 'ArrowLeft')
  assert.equal(focused(), removeOf('design'), 'it stops at the first')
  key(removeOf('design'), 'ArrowRight')
  assert.equal(focused(), removeOf('research'))
  key(removeOf('research'), 'ArrowRight')
  assert.equal(focused(), field, 'past the last, the field')
  key(field, 'ArrowLeft')
  key(removeOf('research'), 'Home')
  assert.equal(focused(), removeOf('design'))
  key(removeOf('design'), 'End')
  assert.equal(focused(), field)
  key(field, 'ArrowLeft')
  key(removeOf('research'), 'Escape')
  assert.equal(focused(), field)
})

test('tags: from right to left the arrows turn around', () => {
  const { root, field, key, focused, removeOf } = setup(markup.replace('<form>', '<form dir="rtl">'))
  ;(globalThis as any).getComputedStyle = () => ({ direction: 'rtl' })
  tags(root)
  field.focus()
  assert.equal(key(field, 'ArrowLeft'), false)
  assert.equal(key(field, 'ArrowRight'), true)
  assert.equal(focused(), removeOf('research'))
  key(removeOf('research'), 'ArrowRight')
  assert.equal(focused(), removeOf('design'))
})

test('tags: Delete removes and moves to the value after; a remove button removes on a click and focus returns to the field', () => {
  const { root, field, key, click, chips, focused, removeOf } = setup()
  tags(root)
  field.focus()
  key(field, 'Backspace')
  key(removeOf('research'), 'ArrowLeft')
  key(removeOf('design'), 'Delete')
  assert.deepEqual(chips(), ['research'])
  assert.equal(focused(), removeOf('research'))
  click(removeOf('research'))
  assert.deepEqual(chips(), [])
  assert.equal(focused(), field)
})

test('tags: a disabled field removes nothing', () => {
  const { root, field, click, key, chips, removeOf } = setup()
  tags(root)
  field.disabled = true
  click(removeOf('design'))
  key(removeOf('design'), 'Backspace')
  assert.deepEqual(chips(), ['design', 'research'])
})

test('tags: value can be set from outside, keeping the chips that stay and dispatching nothing', () => {
  const { root, chips, heard, hidden } = setup()
  const handle = tags(root)
  const kept = root.querySelector('.chip[data-value="research"]')
  handle.value = ['research', 'ops', 'research']
  assert.deepEqual(chips(), ['research', 'ops'])
  assert.equal(root.querySelector('.chip[data-value="research"]'), kept, 'the same chip')
  assert.deepEqual(hidden(), ['labels=research', 'labels=ops'])
  assert.deepEqual(heard, [])
})

test('tags: a reset puts back the values the field started with', () => {
  const { root, field, type, key, chips, one, window } = setup()
  tags(root)
  type(field, 'extra')
  key(field, 'Enter')
  one('form').dispatchEvent(new window.Event('reset'))
  assert.deepEqual(chips(), ['design', 'research'])
})

test('tags: with draw, the page writes the chips', () => {
  const { root, field, type, key, chips } = setup()
  const drawn: string[][] = []
  const handle = tags(root, { draw: values => drawn.push(values) })
  type(field, 'framework')
  key(field, 'Enter')
  assert.deepEqual(drawn, [['design', 'research', 'framework']])
  assert.deepEqual(chips(), ['design', 'research'], 'no chip is written by the script')
  handle.value = ['design']
  assert.deepEqual(drawn.at(-1), ['design'])
})

test('tags: without a name the chips it writes carry no hidden input; name gives one', () => {
  const plain = setup(`<div class="tags input-group input-group-wrap"><input class="input-group-field" aria-label="Tags"></div>`)
  tags(plain.root)
  plain.type(plain.field, 'a')
  plain.key(plain.field, 'Enter')
  assert.deepEqual(plain.hidden(), [])
  const named = setup(`<div class="tags input-group input-group-wrap"><input class="input-group-field" aria-label="Tags"></div>`)
  tags(named.root, { name: 'topics', removeLabel: text => `${text} entfernen` })
  named.type(named.field, 'b')
  named.key(named.field, 'Enter')
  assert.deepEqual(named.hidden(), ['topics=b'])
  assert.equal(named.one('.chip-remove').getAttribute('aria-label'), 'b entfernen')
})

test('tags: while an input method composes, Enter is its own', () => {
  const { root, field, type, key, chips } = setup()
  tags(root)
  type(field, 'かな')
  assert.equal(key(field, 'Enter', { isComposing: true }), false)
  assert.deepEqual(chips(), ['design', 'research'])
  assert.equal(key(field, 'Enter', { keyCode: 229 }), false, 'nor is the Enter Safari sends as a composition ends')
  assert.deepEqual(chips(), ['design', 'research'])
})

test('tags: a chip that stays is not taken out and put back', () => {
  const { root, field, type, key, window } = setup()
  const handle = tags(root)
  const observer = new window.MutationObserver(() => {})
  observer.observe(root, { childList: true })
  type(field, 'writing')
  key(field, 'Enter')
  handle.value = ['research', 'writing', 'ops']
  const removed = observer.takeRecords().flatMap(record => [...record.removedNodes]).map((node: any) => node.getAttribute?.('data-value'))
  assert.deepEqual(removed, ['design'], 'only the value that left')
  observer.disconnect()
})

test('tags: detach removes the listeners', () => {
  const { root, field, type, key, chips } = setup()
  const detach = tags(root)
  detach()
  type(field, 'gone')
  key(field, 'Enter')
  assert.deepEqual(chips(), ['design', 'research'])
})
