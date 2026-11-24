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

test('toolbar: a nested toolbar handles its own toggles, focus and arrows', () => {
  const { root, one, click, key, focused } = setup(`<div class="toolbar" role="toolbar">
    <button id="before">Before</button>
    <div class="toolbar" role="toolbar" id="inner"><button id="toggle" aria-pressed="false">Bold</button></div>
    <button id="after">After</button></div>`)
  toolbar(root)
  toolbar(one('#inner'))
  click(one('#toggle'))
  assert.equal(one('#toggle').getAttribute('aria-pressed'), 'true')
  one('#before').focus()
  key(one('#before'), 'ArrowRight')
  assert.equal(focused(), 'after')
  one('#toggle').focus()
  assert.equal(one('#after').tabIndex, 0, 'focusing the inner toolbar preserves the outer stop')
})

test('toolbar: same-name radios in separate forms are independent stops', () => {
  const { root, one, focused, key } = setup(`<div class="toolbar" role="toolbar">
    <form><input type="radio" name="view" checked id="first"></form>
    <form><input type="radio" name="view" checked id="second"></form><button>Save</button></div>`)
  toolbar(root)
  assert.equal(one('#second').tabIndex, -1)
  one('#first').focus()
  key(one('#first'), 'ArrowRight')
  assert.equal(focused(), 'second')
  assert.equal(one('#first').tabIndex, -1)
})

test('toolbar: arrows pass over an inert subtree', () => {
  const { root, one, focused, key } = setup(`<div class="toolbar"><button id="start">Start</button>
    <div inert><button>Unavailable</button></div><button id="end">End</button></div>`)
  toolbar(root)
  one('#start').focus()
  key(one('#start'), 'ArrowRight')
  assert.equal(focused(), 'end')
})

test('toolbar: where the browser has focusgroup, the keys are its own', () => {
  const { root, one, key, stops, window } = setup(markup.replace('aria-label="Formatting"', 'aria-label="Formatting" focusgroup="toolbar wrap"'))
  ;(window.HTMLElement.prototype as any).focusGroup = ''
  toolbar(root)
  assert.ok(stops().length > 1, 'the script keeps no roving tab stop')
  assert.equal(key(one('#bold'), 'ArrowRight'), false)
})

test('toolbar: when the control holding the stop is disabled, hidden or removed, the first control takes the stop', async () => {
  const { root, one, stops } = setup()
  toolbar(root)
  one<HTMLElement>('#size').focus()
  assert.deepEqual(stops(), ['size'])
  one<HTMLSelectElement>('#size').disabled = true
  await Promise.resolve()
  assert.deepEqual(stops(), ['bold'], 'a disabled stop hands it to the first control')
  one<HTMLElement>('#bold').hidden = true
  await Promise.resolve()
  assert.deepEqual(stops().filter(id => id !== 'bold'), ['italic'], 'a hidden stop hands it on; hidden, it cannot take focus')
  one<HTMLElement>('#italic').remove()
  await Promise.resolve()
  assert.deepEqual(stops().filter(id => id !== 'bold'), ['left', 'center'], 'a removed stop hands it on, to a radio group as the platform keeps it')
  one<HTMLElement>('#link').focus()
  one<HTMLElement>('#bold').hidden = false
  await Promise.resolve()
  assert.deepEqual(stops(), ['link'], 'a stop still in place keeps it')
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

test('toolbar: in a dialog, a popover or a hidden panel it still walks its own controls', () => {
  for (const [open, close] of [['<dialog open>', '</dialog>'], ['<div popover>', '</div>'], ['<div hidden>', '</div>']]) {
    const { root, one, key, focused, stops } = setup(open + markup + close)
    toolbar(root)
    assert.deepEqual(stops(), ['bold'], `${open}: one stop`)
    one<HTMLElement>('#bold').focus()
    assert.equal(key(one('#bold'), 'ArrowRight'), true, `${open}: the arrow is the toolbar's`)
    assert.equal(focused(), 'italic')
  }
})

test('toolbar: a key a control inside has taken, such as a slider\'s arrow, stays with it', () => {
  const { root, one, key, focused } = setup(markup.replace('<select', '<div id="level" role="slider" tabindex="0" aria-valuenow="2">2</div><select'))
  toolbar(root)
  const level = one<HTMLElement>('#level')
  level.addEventListener('keydown', (event) => { if (event.key.startsWith('Arrow')) event.preventDefault() })
  level.focus()
  key(level, 'ArrowRight')
  assert.equal(focused(), 'level', 'the slider keeps focus')
  key(level, 'Home')
  assert.equal(focused(), 'bold', 'a key it leaves is still the toolbar\'s')
})
