import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { kanban, type KanbanValue } from '../../behaviors/kanban.js'

const thrown: unknown[] = []
afterEach(() => assert.deepEqual(thrown.splice(0), [], 'a listener threw'))

const item = (value: string, name: string, extra = '') => `<li class="kanban-item" data-value="${value}">
        <div class="card">
          <button type="button" class="kanban-handle" aria-pressed="false" aria-label="Drag ${name}"${extra}><svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="4" r="1" fill="currentColor" stroke="none"/><circle cx="10" cy="4" r="1" fill="currentColor" stroke="none"/><circle cx="6" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="10" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="6" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="10" cy="12" r="1" fill="currentColor" stroke="none"/></svg></button>
          <p class="card-title">${name}</p>
          <input class="input" aria-label="Note on ${name}">
          <button type="button" class="btn btn-sm" popovertarget="mover" aria-label="Move ${name}">Move</button>
        </div>
      </li>`

const column = (value: string, title: string, items: string, extra = '') => `<section class="kanban-column" data-value="${value}" aria-labelledby="${value}-title"${extra}>
    <header class="kanban-header"><h3 class="kanban-title" id="${value}-title">${title}</h3></header>
    <ol class="kanban-items">${items}</ol>
    <p class="kanban-empty">Nothing here</p>
  </section>`

const markup = `<div class="kanban" role="group" aria-label="Launch">
  ${column('todo', 'To do', `${item('brief', 'Brief')}${item('copy', 'Copy')}${item('press', 'Press kit')}`)}
  ${column('doing', 'In progress', `${item('site', 'Site')}${item('video', 'Video')}`)}
  ${column('review', 'In review', '')}
  ${column('done', 'Done', item('name', 'Name'))}
  <div class="popover" popover id="mover">
    <form class="kanban-mover">
      <label class="field">Column<select class="select" name="column"></select></label>
      <label class="field">Position<select class="select" name="position"></select></label>
      <button type="submit" class="btn btn-primary">Move</button>
    </form>
  </div>
  <div class="kanban-preview" popover="manual" aria-hidden="true"></div>
  <p class="kanban-status" role="status"></p>
</div>
<button type="button" id="elsewhere">Elsewhere</button>`

const start: KanbanValue = [
  { value: 'todo', items: ['brief', 'copy', 'press'] },
  { value: 'doing', items: ['site', 'video'] },
  { value: 'review', items: [] },
  { value: 'done', items: ['name'] },
]

/** Let what waits for a promise or an observer finish. */
const settle = () => new Promise(resolve => setTimeout(resolve, 0))

function setup(html = markup) {
  const page = dom(html)
  page.window.addEventListener('error', (event: any) => thrown.push(event.error ?? event.message))
  const root = page.one<HTMLElement>('.kanban')
  const heard: string[] = []
  for (const type of ['input', 'change']) root.addEventListener(type, () => heard.push(type))
  const handle = (value: string) => page.one<HTMLButtonElement>(`.kanban-item[data-value="${value}"] .kanban-handle`)
  const pressed = () => page.all('.kanban-handle[aria-pressed="true"]').map(each => each.closest('.kanban-item')!.getAttribute('data-value'))
  const status = page.one('.kanban-status')
  const preview = page.one<HTMLElement>('.kanban-preview')
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
  /** Where the line of a place stands: the item it is before, or the column whose list it ends. */
  const marked = () => {
    const before = page.all('.kanban-item-target').map(each => `before ${each.getAttribute('data-value')}`)
    const end = page.all('.kanban-items-target').map(each => `end of ${each.closest('.kanban-column')!.getAttribute('data-value')}`)
    return [...before, ...end]
  }
  /**
   * happy-dom has no layout. The board is 800 by 400; each column is 180 wide, 200 apart; an item is 44 tall
   * and they stand 50 apart from 40 down, less what their list has scrolled.
   */
  const layout = () => {
    root.getBoundingClientRect = () => ({ left: 0, right: 800, top: 0, bottom: 400, width: 800, height: 400 } as DOMRect)
    page.all<HTMLElement>('.kanban-column').forEach((each) => {
      each.getBoundingClientRect = () => {
        const at = page.all('.kanban-column').indexOf(each) * 200 - root.scrollLeft
        return { left: at, right: at + 180, top: 0, bottom: 400, width: 180, height: 400 } as DOMRect
      }
      const list = each.querySelector<HTMLElement>('.kanban-items')!
      list.getBoundingClientRect = () => {
        const at = page.all('.kanban-column').indexOf(each) * 200 - root.scrollLeft
        return { left: at, right: at + 180, top: 40, bottom: 400, width: 180, height: 360 } as DOMRect
      }
    })
    page.all<HTMLElement>('.kanban-item').forEach((each) => {
      each.getBoundingClientRect = () => {
        const list = each.closest<HTMLElement>('.kanban-items')!
        const across = page.all('.kanban-column').indexOf(each.closest('.kanban-column')) * 200 - root.scrollLeft
        const down = 40 + [...list.querySelectorAll('.kanban-item')].indexOf(each) * 50 - list.scrollTop
        return { left: across + 6, right: across + 174, top: down, bottom: down + 44, width: 168, height: 44 } as DOMRect
      }
    })
  }
  layout()
  const down = (value: string, id = 1, x = 20, y = 60) => page.pointer(handle(value), 'pointerdown', { button: 0, isPrimary: true, pointerId: id, clientX: x, clientY: y })
  const send = (type: string, x: number, y: number, id = 1) => page.document.dispatchEvent(new page.window.PointerEvent(type, { bubbles: true, pointerId: id, clientX: x, clientY: y }) as any)
  const move = (x: number, y: number, id = 1) => send('pointermove', x, y, id)
  const up = (x: number, y: number, id = 1) => send('pointerup', x, y, id)
  /** The sheet's glide to its place is over: the browser says so with a transitionend. */
  /** The sheet has faded out where it was released: its leaving is over. */
  const gone = () => {
    const event = new page.window.Event('transitionend', { bubbles: true }) as any
    event.propertyName = 'opacity'
    preview.dispatchEvent(event)
  }
  return { ...page, root, heard, handle, pressed, said, press, key, marked, layout, down, move, up, gone, preview }
}

/* The value. */

test('kanban: value is the arrangement, one entry to a column in the order of the columns', () => {
  const { root } = setup()
  const board = kanban(root)
  assert.deepEqual(board.value, start)
})

test('kanban: setting value arranges the board with the same nodes, and dispatches nothing', () => {
  const { root, one, heard } = setup()
  const board = kanban(root)
  const site = one('.kanban-item[data-value="site"]')
  const next: KanbanValue = [
    { value: 'todo', items: ['press'] },
    { value: 'doing', items: [] },
    { value: 'review', items: ['site', 'brief'] },
    { value: 'done', items: ['video', 'name', 'copy'] },
  ]
  board.value = next
  assert.deepEqual(board.value, next)
  assert.equal(one('.kanban-item[data-value="site"]'), site, 'the node itself moved')
  assert.deepEqual(heard, [])
})

test('kanban: an item or a column the value leaves out stays where it is, after the ones it names', () => {
  const { root } = setup()
  const board = kanban(root)
  board.value = [{ value: 'todo', items: ['press', 'site'] }]
  assert.deepEqual(board.value, [
    { value: 'todo', items: ['press', 'site', 'brief', 'copy'] },
    { value: 'doing', items: ['video'] },
    { value: 'review', items: [] },
    { value: 'done', items: ['name'] },
  ])
})

test('kanban: a value that names an item twice, or a column or an item the board does not have, is refused and nothing moves', () => {
  const { root, heard } = setup()
  const board = kanban(root)
  const refused: unknown[] = [
    [{ value: 'todo', items: ['brief', 'brief'] }],
    [{ value: 'todo', items: ['brief'] }, { value: 'done', items: ['brief'] }],
    [{ value: 'backlog', items: ['brief'] }],
    [{ value: 'todo', items: ['ghost'] }],
    [{ value: 'todo', items: [] }, { value: 'todo', items: ['brief'] }],
    [{ value: 'todo' }],
    { todo: ['brief'] },
    null,
  ]
  for (const value of refused) {
    board.value = value as KanbanValue
    assert.deepEqual(board.value, start, JSON.stringify(value))
  }
  assert.deepEqual(heard, [])
})

/* One path for every commit. */

test('kanban: move puts an item at a place among the other items of a column and dispatches input, then change, once each', () => {
  const { root, heard } = setup()
  const board = kanban(root)
  assert.equal(board.move('brief', 'doing', 1), true)
  assert.deepEqual(board.value[0], { value: 'todo', items: ['copy', 'press'] })
  assert.deepEqual(board.value[1], { value: 'doing', items: ['site', 'brief', 'video'] })
  assert.deepEqual(heard, ['input', 'change'])
})

test('kanban: move within a column counts the place without the item itself', () => {
  const { root, heard } = setup()
  const board = kanban(root)
  assert.equal(board.move('brief', 'todo', 2), true)
  assert.deepEqual(board.value[0].items, ['copy', 'press', 'brief'], 'the last place')
  assert.equal(board.move('brief', 'todo', 0), true)
  assert.deepEqual(board.value[0].items, ['brief', 'copy', 'press'], 'the first place')
  assert.equal(board.move('press', 'todo', 1), true)
  assert.deepEqual(board.value[0].items, ['brief', 'press', 'copy'])
  assert.deepEqual(heard, ['input', 'change', 'input', 'change', 'input', 'change'])
})

test('kanban: move into an empty column, and to a place past the end, which is the end', () => {
  const { root } = setup()
  const board = kanban(root)
  assert.equal(board.move('video', 'review', 0), true)
  assert.deepEqual(board.value[2].items, ['video'])
  assert.equal(board.move('brief', 'done', 9), true)
  assert.deepEqual(board.value[3].items, ['name', 'brief'])
})

test('kanban: a move to the place the item is in, or of something the board does not have, changes and dispatches nothing', () => {
  const { root, heard } = setup()
  const board = kanban(root)
  assert.equal(board.move('copy', 'todo', 1), false)
  assert.equal(board.move('ghost', 'todo', 0), false)
  assert.equal(board.move('copy', 'backlog', 0), false)
  assert.equal(board.move('copy', 'done', -1), false)
  assert.equal(board.move('copy', 'done', 0.5), false)
  assert.deepEqual(board.value, start)
  assert.deepEqual(heard, [])
})

test('kanban: a moved item is the same node, and what it holds keeps its state', () => {
  const { root, one } = setup()
  const board = kanban(root)
  const note = one<HTMLInputElement>('.kanban-item[data-value="copy"] .input')
  note.value = 'Ask Mei for the tagline'
  board.move('copy', 'done', 0)
  assert.equal(one('.kanban-item[data-value="copy"] .input'), note)
  assert.equal(note.value, 'Ask Mei for the tagline')
})

test('kanban: with moveBefore the node is moved atomically; without it, it is inserted again and what had focus is focused again', () => {
  const { root, one, document, window } = setup()
  const board = kanban(root)
  const calls: string[] = []
  ;(window.HTMLElement.prototype as any).moveBefore = function (node: Node, before: Node | null) {
    calls.push('moveBefore')
    return this.insertBefore(node, before)
  }
  board.move('brief', 'done', 0)
  assert.deepEqual(calls, ['moveBefore'])
  delete (window.HTMLElement.prototype as any).moveBefore
  const note = one<HTMLInputElement>('.kanban-item[data-value="copy"] .input')
  note.focus()
  board.move('copy', 'done', 0)
  assert.equal(document.activeElement, note, 'the field that was being typed in still is')
})

/* The keys. */

test('kanban: Enter or Space picks an item up, and says where it is', async () => {
  const { root, handle, press, pressed, said, marked } = setup()
  kanban(root)
  handle('copy').focus()
  await press('copy')
  assert.deepEqual(pressed(), ['copy'])
  assert.deepEqual(marked(), [], 'its own place is not marked')
  assert.match(await said() ?? '', /^Copy, picked up in To do, position 2 of 3\./)
})

test('kanban: the arrows do nothing until an item is picked up', async () => {
  const { root, handle, key, pressed, marked } = setup()
  kanban(root)
  handle('copy').focus()
  assert.equal(await key('copy', 'ArrowDown'), false)
  assert.equal(await key('copy', 'ArrowRight'), false)
  assert.deepEqual(pressed(), [])
  assert.deepEqual(marked(), [])
})

test('kanban: up and down choose a place in the column, without moving the item, and stop at its ends', async () => {
  const { root, handle, press, key, marked, said, heard } = setup()
  const board = kanban(root)
  handle('copy').focus()
  await press('copy')
  assert.equal(await key('copy', 'ArrowDown'), true)
  assert.deepEqual(marked(), ['end of todo'])
  assert.equal(await said(), 'Copy: To do, position 3 of 3.')
  await key('copy', 'ArrowDown')
  assert.deepEqual(marked(), ['end of todo'], 'it stops at the end')
  await key('copy', 'ArrowUp')
  assert.deepEqual(marked(), [], 'back at its own place')
  await key('copy', 'ArrowUp')
  assert.deepEqual(marked(), ['before brief'])
  await key('copy', 'ArrowUp')
  assert.deepEqual(marked(), ['before brief'], 'it stops at the start')
  assert.deepEqual(board.value, start, 'the value is what is committed, not what is chosen')
  assert.deepEqual(heard, [])
})

test('kanban: left and right choose the column beside it, keeping the place or taking the last the column has', async () => {
  const { root, handle, press, key, marked, said } = setup()
  kanban(root)
  handle('press').focus()
  await press('press')
  assert.equal(await key('press', 'ArrowRight'), true)
  assert.deepEqual(marked(), ['end of doing'], 'the third place of a column of two')
  assert.equal(await said(), 'Press kit: In progress, position 3 of 3.')
  await key('press', 'ArrowRight')
  assert.deepEqual(marked(), ['end of review'], 'an empty column has one place')
  await key('press', 'ArrowRight')
  assert.deepEqual(marked(), ['before name'])
  await key('press', 'ArrowRight')
  assert.deepEqual(marked(), ['before name'], 'it stops at the last column')
  await key('press', 'ArrowLeft')
  await key('press', 'ArrowLeft')
  await key('press', 'ArrowLeft')
  assert.deepEqual(marked(), ['before brief'], 'back in its column, at the place the others left it')
  await key('press', 'ArrowLeft')
  assert.deepEqual(marked(), ['before brief'], 'it stops at the first column')
})

test('kanban: from right to left the left arrow goes to the next column', async () => {
  const { root, handle, press, key, marked } = setup()
  kanban(root)
  ;(globalThis as any).getComputedStyle = () => ({ direction: 'rtl' })
  handle('brief').focus()
  await press('brief')
  await key('brief', 'ArrowLeft')
  assert.deepEqual(marked(), ['before site'])
  await key('brief', 'ArrowRight')
  assert.deepEqual(marked(), [])
})

test('kanban: Home and End choose the first and the last place of the column', async () => {
  const { root, handle, press, key, marked } = setup()
  kanban(root)
  handle('copy').focus()
  await press('copy')
  await key('copy', 'End')
  assert.deepEqual(marked(), ['end of todo'])
  assert.equal(await key('copy', 'Home'), true)
  assert.deepEqual(marked(), ['before brief'])
})

test('kanban: a hidden column is passed over', async () => {
  const { root, handle, press, key, marked } = setup(markup.replace('data-value="doing" aria-labelledby="doing-title"', 'data-value="doing" aria-labelledby="doing-title" hidden'))
  kanban(root)
  handle('brief').focus()
  await press('brief')
  await key('brief', 'ArrowRight')
  assert.deepEqual(marked(), ['end of review'])
})

test('kanban: Enter or Space again commits the place, dispatches once, keeps focus on the handle and says where', async () => {
  const { root, handle, press, key, pressed, marked, said, heard, document } = setup()
  const board = kanban(root)
  handle('copy').focus()
  await press('copy')
  await key('copy', 'ArrowRight')
  await key('copy', 'ArrowUp')
  await press('copy')
  assert.deepEqual(board.value[0].items, ['brief', 'press'])
  assert.deepEqual(board.value[1].items, ['copy', 'site', 'video'])
  assert.deepEqual(pressed(), [])
  assert.deepEqual(marked(), [])
  assert.deepEqual(heard, ['input', 'change'])
  assert.equal(document.activeElement, handle('copy'))
  assert.equal(await said(), 'Copy, dropped in In progress, position 1 of 3.')
})

test('kanban: Enter or Space where it was picked up drops it and dispatches nothing', async () => {
  const { root, handle, press, pressed, heard, said } = setup()
  const board = kanban(root)
  handle('copy').focus()
  await press('copy')
  await press('copy')
  assert.deepEqual(pressed(), [])
  assert.deepEqual(board.value, start)
  assert.deepEqual(heard, [])
  assert.equal(await said(), 'Copy, dropped in To do, position 2 of 3.')
})

test('kanban: Escape leaves the item where it was, keeps focus and says so', async () => {
  const { root, handle, press, key, pressed, marked, said, heard, document } = setup()
  const board = kanban(root)
  handle('site').focus()
  await press('site')
  await key('site', 'ArrowLeft')
  await key('site', 'Home')
  assert.equal(await key('site', 'Escape'), true)
  assert.deepEqual(board.value, start)
  assert.deepEqual(pressed(), [])
  assert.deepEqual(marked(), [])
  assert.deepEqual(heard, [])
  assert.equal(document.activeElement, handle('site'))
  assert.equal(await said(), 'Site, move cancelled. Still in In progress, position 1 of 2.')
})

test('kanban: leaving the handle, as Tab does, commits the place and does not take focus back', async () => {
  const { root, handle, press, key, pressed, heard, one, document } = setup()
  const board = kanban(root)
  handle('name').focus()
  await press('name')
  await key('name', 'ArrowLeft')
  assert.equal(await key('name', 'Tab'), false, 'Tab is left to the browser')
  one<HTMLButtonElement>('#elsewhere').focus()
  await settle()
  assert.deepEqual(board.value[2].items, ['name'])
  assert.deepEqual(board.value[3].items, [])
  assert.deepEqual(pressed(), [])
  assert.deepEqual(heard, ['input', 'change'])
  assert.equal(document.activeElement, one('#elsewhere'))
})

test('kanban: a press on a handle that does not move picks the item up as Enter does, and gives its handle focus', async () => {
  const { root, handle, click, down, pressed, document, said } = setup()
  kanban(root)
  assert.equal(down('copy'), false, 'the press selects no text and scrolls nothing')
  click(handle('copy'), { detail: 1 })
  await settle()
  assert.deepEqual(pressed(), ['copy'])
  assert.equal(document.activeElement, handle('copy'))
  assert.match(await said() ?? '', /^Copy, picked up in To do/)
})

test('kanban: a disabled handle picks nothing up, by the keys or the pointer', async () => {
  const { root, press, down, move, pressed } = setup(markup.replace('aria-label="Drag Copy"', 'aria-label="Drag Copy" disabled'))
  kanban(root)
  await press('copy')
  down('copy')
  move(20, 200)
  assert.deepEqual(pressed(), [])
})

test('kanban: messages say it in the page\'s language', async () => {
  const { root, handle, press, said } = setup()
  kanban(root, { messages: { grab: (name, column, position, count) => `已拿起「${name}」：${column}，第 ${position} 項，共 ${count} 項` } })
  handle('copy').focus()
  await press('copy')
  assert.equal(await said(), '已拿起「Copy」：To do，第 2 項，共 3 項')
})

/* The pointer. */

test('kanban: a drag marks the place under the pointer and moves the item once, on the release', async () => {
  const { root, handle, down, move, up, gone, pressed, marked, heard, preview, isOpen, document, said } = setup()
  const board = kanban(root)
  // Brief stands at 40 to 84; the pointer takes hold of it 14px in and 20px down.
  down('brief', 1, 20, 60)
  move(21, 62)
  assert.deepEqual(pressed(), [], 'a few pixels is still a press')
  assert.equal(isOpen(preview), false)
  move(30, 90)
  assert.deepEqual(pressed(), ['brief'])
  assert.equal(isOpen(preview), true, 'the sheet is shown in the top layer')
  assert.equal(preview.textContent, 'Brief', 'with the item\'s name and nothing it holds')
  assert.equal(preview.style.getPropertyValue('--kanban-width'), '168px')
  assert.equal(preview.style.getPropertyValue('--kanban-x'), '16px')
  assert.equal(preview.style.getPropertyValue('--kanban-y'), '70px')
  assert.deepEqual(marked(), [], 'over its own place nothing is marked')
  // Copy's middle is at 112 and Press kit's at 162.
  move(30, 130)
  assert.deepEqual(marked(), ['before press'], 'past Copy, before Press kit')
  move(30, 300)
  assert.deepEqual(marked(), ['end of todo'])
  assert.deepEqual(board.value, start, 'no node moves until the release')
  up(30, 300)
  await settle()
  assert.deepEqual(board.value[0].items, ['copy', 'press', 'brief'])
  assert.deepEqual(marked(), [])
  assert.deepEqual(heard, ['input', 'change'])
  assert.equal(document.activeElement, handle('brief'), 'focus goes to the handle of the item that moved')
  assert.deepEqual(pressed(), [], 'the handle lets go on the release: the item is whole again, and it is what moves')
  assert.equal(isOpen(preview), false, 'the sheet leaves at once')
  assert.equal(preview.classList.contains('kanban-preview-landing'), true, 'in the time of a press')
  assert.equal(preview.style.getPropertyValue('--kanban-y'), '280px', 'where it was released: it never slides over the item it stood for')
  gone()
  assert.equal(preview.classList.contains('kanban-preview-landing'), false)
  assert.equal(await said(), 'Brief, dropped in To do, position 3 of 3.')
})

test('kanban: a drag across columns lands before the item under the pointer, at an end, or in an empty column', async () => {
  const { root, down, move, up, gone, marked } = setup()
  const board = kanban(root)
  down('brief', 1, 20, 60)
  move(260, 50)
  assert.deepEqual(marked(), ['before site'], 'the first place of In progress')
  move(260, 100)
  assert.deepEqual(marked(), ['before video'])
  move(260, 390)
  assert.deepEqual(marked(), ['end of doing'])
  move(390, 200)
  assert.deepEqual(marked(), ['end of doing'], 'between two columns the nearer one is the place')
  move(396, 200)
  assert.deepEqual(marked(), ['end of review'])
  move(480, 380)
  assert.deepEqual(marked(), ['end of review'], 'anywhere under an empty column is its one place')
  up(480, 380)
  await settle()
  gone()
  assert.deepEqual(board.value[0].items, ['copy', 'press'])
  assert.deepEqual(board.value[2].items, ['brief'])
})

test('kanban: a release where the item was picked up changes and dispatches nothing', async () => {
  const { root, down, move, up, gone, pressed, heard, said } = setup()
  const board = kanban(root)
  down('copy', 1, 20, 110)
  move(40, 150)
  move(20, 112)
  up(20, 112)
  await settle()
  gone()
  assert.deepEqual(board.value, start)
  assert.deepEqual(heard, [])
  assert.deepEqual(pressed(), [])
  assert.equal(await said(), '', 'and nothing is said: nothing happened')
})

test('kanban: a release outside the board cancels', async () => {
  const { root, down, move, up, gone, marked, pressed, heard, said } = setup()
  const board = kanban(root)
  down('brief', 1, 20, 60)
  move(260, 100)
  assert.deepEqual(marked(), ['before video'])
  move(260, 460)
  assert.deepEqual(marked(), [], 'off the board there is no place')
  up(260, 460)
  await settle()
  gone()
  assert.deepEqual(board.value, start)
  assert.deepEqual(pressed(), [])
  assert.deepEqual(heard, [])
  assert.equal(await said(), 'Brief, move cancelled. Still in To do, position 1 of 3.')
})

test('kanban: Escape during a drag, a cancelled pointer and a capture lost each leave the item where it was', async () => {
  for (const cancel of ['Escape', 'pointercancel', 'lostpointercapture']) {
    const { root, handle, down, move, gone, marked, pressed, heard, preview, isOpen, pointer, document, window } = setup()
    const board = kanban(root)
    down('site', 1, 220, 60)
    move(30, 100)
    assert.deepEqual(marked(), ['before copy'], cancel)
    if (cancel === 'Escape') document.dispatchEvent(new window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }) as any)
    else if (cancel === 'pointercancel') document.dispatchEvent(new window.PointerEvent('pointercancel', { bubbles: true, pointerId: 1 }) as any)
    else pointer(handle('site'), 'lostpointercapture', { pointerId: 1 })
    await settle()
    gone()
    assert.deepEqual(board.value, start, cancel)
    assert.deepEqual(marked(), [], cancel)
    assert.deepEqual(pressed(), [], cancel)
    assert.equal(isOpen(preview), false, cancel)
    assert.deepEqual(heard, [], cancel)
  }
})

test('kanban: only the pointer that started the drag moves it, and a second press starts nothing', async () => {
  const { root, down, move, up, gone, marked, pressed } = setup()
  const board = kanban(root)
  down('brief', 1, 20, 60)
  move(30, 130)
  assert.deepEqual(marked(), ['before press'])
  down('site', 2, 220, 60)
  move(480, 200, 2)
  assert.deepEqual(marked(), ['before press'], 'another pointer does not move the place')
  assert.deepEqual(pressed(), ['brief'])
  up(480, 200, 2)
  assert.deepEqual(pressed(), ['brief'], 'nor end the drag')
  up(30, 130)
  await settle()
  gone()
  assert.deepEqual(board.value[0].items, ['copy', 'brief', 'press'])
})

test('kanban: a pointer resting on the line between two places does not trade them back and forth', () => {
  const { root, down, move, marked, document, window } = setup()
  kanban(root)
  down('brief', 1, 20, 60)
  // Without Brief, Copy is the first place and Press kit the second; Press kit's middle is at 162.
  move(30, 130)
  assert.deepEqual(marked(), ['before press'])
  move(30, 164)
  assert.deepEqual(marked(), ['before press'], 'just past the middle is not yet past it')
  move(30, 168)
  assert.deepEqual(marked(), ['end of todo'])
  move(30, 160)
  assert.deepEqual(marked(), ['end of todo'], 'and just back over it does not give the place back')
  move(30, 156)
  assert.deepEqual(marked(), ['before press'])
  document.dispatchEvent(new window.PointerEvent('pointercancel', { bubbles: true, pointerId: 1 }) as any)
})

test('kanban: near an end of the board or of a list the drag scrolls it, and stops with the drag', async () => {
  const { root, one, down, move, up, gone, marked } = setup()
  kanban(root)
  const frames: ((time: number) => void)[] = []
  const cancelled: number[] = []
  ;(globalThis as any).requestAnimationFrame = (run: (time: number) => void) => frames.push(run)
  ;(globalThis as any).cancelAnimationFrame = (id: number) => cancelled.push(id)
  const frame = (time: number) => frames.splice(0).forEach(run => run(time))
  Object.defineProperties(root, { scrollWidth: { value: 1200 }, clientWidth: { value: 800 } })
  const list = one<HTMLElement>('.kanban-column[data-value="doing"] .kanban-items')
  Object.defineProperties(list, { scrollHeight: { value: 900 }, clientHeight: { value: 360 } })
  down('brief', 1, 20, 60)
  move(300, 200)
  frame(0)
  frame(16)
  assert.equal(root.scrollLeft, 0, 'in the middle nothing scrolls')
  assert.equal(list.scrollTop, 0)
  move(300, 395)
  frame(32)
  assert.ok(list.scrollTop > 0, 'near the foot of the list under the pointer, it scrolls down')
  const down1 = list.scrollTop
  assert.deepEqual(marked(), ['end of doing'])
  move(790, 200)
  frame(48)
  assert.ok(root.scrollLeft > 0, 'near the end of the board, it scrolls across')
  assert.equal(list.scrollTop, down1, 'and the list it has left stays')
  up(790, 200)
  await settle()
  gone()
  assert.equal(cancelled.length > 0, true, 'the release cancels the frame')
  const across = root.scrollLeft
  frame(64)
  assert.equal(root.scrollLeft, across, 'and nothing scrolls after it')
})

test('kanban: the click a drag\'s release makes picks nothing up', async () => {
  const { root, handle, click, down, move, up, gone, pressed } = setup()
  kanban(root)
  down('brief', 1, 20, 60)
  move(30, 130)
  up(30, 130)
  await settle()
  gone()
  click(handle('brief'), { detail: 1 })
  await settle()
  assert.deepEqual(pressed(), [])
})

test('kanban: without the popover API nothing follows the pointer, and the drag still moves the item', async () => {
  const { root, down, move, up, marked, pressed, preview } = setup()
  ;(preview as any).showPopover = undefined
  const board = kanban(root)
  down('brief', 1, 20, 60)
  move(260, 100)
  assert.deepEqual(marked(), ['before video'])
  assert.deepEqual(pressed(), ['brief'])
  up(260, 100)
  await settle()
  assert.deepEqual(board.value[1].items, ['site', 'brief', 'video'])
  assert.deepEqual(pressed(), [], 'with no sheet to land, the handle lets go at once')
})

test('kanban: with reduced motion nothing glides, and the sheet leaves at once as it always does', async () => {
  const { root, down, move, up, pressed, preview, isOpen, window } = setup()
  ;(window as any).matchMedia = (query: string) => ({ matches: query.includes('reduce') })
  kanban(root)
  down('brief', 1, 20, 60)
  move(260, 100)
  up(260, 100)
  await settle()
  assert.equal(isOpen(preview), false)
  assert.deepEqual(pressed(), [])
  // A sheet that never fires transitionend, as where nothing fades, is done leaving all the same.
  await new Promise(resolve => setTimeout(resolve, 260))
  assert.equal(preview.classList.contains('kanban-preview-landing'), false)
})

/* The mover. */

test('kanban: a button that opens the mover\'s popover fills it for its item: the columns, and the places of the column chosen', async () => {
  const { root, one, all, click } = setup()
  kanban(root)
  click(one('.kanban-item[data-value="copy"] [popovertarget]'), { detail: 1 })
  const column = one<HTMLSelectElement>('.kanban-mover [name="column"]')
  const position = one<HTMLSelectElement>('.kanban-mover [name="position"]')
  assert.deepEqual([...column.options].map(option => [option.value, option.textContent]), [['todo', 'To do'], ['doing', 'In progress'], ['review', 'In review'], ['done', 'Done']])
  assert.equal(column.value, 'todo')
  assert.deepEqual([...position.options].map(option => option.value), ['1', '2', '3'])
  assert.equal(position.value, '2', 'the place it is in')
  assert.equal(all('.kanban-mover .select-option').length, 7, 'the options take the select\'s own class')
  column.value = 'review'
  column.dispatchEvent(new Event('change', { bubbles: true }))
  assert.deepEqual([...position.options].map(option => option.value), ['1'], 'an empty column has one place')
  column.value = 'doing'
  column.dispatchEvent(new Event('change', { bubbles: true }))
  assert.deepEqual([...position.options].map(option => option.value), ['1', '2', '3'])
  assert.equal(position.value, '3', 'in another column, the last place by default')
})

test('kanban: submitting the mover commits the move, once, gives the handle focus and says where', async () => {
  const { root, one, handle, click, heard, said, document, isOpen } = setup()
  const board = kanban(root)
  const sheet = one<HTMLElement>('#mover')
  click(one('.kanban-item[data-value="copy"] [popovertarget]'), { detail: 1 })
  sheet.showPopover()
  const form = one<HTMLFormElement>('.kanban-mover')
  one<HTMLSelectElement>('.kanban-mover [name="column"]').value = 'review'
  one<HTMLSelectElement>('.kanban-mover [name="column"]').dispatchEvent(new Event('change', { bubbles: true }))
  const submit = new Event('submit', { bubbles: true, cancelable: true })
  form.dispatchEvent(submit)
  await settle()
  assert.equal(submit.defaultPrevented, true, 'the form goes nowhere')
  assert.equal(isOpen(sheet), false, 'the popover closes')
  assert.deepEqual(board.value[0].items, ['brief', 'press'])
  assert.deepEqual(board.value[2].items, ['copy'])
  assert.deepEqual(heard.slice(-2), ['input', 'change'])
  assert.equal(heard.filter(type => type === 'input').length, 1)
  assert.equal(document.activeElement, handle('copy'))
  assert.equal(await said(), 'Copy, dropped in In review, position 1 of 1.')
})

test('kanban: submitting the mover for the place the item is in dispatches nothing', async () => {
  const { root, one, click, heard } = setup()
  const board = kanban(root)
  click(one('.kanban-item[data-value="copy"] [popovertarget]'), { detail: 1 })
  one<HTMLFormElement>('.kanban-mover').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await settle()
  assert.deepEqual(board.value, start)
  assert.deepEqual(heard, [])
})

/* What happens around a move. */

test('kanban: setting value during a move cancels the move first, and the arrangement is the one set', async () => {
  const { root, handle, press, key, pressed, marked, heard } = setup()
  const board = kanban(root)
  handle('copy').focus()
  await press('copy')
  await key('copy', 'ArrowRight')
  assert.deepEqual(marked(), ['before video'])
  const next: KanbanValue = [{ value: 'todo', items: ['press', 'copy', 'brief'] }, { value: 'doing', items: ['video', 'site'] }, { value: 'review', items: [] }, { value: 'done', items: ['name'] }]
  board.value = next
  assert.deepEqual(pressed(), [])
  assert.deepEqual(marked(), [])
  assert.deepEqual(board.value, next)
  assert.deepEqual(heard, [])
})

test('kanban: something else rearranging the board during a drag cancels the drag', async () => {
  const { root, one, down, move, up, gone, pressed, marked, heard } = setup()
  const board = kanban(root)
  down('brief', 1, 20, 60)
  move(260, 100)
  assert.deepEqual(marked(), ['before video'])
  // A renderer moves Name into To do under the drag.
  one('.kanban-column[data-value="todo"] .kanban-items').append(one('.kanban-item[data-value="name"]'))
  await settle()
  gone()
  assert.deepEqual(pressed(), [])
  assert.deepEqual(marked(), [])
  up(260, 100)
  await settle()
  assert.deepEqual(board.value[0].items, ['brief', 'copy', 'press', 'name'], 'the release that follows moves nothing')
  assert.deepEqual(heard, [])
})

test('kanban: with arrange, the owner arranges the items, and focus and the events wait for it', async () => {
  const { root, one, handle, press, key, heard, document } = setup()
  const asked: KanbanValue[] = []
  let arranged = false
  let rendered = () => {}
  const render = new Promise<void>((resolve) => { rendered = resolve })
  const board = kanban(root, {
    arrange: async (next) => {
      asked.push(next)
      await render
      // A renderer writes the lists again from its data.
      for (const entry of next) one(`.kanban-column[data-value="${entry.value}"] .kanban-items`).append(...entry.items.map(value => one(`.kanban-item[data-value="${value}"]`)))
      arranged = true
    },
  })
  root.addEventListener('change', () => assert.equal(arranged, true, 'change comes after the owner has arranged'))
  handle('copy').focus()
  await press('copy')
  await key('copy', 'ArrowRight')
  await press('copy')
  assert.deepEqual(board.value, start, 'the script moved no node itself')
  assert.deepEqual(heard, [])
  rendered()
  await settle()
  assert.deepEqual(asked, [[{ value: 'todo', items: ['brief', 'press'] }, { value: 'doing', items: ['site', 'copy', 'video'] }, { value: 'review', items: [] }, { value: 'done', items: ['name'] }]])
  assert.deepEqual(board.value, asked[0])
  assert.deepEqual(heard, ['input', 'change'])
  assert.equal(document.activeElement, handle('copy'), 'the handle is focused again after the nodes were written again')
})

test('kanban: an owner that does not take the arrangement leaves the board as it was, and nothing is dispatched or stuck', async () => {
  const { root, handle, press, key, pressed, heard } = setup()
  const board = kanban(root, { arrange: () => {} })
  handle('copy').focus()
  await press('copy')
  await key('copy', 'ArrowRight')
  await press('copy')
  await settle()
  assert.deepEqual(board.value, start)
  assert.deepEqual(heard, [])
  assert.deepEqual(pressed(), [])
  assert.equal(await board.move('copy', 'done', 0), false)
  await press('copy')
  assert.deepEqual(pressed(), ['copy'], 'the board still answers')
})

test('kanban: detach removes the listeners and ends a move in progress, and attaching again starts clean', async () => {
  const { root, press, down, move, pressed, marked, preview, isOpen } = setup()
  const detach = kanban(root)
  down('brief', 1, 20, 60)
  move(260, 100)
  assert.deepEqual(pressed(), ['brief'])
  detach()
  assert.deepEqual(pressed(), [])
  assert.deepEqual(marked(), [])
  assert.equal(isOpen(preview), false)
  await press('brief')
  assert.deepEqual(pressed(), [], 'detached, a handle answers nothing')
  const board = kanban(root)
  await press('brief')
  assert.deepEqual(pressed(), ['brief'])
  kanban(root)
  assert.deepEqual(board.value, start)
})

/* What a move leaves behind when something goes wrong, or goes another way. */

test('kanban: the mover takes the name of the button that opened it', () => {
  const { root, one, click } = setup()
  kanban(root)
  click(one('.kanban-item[data-value="copy"] [popovertarget]'), { detail: 1 })
  assert.equal(one('.kanban-mover').getAttribute('aria-label'), 'Move Copy')
  click(one('.kanban-item[data-value="site"] [popovertarget]'), { detail: 1 })
  assert.equal(one('.kanban-mover').getAttribute('aria-label'), 'Move Site', 'one form serves every item')
})

test('kanban: the button that opened the mover is expanded while it is open, and only that one', () => {
  const { root, one, click } = setup()
  const detach = kanban(root)
  const copy = one('.kanban-item[data-value="copy"] [popovertarget]')
  const site = one('.kanban-item[data-value="site"] [popovertarget]')
  const sheet = one('#mover')
  const toggle = (newState: 'open' | 'closed') => sheet.dispatchEvent(Object.assign(new Event('toggle'), { newState }))
  click(copy, { detail: 1 })
  toggle('open')
  assert.equal(copy.getAttribute('aria-expanded'), 'true')
  click(site, { detail: 1 })
  toggle('open')
  assert.equal(copy.getAttribute('aria-expanded'), 'false', 'the mover left the first item')
  assert.equal(site.getAttribute('aria-expanded'), 'true')
  toggle('closed')
  assert.equal(site.getAttribute('aria-expanded'), 'false', 'closed by Escape, a click outside or a submit')
  click(site, { detail: 1 })
  detach()
  assert.equal(site.getAttribute('aria-expanded'), 'false', 'detaching leaves no button expanded')
})

test('kanban: a press whose release never came is not a drag once no button is down', () => {
  const { root, down, pressed, isOpen, preview, document, window } = setup()
  const board = kanban(root)
  down('brief', 1, 20, 60)
  // The release went to a menu that opened over the press; the pointer comes back with no button held.
  document.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 1, pointerType: 'mouse', buttons: 0, clientX: 60, clientY: 160 }) as any)
  assert.deepEqual(pressed(), [], 'nothing is picked up')
  assert.equal(isOpen(preview), false)
  // The next press is heard: the one before it is over.
  down('copy', 2, 20, 110)
  document.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 2, pointerType: 'mouse', buttons: 1, clientX: 30, clientY: 150 }) as any)
  assert.deepEqual(pressed(), ['copy'])
  // The drag is still under way: detaching ends it, and the frame it waits for.
  board()
})

test('kanban: an owner that throws leaves the board as it was and able to move again', async () => {
  const { root, handle, press, pressed } = setup()
  let fail = true
  const board = kanban(root, { arrange: () => { if (fail) throw new Error('refused') } })
  assert.throws(() => board.move('copy', 'doing', 0), /refused/, 'the owner\'s error reaches the caller')
  assert.deepEqual(board.value, start, 'the board is as it was')
  fail = false
  handle('copy').focus()
  await press('copy')
  assert.deepEqual(pressed(), ['copy'], 'and an item can still be picked up')
  board()
})

/* The whole item, a hidden column and a handle that is disabled. */

test('kanban: a mouse carries an item by its words, a finger does not, and a press on a field is the field\'s', () => {
  const { root, one, pointer, move, up, pressed, isOpen, preview, document, window } = setup()
  const board = kanban(root)
  const title = one('.kanban-item[data-value="brief"] .card-title')
  const drag = (target: Element, pointerType: string, id: number) => {
    pointer(target, 'pointerdown', { button: 0, isPrimary: true, pointerId: id, pointerType, buttons: 1, clientX: 20, clientY: 60 })
    document.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: id, pointerType, buttons: 1, clientX: 30, clientY: 130 }) as any)
  }
  drag(title, 'touch', 1)
  assert.deepEqual(pressed(), [], 'a finger on the words is a scroll, not a carry')
  drag(one('.kanban-item[data-value="brief"] .input'), 'mouse', 2)
  assert.deepEqual(pressed(), [], 'a press on a field is the field\'s')
  drag(title, 'mouse', 3)
  assert.deepEqual(pressed(), ['brief'], 'a mouse on the words carries the item')
  assert.equal(isOpen(preview), true)
  board()
})

test('kanban: an item whose handle is disabled is not moved by the mover, and move() takes no hidden column', async () => {
  const { root, one, click, heard } = setup(markup
    .replace('aria-label="Drag Copy"', 'aria-label="Drag Copy" disabled')
    .replace('data-value="done" aria-labelledby="done-title"', 'data-value="done" aria-labelledby="done-title" hidden'))
  const board = kanban(root)
  const opened = new Event('click', { bubbles: true, cancelable: true })
  one('.kanban-item[data-value="copy"] [popovertarget]').dispatchEvent(opened)
  assert.equal(opened.defaultPrevented, true, 'the mover does not open for it')
  assert.equal(board.move('brief', 'done', 0), false, 'a hidden column takes no item')
  assert.deepEqual(board.value[3].items, ['name'])
  assert.deepEqual(heard, [])
  board()
})
