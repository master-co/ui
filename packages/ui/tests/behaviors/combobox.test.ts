import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { combobox } from '../../behaviors/combobox.js'

/** happy-dom catches what a listener throws and reports it on the window; a test must not pass over it. */
const thrown: unknown[] = []
afterEach(() => assert.deepEqual(thrown.splice(0), [], 'a listener threw'))

/**
 * The combobox's behavior filters the list from the field, opens and closes the popover with
 * aria-expanded, moves the active option and writes a chosen option into the field. The markup is the
 * contract's example with more regions, a disabled one among them.
 */
const markup = `<div class="combobox">
  <div class="input-group">
    <input class="input-group-field" id="region" role="combobox" aria-expanded="false" aria-controls="region-list" aria-autocomplete="list" autocomplete="off" aria-label="Region">
    <button type="button" class="combobox-toggle" tabindex="-1" aria-label="Show regions"></button>
  </div>
  <div id="region-list" popover="manual" class="listbox" role="listbox" aria-label="Regions">
    <div class="listbox-option" role="option" id="region-hnd" aria-checked="false">Tokyo</div>
    <div class="listbox-option" role="option" id="region-sin" aria-checked="false">Singapore</div>
    <div class="listbox-option" role="option" id="region-pdx" aria-checked="false" aria-disabled="true">Oregon</div>
    <div class="listbox-option" role="option" id="region-fra" aria-checked="false">Frankfurt</div>
    <div class="listbox-option" role="option" id="region-lhr" aria-checked="false">London</div>
    <div class="listbox-empty">No regions match.</div>
  </div>
</div>
<button type="button" id="elsewhere">Elsewhere</button>`

function setup(html = markup) {
  const page = dom(html)
  page.window.addEventListener('error', (event: any) => thrown.push(event.error ?? event.message))
  const root = page.one('.combobox')
  const field = page.one('[role="combobox"]')
  const list = page.one('[role="listbox"]')
  const toggle = page.one('.combobox-toggle')
  const heard: string[] = []
  root.addEventListener('input', (event: any) => { if (event.target === field) heard.push('input') })
  root.addEventListener('change', (event: any) => { if (event.target === field) heard.push('change') })
  /** Whether the list is open, checked both ways the behavior says it. */
  const expanded = () => {
    assert.equal(field.getAttribute('aria-expanded'), String(page.isOpen(list)), 'aria-expanded is in step with the popover')
    return page.isOpen(list)
  }
  /** The id of the active option, or null, checked both ways the behavior says it. */
  const active = () => {
    const selected = page.all('[role="option"][aria-selected="true"]')
    assert.ok(selected.length < 2, 'at most one option is active')
    assert.equal(field.getAttribute('aria-activedescendant'), selected[0]?.id ?? null, 'aria-activedescendant names the active option')
    return (selected[0]?.id ?? null) as string | null
  }
  const shown = () => page.all('[role="option"]').filter(option => !option.hidden).map(option => option.id as string)
  const checked = () => page.all('[role="option"][aria-checked="true"]').map(option => option.id as string)
  const event = (target: any, type: string, init: Record<string, unknown> = {}) => {
    const Kind = type.startsWith('focus') ? (page.window as any).FocusEvent : page.window.MouseEvent
    return target.dispatchEvent(new Kind(type, { bubbles: true, cancelable: true, ...init }))
  }
  return { ...page, root, field, list, toggle, heard, expanded, active, shown, checked, event }
}

test('combobox: typing hides the options that do not match, opens the list and makes the first match active', () => {
  const { root, field, type, expanded, active, shown } = setup()
  combobox(root)
  assert.equal(expanded(), false)
  type(field, 'on')
  assert.deepEqual(shown(), ['region-pdx', 'region-lhr'], 'Oregon and London hold "on"')
  assert.equal(expanded(), true)
  assert.equal(active(), 'region-lhr', 'the first match the keys may land on: Oregon is disabled')
  type(field, ' TOK ')
  assert.deepEqual(shown(), ['region-hnd'], 'whatever the case and the space around')
  assert.equal(active(), 'region-hnd')
  type(field, '')
  assert.equal(shown().length, 5, 'an empty field shows every option')
  assert.equal(active(), 'region-hnd')
})

test('combobox: with no match the list stays open on its empty state, with no active option', () => {
  const { root, field, type, key, expanded, active, shown } = setup()
  combobox(root)
  type(field, 'zz')
  assert.deepEqual(shown(), [])
  assert.equal(expanded(), true)
  assert.equal(active(), null)
  assert.equal(key(field, 'Enter'), false, 'Enter has nothing to choose and is left alone')
  assert.equal(key(field, 'ArrowDown'), true)
  assert.equal(active(), null)
})

test('combobox: ArrowDown opens the list on the first option, then moves and wraps, skipping a disabled option', () => {
  const { root, field, key, expanded, active } = setup()
  combobox(root)
  assert.equal(key(field, 'ArrowDown'), true, 'a key the behavior handles is prevented')
  assert.equal(expanded(), true)
  assert.equal(active(), 'region-hnd')
  key(field, 'ArrowDown')
  assert.equal(active(), 'region-sin')
  key(field, 'ArrowDown')
  assert.equal(active(), 'region-fra', 'Oregon is disabled')
  key(field, 'ArrowDown')
  assert.equal(active(), 'region-lhr')
  key(field, 'ArrowDown')
  assert.equal(active(), 'region-hnd', 'past the last option it wraps to the first')
})

test('combobox: ArrowUp opens the list on the last option, then moves and wraps', () => {
  const { root, field, key, expanded, active } = setup()
  combobox(root)
  assert.equal(key(field, 'ArrowUp'), true)
  assert.equal(expanded(), true)
  assert.equal(active(), 'region-lhr')
  key(field, 'ArrowUp')
  key(field, 'ArrowUp')
  assert.equal(active(), 'region-sin', 'Oregon is skipped on the way back')
  key(field, 'ArrowUp')
  key(field, 'ArrowUp')
  assert.equal(active(), 'region-lhr', 'before the first option it wraps to the last')
})

test('combobox: the arrow keys move through the filtered options only', () => {
  const { root, field, type, key, active } = setup()
  combobox(root)
  type(field, 'o')
  assert.equal(active(), 'region-hnd')
  key(field, 'ArrowDown')
  assert.equal(active(), 'region-sin')
  key(field, 'ArrowDown')
  assert.equal(active(), 'region-lhr', 'Oregon is disabled and Frankfurt is hidden')
  key(field, 'ArrowDown')
  assert.equal(active(), 'region-hnd')
})

test('combobox: Home and End move to the first and the last option while the list is open', () => {
  const { root, field, key, active, expanded } = setup()
  combobox(root)
  assert.equal(key(field, 'Home'), false, 'with the list closed they are the field\'s own')
  assert.equal(key(field, 'End'), false)
  assert.equal(expanded(), false)
  key(field, 'ArrowDown')
  assert.equal(key(field, 'End'), true)
  assert.equal(active(), 'region-lhr')
  assert.equal(key(field, 'Home'), true)
  assert.equal(active(), 'region-hnd')
  assert.equal(key(field, 'End', { shiftKey: true }), false, 'with Shift they select text in the field')
  assert.equal(active(), 'region-hnd')
})

test('combobox: Enter chooses the active option: the field takes its text, the option its check, and the list closes', () => {
  const { root, field, type, key, expanded, active, checked, shown, heard } = setup()
  combobox(root)
  type(field, 'fr')
  heard.length = 0
  assert.equal(key(field, 'Enter'), true)
  assert.equal(field.value, 'Frankfurt')
  assert.deepEqual(checked(), ['region-fra'])
  assert.equal(expanded(), false)
  assert.equal(active(), null, 'a closed list has no active option')
  assert.deepEqual(heard, ['input', 'change'], 'the field says its value changed')
  assert.deepEqual(shown(), ['region-fra'], 'its own input event does not filter again or open the list')
  assert.equal(key(field, 'Enter'), false, 'with the list closed Enter is left alone')
})

test('combobox: choosing another option moves the check', () => {
  const { root, field, key, all, checked } = setup()
  combobox(root)
  key(field, 'ArrowDown')
  key(field, 'Enter')
  assert.deepEqual(checked(), ['region-hnd'])
  key(field, 'ArrowUp')
  key(field, 'Enter')
  assert.equal(field.value, 'London')
  assert.deepEqual(all('[role="option"]').map(option => option.getAttribute('aria-checked')), ['false', 'false', 'false', 'false', 'true'])
})

test('combobox: Escape closes the list and the field keeps its text', () => {
  const { root, field, type, key, expanded } = setup()
  combobox(root)
  type(field, 'sin')
  assert.equal(key(field, 'Escape'), true)
  assert.equal(expanded(), false)
  assert.equal(field.value, 'sin')
  assert.equal(key(field, 'Escape'), false, 'with the list closed Escape is left alone')
})

test('combobox: a key it does not handle is left alone', () => {
  const { root, field, key, expanded } = setup()
  combobox(root)
  assert.equal(key(field, 'Tab'), false)
  assert.equal(key(field, 'a'), false)
  assert.equal(key(field, 'ArrowLeft'), false)
  assert.equal(key(field, 'ArrowDown', { altKey: true }), false)
  assert.equal(key(field, 'ArrowDown', { isComposing: true }), false, 'while an input method composes, the keys are its own')
  assert.equal(expanded(), false)
})

test('combobox: a click on an option chooses it; a click on a disabled option does not', () => {
  const { root, field, one, key, click, expanded, checked, heard } = setup()
  combobox(root)
  key(field, 'ArrowDown')
  click(one('#region-pdx'))
  assert.equal(expanded(), true)
  assert.equal(field.value, '')
  click(one('#region-sin'))
  assert.equal(field.value, 'Singapore')
  assert.deepEqual(checked(), ['region-sin'])
  assert.equal(expanded(), false)
  assert.deepEqual(heard, ['input', 'change'])
})

test('combobox: the pointer does not take focus from the field', () => {
  const { root, one, toggle, event } = setup()
  combobox(root)
  assert.equal(event(one('#region-sin'), 'mousedown'), false, 'mousedown on the list is prevented')
  assert.equal(event(toggle, 'mousedown'), false, 'and on the toggle')
})

test('combobox: an option chosen gives the field its text without the description and the hint', () => {
  const { root, field, one, key, click } = setup(markup.replace('>Tokyo<', `>
      <span class="listbox-body">
        <span>Tokyo</span>
        <span class="listbox-description">Japan, 9 ms</span>
      </span>
      <span class="listbox-end">hnd1</span>
    <`))
  combobox(root)
  key(field, 'ArrowDown')
  click(one('#region-hnd'))
  assert.equal(field.value, 'Tokyo')
})

test('combobox: typing over a chosen value takes its check away', () => {
  const { root, field, type, key, checked } = setup()
  combobox(root)
  type(field, 'tok')
  key(field, 'Enter')
  assert.deepEqual(checked(), ['region-hnd'])
  type(field, 'Tokyo')
  assert.deepEqual(checked(), ['region-hnd'], 'the field still holds it')
  type(field, 'Toky')
  assert.deepEqual(checked(), [])
})

test('combobox: the toggle opens and closes the list and returns focus to the field', () => {
  const { root, field, toggle, document, click, expanded, active } = setup()
  combobox(root)
  click(toggle)
  assert.equal(expanded(), true)
  assert.equal(active(), null, 'opening with the pointer makes no option active')
  assert.equal(document.activeElement, field)
  click(toggle)
  assert.equal(expanded(), false)
  assert.equal(document.activeElement, field)
})

test('combobox: a click in the field opens the list', () => {
  const { root, field, click, expanded } = setup()
  combobox(root)
  click(field)
  assert.equal(expanded(), true)
  click(field)
  assert.equal(expanded(), true, 'and keeps it open')
})

test('combobox: the toggle of a disabled field opens nothing', () => {
  const { root, field, toggle, click, expanded } = setup()
  field.disabled = true
  combobox(root)
  click(toggle)
  assert.equal(expanded(), false)
})

test('combobox: the list closes when focus leaves the combobox, and stays when focus moves inside it', () => {
  const { root, field, toggle, one, key, expanded, event } = setup()
  combobox(root)
  key(field, 'ArrowDown')
  event(field, 'focusout', { relatedTarget: toggle })
  assert.equal(expanded(), true)
  event(field, 'focusout', { relatedTarget: one('#elsewhere') })
  assert.equal(expanded(), false)
  key(field, 'ArrowDown')
  event(field, 'focusout', { relatedTarget: null })
  assert.equal(expanded(), false)
})

test('combobox: aria-expanded follows a popover that something else opens or closes', () => {
  const { root, field, list, key, expanded, active } = setup()
  combobox(root)
  list.showPopover()
  assert.equal(expanded(), true)
  key(field, 'ArrowDown')
  list.hidePopover()
  assert.equal(expanded(), false)
  assert.equal(active(), null)
})

test('combobox: attaching says what is true of a list that is already open', () => {
  const { root, list, expanded } = setup()
  list.showPopover()
  combobox(root)
  assert.equal(expanded(), true)
})

test('combobox: detach removes the listeners, and attaching twice leaves one behavior', () => {
  const { root, field, toggle, one, type, key, click, expanded, shown, heard } = setup()
  combobox(root)
  const detach = combobox(root)
  key(field, 'ArrowDown')
  key(field, 'Enter')
  assert.deepEqual(heard, ['input', 'change'], 'one behavior answers, not two')
  detach()
  heard.length = 0
  assert.equal(key(field, 'ArrowDown'), false)
  click(toggle)
  click(field)
  type(field, 'lon')
  assert.equal(expanded(), false)
  assert.equal(shown().length, 5, 'typing filters nothing')
  one('[role="listbox"]').showPopover()
  assert.equal(field.getAttribute('aria-expanded'), 'false', 'and the popover is no longer followed')
  click(one('#region-lhr'))
  assert.equal(field.value, 'lon')
})
