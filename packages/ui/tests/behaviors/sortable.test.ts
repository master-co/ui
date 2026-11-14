import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { sortable } from '../../behaviors/sortable.js'

const thrown: unknown[] = []
afterEach(() => assert.deepEqual(thrown.splice(0), [], 'a listener threw'))

const item = (value: string, name: string, extra = '') => `<li class="list-row sortable-item" data-value="${value}">
    <button type="button" class="sortable-handle" aria-pressed="false" aria-label="Move ${name}"${extra}></button>
    <span class="list-body"><span class="list-title">${name}</span></span>
  </li>`

const markup = `<ol class="list sortable" aria-label="Priorities">
  ${item('onboarding', 'Onboarding')}
  ${item('billing', 'Billing')}
  ${item('search', 'Search')}
  ${item('exports', 'Exports')}
</ol>
<p class="sortable-status" role="status"></p>
<button type="button" id="elsewhere">Elsewhere</button>`

/** Let the moves, which wait for a transition or a promise, finish. */
const settle = () => new Promise(resolve => setTimeout(resolve, 0))

function setup(html = markup) {
  const page = dom(html)
  page.window.addEventListener('error', (event: any) => thrown.push(event.error ?? event.message))
  const root = page.one('.sortable')
  const heard: string[] = []
  root.addEventListener('change', () => heard.push('change'))
  const order = () => page.all('.sortable-item').map(each => each.getAttribute('data-value'))
  const handle = (value: string) => page.one<HTMLButtonElement>(`.sortable-item[data-value="${value}"] .sortable-handle`)
  const pressed = () => page.all('.sortable-handle[aria-pressed="true"]').map(each => each.closest('.sortable-item')!.getAttribute('data-value'))
  const status = page.one('.sortable-status')
  /** What the status region says once its pause is over. */
  const said = async () => {
    await new Promise(resolve => setTimeout(resolve, 450))
    return status.textContent
  }
  /** Enter on a handle: the browser clicks it, with no pointer. */
  const press = async (value: string) => {
    page.click(handle(value), { detail: 0 })
    await settle()
  }
  const key = async (value: string, name: string) => {
    const prevented = page.key(handle(value), name)
    await settle()
    return prevented
  }
  return { ...page, root, heard, order, handle, pressed, said, press, key }
}

test('sortable: Enter or Space picks an item up, and says so', async () => {
  const { root, handle, press, pressed, said } = setup()
  sortable(root)
  handle('billing').focus()
  await press('billing')
  assert.deepEqual(pressed(), ['billing'])
  assert.match(await said() ?? '', /^Billing, picked up at position 2 of 4\./)
})

test('sortable: the arrows move the item that is picked up, one place at a time, and stop at the ends', async () => {
  const { root, handle, press, key, order, said, heard, document } = setup()
  sortable(root)
  handle('billing').focus()
  await press('billing')
  assert.equal(await key('billing', 'ArrowDown'), true)
  assert.deepEqual(order(), ['onboarding', 'search', 'billing', 'exports'])
  assert.equal(document.activeElement, handle('billing'), 'the handle keeps focus')
  assert.equal(await said(), 'Billing, position 3 of 4.')
  await key('billing', 'ArrowDown')
  await key('billing', 'ArrowDown')
  assert.deepEqual(order(), ['onboarding', 'search', 'exports', 'billing'], 'it stops at the end')
  await key('billing', 'Home')
  assert.deepEqual(order(), ['billing', 'onboarding', 'search', 'exports'])
  await key('billing', 'End')
  await key('billing', 'ArrowUp')
  assert.deepEqual(order(), ['onboarding', 'search', 'billing', 'exports'])
  assert.deepEqual(heard, [], 'nothing is said to the page until the drop')
})

test('sortable: Enter or Space again drops it, dispatches change and says where', async () => {
  const { root, handle, press, key, pressed, said, heard } = setup()
  const order = sortable(root)
  handle('billing').focus()
  await press('billing')
  await key('billing', 'ArrowUp')
  await press('billing')
  assert.deepEqual(pressed(), [])
  assert.deepEqual(heard, ['change'])
  assert.deepEqual(order.value, ['billing', 'onboarding', 'search', 'exports'])
  assert.equal(await said(), 'Billing, dropped at position 1 of 4.')
})

test('sortable: Escape puts the item back where it was picked up', async () => {
  const { root, handle, press, key, order, pressed, said, heard } = setup()
  sortable(root)
  handle('search').focus()
  await press('search')
  await key('search', 'ArrowUp')
  await key('search', 'ArrowUp')
  assert.equal(await key('search', 'Escape'), true)
  await settle()
  assert.deepEqual(order(), ['onboarding', 'billing', 'search', 'exports'])
  assert.deepEqual(pressed(), [])
  assert.deepEqual(heard, [])
  assert.equal(await said(), 'Search, move cancelled. Back at position 3 of 4.')
})

test('sortable: leaving the handle drops the item', async () => {
  const { root, handle, press, key, pressed, heard, one } = setup()
  sortable(root)
  handle('exports').focus()
  await press('exports')
  await key('exports', 'ArrowUp')
  one<HTMLButtonElement>('#elsewhere').focus()
  assert.deepEqual(pressed(), [])
  assert.deepEqual(heard, ['change'])
})

test('sortable: arrows do nothing until an item is picked up, and a pointer click picks nothing up', async () => {
  const { root, handle, key, order, click, pressed } = setup()
  sortable(root)
  handle('billing').focus()
  assert.equal(await key('billing', 'ArrowDown'), false)
  click(handle('billing'), { detail: 1 })
  assert.deepEqual(pressed(), [])
  assert.deepEqual(order(), ['onboarding', 'billing', 'search', 'exports'])
})

test('sortable: across, in sortable-row, ArrowRight and ArrowLeft move, and turn around from right to left', async () => {
  const { root, handle, press, key, order } = setup(markup.replace('class="list sortable"', 'class="list sortable sortable-row"'))
  sortable(root)
  handle('billing').focus()
  await press('billing')
  assert.equal(await key('billing', 'ArrowDown'), false)
  await key('billing', 'ArrowRight')
  assert.deepEqual(order(), ['onboarding', 'search', 'billing', 'exports'])
  ;(globalThis as any).getComputedStyle = () => ({ direction: 'rtl' })
  await key('billing', 'ArrowRight')
  assert.deepEqual(order(), ['onboarding', 'billing', 'search', 'exports'])
})

test('sortable: a disabled handle picks nothing up', async () => {
  const { root, press, pressed } = setup(markup.replace('aria-label="Move Search"', 'aria-label="Move Search" disabled'))
  sortable(root)
  await press('search')
  assert.deepEqual(pressed(), [])
})

test('sortable: messages say it in the page\'s language', async () => {
  const { root, handle, press, said } = setup()
  sortable(root, { messages: { grab: (name, position, count) => `${name}：第 ${position} 項，共 ${count} 項` } })
  handle('billing').focus()
  await press('billing')
  assert.equal(await said(), 'Billing：第 2 項，共 4 項')
})

test('sortable: value is the order, and setting it puts the items in it, the same nodes, dispatching nothing', () => {
  const { root, order, heard, one } = setup()
  const handle = sortable(root)
  assert.deepEqual(handle.value, ['onboarding', 'billing', 'search', 'exports'])
  const search = one('.sortable-item[data-value="search"]')
  handle.value = ['search', 'exports', 'onboarding', 'billing']
  assert.deepEqual(order(), ['search', 'exports', 'onboarding', 'billing'])
  assert.equal(one('.sortable-item[data-value="search"]'), search)
  handle.value = ['billing']
  assert.deepEqual(order(), ['billing', 'search', 'exports', 'onboarding'], 'what the value leaves out keeps its order after it')
  assert.deepEqual(heard, [])
})

test('sortable: with move, the page moves the items, and the behavior waits for it', async () => {
  const { root, handle, press, key, order } = setup()
  const moves: [number, number][] = []
  sortable(root, {
    move: async (from, to) => {
      moves.push([from, to])
      await settle()
      const items = [...root.querySelectorAll('.sortable-item')]
      const [moved] = items.splice(from, 1)
      items.splice(to, 0, moved!)
      root.append(...items)
    },
  })
  handle('onboarding').focus()
  await press('onboarding')
  await key('onboarding', 'ArrowDown')
  await settle()
  assert.deepEqual(moves, [[0, 1]])
  assert.deepEqual(order(), ['billing', 'onboarding', 'search', 'exports'])
})

test('sortable: a drag moves the item once, on the release, and the items it passes make room on the way', async () => {
  const { root, handle, order, pressed, pointer, all, heard, document, window } = setup()
  // happy-dom has no layout: each item is 40px tall, one under the other.
  const boxes = () => all<HTMLElement>('.sortable-item').forEach((each) => {
    each.getBoundingClientRect = () => {
      const index = all('.sortable-item').indexOf(each)
      return { top: index * 40, bottom: index * 40 + 40, left: 0, right: 200, width: 200, height: 40, x: 0, y: index * 40 } as DOMRect
    }
  })
  boxes()
  sortable(root)
  const grip = handle('onboarding')
  const making = () => [all('.sortable-item-back').map(each => each.getAttribute('data-value')), all('.sortable-item-forward').map(each => each.getAttribute('data-value'))]
  pointer(grip, 'pointerdown', { button: 0, isPrimary: true, pointerId: 1, clientY: 20 })
  const move = (y: number) => document.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientY: y }) as any)
  move(22)
  assert.deepEqual(pressed(), [], 'a few pixels is still a press')
  move(70)
  assert.deepEqual(pressed(), ['onboarding'])
  assert.equal(root.style.getPropertyValue('--sortable-size'), '40px', 'the room is the item with the gap after it')
  assert.equal(grip.closest<HTMLElement>('.sortable-item')!.style.getPropertyValue('--sortable-offset'), '50px')
  assert.deepEqual(making(), [['billing'], []], 'Billing makes room toward the start')
  move(150)
  assert.deepEqual(making(), [['billing', 'search', 'exports'], []])
  move(10)
  assert.deepEqual(making(), [[], []], 'back over its own place, nothing makes room')
  move(150)
  assert.deepEqual(order(), ['onboarding', 'billing', 'search', 'exports'], 'no node moves until the release')
  document.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientY: 150 }) as any)
  await settle()
  assert.deepEqual(order(), ['billing', 'search', 'exports', 'onboarding'])
  assert.deepEqual(making(), [[], []])
  assert.equal(grip.closest<HTMLElement>('.sortable-item')!.style.getPropertyValue('--sortable-offset'), '')
  assert.equal(root.style.getPropertyValue('--sortable-size'), '')
  assert.equal(root.hasAttribute('aria-busy'), false, 'the list is busy only while the items change places')
  assert.deepEqual(pressed(), [])
  assert.deepEqual(heard, ['change'])
})

test('sortable: carried toward the start, the items it passes make room toward the end', () => {
  const { root, handle, pointer, all, document, window } = setup()
  all<HTMLElement>('.sortable-item').forEach((each, index) => {
    each.getBoundingClientRect = () => ({ top: index * 40, bottom: index * 40 + 40, left: 0, right: 200, width: 200, height: 40 } as DOMRect)
  })
  sortable(root)
  pointer(handle('exports'), 'pointerdown', { button: 0, isPrimary: true, pointerId: 2, clientY: 140 })
  document.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 2, clientY: 50 }) as any)
  assert.deepEqual(all('.sortable-item-forward').map(each => each.getAttribute('data-value')), ['billing', 'search'])
  assert.deepEqual(all('.sortable-item-back'), [])
  document.dispatchEvent(new window.PointerEvent('pointercancel', { bubbles: true, pointerId: 2 }) as any)
  assert.deepEqual(all('.sortable-item-forward'), [], 'a cancelled drag takes the room away')
})

test('sortable: a pointer resting on the line between two places does not make them trade back and forth', () => {
  const { root, handle, pointer, all, document, window } = setup()
  all<HTMLElement>('.sortable-item').forEach((each, index) => {
    each.getBoundingClientRect = () => ({ top: index * 40, bottom: index * 40 + 40, left: 0, right: 200, width: 200, height: 40 } as DOMRect)
  })
  sortable(root)
  const back = () => all('.sortable-item-back').map(each => each.getAttribute('data-value'))
  const move = (y: number) => document.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 4, clientY: y }) as any)
  pointer(handle('onboarding'), 'pointerdown', { button: 0, isPrimary: true, pointerId: 4, clientY: 20 })
  // Billing's middle is at 60: the carried middle has to pass it by a few pixels to take its place.
  move(58)
  move(62)
  assert.deepEqual(back(), [], 'just past the middle is not yet past it')
  move(68)
  assert.deepEqual(back(), ['billing'])
  move(58)
  assert.deepEqual(back(), ['billing'], 'and just back over it does not give the place back')
  move(52)
  assert.deepEqual(back(), [])
  document.dispatchEvent(new window.PointerEvent('pointercancel', { bubbles: true, pointerId: 4 }) as any)
})

test('sortable: an item still gliding aside is measured where it stands in the layout, not where it has got to', () => {
  const { root, handle, pointer, all, document, window } = setup()
  // Billing is 30px into a glide back from the last drag: its box is drawn 30px lower than its place.
  all<HTMLElement>('.sortable-item').forEach((each, index) => {
    const drawn = each.getAttribute('data-value') === 'billing' ? 30 : 0
    each.getBoundingClientRect = () => ({ top: index * 40 + drawn, bottom: index * 40 + 40 + drawn, left: 0, right: 200, width: 200, height: 40 } as DOMRect)
  })
  const computed = (globalThis as any).getComputedStyle
  ;(globalThis as any).getComputedStyle = (element: Element) => ({ ...computed(element), translate: element.getAttribute('data-value') === 'billing' ? '0px 30px' : 'none', direction: 'ltr' })
  sortable(root)
  pointer(handle('onboarding'), 'pointerdown', { button: 0, isPrimary: true, pointerId: 5, clientY: 20 })
  document.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 5, clientY: 70 }) as any)
  assert.equal(root.style.getPropertyValue('--sortable-size'), '40px', 'the room is measured in the layout too')
  assert.deepEqual(all('.sortable-item-back').map(each => each.getAttribute('data-value')), ['billing'], 'past Billing\'s middle in the layout, 60, though it is drawn at 90')
  document.dispatchEvent(new window.PointerEvent('pointercancel', { bubbles: true, pointerId: 5 }) as any)
})

test('sortable: Escape during a drag puts the item back', async () => {
  const { root, handle, order, pressed, pointer, all, heard, document, window } = setup()
  all<HTMLElement>('.sortable-item').forEach((each, index) => {
    each.getBoundingClientRect = () => ({ top: index * 40, bottom: index * 40 + 40, left: 0, right: 200, width: 200, height: 40 } as DOMRect)
  })
  sortable(root)
  pointer(handle('search'), 'pointerdown', { button: 0, isPrimary: true, pointerId: 3, clientY: 100 })
  document.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 3, clientY: 10 }) as any)
  assert.deepEqual(pressed(), ['search'])
  document.dispatchEvent(new window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }) as any)
  assert.deepEqual(pressed(), [])
  assert.deepEqual(order(), ['onboarding', 'billing', 'search', 'exports'])
  assert.deepEqual(all('.sortable-item-back, .sortable-item-forward'), [], 'the items that made room step back')
  assert.deepEqual(heard, [])
})

test('sortable: detach removes the listeners', async () => {
  const { root, handle, press, pressed } = setup()
  sortable(root)()
  await press('billing')
  assert.deepEqual(pressed(), [])
  void handle
})
