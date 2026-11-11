import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { wheel } from '../../behaviors/wheel.js'

/**
 * A wheel's columns scroll and snap natively; the behavior reads which option rests under the mark.
 * happy-dom has no layout and does not scroll, so `lay` gives a column what a browser would: 36px rows, the
 * first of them under the mark before any scrolling, and a `scrollTo` that arrives at once and says so with
 * `scroll` and `scrollend`. A column laid with `arrive: false` records where it was sent and stays put,
 * like a smooth scroll still on its way.
 */
const option = (label: string, attributes = 'aria-selected="false"') => `<div class="wheel-option" role="option" ${attributes}>${label}</div>`
const markup = (options: string, root = '') => `<div class="wheel" role="group" aria-label="Repeat every" ${root}>
  <div class="wheel-column" role="listbox" aria-label="Interval" tabindex="0">
    ${options}
  </div>
</div>`
const interval = [option('Hour'), option('Day'), option('Week', 'aria-selected="true"'), option('Month'), option('Year')].join('\n')
const many = (count: number, attributes: Record<number, string> = {}) => Array.from({ length: count }, (_, index) => option(String(index), attributes[index] ?? 'aria-selected="false"')).join('\n')

const row = 36

function lay(page: ReturnType<typeof dom>, column: any, { arrive = true } = {}) {
  let top = 72
  for (const each of column.querySelectorAll('.wheel-option')) {
    Object.defineProperty(each, 'offsetTop', { value: each.hidden ? 0 : top, configurable: true })
    if (!each.hidden) top += row
  }
  const sent: { top: number, behavior?: string }[] = []
  column.scrollTo = (to: { top: number, behavior?: string }) => {
    sent.push({ top: to.top, behavior: to.behavior })
    if (!arrive || to.top === column.scrollTop) return
    column.scrollTop = to.top
    column.dispatchEvent(new page.window.Event('scroll'))
    column.dispatchEvent(new page.window.Event('scrollend'))
  }
  return sent
}

function setup(options = interval, root = '', layout?: { arrive?: boolean }) {
  const page = dom(markup(options, root))
  const root_ = page.one('.wheel')
  const column = page.one('.wheel-column')
  const sent = lay(page, column, layout)
  const changes: { value: string, option: any, target: any }[] = []
  root_.addEventListener('change', (event: any) => changes.push({ value: event.detail.value, option: event.detail.option, target: event.target }))
  const selected = () => page.all('.wheel-option').filter(each => each.getAttribute('aria-selected') === 'true').map(each => each.textContent)
  /** What a reader's own scrolling does: the column moves, then comes to rest. */
  const scroll = (top: number) => {
    column.scrollTop = top
    column.dispatchEvent(new page.window.Event('scroll'))
    column.dispatchEvent(new page.window.Event('scrollend'))
  }
  return { ...page, root: root_, column, sent, changes, selected, scroll }
}

test('wheel: attaching brings the chosen option under the mark, at once and without a change', () => {
  const { root, column, sent, changes, selected } = setup()
  wheel(root)
  assert.deepEqual(sent, [{ top: 2 * row, behavior: 'instant' }])
  assert.equal(column.scrollTop, 2 * row)
  assert.deepEqual(selected(), ['Week'])
  assert.deepEqual(changes, [])
})

test('wheel: a column with no chosen option takes the one under the mark', () => {
  const { root, changes, selected } = setup([option('Hour', ''), option('Day', ''), option('Week', '')].join('\n'))
  wheel(root)
  assert.deepEqual(selected(), ['Hour'])
  assert.deepEqual(root.querySelectorAll('[aria-selected="false"]').length, 2, 'every other option says it is not selected')
  assert.deepEqual(changes, [])
})

test('wheel: when a column settles, the option under the mark is selected and the column says change', () => {
  const { root, column, all, changes, selected, scroll } = setup()
  wheel(root)
  scroll(3 * row)
  assert.deepEqual(selected(), ['Month'])
  assert.equal(changes.length, 1)
  assert.equal(changes[0].value, 'Month')
  assert.equal(changes[0].option, all('.wheel-option')[3])
  assert.equal(changes[0].target, column, 'the change comes from the column and bubbles')
  scroll(0)
  assert.deepEqual(selected(), ['Hour'])
  assert.deepEqual(changes.map(change => change.value), ['Month', 'Hour'])
})

test('wheel: the option nearest the mark is the one, and settling on the same one says nothing', () => {
  const { root, changes, selected, scroll } = setup()
  wheel(root)
  scroll(3 * row + 10)
  assert.deepEqual(selected(), ['Month'])
  scroll(3 * row - 12)
  assert.deepEqual(selected(), ['Month'])
  assert.equal(changes.length, 1)
  scroll(4 * row - 15)
  assert.deepEqual(selected(), ['Year'])
})

test('wheel: nothing is selected while a column is still scrolling', () => {
  const { root, window, column, changes, selected } = setup()
  wheel(root)
  column.scrollTop = 4 * row
  column.dispatchEvent(new window.Event('scroll'))
  assert.deepEqual(selected(), ['Week'])
  assert.deepEqual(changes, [])
  column.dispatchEvent(new window.Event('scrollend'))
  assert.deepEqual(selected(), ['Year'])
})

test('wheel: the value in the change is data-value, or the option\'s text', () => {
  const { root, changes, scroll } = setup([option('Hour', 'aria-selected="true" data-value="PT1H"'), option('Day', 'aria-selected="false" data-value="P1D"'), option('  Week\n', 'aria-selected="false"')].join('\n'))
  wheel(root)
  scroll(row)
  scroll(2 * row)
  assert.deepEqual(changes.map(change => change.value), ['P1D', 'Week'])
})

test('wheel: ArrowDown and ArrowUp bring the option after and before under the mark', () => {
  const { root, column, key, sent, changes, selected } = setup()
  wheel(root)
  sent.length = 0
  assert.equal(key(column, 'ArrowDown'), true, 'a key the behavior handles is prevented')
  assert.deepEqual(sent, [{ top: 3 * row, behavior: 'smooth' }])
  assert.deepEqual(selected(), ['Month'])
  assert.equal(key(column, 'ArrowUp'), true)
  assert.equal(key(column, 'ArrowUp'), true)
  assert.deepEqual(selected(), ['Day'])
  assert.deepEqual(changes.map(change => change.value), ['Month', 'Week', 'Day'])
})

test('wheel: the arrows stop at the ends and do not wrap', () => {
  const { root, column, key, sent, selected, scroll } = setup()
  wheel(root)
  scroll(0)
  sent.length = 0
  assert.equal(key(column, 'ArrowUp'), true)
  assert.deepEqual(sent, [])
  assert.deepEqual(selected(), ['Hour'])
  scroll(4 * row)
  assert.equal(key(column, 'ArrowDown'), true)
  assert.deepEqual(sent, [])
  assert.deepEqual(selected(), ['Year'])
})

test('wheel: Home and End bring the first and the last option under the mark', () => {
  const { root, column, key, selected } = setup()
  wheel(root)
  assert.equal(key(column, 'End'), true)
  assert.deepEqual(selected(), ['Year'])
  assert.equal(key(column, 'Home'), true)
  assert.deepEqual(selected(), ['Hour'])
})

test('wheel: PageDown and PageUp move by as many options as the column shows, five by default', () => {
  const { root, column, key, selected } = setup(many(12, { 0: 'aria-selected="true"' }))
  wheel(root)
  assert.equal(key(column, 'PageDown'), true)
  assert.deepEqual(selected(), ['5'])
  key(column, 'PageDown')
  assert.deepEqual(selected(), ['10'])
  key(column, 'PageDown')
  assert.deepEqual(selected(), ['11'], 'a page that runs past the end stops at the last option')
  assert.equal(key(column, 'PageUp'), true)
  assert.deepEqual(selected(), ['6'])
  key(column, 'PageUp')
  key(column, 'PageUp')
  assert.deepEqual(selected(), ['0'])
})

test('wheel: a page follows --wheel-rows', () => {
  const { root, column, key, selected } = setup(many(12, { 0: 'aria-selected="true"' }), 'style="--wheel-rows: 3"')
  wheel(root)
  key(column, 'PageDown')
  assert.deepEqual(selected(), ['3'])
  key(column, 'PageUp')
  assert.deepEqual(selected(), ['0'])
})

test('wheel: the keys skip disabled and hidden options', () => {
  const { root, column, key, selected } = setup(many(8, { 0: 'aria-selected="false" aria-disabled="true"', 1: 'aria-selected="true"', 2: 'aria-selected="false" aria-disabled="true"', 3: 'aria-selected="false" hidden', 6: 'aria-selected="false" aria-disabled="true"', 7: 'aria-selected="false" aria-disabled="true"' }))
  wheel(root)
  key(column, 'ArrowDown')
  assert.deepEqual(selected(), ['4'])
  key(column, 'ArrowUp')
  assert.deepEqual(selected(), ['1'])
  key(column, 'ArrowUp')
  assert.deepEqual(selected(), ['1'], 'nothing enabled before it')
  key(column, 'End')
  assert.deepEqual(selected(), ['5'])
  key(column, 'Home')
  assert.deepEqual(selected(), ['1'])
  key(column, 'PageDown')
  assert.deepEqual(selected(), ['5'])
  key(column, 'PageUp')
  assert.deepEqual(selected(), ['1'])
})

test('wheel: keys pressed while a column turns add up', () => {
  const { root, column, key, sent, selected } = setup(interval, '', { arrive: false })
  wheel(root)
  sent.length = 0
  key(column, 'ArrowUp')
  key(column, 'ArrowUp')
  assert.deepEqual(sent.map(to => to.top), [row, 0])
  key(column, 'End')
  key(column, 'ArrowUp')
  assert.deepEqual(sent.map(to => to.top), [row, 0, 4 * row, 3 * row])
  assert.deepEqual(selected(), ['Week'], 'nothing is selected before the column settles')
})

test('wheel: keys it does not handle, keys with a modifier and keys outside a column are left alone', () => {
  const { root, column, key, sent } = setup()
  wheel(root)
  sent.length = 0
  for (const name of ['ArrowLeft', 'ArrowRight', 'Enter', ' ', 'Tab', 'a']) assert.equal(key(column, name), false, name)
  assert.equal(key(column, 'ArrowDown', { ctrlKey: true }), false)
  assert.equal(key(column, 'End', { metaKey: true }), false)
  assert.equal(key(column, 'PageDown', { altKey: true }), false)
  assert.equal(key(root, 'ArrowDown'), false)
  assert.deepEqual(sent, [])
})

test('wheel: a click brings the option under the mark', () => {
  const { root, all, click, sent, changes, selected } = setup()
  wheel(root)
  sent.length = 0
  click(all('.wheel-option')[4])
  assert.deepEqual(sent, [{ top: 4 * row, behavior: 'smooth' }])
  assert.deepEqual(selected(), ['Year'])
  assert.deepEqual(changes.map(change => change.value), ['Year'])
})

test('wheel: a click on a disabled option does nothing', () => {
  const { root, all, click, sent, selected } = setup([option('Hour', 'aria-selected="true"'), option('Day', 'aria-selected="false" aria-disabled="true"'), option('Week')].join('\n'))
  wheel(root)
  sent.length = 0
  click(all('.wheel-option')[1])
  assert.deepEqual(sent, [])
  assert.deepEqual(selected(), ['Hour'])
})

test('wheel: a column that rests on a disabled option turns on to the nearest one that is not', () => {
  const { root, sent, changes, selected, scroll } = setup(many(6, { 0: 'aria-selected="true"', 2: 'aria-selected="false" aria-disabled="true"', 3: 'aria-selected="false" aria-disabled="true"' }))
  wheel(root)
  sent.length = 0
  scroll(3 * row)
  assert.deepEqual(sent, [{ top: 4 * row, behavior: 'smooth' }])
  assert.deepEqual(selected(), ['4'])
  assert.deepEqual(changes.map(change => change.value), ['4'], 'the disabled option was never the value')
  scroll(2 * row - 4)
  assert.deepEqual(selected(), ['1'])
})

test('wheel: with reduced motion a column is turned at once', () => {
  const { root, window, column, key, all, click, sent } = setup()
  window.matchMedia = ((query: string) => ({ matches: query === '(prefers-reduced-motion: reduce)' })) as any
  wheel(root)
  sent.length = 0
  key(column, 'ArrowDown')
  click(all('.wheel-option')[0])
  assert.deepEqual(sent, [{ top: 3 * row, behavior: 'instant' }, { top: 0, behavior: 'instant' }])
})

test('wheel: each column keeps its own option', () => {
  const page = dom(`<div class="wheel" role="group" aria-label="Reminder time">
  <div class="wheel-column" role="listbox" aria-label="Hour" tabindex="0">${[option('08'), option('09', 'aria-selected="true"'), option('10')].join('')}</div>
  <span class="wheel-separator" aria-hidden="true">:</span>
  <div class="wheel-column" role="listbox" aria-label="Minute" tabindex="0">${[option('00', 'aria-selected="true"'), option('30')].join('')}</div>
</div>`)
  const [hour, minute] = page.all('.wheel-column')
  lay(page, hour)
  lay(page, minute)
  const changes: string[] = []
  page.one('.wheel').addEventListener('change', (event: any) => changes.push(`${event.target.getAttribute('aria-label')} ${event.detail.value}`))
  wheel(page.one('.wheel'))
  assert.equal(hour.scrollTop, row)
  assert.equal(minute.scrollTop, 0)
  page.key(minute, 'ArrowDown')
  page.key(hour, 'ArrowUp')
  assert.deepEqual(changes, ['Minute 30', 'Hour 08'])
  assert.deepEqual(page.all('[aria-selected="true"]').map(each => each.textContent), ['08', '30'])
})

test('wheel: it moves aria-selected and sets no style, class or other attribute', () => {
  const { root, column, all, key } = setup()
  const names = (element: any) => element.getAttributeNames().sort().join(' ')
  const before = [root, column, ...all('.wheel-option')].map(names)
  wheel(root)
  key(column, 'ArrowDown')
  key(column, 'Home')
  assert.deepEqual([root, column, ...all('.wheel-option')].map(names), before)
  assert.equal(root.getAttribute('style'), null)
  assert.equal(column.getAttribute('style'), null)
  assert.equal(column.getAttribute('aria-activedescendant'), null)
})

test('wheel: without scrollend a column has settled when it has stood still', (t) => {
  const page = dom(markup(interval))
  // A browser without the event: `'onscrollend' in window` is false there.
  const real = page.window
  ;(globalThis as any).window = new Proxy(real, {
    has: (target, name) => name !== 'onscrollend' && name in target,
    get: (target, name) => {
      const value = (target as any)[name]
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const root = page.one('.wheel')
  const column = page.one('.wheel-column')
  lay(page, column)
  const changes: string[] = []
  root.addEventListener('change', (event: any) => changes.push(event.detail.value))
  const selected = () => page.all('[aria-selected="true"]').map(each => each.textContent)
  const detach = wheel(root)
  t.mock.timers.tick(500)
  assert.deepEqual(changes, [], 'the scroll to the chosen option is not a change')

  column.scrollTop = 3 * row
  column.dispatchEvent(new real.Event('scroll'))
  column.dispatchEvent(new real.Event('scrollend'))
  assert.deepEqual(selected(), ['Week'], 'scrollend is not listened for')
  t.mock.timers.tick(100)
  column.scrollTop = 4 * row
  column.dispatchEvent(new real.Event('scroll'))
  t.mock.timers.tick(100)
  assert.deepEqual(selected(), ['Week'], 'each scroll starts the wait again')
  t.mock.timers.tick(20)
  assert.deepEqual(selected(), ['Year'])
  assert.deepEqual(changes, ['Year'])

  column.scrollTop = 0
  column.dispatchEvent(new real.Event('scroll'))
  detach()
  t.mock.timers.tick(500)
  assert.deepEqual(selected(), ['Year'], 'detach forgets a column that had not settled')
})

test('wheel: a column that is laid out again is brought back to its chosen option', (t) => {
  const observers: { callback: (entries: any[]) => void, observed: any[], connected: boolean }[] = []
  ;(globalThis as any).ResizeObserver = class {
    record: (typeof observers)[number]
    constructor(callback: (entries: any[]) => void) { observers.push(this.record = { callback, observed: [], connected: true }) }
    observe(target: any) { this.record.observed.push(target) }
    disconnect() { this.record.connected = false }
  }
  t.after(() => { delete (globalThis as any).ResizeObserver })
  const { root, column, sent, changes, selected } = setup()
  const detach = wheel(root)
  assert.equal(observers.length, 1)
  assert.deepEqual(observers[0].observed, [column])
  // A popover that closed and opened again: the column is back at its top.
  column.scrollTop = 0
  sent.length = 0
  observers[0].callback([{ target: column }])
  assert.deepEqual(sent, [{ top: 2 * row, behavior: 'instant' }])
  assert.equal(column.scrollTop, 2 * row)
  assert.deepEqual(selected(), ['Week'])
  assert.deepEqual(changes, [])
  detach()
  assert.equal(observers[0].connected, false)
})

test('wheel: detach removes the listeners', () => {
  const { root, column, all, key, click, sent, changes, selected, scroll } = setup()
  const detach = wheel(root)
  detach()
  sent.length = 0
  scroll(4 * row)
  assert.deepEqual(selected(), ['Week'])
  for (const name of ['ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']) assert.equal(key(column, name), false, name)
  click(all('.wheel-option')[0])
  assert.deepEqual(sent, [])
  assert.deepEqual(changes, [])
  detach()
})

test('wheel: attaching twice leaves one behavior', () => {
  const { root, column, key, sent, changes } = setup()
  const first = wheel(root)
  const second = wheel(root)
  sent.length = 0
  key(column, 'ArrowDown')
  assert.equal(sent.length, 1)
  assert.deepEqual(changes.map(change => change.value), ['Month'])
  first()
  key(column, 'ArrowDown')
  assert.deepEqual(changes.map(change => change.value), ['Month', 'Year'], 'the first detach is spent; the second behavior still listens')
  second()
  assert.equal(key(column, 'ArrowUp'), false)
})

test('wheel: a root without a column, and a column without options, attach without error', () => {
  const { one, key } = dom('<div class="wheel" id="empty"></div><div class="wheel" id="bare"><div class="wheel-column" role="listbox" aria-label="None" tabindex="0"></div></div>')
  wheel(one('#empty'))()
  const detach = wheel(one('#bare'))
  assert.equal(key(one('#bare .wheel-column'), 'ArrowDown'), true)
  one('#bare .wheel-column').dispatchEvent(new window.Event('scrollend') as any)
  detach()
})
