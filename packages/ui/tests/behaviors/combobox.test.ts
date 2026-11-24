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
    <button type="button" class="combobox-toggle" tabindex="-1" aria-label="Show regions"><svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5L10.3586 7.8586A0.2 0.2 0 0 1 10.3586 8.1414L6 12.5" transform="rotate(90 8 8)"/></svg></button>
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

test('combobox: a local search only reveals options the search itself hid', () => {
  const { root, field, one, type, active, shown } = setup()
  one('#region-sin').hidden = true
  combobox(root)
  type(field, 'Singapore')
  assert.deepEqual(shown(), [])
  assert.equal(active(), null)
  type(field, '')
  assert.ok(shown().includes('region-hnd'))
  assert.ok(!shown().includes('region-sin'))
})

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
  assert.equal(key(field, 'Enter', { keyCode: 229 }), false, 'and so is the Enter that commits a composition Safari has ended')
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

/** The combobox with a multiselectable list: chips before the field in an input group that wraps. */
const several = `<form><div class="combobox">
  <div class="input-group input-group-wrap">
    <span class="chip" data-value="region-hnd">Tokyo<input type="hidden" name="regions" value="region-hnd"><button type="button" class="chip-remove" tabindex="-1" aria-label="Remove Tokyo"><svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4L12 12"/><path d="M4 12L12 4"/></svg></button></span>
    <input class="input-group-field" id="region" role="combobox" aria-expanded="false" aria-controls="region-list" aria-autocomplete="list" autocomplete="off" aria-label="Regions">
    <button type="button" class="combobox-toggle" tabindex="-1" aria-label="Show regions"><svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5L10.3586 7.8586A0.2 0.2 0 0 1 10.3586 8.1414L6 12.5" transform="rotate(90 8 8)"/></svg></button>
  </div>
  <div id="region-list" popover="manual" class="listbox" role="listbox" aria-label="Regions" aria-multiselectable="true">
    <div class="listbox-option" role="option" id="region-hnd" data-value="region-hnd" aria-checked="true">Tokyo</div>
    <div class="listbox-option" role="option" id="region-sin" data-value="region-sin" aria-checked="false">Singapore <span class="listbox-description">Asia Pacific</span></div>
    <div class="listbox-option" role="option" id="region-fra" data-value="region-fra" aria-checked="false">Frankfurt</div>
    <div class="listbox-empty">No regions match.</div>
  </div>
</div></form>`

test('combobox: with several values, Enter checks the active option, writes its chip, empties the field and keeps the list open', () => {
  const { root, field, type, key, expanded, checked, shown, heard, all } = setup(several)
  const handle = combobox(root)
  type(field, 'sing')
  heard.length = 0
  assert.equal(key(field, 'Enter'), true)
  assert.deepEqual(checked(), ['region-hnd', 'region-sin'])
  assert.equal(field.value, '')
  assert.equal(expanded(), true)
  assert.equal(shown().length, 3, 'the empty field shows every option again')
  assert.deepEqual(all('.chip').map((chip: any) => [chip.getAttribute('data-value'), chip.firstChild.textContent]), [['region-hnd', 'Tokyo'], ['region-sin', 'Singapore']], 'the chip says the option without its description')
  assert.deepEqual(all<HTMLInputElement>('.chip input[type="hidden"]').map(input => `${input.name}=${input.value}`), ['regions=region-hnd', 'regions=region-sin'])
  assert.deepEqual(heard, ['input', 'change'])
  assert.deepEqual(handle.value, ['region-hnd', 'region-sin'])
})

test('combobox: with several values, choosing a checked option again unchecks it and takes its chip away', () => {
  const { root, field, click, one, checked, all } = setup(several)
  const handle = combobox(root)
  click(field)
  click(one('#region-hnd'))
  assert.deepEqual(checked(), [])
  assert.deepEqual(all('.chip'), [])
  assert.deepEqual(handle.value, [])
})

test('combobox: with several values, the value is in the order the values were chosen', () => {
  const { root, field, click, one } = setup(several)
  const handle = combobox(root)
  click(field)
  click(one('#region-fra'))
  click(one('#region-sin'))
  assert.deepEqual(handle.value, ['region-hnd', 'region-fra', 'region-sin'])
})

test('combobox: with several values, Backspace in an empty field reaches the last chip, and Backspace there unchecks it', () => {
  const { root, field, key, checked, document, all } = setup(several)
  combobox(root)
  field.focus()
  assert.equal(key(field, 'Backspace'), true)
  const remove = root.querySelector('.chip-remove')
  assert.equal(document.activeElement, remove)
  key(remove, 'Backspace')
  assert.deepEqual(checked(), [])
  assert.deepEqual(all('.chip'), [])
  assert.equal(document.activeElement, field)
})

test('combobox: with several values, a chip\'s remove button unchecks its option; typing leaves the checks alone', () => {
  const { root, field, click, type, checked } = setup(several)
  combobox(root)
  type(field, 'Frank')
  assert.deepEqual(checked(), ['region-hnd'], 'the field only searches')
  click(root.querySelector('.chip-remove'))
  assert.deepEqual(checked(), [])
})

test('combobox: with several values, value can be set from outside; it writes the chips and dispatches nothing', () => {
  const { root, checked, heard, all } = setup(several)
  const handle = combobox(root)
  handle.value = ['region-fra', 'region-sin', 'nowhere']
  assert.deepEqual(checked(), ['region-sin', 'region-fra'])
  assert.deepEqual(all('.chip').map((chip: any) => chip.getAttribute('data-value')), ['region-fra', 'region-sin'])
  assert.deepEqual(handle.value, ['region-fra', 'region-sin'])
  assert.deepEqual(heard, [])
})

test('combobox: with several values and draw, the page writes the chips', () => {
  const { root, field, type, key, all } = setup(several)
  const drawn: string[][] = []
  combobox(root, { draw: values => drawn.push(values) })
  type(field, 'frank')
  key(field, 'Enter')
  assert.deepEqual(drawn, [['region-hnd', 'region-fra']])
  assert.equal(all('.chip').length, 1)
})

test('combobox: a read-only field neither opens its list nor takes an option', () => {
  const { root, field, key, click, one, expanded, active, checked, heard } = setup()
  field.readOnly = true
  combobox(root)
  click(field)
  assert.equal(expanded(), false, 'a press leaves the list closed')
  assert.equal(key(field, 'ArrowDown'), true)
  assert.equal(expanded(), false)
  assert.equal(active(), null, 'a closed list has no active option')
  one('#region-list').showPopover()
  click(one('#region-sin'))
  assert.equal(field.value, '', 'an option pressed in a list opened from outside writes nothing')
  assert.deepEqual(checked(), [])
  assert.deepEqual(heard, [])
})

test('combobox: Enter held down chooses once, and its repeats do not reach the form', () => {
  const { root, field, key, checked, heard } = setup(several)
  combobox(root)
  key(field, 'ArrowDown')
  key(field, 'ArrowDown')
  assert.equal(key(field, 'Enter'), true)
  assert.deepEqual(checked(), ['region-hnd', 'region-sin'])
  assert.equal(key(field, 'Enter', { repeat: true }), true, 'a repeat is prevented')
  assert.equal(key(field, 'Enter', { repeat: true }), true)
  assert.deepEqual(checked(), ['region-hnd', 'region-sin'], 'and checks nothing again')
  assert.deepEqual(heard, ['input', 'change'])
  field.dispatchEvent(new (field.ownerDocument.defaultView as any).KeyboardEvent('keyup', { key: 'Enter', bubbles: true }))
  assert.equal(key(field, 'Enter', { repeat: true }), true, 'a new press is answered again')
  assert.deepEqual(checked(), ['region-hnd'])

  const single = setup()
  combobox(single.root)
  single.key(single.field, 'ArrowDown')
  assert.equal(single.key(single.field, 'Enter'), true)
  assert.equal(single.field.value, 'Tokyo')
  assert.equal(single.key(single.field, 'Enter', { repeat: true }), true, 'the closed list keeps the repeat from the form')
})

test('combobox: a value given as a number names the option whose data-value writes it', () => {
  const { root, field, checked } = setup(markup.replace('id="region-sin"', 'id="region-sin" data-value="2"'))
  const handle = combobox(root)
  handle.value = 2 as never
  assert.deepEqual(checked(), ['region-sin'])
  assert.equal(field.value, 'Singapore')
  assert.equal(handle.value, '2')
})

test('combobox: with several values, a chip that stays is not taken out and put back', async () => {
  const { root, field, type, key } = setup(several)
  combobox(root)
  const group = root.querySelector('.input-group')
  const left: string[] = []
  const observer = new MutationObserver((records) => {
    for (const record of records) for (const node of record.removedNodes) left.push((node as Element).getAttribute?.('data-value') ?? '')
  })
  observer.observe(group, { childList: true })
  type(field, 'frank')
  key(field, 'Enter')
  await new Promise(resolve => setTimeout(resolve))
  observer.disconnect()
  assert.deepEqual(left, [], 'Tokyo\'s chip stays where it was')
  assert.deepEqual([...group.querySelectorAll('.chip')].map((chip: any) => chip.getAttribute('data-value')), ['region-hnd', 'region-fra'])
})

test('combobox: a value set from outside filters the list by the text it writes, not by the query before it', () => {
  const { root, field, type, key, shown } = setup()
  const handle = combobox(root)
  type(field, 'Tok')
  key(field, 'Escape')
  handle.value = 'Singapore'
  assert.equal(field.value, 'Singapore')
  assert.deepEqual(shown(), ['region-sin'], 'the checked option is in the list the field opens on')
})
