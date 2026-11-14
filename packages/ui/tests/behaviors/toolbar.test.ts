import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { toolbar } from '../../behaviors/toolbar.js'

const thrown: unknown[] = []
afterEach(() => assert.deepEqual(thrown.splice(0), [], 'a listener threw'))

const markup = `<button type="button" id="before">Before</button>
<div class="toolbar" role="toolbar" aria-label="Formatting">
  <button type="button" class="btn btn-quiet btn-sm" id="bold" aria-pressed="true">Bold</button>
  <button type="button" class="btn btn-quiet btn-sm" id="italic" aria-pressed="false">Italic</button>
  <button type="button" class="btn btn-quiet btn-sm" id="strike" disabled>Strike</button>
  <span class="toolbar-separator" role="separator" aria-orientation="vertical"></span>
  <div class="segmented" role="radiogroup" aria-label="Align">
    <label class="segmented-item"><input class="segmented-input" type="radio" name="align" id="left" value="left">Left</label>
    <label class="segmented-item"><input class="segmented-input" type="radio" name="align" id="center" value="center" checked>Center</label>
  </div>
  <select id="size" aria-label="Size"><option>Small</option><option>Large</option></select>
  <button type="button" class="btn btn-quiet btn-sm" id="link" aria-disabled="true">Link</button>
</div>`

function setup(html = markup) {
  const page = dom(html)
  page.window.addEventListener('error', (event: any) => thrown.push(event.error ?? event.message))
  const root = page.one('.toolbar')
  const focused = () => (page.document.activeElement as HTMLElement | null)?.id
  const stops = () => page.all<HTMLElement>('.toolbar button, .toolbar input, .toolbar select').filter(each => each.tabIndex === 0 && !(each as HTMLButtonElement).disabled).map(each => each.id)
  return { ...page, root, focused, stops }
}

test('toolbar: one control is in the tab order, the first, and focus moves the stop with it', () => {
  const { root, one, stops } = setup()
  toolbar(root)
  assert.deepEqual(stops(), ['bold'])
  one<HTMLElement>('#size').focus()
  assert.deepEqual(stops(), ['size'], 'returning to the toolbar returns to the control focused last')
})

test('toolbar: ArrowRight and ArrowLeft move along it, wrapping, skipping disabled controls, with a radio group as one stop', () => {
  const { root, one, key, focused } = setup()
  toolbar(root)
  one<HTMLElement>('#bold').focus()
  assert.equal(key(one('#bold'), 'ArrowRight'), true)
  assert.equal(focused(), 'italic')
  key(one('#italic'), 'ArrowRight')
  assert.equal(focused(), 'center', 'Strike is disabled; the group stands for its checked radio')
  assert.equal(key(one('#center'), 'ArrowRight'), true, 'the arrows leave the group instead of choosing')
  assert.equal(focused(), 'size')
  assert.equal(key(one('#size'), 'ArrowRight'), false, 'a select keeps its arrows')
  one<HTMLElement>('#link').focus()
  key(one('#link'), 'ArrowRight')
  assert.equal(focused(), 'bold', 'aria-disabled stays reachable, and the end wraps')
  key(one('#bold'), 'ArrowLeft')
  assert.equal(focused(), 'link')
})

test('toolbar: Home and End go to the first and the last control', () => {
  const { root, one, key, focused } = setup()
  toolbar(root)
  one<HTMLElement>('#italic').focus()
  key(one('#italic'), 'End')
  assert.equal(focused(), 'link')
  key(one('#link'), 'Home')
  assert.equal(focused(), 'bold')
})

test('toolbar: vertical toolbars move with ArrowDown and ArrowUp, and leave Left and Right alone', () => {
  const { root, one, key, focused } = setup(markup.replace('aria-label="Formatting"', 'aria-label="Formatting" aria-orientation="vertical"'))
  toolbar(root)
  one<HTMLElement>('#bold').focus()
  assert.equal(key(one('#bold'), 'ArrowRight'), false)
  key(one('#bold'), 'ArrowDown')
  assert.equal(focused(), 'italic')
  key(one('#italic'), 'ArrowUp')
  assert.equal(focused(), 'bold')
})

test('toolbar: from right to left ArrowLeft moves forward', () => {
  const { root, one, key, focused } = setup()
  ;(globalThis as any).getComputedStyle = () => ({ direction: 'rtl' })
  toolbar(root)
  one<HTMLElement>('#bold').focus()
  key(one('#bold'), 'ArrowLeft')
  assert.equal(focused(), 'italic')
})

test('toolbar: a toggle button presses on a click; aria-disabled stops the click', () => {
  const { root, one, click } = setup()
  toolbar(root)
  let heard = 0
  one('#link').addEventListener('click', () => heard++)
  click(one('#italic'))
  assert.equal(one('#italic').getAttribute('aria-pressed'), 'true')
  click(one('#bold'))
  assert.equal(one('#bold').getAttribute('aria-pressed'), 'false')
  click(one('#link'))
  assert.equal(heard, 0)
})

test('toolbar: where the browser has focusgroup, the keys are its own', () => {
  const { root, one, key, stops, window } = setup(markup.replace('aria-label="Formatting"', 'aria-label="Formatting" focusgroup="toolbar wrap"'))
  ;(window.HTMLElement.prototype as any).focusGroup = ''
  toolbar(root)
  assert.ok(stops().length > 1, 'the script keeps no roving tab stop')
  assert.equal(key(one('#bold'), 'ArrowRight'), false)
})

test('toolbar: detach removes the listeners', () => {
  const { root, one, key, click } = setup()
  toolbar(root)()
  one<HTMLElement>('#bold').focus()
  assert.equal(key(one('#bold'), 'ArrowRight'), false)
  click(one('#italic'))
  assert.equal(one('#italic').getAttribute('aria-pressed'), 'false')
})

test('toolbar: detach gives every control back the tabindex it had', () => {
  const { root, all } = setup(markup.replace('id="italic"', 'id="italic" tabindex="0"'))
  const detach = toolbar(root)
  assert.equal(all('.toolbar [tabindex="-1"]').length > 0, true)
  detach()
  assert.equal(all('.toolbar [tabindex="-1"]').length, 0, 'no control is left out of the tab order')
  assert.equal(root.querySelector('#italic').getAttribute('tabindex'), '0', 'a tabindex the page wrote stays')
  assert.equal(root.querySelector('#bold').hasAttribute('tabindex'), false)
})
