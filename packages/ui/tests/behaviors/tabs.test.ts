import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { tabs } from '../../behaviors/tabs.js'

/** happy-dom catches what a listener throws and reports it on the window; a test must not pass over it. */
const thrown: unknown[] = []
afterEach(() => assert.deepEqual(thrown.splice(0), [], 'a listener threw'))

/**
 * The tabs' behavior moves one state, aria-selected, and what follows from it: the one tab in the tab order
 * and the panel that is shown. The markup is the tablist of the component page with a disabled tab added.
 */
const markup = (attributes = '') => `<div class="tabs" role="tablist" aria-label="Account" ${attributes}>
  <button type="button" class="tabs-item" role="tab" id="tab-profile" aria-selected="true" aria-controls="panel-profile">Profile</button>
  <button type="button" class="tabs-item" role="tab" id="tab-billing" aria-selected="false" aria-controls="panel-billing" data-value="billing">Billing</button>
  <button type="button" class="tabs-item" role="tab" id="tab-team" aria-selected="false" aria-controls="panel-team" disabled>Team</button>
  <button type="button" class="tabs-item" role="tab" id="tab-keys" aria-selected="false" aria-controls="panel-keys">Keys</button>
</div>
<div role="tabpanel" id="panel-profile" aria-labelledby="tab-profile">Profile settings</div>
<div role="tabpanel" id="panel-billing" aria-labelledby="tab-billing">Billing settings</div>
<div role="tabpanel" id="panel-team" aria-labelledby="tab-team">Team settings</div>
<div role="tabpanel" id="panel-keys" aria-labelledby="tab-keys">API keys</div>`

function setup(html = markup()) {
  const page = dom(html)
  page.window.addEventListener('error', (event: any) => thrown.push(event.error ?? event.message))
  const root = page.one('.tabs')
  const heard: string[] = []
  root.addEventListener('change', (event: any) => heard.push(event.detail.value))
  const selected = () => page.all('[role="tab"][aria-selected="true"]').map(tab => tab.id as string)
  const stops = () => page.all('[role="tab"][tabindex="0"]').map(tab => tab.id as string)
  const shown = () => page.all('[role="tabpanel"]').filter(panel => !panel.hidden).map(panel => panel.id as string)
  return { ...page, root, heard, selected, stops, shown }
}

test('tabs: the selected tab is the one tab stop and its panel the one shown', () => {
  const { root, selected, stops, shown, heard } = setup()
  tabs(root)
  assert.deepEqual(selected(), ['tab-profile'])
  assert.deepEqual(stops(), ['tab-profile'])
  assert.deepEqual(shown(), ['panel-profile'])
  assert.deepEqual(heard, [], 'attaching says nothing')
})

test('tabs: without a selected tab the first one that can be selected is', () => {
  const { root, selected, shown } = setup(markup().replace('aria-selected="true"', 'aria-selected="false"'))
  tabs(root)
  assert.deepEqual(selected(), ['tab-profile'])
  assert.deepEqual(shown(), ['panel-profile'])
})

test('tabs: ArrowRight and ArrowLeft move focus and select, skip a disabled tab and wrap at the ends', () => {
  const { root, one, key, document, selected, stops, shown, heard } = setup()
  tabs(root)
  assert.equal(key(one('#tab-profile'), 'ArrowRight'), true, 'a key the behavior handles is prevented')
  assert.deepEqual(selected(), ['tab-billing'])
  assert.deepEqual(stops(), ['tab-billing'])
  assert.deepEqual(shown(), ['panel-billing'])
  assert.equal(document.activeElement, one('#tab-billing'))
  key(one('#tab-billing'), 'ArrowRight')
  assert.deepEqual(selected(), ['tab-keys'], 'Team is disabled')
  key(one('#tab-keys'), 'ArrowRight')
  assert.deepEqual(selected(), ['tab-profile'], 'past the last tab is the first')
  key(one('#tab-profile'), 'ArrowLeft')
  assert.deepEqual(selected(), ['tab-keys'], 'before the first tab is the last')
  assert.deepEqual(heard, ['billing', 'Keys', 'Profile', 'Keys'], 'the value is data-value, or the text')
})

test('tabs: Home and End select the first and the last tab', () => {
  const { root, one, key, selected } = setup()
  tabs(root)
  key(one('#tab-profile'), 'End')
  assert.deepEqual(selected(), ['tab-keys'])
  key(one('#tab-keys'), 'Home')
  assert.deepEqual(selected(), ['tab-profile'])
})

test('tabs: from right to left the arrows change sides, and a vertical tablist takes the up and down arrows', () => {
  const rtl = setup(markup('style="direction: rtl"'))
  tabs(rtl.root)
  rtl.key(rtl.one('#tab-profile'), 'ArrowLeft')
  assert.deepEqual(rtl.selected(), ['tab-billing'])

  const vertical = setup(markup('aria-orientation="vertical"'))
  tabs(vertical.root)
  assert.equal(vertical.key(vertical.one('#tab-profile'), 'ArrowRight'), false, 'the horizontal arrows are left alone')
  vertical.key(vertical.one('#tab-profile'), 'ArrowDown')
  assert.deepEqual(vertical.selected(), ['tab-billing'])
  vertical.key(vertical.one('#tab-billing'), 'ArrowUp')
  assert.deepEqual(vertical.selected(), ['tab-profile'])
})

test('tabs: a click selects a tab; a disabled tab, a key with a modifier and an unknown key do nothing', () => {
  const { root, one, key, click, selected, heard } = setup()
  tabs(root)
  click(one('#tab-keys'))
  assert.deepEqual(selected(), ['tab-keys'])
  click(one('#tab-team'))
  assert.deepEqual(selected(), ['tab-keys'])
  click(one('#tab-keys'))
  assert.deepEqual(heard, ['Keys'], 'selecting the selected tab says nothing')
  assert.equal(key(one('#tab-keys'), 'ArrowLeft', { ctrlKey: true }), false)
  assert.equal(key(one('#tab-keys'), 'a'), false)
  assert.deepEqual(selected(), ['tab-keys'])
})

test('tabs: value reads the selected tab, and setting it selects without a change event', () => {
  const { root, selected, shown, stops, heard } = setup()
  const handle = tabs(root)
  assert.equal(handle.value, 'Profile')
  handle.value = 'billing'
  assert.equal(handle.value, 'billing')
  assert.deepEqual(selected(), ['tab-billing'])
  assert.deepEqual(stops(), ['tab-billing'])
  assert.deepEqual(shown(), ['panel-billing'])
  handle.value = 'nothing by that name'
  assert.deepEqual(selected(), ['tab-billing'], 'a value no tab stands for changes nothing')
  assert.deepEqual(heard, [])
})

test('tabs: the tabs of a tablist inside a panel are that tablist\'s own', () => {
  const { root, one, key, selected } = setup(markup().replace('Profile settings', `<div class="tabs" role="tablist" aria-label="Inner"><button type="button" class="tabs-item" role="tab" id="inner-a" aria-selected="true">A</button></div>`))
  tabs(root)
  key(one('#tab-keys'), 'ArrowRight')
  assert.ok(selected().includes('tab-profile'), 'the outer tablist wraps to its own first tab')
  assert.ok(selected().includes('inner-a'), 'the inner tab is left as it was')
})

test('tabs: detach removes the listeners and gives every tab its tabindex back; attaching twice leaves one behavior', () => {
  const { root, one, all, key, selected, heard } = setup()
  tabs(root)
  const detach = tabs(root)
  key(one('#tab-profile'), 'ArrowRight')
  assert.deepEqual(heard, ['billing'], 'one behavior answered')
  detach()
  assert.deepEqual(all('[role="tab"]').map(tab => tab.getAttribute('tabindex')), [null, null, null, null])
  assert.equal(key(one('#tab-billing'), 'ArrowRight'), false)
  assert.deepEqual(selected(), ['tab-billing'])
})
