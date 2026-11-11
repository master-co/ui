import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { command } from '../../behaviors/command.js'

/** happy-dom catches what a listener throws and reports it on the window; a test must not pass over it. */
const thrown: unknown[] = []
afterEach(() => assert.deepEqual(thrown.splice(0), [], 'a listener threw'))

/**
 * The command palette's behavior filters the list from the field, moves the active option, clicks it on
 * Enter and opens the dialog on a shortcut; the dialog itself stays the browser's. The markup is the
 * contract's example with the page's two groups, a disabled command and a link among them.
 */
const markup = `<button type="button" class="btn" commandfor="palette" command="show-modal">Search commands</button>

<dialog id="palette" class="dialog command" closedby="any" aria-label="Command palette">
  <label class="command-search">
    <input class="command-input" type="search" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant="cmd-new" aria-autocomplete="list" aria-label="Search commands" autocomplete="off" placeholder="Type a command or search" autofocus>
  </label>
  <div class="listbox command-list" id="palette-list" role="listbox" aria-label="Commands">
    <div class="listbox-group" role="group" aria-labelledby="group-suggestions">
      <div class="listbox-label" id="group-suggestions">Suggestions</div>
      <div class="listbox-option" role="option" id="cmd-new" aria-selected="true">New project</div>
      <div class="listbox-option" role="option" id="cmd-deploy">Deploy to production</div>
      <div class="listbox-option" role="option" id="cmd-transfer" aria-disabled="true">Transfer project</div>
    </div>
    <div class="listbox-group" role="group" aria-labelledby="group-go">
      <div class="listbox-label" id="group-go">Go to</div>
      <a class="listbox-option" role="option" id="cmd-settings" href="#settings">Settings</a>
      <div class="listbox-option" role="option" id="cmd-billing">Billing</div>
    </div>
    <div class="listbox-empty">No commands match.</div>
  </div>
</dialog>`

function setup(html = markup) {
  const page = dom(html)
  page.window.addEventListener('error', (event: any) => thrown.push(event.error ?? event.message))
  const root = page.one('.command')
  const field = page.one('.command-input')
  /** The id of the active option, or null, checked both ways the behavior says it. */
  const active = () => {
    const selected = page.all('[role="option"][aria-selected="true"]')
    assert.ok(selected.length < 2, 'at most one option is active')
    assert.equal(field.getAttribute('aria-activedescendant'), selected[0]?.id ?? null, 'aria-activedescendant names the active option')
    return (selected[0]?.id ?? null) as string | null
  }
  const shown = () => page.all('[role="option"]').filter(option => !option.hidden).map(option => option.id as string)
  /** The commands that ran, by the click a command listens to. */
  const ran: string[] = []
  for (const option of page.all('[role="option"]')) option.addEventListener('click', () => ran.push(option.id))
  return { ...page, root, field, active, shown, ran }
}

test('command: typing hides the options that do not match and makes the first match the active one', () => {
  const { root, field, all, type, active, shown } = setup()
  command(root)
  type(field, 'pro')
  assert.deepEqual(shown(), ['cmd-new', 'cmd-deploy', 'cmd-transfer'])
  assert.equal(active(), 'cmd-new')
  type(field, 'B')
  assert.deepEqual(shown(), ['cmd-billing'], 'whatever the case')
  assert.equal(active(), 'cmd-billing')
  assert.deepEqual(all('.listbox-group').map(group => group.hidden), [false, false], 'hiding an emptied group is the stylesheet\'s work')
  type(field, 'transfer')
  assert.deepEqual(shown(), ['cmd-transfer'])
  assert.equal(active(), null, 'a disabled command is shown and never active')
  type(field, 'zz')
  assert.deepEqual(shown(), [])
  assert.equal(active(), null)
  type(field, '')
  assert.equal(shown().length, 5)
  assert.equal(active(), 'cmd-new')
})

test('command: ArrowDown and ArrowUp move the active option, skip a disabled one and wrap at the ends', () => {
  const { root, field, key, active } = setup()
  command(root)
  assert.equal(key(field, 'ArrowDown'), true, 'a key the behavior handles is prevented')
  assert.equal(active(), 'cmd-deploy')
  key(field, 'ArrowDown')
  assert.equal(active(), 'cmd-settings', 'Transfer project is disabled')
  key(field, 'ArrowDown')
  key(field, 'ArrowDown')
  assert.equal(active(), 'cmd-new', 'past the last option it wraps to the first')
  assert.equal(key(field, 'ArrowUp'), true)
  assert.equal(active(), 'cmd-billing', 'before the first option it wraps to the last')
  key(field, 'ArrowUp')
  key(field, 'ArrowUp')
  assert.equal(active(), 'cmd-deploy')
})

test('command: the arrow keys move through the filtered options only', () => {
  const { root, field, type, key, active } = setup()
  command(root)
  type(field, 'e')
  assert.equal(active(), 'cmd-new')
  key(field, 'ArrowDown')
  key(field, 'ArrowDown')
  assert.equal(active(), 'cmd-settings')
  key(field, 'ArrowDown')
  assert.equal(active(), 'cmd-new', 'Billing is hidden')
})

test('command: Home and End move to the first and the last option', () => {
  const { root, field, key, active } = setup()
  command(root)
  assert.equal(key(field, 'End'), true)
  assert.equal(active(), 'cmd-billing')
  assert.equal(key(field, 'Home'), true)
  assert.equal(active(), 'cmd-new')
  assert.equal(key(field, 'End', { shiftKey: true }), false, 'with Shift they select text in the field')
  assert.equal(active(), 'cmd-new')
})

test('command: Enter runs the active command by clicking it, and the palette closes', () => {
  const { root, field, key, ran } = setup()
  command(root)
  root.showModal()
  key(field, 'ArrowDown')
  assert.equal(key(field, 'Enter'), true)
  assert.deepEqual(ran, ['cmd-deploy'])
  assert.equal(root.open, false)
})

test('command: Enter on a link option clicks the link', () => {
  const { root, field, one, type, key, ran } = setup()
  command(root)
  root.showModal()
  let followed = 0
  one('#cmd-settings').addEventListener('click', (event: any) => { followed++; event.preventDefault() })
  type(field, 'sett')
  key(field, 'Enter')
  assert.deepEqual(ran, ['cmd-settings'])
  assert.equal(followed, 1)
  assert.equal(root.open, false, 'the palette closes whatever the click went on to do')
})

test('command: with nothing matching, Enter is left alone and the palette stays', () => {
  const { root, field, type, key, ran } = setup()
  command(root)
  root.showModal()
  type(field, 'zz')
  assert.equal(key(field, 'Enter'), false)
  assert.deepEqual(ran, [])
  assert.equal(root.open, true)
})

test('command: a click on a command closes the palette; a click on a disabled one or beside the options does not', () => {
  const { root, one, click } = setup()
  command(root)
  root.showModal()
  click(one('#cmd-transfer'))
  assert.equal(root.open, true)
  click(one('.listbox-label'))
  assert.equal(root.open, true)
  click(one('.command-search'))
  assert.equal(root.open, true)
  click(one('#cmd-billing'))
  assert.equal(root.open, false)
})

test('command: Command+K and Control+K open the palette from anywhere, and close it when it is open', () => {
  const { root, field, document, one, key } = setup()
  command(root)
  assert.equal(key(document.body, 'k', { metaKey: true }), true, 'the shortcut is prevented')
  assert.equal(root.open, true)
  assert.equal(key(field, 'k', { metaKey: true }), true, 'from the field too')
  assert.equal(root.open, false)
  assert.equal(key(one('.btn'), 'K', { ctrlKey: true }), true)
  assert.equal(root.open, true)
  key(document.body, 'k', { ctrlKey: true })
  assert.equal(root.open, false)
})

test('command: the shortcut is only that key with Command or Control', () => {
  const { root, document, key } = setup()
  command(root)
  assert.equal(key(document.body, 'k'), false)
  assert.equal(key(document.body, 'k', { altKey: true, ctrlKey: true }), false)
  assert.equal(key(document.body, 'k', { shiftKey: true, metaKey: true }), false)
  assert.equal(key(document.body, 'j', { metaKey: true }), false)
  assert.equal(root.open, false)
})

test('command: the shortcut option names another key, or none', () => {
  const other = setup()
  command(other.root, { shortcut: 'p' })
  assert.equal(other.key(other.document.body, 'k', { metaKey: true }), false)
  assert.equal(other.key(other.document.body, 'p', { metaKey: true }), true)
  assert.equal(other.root.open, true)

  const none = setup()
  command(none.root, { shortcut: false })
  assert.equal(none.key(none.document.body, 'k', { metaKey: true }), false)
  assert.equal(none.root.open, false)
})

test('command: Escape, and any key it does not handle, is left to the dialog and the field', () => {
  const { root, field, key, active } = setup()
  command(root)
  root.showModal()
  assert.equal(key(field, 'Escape'), false)
  assert.equal(key(field, 'Tab'), false)
  assert.equal(key(field, 'a'), false)
  assert.equal(key(field, 'ArrowLeft'), false)
  assert.equal(key(field, 'ArrowDown', { altKey: true }), false)
  assert.equal(key(field, 'Enter', { isComposing: true }), false, 'while an input method composes, the keys are its own')
  assert.equal(root.open, true)
  assert.equal(active(), 'cmd-new')
})

test('command: attaching gives the palette an active option when the markup has none it can use', () => {
  const none = setup(markup.replace(' aria-activedescendant="cmd-new"', '').replace(' aria-selected="true"', ''))
  command(none.root)
  assert.equal(none.active(), 'cmd-new')

  const disabled = setup(markup.replace('id="cmd-new" aria-selected="true"', 'id="cmd-new" aria-selected="true" aria-disabled="true"'))
  command(disabled.root)
  assert.equal(disabled.active(), 'cmd-deploy')

  const kept = setup(markup.replace('aria-activedescendant="cmd-new"', 'aria-activedescendant="cmd-billing"').replace(' aria-selected="true"', '').replace('id="cmd-billing"', 'id="cmd-billing" aria-selected="true"'))
  command(kept.root)
  assert.equal(kept.active(), 'cmd-billing', 'an active option the markup names is kept')
})

test('command: an option without an id is given one when it becomes active', () => {
  const { root, field, all, key } = setup(markup.replace(/ id="cmd-[a-z]+"/g, '').replace(' aria-activedescendant="cmd-new"', ''))
  command(root)
  key(field, 'ArrowDown')
  const option = all('[role="option"]')[1]
  assert.ok(option.id)
  assert.equal(field.getAttribute('aria-activedescendant'), option.id)
})

test('command: detach removes the listeners, the shortcut among them, and attaching twice leaves one behavior', () => {
  const { root, field, document, one, type, key, click, active, shown, ran } = setup()
  command(root)
  const detach = command(root)
  root.showModal()
  key(field, 'ArrowDown')
  assert.equal(active(), 'cmd-deploy', 'one behavior answers, not two')
  key(field, 'Enter')
  assert.deepEqual(ran, ['cmd-deploy'])
  key(document.body, 'k', { metaKey: true })
  assert.equal(root.open, true, 'one shortcut opens it; two would open and close it')
  detach()
  assert.equal(key(field, 'ArrowDown'), false)
  assert.equal(key(field, 'Enter'), false)
  type(field, 'bill')
  assert.equal(shown().length, 5, 'typing filters nothing')
  click(one('#cmd-billing'))
  assert.equal(root.open, true)
  assert.equal(key(document.body, 'k', { metaKey: true }), false)
  assert.equal(root.open, true)
})

test('command: an option the markup marks active is named on the field from the start', () => {
  const { one } = dom('<dialog class="dialog command" aria-label="Commands"><label class="command-search"><input class="command-input" role="combobox" aria-expanded="true" aria-controls="list" aria-label="Search"></label><div class="command-list listbox" id="list" role="listbox" aria-label="Commands"><div class="listbox-option" role="option" id="new" aria-selected="true">New file</div><div class="listbox-option" role="option" id="open">Open</div></div></dialog>')
  command(one('.command'))
  assert.equal(one('.command-input').getAttribute('aria-activedescendant'), 'new')
})
