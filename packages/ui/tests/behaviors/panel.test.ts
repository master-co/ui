import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { panel } from '../../behaviors/panel.js'

/**
 * The panel's behavior writes the place and the size a pointer or a key asks for, and reads back where the
 * stylesheet drew the panel. happy-dom has no layout, so a test draws it: a viewport of 1000 by 800, a gutter
 * of 8, a header of 44, 320 wide by default and never narrower than 192, 200 tall by default, and the clamps
 * of panel.css.
 */
const markup = (id = 'layers', attributes = '') => `<div id="${id}" popover="manual" role="dialog" class="panel" aria-labelledby="${id}-title" ${attributes}>
  <div class="panel-header">
    <button type="button" class="panel-handle" aria-label="Move the ${id} panel with the arrow keys"></button>
    <h2 class="panel-title" id="${id}-title">${id}</h2>
    <div class="panel-actions">
      <button type="button" class="btn btn-quiet btn-sm btn-square panel-minimize" aria-pressed="false" aria-label="Minimize"></button>
      <button type="button" class="btn btn-quiet btn-sm btn-square" commandfor="${id}" command="hide-popover" aria-label="Close"></button>
    </div>
  </div>
  <div class="panel-body"><button type="button" class="inside">Header</button></div>
  <span class="panel-resize" aria-hidden="true"></span>
</div>`

const thrown: unknown[] = []
afterEach(() => assert.deepEqual(thrown.splice(0), [], 'a listener threw'))

const clamp = (least: number, value: number, most: number) => Math.max(least, Math.min(value, most))

function draw(root: any) {
  const number = (name: string) => parseFloat(root.style.getPropertyValue(`--panel-${name}`))
  root.getBoundingClientRect = () => {
    const given = number('width')
    const width = Math.min(Math.max(192, Number.isNaN(given) ? 320 : given), 984)
    const folded = root.querySelector('.panel-minimize')?.getAttribute('aria-pressed') === 'true'
    const tall = number('height')
    const height = folded ? 44 : Math.min(Math.max(44, Number.isNaN(tall) ? 200 : tall), 784)
    const left = clamp(8, Number.isNaN(number('x')) ? 1000 : number('x'), 1000 - width - 8)
    const top = clamp(8, Number.isNaN(number('y')) ? 0 : number('y'), 800 - 44 - 8)
    return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }
  }
}

function setup(html = `<button type="button" class="opener" commandfor="layers" command="toggle-popover">Layers</button>${markup()}`) {
  const page = dom(html)
  page.window.addEventListener('error', (event: any) => thrown.push(event.error ?? event.message))
  // The helper's popover methods say toggle; a browser says beforetoggle first, with the state it goes to.
  const element = page.window.HTMLElement.prototype as any
  for (const [name, state] of [['showPopover', 'open'], ['hidePopover', 'closed']] as const) {
    const original = element[name]
    element[name] = function () {
      if ((state === 'open') === page.isOpen(this)) return
      this.dispatchEvent(Object.assign(new page.window.Event('beforetoggle'), { newState: state, oldState: state === 'open' ? 'closed' : 'open' }))
      original.call(this)
    }
  }
  for (const root of page.all('.panel')) draw(root)
  const root = page.one<HTMLElement>('.panel')
  const handle = page.one<HTMLElement>('.panel-handle')
  const captured: number[] = []
  for (const each of page.all('.panel-handle, .panel-resize')) each.setPointerCapture = (id: number) => { captured.push(id) }
  const heard: string[] = []
  root.addEventListener('input', (event: any) => { if (event.target === root) heard.push('input') })
  root.addEventListener('change', (event: any) => { if (event.target === root) heard.push('change') })
  const style = (name: string) => root.style.getPropertyValue(`--panel-${name}`)
  return { ...page, root, handle, captured, heard, style }
}

/** Open the panel the way its button does: with the button focused. */
function open(page: ReturnType<typeof setup>, root = page.root) {
  page.document.querySelector<HTMLElement>(`[commandfor="${root.id}"]`)?.focus()
  root.showPopover()
}

test('panel: the arrow keys on the handle move the panel a step, and Shift four steps', () => {
  const page = setup()
  const { root, handle, key, heard, style } = page
  panel(root)
  open(page)
  assert.equal(key(handle, 'ArrowLeft'), true, 'a key the behavior handles is prevented')
  assert.equal(style('x'), '656px', 'from where it was drawn, 1000 - 320 - 8 - 16')
  assert.equal(style('y'), '8px')
  assert.deepEqual(heard, ['input', 'change'])
  key(handle, 'ArrowDown')
  assert.equal(style('y'), '24px')
  key(handle, 'ArrowDown', { shiftKey: true })
  assert.equal(style('y'), '88px')
  key(handle, 'ArrowRight')
  key(handle, 'ArrowUp')
  assert.equal(style('x'), '672px')
  assert.equal(style('y'), '72px')
  key(handle, 'ArrowLeft', { shiftKey: true })
  assert.equal(style('x'), '608px')
})

test('panel: a move stops at the edge of the viewport and keeps the place the panel was drawn at', () => {
  const page = setup()
  const { root, handle, key, heard, style } = page
  const behavior = panel(root)
  open(page)
  behavior.value = { x: 12, y: 30, width: null, height: null, minimized: false }
  key(handle, 'ArrowLeft')
  assert.equal(style('x'), '8px', 'it went as far as the gutter, and holds where it was drawn')
  heard.length = 0
  assert.equal(key(handle, 'ArrowLeft'), true)
  assert.equal(style('x'), '8px')
  assert.deepEqual(heard, [], 'a key that moves nothing says nothing')
})

test('panel: Alt with ArrowRight and ArrowLeft makes the panel wider and narrower, with ArrowDown and ArrowUp taller and shorter', () => {
  const page = setup()
  const { root, handle, key, heard, style } = page
  panel(root)
  open(page)
  assert.equal(key(handle, 'ArrowRight', { altKey: true }), true)
  assert.equal(style('width'), '336px')
  assert.equal(style('height'), '', 'a change of width leaves the height to the content')
  assert.equal(style('x'), '', 'and the place to the stylesheet')
  assert.deepEqual(heard, ['input', 'change'])
  key(handle, 'ArrowLeft', { altKey: true, shiftKey: true })
  assert.equal(style('width'), '272px')
  key(handle, 'ArrowDown', { altKey: true })
  assert.equal(style('height'), '216px')
  key(handle, 'ArrowUp', { altKey: true, shiftKey: true })
  assert.equal(style('height'), '152px')
  key(handle, 'ArrowLeft', { altKey: true, shiftKey: true })
  key(handle, 'ArrowLeft', { altKey: true, shiftKey: true })
  assert.equal(style('width'), '192px', 'no narrower than the stylesheet draws it')
})

test('panel: from right to left the corner is at the left, so Alt+ArrowLeft makes the panel wider and keeps its right edge', () => {
  const page = setup(markup('layers', 'style="direction: rtl; --panel-x: 100px; --panel-y: 100px"'))
  const { root, handle, key, style } = page
  panel(root)
  root.showPopover()
  key(handle, 'ArrowLeft', { altKey: true })
  assert.equal(style('width'), '336px')
  assert.equal(style('x'), '84px', 'the right edge stays at 420')
  key(handle, 'ArrowRight', { altKey: true })
  assert.equal(style('width'), '320px')
  assert.equal(style('x'), '100px')
})

test('panel: the minimize button folds the panel and unfolds it, and a folded panel keeps its height', () => {
  const page = setup()
  const { root, handle, key, click, one, heard, style } = page
  const behavior = panel(root)
  open(page)
  const folder = one('.panel-minimize')
  click(folder)
  assert.equal(folder.getAttribute('aria-pressed'), 'true')
  assert.deepEqual(heard, ['input', 'change'])
  assert.equal(behavior.value.minimized, true)
  assert.equal(key(handle, 'ArrowDown', { altKey: true }), true)
  assert.equal(style('height'), '', 'the keys do not make a folded panel taller')
  key(handle, 'ArrowRight', { altKey: true })
  assert.equal(style('width'), '336px', 'but they still widen it')
  click(folder)
  assert.equal(folder.getAttribute('aria-pressed'), 'false')
  assert.equal(behavior.value.minimized, false)
})

test('panel: a disabled minimize button folds nothing', () => {
  const page = setup()
  const { root, click, one, heard } = page
  panel(root)
  const folder = one<HTMLButtonElement>('.panel-minimize')
  folder.disabled = true
  click(folder)
  assert.equal(folder.getAttribute('aria-pressed'), 'false')
  assert.deepEqual(heard, [])
})

test('panel: arrows away from the handle, and with Control or Command, are left alone', () => {
  const page = setup()
  const { root, handle, key, one, heard, style } = page
  panel(root)
  open(page)
  assert.equal(key(one('.inside'), 'ArrowLeft'), false, 'a control in the body keeps its arrows')
  assert.equal(key(handle, 'ArrowLeft', { ctrlKey: true }), false)
  assert.equal(key(handle, 'ArrowLeft', { metaKey: true }), false)
  assert.equal(key(handle, 'Home'), false)
  assert.equal(style('x'), '')
  assert.deepEqual(heard, [])
})

test('panel: a drag of the handle moves the panel, says input as it goes and change when it is let go', () => {
  const page = setup()
  const { root, handle, pointer, captured, heard, style } = page
  const behavior = panel(root)
  open(page)
  pointer(handle, 'pointerdown', { pointerId: 3, button: 0, clientX: 700, clientY: 20 })
  assert.deepEqual(captured, [3], 'the handle captures the pointer')
  pointer(handle, 'pointermove', { pointerId: 3, clientX: 600, clientY: 120 })
  assert.equal(style('x'), '572px', 'the point it was picked up by stays under the pointer')
  assert.equal(style('y'), '108px')
  pointer(handle, 'pointermove', { pointerId: 9, clientX: 0, clientY: 0 })
  assert.equal(style('x'), '572px', 'another pointer does not move it')
  pointer(handle, 'pointermove', { pointerId: 3, clientX: -400, clientY: 120 })
  assert.equal(style('x'), '-428px', 'while it is held the place asked for is written; the stylesheet keeps it in')
  assert.deepEqual(heard, ['input', 'input'])
  pointer(handle, 'pointerup', { pointerId: 3, clientX: -400, clientY: 120 })
  assert.deepEqual(heard, ['input', 'input', 'change'])
  assert.equal(style('x'), '8px', 'let go, it keeps the place it was drawn at')
  assert.deepEqual(behavior.value, { x: 8, y: 108, width: null, height: null, minimized: false })
  pointer(handle, 'pointermove', { pointerId: 3, clientX: 900, clientY: 300 })
  assert.equal(style('x'), '8px', 'a pointer that let go moves nothing')
})

test('panel: a press that does not move says nothing, and a press on an action or with another button drags nothing', () => {
  const page = setup()
  const { root, handle, pointer, one, captured, heard, style } = page
  panel(root)
  open(page)
  pointer(handle, 'pointerdown', { pointerId: 1, button: 0, clientX: 700, clientY: 20 })
  pointer(handle, 'pointerup', { pointerId: 1, clientX: 700, clientY: 20 })
  assert.deepEqual(heard, [])
  pointer(one('.panel-minimize'), 'pointerdown', { pointerId: 2, button: 0, clientX: 950, clientY: 20 })
  pointer(one('.panel-minimize'), 'pointermove', { pointerId: 2, clientX: 600, clientY: 300 })
  pointer(handle, 'pointerdown', { pointerId: 4, button: 2, clientX: 700, clientY: 20 })
  pointer(handle, 'pointermove', { pointerId: 4, clientX: 600, clientY: 300 })
  assert.deepEqual(captured, [1])
  assert.equal(style('x'), '')
  assert.deepEqual(heard, [])
})

test('panel: a drag of the corner resizes the panel', () => {
  const page = setup()
  const { root, pointer, one, captured, heard, style } = page
  const behavior = panel(root)
  open(page)
  const corner = one('.panel-resize')
  pointer(corner, 'pointerdown', { pointerId: 5, button: 0, clientX: 990, clientY: 206 })
  assert.deepEqual(captured, [5])
  pointer(corner, 'pointermove', { pointerId: 5, clientX: 940, clientY: 306 })
  assert.equal(style('width'), '270px')
  assert.equal(style('height'), '300px')
  pointer(corner, 'pointermove', { pointerId: 5, clientX: 700, clientY: 306 })
  pointer(corner, 'pointerup', { pointerId: 5, clientX: 700, clientY: 306 })
  assert.deepEqual(heard, ['input', 'input', 'change'])
  assert.deepEqual(behavior.value, { x: null, y: null, width: 192, height: 300, minimized: false }, 'it keeps the least width the stylesheet drew')
})

test('panel: a panel opened from a control takes focus on its handle, and Escape closes it and gives focus back', () => {
  const page = setup()
  const { root, handle, key, one, document, isOpen } = page
  panel(root)
  open(page)
  assert.equal(document.activeElement, handle, 'focus goes to the panel')
  one<HTMLElement>('.inside').focus()
  assert.equal(key(one('.inside'), 'Escape'), true)
  assert.equal(isOpen(root), false)
  assert.equal(document.activeElement, one('.opener'), 'focus goes back to the control that opened it')
})

test('panel: a panel opened by the page, not from a control, leaves focus where it is', () => {
  const page = setup()
  const { root, document } = page
  panel(root)
  root.showPopover()
  assert.equal(document.activeElement, document.body)
})

test('panel: Escape is left to a control that handled it, and to a popover inside the panel', () => {
  const page = setup()
  const { root, one, key, isOpen } = page
  panel(root)
  open(page)
  const inside = one<HTMLElement>('.inside')
  inside.addEventListener('keydown', (event: KeyboardEvent) => { if (event.key === 'Escape') event.preventDefault() }, { once: true })
  key(inside, 'Escape')
  assert.equal(isOpen(root), true)
  const menu = page.document.createElement('div')
  menu.setAttribute('popover', '')
  menu.innerHTML = '<button type="button" class="item">Rename</button>'
  one('.panel-body').append(menu)
  assert.equal(key(menu.querySelector('.item'), 'Escape'), false)
  assert.equal(isOpen(root), true)
  assert.equal(key(one('.panel-handle'), 'Escape', { shiftKey: true }), false)
  assert.equal(isOpen(root), true)
})

test('panel: closing with the close button gives focus back to the control that opened it', () => {
  const page = setup()
  const { root, one, document } = page
  panel(root)
  open(page)
  one<HTMLElement>('[command="hide-popover"]').focus()
  root.hidePopover()
  assert.equal(document.activeElement, one('.opener'))
})

test('panel: a press or focus inside a panel behind another brings it to the front', () => {
  const page = setup(markup('layers') + markup('colors'))
  const [layers, colors] = page.all<HTMLElement>('.panel')
  const shown: string[] = []
  const element = page.window.HTMLElement.prototype as any
  const show = element.showPopover
  element.showPopover = function () { shown.push(this.id); show.call(this) }
  const detach = [panel(layers), panel(colors)]
  layers.showPopover()
  colors.showPopover()
  assert.deepEqual(shown, ['layers', 'colors'])
  page.pointer(colors.querySelector('.panel-body'), 'pointerdown', { pointerId: 1, button: 0 })
  assert.deepEqual(shown, ['layers', 'colors'], 'the front panel stays as it is')
  const inside = layers.querySelector<HTMLElement>('.inside')!
  inside.focus()
  assert.deepEqual(shown, ['layers', 'colors', 'layers'], 'the panel behind is shown again, in front')
  assert.equal(page.document.activeElement, inside, 'and keeps the focus it was given')
  assert.equal(page.isOpen(layers), true)
  page.pointer(colors.querySelector('.panel-title'), 'pointerdown', { pointerId: 2, button: 0 })
  assert.deepEqual(shown, ['layers', 'colors', 'layers', 'colors'])
  detach.forEach(each => each())
})

test('panel: value reads and sets the place, the size and the fold, and setting it says nothing', () => {
  const page = setup()
  const { root, one, heard, style } = page
  const behavior = panel(root)
  assert.deepEqual(behavior.value, { x: null, y: null, width: null, height: null, minimized: false })
  behavior.value = { x: 120.4, y: 64, width: 360, height: null, minimized: true }
  assert.equal(style('x'), '120px')
  assert.equal(style('y'), '64px')
  assert.equal(style('width'), '360px')
  assert.equal(style('height'), '')
  assert.equal(one('.panel-minimize').getAttribute('aria-pressed'), 'true')
  assert.deepEqual(behavior.value, { x: 120, y: 64, width: 360, height: null, minimized: true })
  behavior.value = { x: null, y: null, width: null, height: null, minimized: false }
  assert.equal(style('x'), '')
  assert.equal(one('.panel-minimize').getAttribute('aria-pressed'), 'false')
  assert.deepEqual(heard, [])
})

test('panel: detach removes the listeners', () => {
  const page = setup()
  const { root, handle, key, click, one, pointer, heard, style } = page
  const detach = panel(root)
  open(page)
  detach()
  assert.equal(key(handle, 'ArrowLeft'), false)
  click(one('.panel-minimize'))
  pointer(handle, 'pointerdown', { pointerId: 1, button: 0, clientX: 700, clientY: 20 })
  pointer(handle, 'pointermove', { pointerId: 1, clientX: 600, clientY: 20 })
  assert.equal(key(handle, 'Escape'), false)
  assert.equal(page.isOpen(root), true)
  assert.equal(one('.panel-minimize').getAttribute('aria-pressed'), 'false')
  assert.equal(style('x'), '')
  assert.deepEqual(heard, [])
})
