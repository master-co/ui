import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { contextMenu, menu } from '../../behaviors/menu.js'

/** happy-dom catches what a listener throws and reports it on the window; a test must not pass over it. */
const thrown: unknown[] = []
afterEach(() => assert.deepEqual(thrown.splice(0), [], 'a listener threw'))

/**
 * The menu's behavior moves focus: to the first item when the menu opens, and through the items with the
 * keys. The markup is the contract's example with a disabled item, a hidden one, checkable label items and
 * a submenu. happy-dom does not return focus to the button when a popover closes, so nothing here asserts it.
 */
const markup = (attributes = '') => `<button type="button" class="btn" id="project" popovertarget="project-menu">Project</button>

<div id="project-menu" popover class="menu" ${attributes}>
  <button type="button" class="menu-item" id="rename" popovertarget="project-menu" popovertargetaction="hide">Rename <span class="menu-shortcut">⌘R</span></button>
  <button type="button" class="menu-item" id="duplicate" popovertarget="project-menu" popovertargetaction="hide">Duplicate</button>
  <button type="button" class="menu-item" id="transfer" disabled>Transfer</button>
  <a class="menu-item" id="settings" href="/settings">Settings</a>
  <a class="menu-item" id="billing" aria-disabled="true">Billing</a>
  <button type="button" class="menu-item" id="share" hidden>Share</button>
  <hr class="menu-separator">
  <div class="menu-label">Show</div>
  <label class="menu-item" id="archived"><input type="checkbox" class="menu-input" id="archived-input" checked>Archived projects</label>
  <label class="menu-item" id="previews"><input type="checkbox" class="menu-input" id="previews-input" disabled>Preview deployments</label>
  <button type="button" class="menu-item" id="recent" popovertarget="recent-menu" aria-haspopup="menu">Open recent</button>
  <div id="recent-menu" popover class="menu menu-sub">
    <button type="button" class="menu-item" id="atlas">atlas</button>
    <button type="button" class="menu-item" id="borealis">borealis</button>
  </div>
  <hr class="menu-separator">
  <button type="button" class="menu-item menu-item-danger" id="delete" popovertarget="project-menu" popovertargetaction="hide">Delete</button>
</div>`

function setup(html = markup()) {
  const page = dom(html)
  page.window.addEventListener('error', (event: any) => thrown.push(event.error ?? event.message))
  const root = page.one('#project-menu')
  const sub = page.one('#recent-menu')
  /** The id of the element that has focus. */
  const focused = () => (page.document.activeElement as any)?.id as string | undefined
  /** Press a key on the element that has focus, as a keyboard does. */
  const press = (name: string, init: Record<string, unknown> = {}) => page.key(page.document.activeElement, name, init)
  return { ...page, root, sub, focused, press }
}

test('menu: when the menu opens, focus moves to its first item', () => {
  const { root, one, focused, isOpen } = setup()
  menu(root)
  one('#project').focus()
  root.showPopover()
  assert.equal(focused(), 'rename')
  root.hidePopover()
  assert.equal(isOpen(root), false)
  assert.equal(focused(), 'rename', 'closing moves no focus: returning it to the button is the browser\'s work')
})

test('menu: the first item the keys may land on takes focus, be it the control of a label item', () => {
  const { root, one, focused } = setup()
  one('#rename').disabled = true
  one('#duplicate').hidden = true
  one('#settings').setAttribute('aria-disabled', 'true')
  menu(root)
  root.showPopover()
  assert.equal(focused(), 'archived-input', 'a label item is focused through its checkbox')
})

test('menu: ArrowDown and ArrowUp move focus, skip disabled and hidden items and wrap at the ends', () => {
  const { root, focused, press } = setup()
  menu(root)
  root.showPopover()
  assert.equal(press('ArrowDown'), true, 'a key the behavior handles is prevented')
  assert.equal(focused(), 'duplicate')
  press('ArrowDown')
  assert.equal(focused(), 'settings', 'the disabled button is skipped')
  press('ArrowDown')
  assert.equal(focused(), 'archived-input', 'so are the disabled link and the hidden button')
  press('ArrowDown')
  assert.equal(focused(), 'recent', 'and the label item whose checkbox is disabled')
  press('ArrowDown')
  assert.equal(focused(), 'delete', 'the items of a submenu are not this menu\'s')
  assert.equal(press('ArrowDown'), true)
  assert.equal(focused(), 'rename', 'past the last item it wraps to the first')
  assert.equal(press('ArrowUp'), true)
  assert.equal(focused(), 'delete', 'before the first item it wraps to the last')
  press('ArrowUp')
  press('ArrowUp')
  assert.equal(focused(), 'archived-input')
  press('ArrowUp')
  assert.equal(focused(), 'settings')
})

test('menu: Home and End move to the first and the last item', () => {
  const { root, focused, press } = setup()
  menu(root)
  root.showPopover()
  assert.equal(press('End'), true)
  assert.equal(focused(), 'delete')
  assert.equal(press('Home'), true)
  assert.equal(focused(), 'rename')
})

test('menu: typed letters move to the next item that starts with them', (t) => {
  const { root, focused, press } = setup()
  let now = 1_000
  t.mock.method(Date, 'now', () => now)
  menu(root)
  root.showPopover()
  assert.equal(press('d'), true, 'a typed letter is prevented')
  assert.equal(focused(), 'duplicate')
  now += 100
  press('e')
  assert.equal(focused(), 'delete', 'letters typed together are read together: "de"')
  now += 1_000
  press('A')
  assert.equal(focused(), 'archived-input', 'a label item is found by its text, in any case')
  now += 1_000
  press('t')
  assert.equal(focused(), 'archived-input', 'a disabled item is never found')
  now += 1_000
  press('b')
  assert.equal(focused(), 'archived-input', 'nor a submenu\'s item from its parent')
})

test('menu: one letter pressed again walks through the items that start with it', (t) => {
  const { root, focused, press } = setup()
  let now = 1_000
  t.mock.method(Date, 'now', () => now)
  menu(root)
  root.showPopover()
  press('d')
  assert.equal(focused(), 'duplicate')
  now += 100
  press('d')
  assert.equal(focused(), 'delete')
  now += 100
  press('d')
  assert.equal(focused(), 'duplicate')
})

test('menu: Tab and Shift+Tab close the menu and are not prevented, so focus moves on', () => {
  const { root, press, isOpen } = setup()
  menu(root)
  root.showPopover()
  assert.equal(press('Tab'), false)
  assert.equal(isOpen(root), false)
  root.showPopover()
  assert.equal(press('Tab', { shiftKey: true }), false)
  assert.equal(isOpen(root), false)
})

test('menu: Enter, Space, Escape and any key it does not handle are left to the item and the popover', () => {
  const { root, focused, press, isOpen } = setup()
  menu(root)
  root.showPopover()
  assert.equal(press('Enter'), false)
  assert.equal(press(' '), false)
  assert.equal(press('Escape'), false)
  assert.equal(press('ArrowRight'), false, 'an item without a submenu has nothing to open')
  assert.equal(press('ArrowLeft'), false, 'and a menu that is not a submenu has nothing to go back to')
  assert.equal(press('ArrowDown', { altKey: true }), false)
  assert.equal(press('d', { ctrlKey: true }), false)
  assert.equal(focused(), 'rename')
  assert.equal(isOpen(root), true)
})

test('menu: the arrow that points into a submenu opens it and focus moves to its first item; the other arrow closes it', () => {
  const { root, sub, one, focused, press, isOpen } = setup()
  menu(root)
  menu(sub)
  root.showPopover()
  one('#recent').focus()
  assert.equal(press('ArrowRight'), true)
  assert.equal(isOpen(sub), true)
  assert.equal(focused(), 'atlas')
  assert.equal(press('ArrowRight'), false, 'inside the submenu there is nothing further to open')
  assert.equal(press('ArrowLeft'), true)
  assert.equal(isOpen(sub), false)
  assert.equal(focused(), 'recent', 'focus is back on the item that opens the submenu')
  assert.equal(isOpen(root), true, 'the parent menu stays open')
})

test('menu: in a right-to-left menu the arrows of a submenu change places', () => {
  const { root, sub, one, focused, press, isOpen } = setup(markup('style="direction: rtl"'))
  menu(root)
  menu(sub)
  root.showPopover()
  one('#recent').focus()
  assert.equal(press('ArrowRight'), false)
  assert.equal(isOpen(sub), false)
  assert.equal(press('ArrowLeft'), true)
  assert.equal(isOpen(sub), true)
  assert.equal(focused(), 'atlas')
  assert.equal(press('ArrowLeft'), false)
  assert.equal(press('ArrowRight'), true)
  assert.equal(isOpen(sub), false)
  assert.equal(focused(), 'recent')
})

test('menu: a submenu has its own keys, and its parent does not answer them', () => {
  const { root, sub, one, focused, press, isOpen } = setup()
  menu(root)
  menu(sub)
  root.showPopover()
  one('#recent').focus()
  press('ArrowRight')
  assert.equal(press('ArrowDown'), true)
  assert.equal(focused(), 'borealis')
  press('ArrowDown')
  assert.equal(focused(), 'atlas', 'it wraps inside the submenu')
  press('End')
  assert.equal(focused(), 'borealis')
  assert.equal(press('Tab'), false)
  assert.equal(isOpen(sub), false)
  assert.equal(isOpen(root), false, 'Tab closes the submenu and the menu that holds it')
})

test('menu: without the behavior on a submenu, its parent leaves the submenu\'s keys alone', () => {
  const { root, sub, one, focused, press } = setup()
  menu(root)
  root.showPopover()
  sub.showPopover()
  one('#atlas').focus()
  assert.equal(press('ArrowDown'), false)
  assert.equal(press('End'), false)
  assert.equal(press('d'), false)
  assert.equal(focused(), 'atlas')
})

test('menu: the script adds no role and no state', () => {
  const { root, all, press } = setup()
  const before = root.outerHTML
  menu(root)
  root.showPopover()
  press('ArrowDown')
  press('End')
  press('d')
  assert.equal(root.outerHTML, before)
  assert.equal(root.hasAttribute('role'), false)
  assert.deepEqual(all('.menu-item').filter(item => item.hasAttribute('role') || item.hasAttribute('tabindex')), [])
})

test('menu: detach removes the listeners, and attaching twice leaves one behavior', () => {
  const { root, one, focused, press, isOpen } = setup()
  const focuses: string[] = []
  one('#rename').addEventListener('focus', () => focuses.push('rename'))
  menu(root)
  const detach = menu(root)
  root.showPopover()
  assert.deepEqual(focuses, ['rename'], 'one behavior answers, not two')
  detach()
  assert.equal(press('ArrowDown'), false)
  assert.equal(press('End'), false)
  assert.equal(press('d'), false)
  assert.equal(focused(), 'rename')
  press('Tab')
  assert.equal(isOpen(root), true)
  root.hidePopover()
  one('#project').focus()
  root.showPopover()
  assert.equal(focused(), 'project', 'opening no longer moves focus')
})

/** A context menu: the page's example, a focusable target and a menu-context. */
const context = `<div class="well" id="canvas" tabindex="0">Right-click, or press the menu key</div>

<div id="canvas-menu" popover class="menu menu-context">
  <button type="button" class="menu-item" id="copy" popovertarget="canvas-menu" popovertargetaction="hide">Copy</button>
  <button type="button" class="menu-item" id="paste" popovertarget="canvas-menu" popovertargetaction="hide">Paste</button>
</div>`

function setupContext() {
  const page = dom(context)
  page.window.addEventListener('error', (event: any) => thrown.push(event.error ?? event.message))
  const target = page.one('#canvas')
  const root = page.one('#canvas-menu')
  // happy-dom has no layout: the target is given the box the keyboard opens the menu at, 200 by 100 at 100, 40.
  target.getBoundingClientRect = () => ({ left: 100, top: 40, right: 300, bottom: 140, width: 200, height: 100, x: 100, y: 40 })
  /** Send contextmenu the way a right click does; returns whether the default was prevented. */
  const rightClick = (on: any, init: Record<string, unknown> = {}) => {
    const event = new page.window.MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, ...init })
    on.dispatchEvent(event)
    return event.defaultPrevented
  }
  const place = () => [root.style.getPropertyValue('--menu-x'), root.style.getPropertyValue('--menu-y')]
  return { ...page, target, root, rightClick, place }
}

test('contextMenu: a right click opens the menu at the pointer and prevents the browser\'s menu', () => {
  const { target, root, rightClick, place, isOpen } = setupContext()
  contextMenu(target, root)
  assert.equal(rightClick(target, { clientX: 240, clientY: 96 }), true)
  assert.deepEqual(place(), ['240px', '96px'])
  assert.equal(isOpen(root), true)
})

test('contextMenu: a right click with the menu open moves it and shows it again', () => {
  const { target, root, rightClick, place, isOpen } = setupContext()
  contextMenu(target, root)
  rightClick(target, { clientX: 240, clientY: 96 })
  const toggles: boolean[] = []
  root.addEventListener('toggle', () => toggles.push(isOpen(root)))
  rightClick(target, { clientX: 120, clientY: 60 })
  assert.deepEqual(place(), ['120px', '60px'])
  assert.deepEqual(toggles, [false, true])
})

test('contextMenu: a contextmenu event without a position opens the menu at the middle of the target', () => {
  const { target, root, rightClick, place, isOpen } = setupContext()
  contextMenu(target, root)
  assert.equal(rightClick(target), true)
  assert.deepEqual(place(), ['200px', '90px'])
  assert.equal(isOpen(root), true)
})

test('contextMenu: the ContextMenu key and Shift+F10 open the menu at the middle of the target', () => {
  const { target, root, key, place, isOpen } = setupContext()
  contextMenu(target, root)
  assert.equal(key(target, 'ContextMenu'), true, 'a key the behavior handles is prevented')
  assert.deepEqual(place(), ['200px', '90px'])
  assert.equal(isOpen(root), true)
  root.hidePopover()
  assert.equal(key(target, 'F10', { shiftKey: true }), true)
  assert.equal(isOpen(root), true)
  root.hidePopover()
  assert.equal(key(target, 'F10'), false, 'F10 by itself is left alone')
  assert.equal(key(target, 'Enter'), false)
  assert.equal(isOpen(root), false)
})

test('contextMenu: with the menu behavior, focus moves into the menu however it opens', () => {
  const { target, root, document, key, rightClick } = setupContext()
  menu(root)
  contextMenu(target, root)
  target.focus()
  key(target, 'F10', { shiftKey: true })
  assert.equal((document.activeElement as any).id, 'copy')
  root.hidePopover()
  target.focus()
  rightClick(target, { clientX: 240, clientY: 96 })
  assert.equal((document.activeElement as any).id, 'copy')
})

test('contextMenu: the browser\'s menu stays away from the menu itself', () => {
  const { target, root, one, rightClick, place, isOpen } = setupContext()
  contextMenu(target, root)
  rightClick(target, { clientX: 240, clientY: 96 })
  assert.equal(rightClick(one('#copy'), { clientX: 250, clientY: 110 }), true)
  assert.deepEqual(place(), ['240px', '96px'], 'and the menu stays where it is')
  assert.equal(isOpen(root), true)
})

test('contextMenu: detach removes the listeners, and attaching twice leaves one behavior', () => {
  const { target, root, one, key, rightClick, isOpen } = setupContext()
  contextMenu(target, root)
  const detach = contextMenu(target, root)
  const toggles: boolean[] = []
  root.addEventListener('toggle', () => toggles.push(isOpen(root)))
  rightClick(target, { clientX: 240, clientY: 96 })
  assert.deepEqual(toggles, [true], 'one behavior opens it; two would show it twice')
  root.hidePopover()
  detach()
  assert.equal(rightClick(target, { clientX: 240, clientY: 96 }), false)
  assert.equal(key(target, 'ContextMenu'), false)
  assert.equal(rightClick(one('#copy')), false)
  assert.equal(isOpen(root), false)
})
