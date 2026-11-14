import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { editable } from '../../behaviors/editable.js'

const thrown: unknown[] = []
afterEach(() => assert.deepEqual(thrown.splice(0), [], 'a listener threw'))

const markup = `<span id="title-label">Title</span>
<div class="editable">
  <button type="button" class="editable-preview" id="title-preview" aria-labelledby="title-label title-preview">Quarterly report</button>
  <input class="editable-field" value="Quarterly report" aria-labelledby="title-label" placeholder="Add a title" required hidden>
</div>
<button type="button" id="elsewhere">Elsewhere</button>`

function setup(html = markup) {
  const page = dom(html)
  page.window.addEventListener('error', (event: any) => thrown.push(event.error ?? event.message))
  const root = page.one('.editable')
  const preview = page.one<HTMLButtonElement>('.editable-preview')
  const field = page.one<HTMLInputElement>('.editable-field')
  const heard: string[] = []
  root.addEventListener('input', (event: any) => { if (event.target === field && !event.isTrusted && event.constructor.name !== 'InputEvent') heard.push('input') })
  root.addEventListener('change', () => heard.push('change'))
  const editing = () => {
    assert.equal(preview.hidden, !field.hidden, 'one of the two shows')
    return !field.hidden
  }
  const focused = () => page.document.activeElement
  return { ...page, root, preview, field, heard, editing, focused }
}

test('editable: a press on the preview opens the field with the saved value, focused', () => {
  const { root, preview, field, click, editing, focused } = setup()
  editable(root)
  assert.equal(editing(), false)
  click(preview)
  assert.equal(editing(), true)
  assert.equal(field.value, 'Quarterly report')
  assert.equal(focused(), field)
})

test('editable: Enter saves a new value into the preview, dispatches change and returns focus to the preview', () => {
  const { root, preview, field, click, key, type, editing, focused, heard } = setup()
  const handle = editable(root)
  click(preview)
  type(field, 'Annual report')
  assert.equal(handle.value, 'Quarterly report', 'typing is not saving')
  assert.equal(key(field, 'Enter'), true)
  assert.equal(editing(), false)
  assert.equal(preview.textContent, 'Annual report')
  assert.equal(handle.value, 'Annual report')
  assert.equal(focused(), preview)
  assert.ok(heard.includes('change'))
})

test('editable: Escape puts the saved value back and dispatches nothing', () => {
  const { root, preview, field, click, key, type, editing, focused, heard } = setup()
  const handle = editable(root)
  click(preview)
  type(field, 'Something else')
  assert.equal(key(field, 'Escape'), true)
  assert.equal(editing(), false)
  assert.equal(field.value, 'Quarterly report')
  assert.equal(preview.textContent, 'Quarterly report')
  assert.equal(handle.value, 'Quarterly report')
  assert.equal(focused(), preview)
  assert.deepEqual(heard.filter(each => each === 'change'), [])
})

test('editable: saving the same value closes the field and dispatches nothing', () => {
  const { root, preview, field, click, key, editing, heard } = setup()
  editable(root)
  click(preview)
  key(field, 'Enter')
  assert.equal(editing(), false)
  assert.deepEqual(heard, [])
})

test('editable: a value the field refuses keeps it open on Enter, and leaving puts the saved value back', () => {
  const { root, preview, field, click, key, type, editing, one } = setup()
  const handle = editable(root)
  click(preview)
  type(field, '')
  key(field, 'Enter')
  assert.equal(editing(), true, 'required: still editing')
  one<HTMLButtonElement>('#elsewhere').focus()
  assert.equal(editing(), false)
  assert.equal(handle.value, 'Quarterly report')
  assert.equal(preview.textContent, 'Quarterly report')
})

test('editable: leaving the field saves it, or cancels with blur: cancel', () => {
  const saving = setup()
  const handle = editable(saving.root)
  saving.click(saving.preview)
  saving.type(saving.field, 'Kept')
  saving.one<HTMLButtonElement>('#elsewhere').focus()
  assert.equal(handle.value, 'Kept')
  assert.equal(saving.focused(), saving.one('#elsewhere'), 'focus stays where the reader put it')

  const cancelling = setup()
  const other = editable(cancelling.root, { blur: 'cancel' })
  cancelling.click(cancelling.preview)
  cancelling.type(cancelling.field, 'Dropped')
  cancelling.one<HTMLButtonElement>('#elsewhere').focus()
  assert.equal(other.value, 'Quarterly report')
})

test('editable: in a textarea Enter starts a line, and Control or Command with Enter saves', () => {
  const { root, preview, field, click, key, type, editing } = setup(markup.replace('<input class="editable-field" value="Quarterly report"', '<textarea class="editable-field"').replace(' required hidden>', ' hidden>Quarterly report</textarea>'))
  const handle = editable(root)
  click(preview)
  type(field, 'Line one')
  assert.equal(key(field, 'Enter'), false)
  assert.equal(editing(), true)
  assert.equal(key(field, 'Enter', { metaKey: true }), true)
  assert.equal(handle.value, 'Line one')
  click(preview)
  type(field, 'Line two')
  key(field, 'Enter', { ctrlKey: true })
  assert.equal(handle.value, 'Line two')
})

test('editable: an empty value shows the placeholder in editable-placeholder', () => {
  const { root, preview, field, click, key, type } = setup(markup.replace(' required', ''))
  editable(root)
  click(preview)
  type(field, '')
  key(field, 'Enter')
  const placeholder = preview.querySelector('.editable-placeholder')
  assert.equal(placeholder?.textContent, 'Add a title')
})

test('editable: value can be set from outside and edit() opens the field; neither dispatches', () => {
  const { root, preview, field, editing, heard } = setup()
  const handle = editable(root)
  handle.value = 'From the server'
  assert.equal(preview.textContent, 'From the server')
  assert.equal(field.value, 'From the server')
  handle.edit()
  assert.equal(editing(), true)
  assert.deepEqual(heard, [])
})

test('editable: a pending or disabled preview does not open', () => {
  const { root, preview, click, editing } = setup()
  editable(root)
  root.setAttribute('aria-busy', 'true')
  click(preview)
  assert.equal(editing(), false)
  root.removeAttribute('aria-busy')
  preview.disabled = true
  click(preview)
  assert.equal(editing(), false)
})

test('editable: while an input method composes, Enter and Escape are its own', () => {
  const { root, preview, field, click, key, editing } = setup()
  editable(root)
  click(preview)
  assert.equal(key(field, 'Enter', { isComposing: true }), false)
  assert.equal(key(field, 'Escape', { isComposing: true }), false)
  assert.equal(key(field, 'Enter', { keyCode: 229 }), false, 'nor the Enter that commits a composition Safari has ended')
  assert.equal(editing(), true)
})

test('editable: typing clears aria-invalid', () => {
  const { root, preview, field, click, type } = setup()
  editable(root)
  click(preview)
  field.setAttribute('aria-invalid', 'true')
  type(field, 'Fixed')
  assert.equal(field.hasAttribute('aria-invalid'), false)
})

test('editable: detach removes the listeners', () => {
  const { root, preview, click, editing } = setup()
  editable(root)()
  click(preview)
  assert.equal(editing(), false)
})

test('editable: Enter held down saves once and does not open the field again from the preview', () => {
  const { root, preview, field, click, key, type, editing, focused, heard } = setup()
  editable(root)
  click(preview)
  type(field, 'Annual report')
  heard.length = 0
  assert.equal(key(field, 'Enter'), true)
  assert.equal(editing(), false)
  assert.equal(focused(), preview)
  assert.equal(key(preview, 'Enter', { repeat: true }), true, 'the repeat does not press the preview')
  assert.equal(key(preview, 'Enter'), false, 'a new press does')
  click(preview)
  assert.equal(editing(), true)
  assert.equal(key(field, 'Enter', { repeat: true }), true, 'the repeat of the Enter that opened the field')
  assert.equal(editing(), true, 'does not save it as soon as it opens')
  assert.deepEqual(heard, ['input', 'change'])
})
