import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { drawer } from '../../behaviors/drawer.js'

/**
 * The drawer behavior works on a track that scrolls, which happy-dom cannot lay out. A test lays it out by
 * hand: the track is 400 by 800, the panel is `size` long along the way it leaves, and `pushed` is how far it
 * has moved away from its open rest. The track's `scrollBy` moves the panel as a browser would, without
 * snapping, and the stylesheet's half rest is the height `getComputedStyle(panel, '::before')` reports.
 */
const items = Array.from({ length: 3 }, (_, at) => `<li>Comment ${at + 1}</li>`).join('')
const markup = (classes: string, handle: string, closedby = 'closedby="any"') => `<button type="button" class="btn" commandfor="sheet" command="show-modal">Comments</button>
<dialog id="sheet" class="dialog ${classes}" ${closedby} aria-labelledby="sheet-title">
  <div class="dialog-panel">
    ${handle}
    <header class="dialog-header"><h2 class="dialog-title" id="sheet-title">Comments</h2></header>
    <div class="dialog-body"><ul>${items}</ul><button type="button" class="btn">Reply</button></div>
  </div>
</dialog>`
const button = '<button type="button" class="dialog-handle" aria-label="Sheet height"></button>'
const groove = '<div class="dialog-handle" aria-hidden="true"></div>'

function setup({ classes = 'dialog-sheet dialog-swipe dialog-detents', handle = button, closedby = 'closedby="any"', size = 752, shown = 400, direction = 'ltr' } = {}) {
  const page = dom(markup(classes, handle, closedby))
  const root = page.one<any>('dialog')
  const panel = page.one<any>('.dialog-panel')
  const layout = { pushed: 0, direction }
  const drawerSide = () => root.classList.contains('dialog-drawer')
  const leavesRight = () => root.classList.contains('dialog-drawer-start') === (layout.direction === 'rtl')
  root.getBoundingClientRect = () => ({ left: 0, top: 0, right: 400, bottom: 800, width: 400, height: 800, x: 0, y: 0 })
  panel.getBoundingClientRect = () => {
    if (!drawerSide()) return { left: 0, right: 400, width: 400, height: size, top: 800 - size + layout.pushed, bottom: 800 + layout.pushed }
    const left = leavesRight() ? 400 - size + layout.pushed : -layout.pushed
    return { left, right: left + size, width: size, height: 784, top: 8, bottom: 792 }
  }
  const scrolled: { left: number, top: number, behavior?: string }[] = []
  root.scrollBy = ({ left = 0, top = 0, behavior }: { left?: number, top?: number, behavior?: string }) => {
    scrolled.push({ left, top, behavior })
    // Scrolling forward moves what the track holds back, so the panel moves the other way.
    const moved = drawerSide() ? (leavesRight() ? -left : left) : -top
    layout.pushed = Math.min(size, Math.max(0, layout.pushed + moved))
    root.dispatchEvent(new page.window.Event('scroll'))
  }
  const computed = globalThis.getComputedStyle
  globalThis.getComputedStyle = ((element: any, pseudo?: string) => {
    if (element === panel && pseudo === '::before') return { blockSize: root.classList.contains('dialog-detents') ? `${shown}px` : 'auto' }
    if (element === root) return { ...computed(element), direction: layout.direction }
    return computed(element, pseudo)
  }) as any
  /** The observer the behavior watches the panel with, if it made one. */
  const observers: { callback: (entries: { intersectionRatio: number }[]) => void, options: any, target?: Element }[] = []
  ;(globalThis as any).IntersectionObserver = class {
    entry: (typeof observers)[number]
    constructor(callback: any, options: any) { this.entry = { callback, options }; observers.push(this.entry) }
    observe(target: Element) { this.entry.target = target }
    disconnect() { observers.splice(observers.indexOf(this.entry), 1) }
  }
  const open = () => {
    root.showModal?.() ?? root.setAttribute('open', '')
    root.dispatchEvent(Object.assign(new page.window.Event('beforetoggle'), { newState: 'open' }))
    root.dispatchEvent(Object.assign(new page.window.Event('toggle'), { newState: 'open' }))
  }
  const frame = () => new Promise(resolve => setTimeout(resolve, 40))
  /** A pointer event, at the time given: the speed of a drag is read from when its moves happened. */
  const pointer = (target: any, type: string, { timeStamp, ...init }: Record<string, any> = {}) => {
    const event = new page.window.PointerEvent(type, { bubbles: true, cancelable: true, ...init })
    if (timeStamp !== undefined) Object.defineProperty(event, 'timeStamp', { value: timeStamp })
    return target.dispatchEvent(event)
  }
  const expanded = () => page.one('.dialog-handle').getAttribute('aria-expanded')
  const scrim = () => root.style.getPropertyValue('--dialog-scrim')
  return { ...page, root, panel, layout, scrolled, observers, open, frame, pointer, expanded, scrim }
}

test('drawer: a sheet with detents opens at half height and its handle says it is not at full height', () => {
  const { root, layout, open, expanded, scrolled, errors } = setup()
  drawer(root)
  open()
  assert.equal(layout.pushed, 352, 'the panel rests with 400px shown')
  assert.equal(scrolled.at(-1)?.behavior, 'instant', 'it is put there, not carried')
  assert.equal(expanded(), 'false')
  assert.deepEqual(errors, [])
})

test('drawer: ArrowUp grows the sheet to full height, ArrowDown shrinks it to half height', () => {
  const { root, layout, open, key, one, expanded } = setup()
  drawer(root)
  open()
  const handle = one('.dialog-handle')
  assert.equal(key(handle, 'ArrowUp'), true, 'a key the behavior handles is prevented')
  assert.equal(layout.pushed, 0)
  assert.equal(expanded(), 'true')
  assert.equal(key(handle, 'ArrowUp'), true, 'at full height it stays there')
  assert.equal(layout.pushed, 0)
  assert.equal(key(handle, 'ArrowDown'), true)
  assert.equal(layout.pushed, 352)
  assert.equal(expanded(), 'false')
  assert.equal(key(handle, 'ArrowDown'), true, 'at half height it stays there: Escape is what closes')
  assert.equal(layout.pushed, 352)
  assert.equal(root.open, true)
  assert.equal(key(handle, 'ArrowLeft'), false, 'other keys are left alone')
  assert.equal(key(handle, 'ArrowUp', { altKey: true }), false, 'and so are the arrows held with a modifier')
  assert.equal(key(handle, 'ArrowUp', { metaKey: true }), false)
  assert.equal(layout.pushed, 352)
})

test('drawer: Enter, Space or a press on the handle moves the sheet to the other rest', () => {
  const { root, layout, open, click, one, expanded } = setup()
  drawer(root)
  open()
  const handle = one('.dialog-handle')
  // The browser turns Enter and Space on a button into a click.
  click(handle)
  assert.equal(layout.pushed, 0)
  assert.equal(expanded(), 'true')
  click(handle)
  assert.equal(layout.pushed, 352)
  assert.equal(expanded(), 'false')
})

test('drawer: a sheet too short for a half rest opens at full height and its handle says so', () => {
  const { root, layout, open, expanded } = setup({ size: 300 })
  drawer(root)
  open()
  assert.equal(layout.pushed, 0)
  assert.equal(expanded(), 'true')
})

test('drawer: without detents the handle is only a groove, and its keys are left alone', () => {
  const { root, layout, open, key, one } = setup({ classes: 'dialog-sheet dialog-swipe', handle: groove })
  drawer(root)
  open()
  assert.equal(layout.pushed, 0, 'it opens all the way')
  assert.equal(key(one('.dialog-handle'), 'ArrowDown'), false)
  assert.equal(one('.dialog-handle').hasAttribute('aria-expanded'), false)
})

test('drawer: the dialog closes once the panel has gone, and only after it was seen', () => {
  const { root, open, observers, panel } = setup()
  drawer(root)
  open()
  assert.equal(observers.length, 1)
  const [watching] = observers
  assert.equal(watching.options.root, root, 'the panel is watched on the track')
  assert.equal(watching.target, panel)
  watching.callback([{ intersectionRatio: 0 }])
  assert.equal(root.open, true, 'a panel not yet laid out has not gone')
  watching.callback([{ intersectionRatio: .5 }])
  watching.callback([{ intersectionRatio: 0 }])
  assert.equal(root.open, false, 'it went past the edge, so the dialog closed')
})

test('drawer: closedby="any" closes the dialog on a press on the track beside the panel', () => {
  const { root, open, click, pointer, one } = setup()
  drawer(root)
  open()
  pointer(one('.dialog-title'), 'pointerdown', { pointerType: 'touch' })
  click(root)
  assert.equal(root.open, true, 'a press that began on the panel and ended beside it is not a press on the scrim')
  pointer(root, 'pointerdown', { pointerType: 'touch' })
  click(root)
  assert.equal(root.open, false)
})

test('drawer: without closedby="any" a press on the track leaves the dialog open', () => {
  const { root, open, click, pointer } = setup({ closedby: '' })
  drawer(root)
  open()
  pointer(root, 'pointerdown', { pointerType: 'mouse', button: 0 })
  click(root)
  assert.equal(root.open, true)
})

test('drawer: a mouse drags the panel and lets it go to the nearest rest', async () => {
  const { root, layout, open, pointer, one, frame, expanded } = setup()
  drawer(root)
  open()
  {
    // From half height, 120px down and a pause: nearer half height than gone.
    const title = one('.dialog-title')
    assert.equal(pointer(title, 'pointerdown', { pointerType: 'mouse', button: 0, pointerId: 1, clientX: 200, clientY: 460, timeStamp: 0 }), false, 'the press is taken: no text is selected')
    pointer(title, 'pointermove', { pointerType: 'mouse', pointerId: 1, clientX: 200, clientY: 520, timeStamp: 100 })
    pointer(title, 'pointermove', { pointerType: 'mouse', pointerId: 1, clientX: 200, clientY: 580, timeStamp: 200 })
    assert.equal(layout.pushed, 472, 'the panel follows the pointer')
    pointer(title, 'pointerup', { pointerType: 'mouse', pointerId: 1, clientX: 200, clientY: 580, timeStamp: 600 })
    await frame()
    assert.equal(layout.pushed, 352, 'it settles back at half height')
  }
  // Up by 300px: nearer full height.
  const handle = one('.dialog-handle')
  pointer(handle, 'pointerdown', { pointerType: 'mouse', button: 0, pointerId: 2, clientX: 200, clientY: 456, timeStamp: 1000 })
  pointer(handle, 'pointermove', { pointerType: 'mouse', pointerId: 2, clientX: 200, clientY: 156, timeStamp: 1100 })
  pointer(handle, 'pointerup', { pointerType: 'mouse', pointerId: 2, clientX: 200, clientY: 156, timeStamp: 1400 })
  await frame()
  assert.equal(layout.pushed, 0)
  root.dispatchEvent(new Event('scrollend'))
  assert.equal(expanded(), 'true', 'where it settled is said')
})

test('drawer: a mouse that flings the panel lets it go to the rest it was thrown toward', async () => {
  const { root, layout, open, pointer, one, frame } = setup()
  drawer(root)
  open()
  const title = one('.dialog-title')
  // 40px down in 20ms from half height: alone it would settle back, thrown it reaches the gone rest.
  pointer(title, 'pointerdown', { pointerType: 'mouse', button: 0, pointerId: 1, clientX: 200, clientY: 460, timeStamp: 0 })
  pointer(title, 'pointermove', { pointerType: 'mouse', pointerId: 1, clientX: 200, clientY: 480, timeStamp: 10 })
  pointer(title, 'pointermove', { pointerType: 'mouse', pointerId: 1, clientX: 200, clientY: 500, timeStamp: 20 })
  pointer(title, 'pointerup', { pointerType: 'mouse', pointerId: 1, clientX: 200, clientY: 500, timeStamp: 30 })
  await frame()
  assert.equal(layout.pushed, 752)
})

test('drawer: a mouse press on a control, in the body or by touch does not take hold of the panel', () => {
  const { root, layout, open, pointer, one } = setup()
  drawer(root)
  open()
  const start = layout.pushed
  for (const [target, pointerType] of [[one('.dialog-body li'), 'mouse'], [one('.dialog-body .btn'), 'mouse'], [one('.dialog-title'), 'touch']] as const) {
    assert.equal(pointer(target, 'pointerdown', { pointerType, button: 0, pointerId: 3, clientX: 200, clientY: 460 }), true, 'the press is left to the page')
    pointer(target, 'pointermove', { pointerType, pointerId: 3, clientX: 200, clientY: 700 })
    pointer(target, 'pointerup', { pointerType, pointerId: 3, clientX: 200, clientY: 700 })
  }
  assert.equal(layout.pushed, start)
})

test('drawer: a handle dragged by a mouse is not pressed when the drag ends', async () => {
  const { root, layout, open, pointer, click, one, frame, expanded } = setup()
  drawer(root)
  open()
  const handle = one('.dialog-handle')
  pointer(handle, 'pointerdown', { pointerType: 'mouse', button: 0, pointerId: 4, clientX: 200, clientY: 456, timeStamp: 0 })
  pointer(handle, 'pointermove', { pointerType: 'mouse', pointerId: 4, clientX: 200, clientY: 476, timeStamp: 100 })
  pointer(handle, 'pointerup', { pointerType: 'mouse', pointerId: 4, clientX: 200, clientY: 476, timeStamp: 400 })
  click(handle)
  await frame()
  assert.equal(layout.pushed, 352, 'the drag settled back and the click after it did nothing')
  assert.equal(expanded(), 'false')
})

test('drawer: the scrim thins from the last rest before the gone one', () => {
  const { root, layout, open, scrim } = setup()
  drawer(root)
  open()
  root.scrollBy({ top: 352 })
  assert.equal(layout.pushed, 0)
  assert.equal(scrim(), '1')
  root.scrollBy({ top: -352 })
  assert.equal(scrim(), '1', 'all of it at half height')
  root.scrollBy({ top: -200 })
  assert.equal(scrim(), '0.5')
  root.scrollBy({ top: -200 })
  assert.equal(scrim(), '0')
  open()
  assert.equal(scrim(), '1', 'a dialog that opens again has all its scrim')
})

for (const [label, classes, direction, outward] of [
  ['a drawer at the inline end leaves to the right', 'dialog-drawer dialog-swipe', 'ltr', 1],
  ['a drawer at the inline start leaves to the left', 'dialog-drawer dialog-drawer-start dialog-swipe', 'ltr', -1],
  ['in a right-to-left page a drawer at the inline end leaves to the left', 'dialog-drawer dialog-swipe', 'rtl', -1],
  ['in a right-to-left page a drawer at the inline start leaves to the right', 'dialog-drawer dialog-drawer-start dialog-swipe', 'rtl', 1],
] as const) {
  test(`drawer: ${label}, after a mouse`, async () => {
    const { root, layout, open, pointer, one, frame } = setup({ classes, handle: '', size: 384, direction })
    drawer(root)
    open()
    assert.equal(layout.pushed, 0, 'it opens all the way')
    const title = one('.dialog-title')
    pointer(title, 'pointerdown', { pointerType: 'mouse', button: 0, pointerId: 1, clientX: 200, clientY: 100, timeStamp: 0 })
    pointer(title, 'pointermove', { pointerType: 'mouse', pointerId: 1, clientX: 200 + outward * 120, clientY: 100, timeStamp: 100 })
    assert.equal(layout.pushed, 120)
    pointer(title, 'pointermove', { pointerType: 'mouse', pointerId: 1, clientX: 200 + outward * 260, clientY: 100, timeStamp: 200 })
    pointer(title, 'pointerup', { pointerType: 'mouse', pointerId: 1, clientX: 200 + outward * 260, clientY: 100, timeStamp: 500 })
    await frame()
    assert.equal(layout.pushed, 384, 'past halfway it goes')
  })
}

test('drawer: a drawer\'s drag asks the dialog its direction once, as it begins, not on every move', () => {
  const { root, layout, open, pointer, one } = setup({ classes: 'dialog-drawer dialog-swipe', handle: '', size: 384 })
  drawer(root)
  open()
  const style = globalThis.getComputedStyle
  let asked = 0
  globalThis.getComputedStyle = ((element: any, pseudo?: string) => { if (element === root) asked++; return style(element, pseudo) }) as any
  try {
    const title = one('.dialog-title')
    pointer(title, 'pointerdown', { pointerType: 'mouse', button: 0, pointerId: 1, clientX: 200, clientY: 100, timeStamp: 0 })
    const atPress = asked
    for (let move = 1; move <= 5; move++) pointer(title, 'pointermove', { pointerType: 'mouse', pointerId: 1, clientX: 200 + move * 20, clientY: 100, timeStamp: move * 16 })
    assert.equal(layout.pushed, 100, 'the panel still follows the pointer')
    // The scrim is thinned as the track scrolls, which measures; the moves themselves ask nothing more.
    assert.equal(asked - atPress, 5, 'once for each scroll the moves made, none for the moves')
  } finally {
    globalThis.getComputedStyle = style
  }
})

test('drawer: a dialog without dialog-swipe is left alone', () => {
  const { root, layout, open, click, pointer, one, observers } = setup({ classes: 'dialog-sheet' })
  drawer(root)
  open()
  assert.equal(observers.length, 0)
  pointer(root, 'pointerdown', { pointerType: 'mouse', button: 0 })
  click(root)
  assert.equal(root.open, true)
  assert.equal(pointer(one('.dialog-title'), 'pointerdown', { pointerType: 'mouse', button: 0, pointerId: 1, clientX: 0, clientY: 0 }), true)
  assert.equal(layout.pushed, 0)
})

test('drawer: a drag whose capture is lost without a release ends, and a mouse that comes back carries nothing', async () => {
  const { root, layout, open, pointer, one, frame } = setup()
  drawer(root)
  open()
  const title = one('.dialog-title')
  pointer(title, 'pointerdown', { pointerType: 'mouse', button: 0, pointerId: 1, clientX: 200, clientY: 460, timeStamp: 0 })
  pointer(title, 'pointermove', { pointerType: 'mouse', pointerId: 1, clientX: 200, clientY: 520, timeStamp: 100 })
  assert.equal(layout.pushed, 412)
  pointer(title, 'lostpointercapture', { pointerType: 'mouse', pointerId: 1, timeStamp: 400 })
  await frame()
  assert.equal(layout.pushed, 352, 'it settles at the nearest rest')
  pointer(title, 'pointermove', { pointerType: 'mouse', pointerId: 1, clientX: 200, clientY: 700, timeStamp: 900 })
  assert.equal(layout.pushed, 352, 'the panel does not follow a pointer that holds nothing')
})

test('drawer: a drag let go just before detaching does not move the panel afterwards', async () => {
  const { root, layout, open, pointer, one, frame } = setup()
  const detach = drawer(root)
  open()
  const title = one('.dialog-title')
  pointer(title, 'pointerdown', { pointerType: 'mouse', button: 0, pointerId: 1, clientX: 200, clientY: 460, timeStamp: 0 })
  pointer(title, 'pointermove', { pointerType: 'mouse', pointerId: 1, clientX: 200, clientY: 520, timeStamp: 100 })
  pointer(title, 'pointerup', { pointerType: 'mouse', pointerId: 1, clientX: 200, clientY: 520, timeStamp: 600 })
  detach()
  await frame()
  assert.equal(layout.pushed, 412, 'the frame it waited for finds it detached')
})

test('drawer: attaching again to an open dialog leaves one observer', () => {
  const { root, open, observers } = setup()
  drawer(root)
  open()
  assert.equal(observers.length, 1)
  const detach = drawer(root)
  assert.equal(observers.length, 1, 'the first attachment\'s observer is gone with it')
  detach()
  assert.equal(observers.length, 0)
})

test('drawer: attaching twice is safe, and detaching removes what it added', () => {
  const { root, open, click, pointer, one, observers, key } = setup()
  drawer(root)
  const detach = drawer(root)
  open()
  assert.equal(observers.length, 1, 'one observer, from the second attachment')
  detach()
  assert.equal(observers.length, 0)
  assert.equal(key(one('.dialog-handle'), 'ArrowUp'), false)
  pointer(root, 'pointerdown', { pointerType: 'mouse', button: 0 })
  click(root)
  assert.equal(root.open, true)
})
