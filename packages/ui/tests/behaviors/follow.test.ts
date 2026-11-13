import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { follow } from '../../behaviors/follow.js'

/**
 * The follow behavior keeps the end of a scroll area in view. happy-dom has no layout, so a test gives the
 * region the geometry a browser would: a view 200 tall over content whose height the test sets, a scrollTop
 * that stays between 0 and the end, and rows that stand where the content above them puts them. The keys
 * scroll natively; a test makes the scroll they would make and dispatches its `scroll` event.
 */
const rows = Array.from({ length: 25 }, (_, index) => `<li>Row ${index + 1}</li>`).join('')
const markup = (latest = '<button type="button" class="btn btn-sm btn-pill scroll-area-latest" hidden>Jump to latest</button>') => `<div class="scroll-area" tabindex="0" role="log" aria-label="Build log">
  <ol class="rows">${rows}</ol>
  ${latest}
</div>`

/** A mutation observer's callback runs after the change, in a microtask. */
const settle = () => new Promise(resolve => setTimeout(resolve, 0))

/** happy-dom reports what a listener throws on the window; a test must not pass over it. */
const pages: { errors: unknown[] }[] = []
afterEach(() => {
  for (const page of pages.splice(0)) assert.deepEqual(page.errors, [], 'a listener threw')
})

/** 25 rows of 40 in a view 200 tall, 100 from the top of the window. */
function setup(html = markup()) {
  const page = dom(html)
  pages.push(page)
  const root = page.one<HTMLElement>('.scroll-area')
  const list = page.one<HTMLElement>('.rows')
  const view = 200
  const row = 40
  let content = list.children.length * row
  let top = 0
  const max = () => Math.max(0, content - view)
  Object.defineProperty(root, 'clientHeight', { get: () => view, configurable: true })
  Object.defineProperty(root, 'scrollHeight', { get: () => content, configurable: true })
  Object.defineProperty(root, 'scrollTop', { get: () => top, set: (value: number) => { top = Math.min(max(), Math.max(0, value)) }, configurable: true })
  const scrolledTo: unknown[] = []
  root.scrollTo = ((options: ScrollToOptions) => { scrolledTo.push(options.behavior); root.scrollTop = options.top! }) as any
  const box = (y: number, height: number) => ({ top: y, bottom: y + height, left: 0, right: 300, width: 300, height, x: 0, y }) as DOMRect
  root.getBoundingClientRect = () => box(100, view)
  list.getBoundingClientRect = () => box(100 - top, content)
  // Each row stands where the rows above it put it, and the region's scrollTop moves them all.
  const offsets = new Map<Element, [offset: number, height: number]>()
  const place = (element: Element, offset: number, height = row) => {
    offsets.set(element, [offset, height])
    element.getBoundingClientRect = () => box(100 + offsets.get(element)![0] - top, offsets.get(element)![1])
  }
  ;[...list.children].forEach((child, index) => place(child, index * row))
  const heard: string[] = []
  root.addEventListener('change', (event) => { if (event.target === root) heard.push('change') })
  /** The reader scrolls: the region moves and says so. */
  const scroll = (to: number) => {
    root.scrollTop = to
    root.dispatchEvent(new page.window.Event('scroll'))
  }
  const item = (text: string) => {
    const element = page.document.createElement('li')
    element.textContent = text
    return element
  }
  /** A row arrives at the end. */
  const append = (height = 120) => {
    const element = item('More')
    place(element, content, height)
    content += height
    list.append(element)
  }
  /**
   * An older row is inserted at the start, and every row below it moves down. A browser that anchors moves
   * the region by as much, before anything can measure it.
   */
  const prepend = (height = 120, anchors = false) => {
    for (const [element, [offset, size]] of offsets) offsets.set(element, [offset + height, size])
    const element = item('Older')
    place(element, 0, height)
    content += height
    if (anchors) top += height
    list.prepend(element)
  }
  /** The last row goes, and a region at its end is pulled back. */
  const shrink = () => {
    const last = list.lastElementChild!
    content -= offsets.get(last)![1]
    last.remove()
    root.scrollTop = top
  }
  const latest = () => page.all<HTMLButtonElement>('.scroll-area-latest')[0]
  return { ...page, root, list, heard, scroll, append, prepend, shrink, latest, scrolledTo, top: () => top, max }
}

test('follow: attaching scrolls the region to its end, follows it, and keeps the way back hidden', () => {
  const { root, latest, top, max, heard } = setup()
  const handle = follow(root)
  assert.equal(top(), max())
  assert.equal(handle.value, true)
  assert.equal(latest().hidden, true)
  assert.deepEqual(heard, [], 'attaching says nothing')
})

test('follow: content that arrives at the end is followed', async () => {
  const { root, append, top, max } = setup()
  follow(root)
  append()
  await settle()
  assert.equal(top(), 920)
  assert.equal(top(), max())
  root.querySelector('li:last-child')!.textContent += ' and a streamed word'
  await settle()
  assert.equal(top(), max(), 'a word added to a row is content too')
})

test('follow: scrolling toward the start stops following, shows the way back and says change', async () => {
  const { root, scroll, append, latest, top, heard } = setup()
  const handle = follow(root)
  scroll(500)
  assert.equal(handle.value, false)
  assert.equal(latest().hidden, false)
  assert.deepEqual(heard, ['change'])
  append()
  await settle()
  assert.equal(top(), 500, 'what arrives does not move the reader')
  scroll(450)
  assert.deepEqual(heard, ['change'], 'it says change once')
})

test('follow: ArrowUp, PageUp and Home are the browser\'s; the scroll they make stops following', () => {
  for (const name of ['ArrowUp', 'PageUp', 'Home']) {
    const { root, key, scroll, latest, max } = setup()
    const handle = follow(root)
    assert.equal(key(root, name), false, `${name} is left to the browser`)
    scroll(name === 'Home' ? 0 : name === 'PageUp' ? max() - 180 : max() - 40)
    assert.equal(handle.value, false, name)
    assert.equal(latest().hidden, false, name)
  }
})

test('follow: End is the browser\'s; back at the end the region follows again', async () => {
  const { root, key, scroll, append, latest, top, max, heard } = setup()
  const handle = follow(root)
  scroll(300)
  assert.equal(key(root, 'End'), false)
  scroll(max())
  assert.equal(handle.value, true)
  assert.equal(latest().hidden, true)
  assert.deepEqual(heard, ['change', 'change'])
  append()
  await settle()
  assert.equal(top(), max())
})

test('follow: a few pixels short of the end is still the end', () => {
  const { root, scroll, max } = setup()
  const handle = follow(root)
  scroll(300)
  scroll(max() - 4)
  assert.equal(handle.value, true)
})

test('follow: a wheel turned toward the start stops following before the region moves', async () => {
  const { root, append, top, window } = setup()
  const handle = follow(root)
  root.dispatchEvent(new window.WheelEvent('wheel', { deltaY: 40 }))
  assert.equal(handle.value, true, 'toward the end changes nothing')
  root.dispatchEvent(new window.WheelEvent('wheel', { deltaY: -40 }))
  assert.equal(handle.value, false)
  append()
  await settle()
  assert.equal(top(), 800, 'what arrives meanwhile does not pull the reader back')
})

test('follow: a finger dragging the content down stops following', () => {
  const { root, window } = setup()
  const handle = follow(root)
  const touch = (type: string, clientY: number) => {
    const event = new window.Event(type) as any
    event.touches = [{ clientY }]
    root.dispatchEvent(event)
  }
  touch('touchstart', 300)
  touch('touchmove', 280)
  assert.equal(handle.value, true, 'dragging up scrolls toward the end')
  touch('touchmove', 330)
  assert.equal(handle.value, false)
})

test('follow: the way back scrolls to the end, follows again and gives the region the focus it had', async () => {
  const { root, scroll, click, latest, top, max, scrolledTo, heard, append, document } = setup()
  const handle = follow(root)
  scroll(200)
  latest().focus()
  assert.equal(document.activeElement, latest())
  click(latest())
  assert.equal(handle.value, true)
  assert.equal(latest().hidden, true)
  assert.equal(top(), max())
  assert.deepEqual(scrolledTo, ['smooth'])
  assert.equal(document.activeElement, root, 'the hidden button does not keep the focus')
  assert.deepEqual(heard, ['change', 'change'])
  append()
  await settle()
  assert.equal(top(), max())
})

test('follow: under reduced motion the way back jumps', () => {
  const { root, scroll, click, latest, scrolledTo, window } = setup()
  ;(window as any).matchMedia = (query: string) => ({ matches: query.includes('reduce') })
  ;(globalThis as any).matchMedia = (window as any).matchMedia
  try {
    follow(root)
    scroll(200)
    click(latest())
    assert.deepEqual(scrolledTo, [])
  } finally { delete (globalThis as any).matchMedia }
})

test('follow: setting value follows or stops, and says nothing', () => {
  const { root, scroll, latest, top, max, heard } = setup()
  const handle = follow(root)
  scroll(100)
  heard.length = 0
  handle.value = true
  assert.equal(top(), max())
  assert.equal(latest().hidden, true)
  handle.value = false
  assert.equal(handle.value, false)
  assert.equal(latest().hidden, false)
  assert.deepEqual(heard, [])
})

test('follow: content that shrinks pulls the region back without stopping it', async () => {
  const { root, shrink, max, top } = setup()
  const handle = follow(root)
  shrink()
  root.dispatchEvent(new Event('scroll'))
  await settle()
  assert.equal(handle.value, true)
  assert.equal(top(), max())
})

test('follow: where the browser does not anchor, rows inserted above keep the reader\'s place', async () => {
  const { root, scroll, prepend, top, one } = setup()
  follow(root)
  scroll(400)
  const reading = one('li:nth-child(11)').getBoundingClientRect().top
  prepend(120)
  await settle()
  assert.equal(top(), 520, 'the region moved by what the rows above added')
  assert.equal(one('li:nth-child(12)').getBoundingClientRect().top, reading, 'the row being read stands where it stood')
  prepend(80)
  await settle()
  assert.equal(top(), 600, 'and again, from the place it kept')
})

test('follow: a line kept out of scroll anchoring is never what holds the place', async () => {
  const html = markup().replace('<ol class="rows">', '<p class="loading" style="overflow-anchor: none">Earlier messages load as you scroll up</p><ol class="rows">')
  const { root, scroll, prepend, top, one } = setup(html)
  // The line stands over the view's top edge, above the rows.
  one('.loading').getBoundingClientRect = () => ({ top: 90, bottom: 110, left: 0, right: 300, width: 300, height: 20, x: 0, y: 90 }) as DOMRect
  follow(root)
  scroll(4)
  prepend(120)
  await settle()
  assert.equal(top(), 124, 'the first row held its place, not the line')
})

test('follow: where the browser anchors, the behavior finds nothing moved and leaves the region', async () => {
  const { root, scroll, prepend, top } = setup()
  follow(root)
  scroll(400)
  prepend(120, true)
  await settle()
  assert.equal(top(), 520, 'moved once, by the browser')
})

test('follow: a region inside the region keeps its own way back', () => {
  const inner = '<div class="scroll-area" role="log" aria-label="Inner"><button type="button" class="btn scroll-area-latest" hidden>Inner latest</button></div>'
  const { root, scroll, all } = setup(markup(`${inner}<button type="button" class="btn scroll-area-latest" hidden>Jump to latest</button>`))
  follow(root)
  scroll(100)
  const [own, outer] = all<HTMLButtonElement>('.scroll-area-latest')
  assert.equal(own.hidden, true, 'the inner region\'s button is not this one\'s')
  assert.equal(outer.hidden, false)
})

test('follow: a region without a way back still follows', async () => {
  const { root, append, scroll, top, max } = setup(markup(''))
  const handle = follow(root)
  append()
  await settle()
  assert.equal(top(), max())
  scroll(100)
  assert.equal(handle.value, false)
})

test('follow: detach stops following and gives the button its hidden back', async () => {
  const { root, append, scroll, latest, click, top, heard } = setup()
  const detach = follow(root)
  scroll(100)
  assert.equal(latest().hidden, false)
  detach()
  assert.equal(latest().hidden, true)
  append()
  await settle()
  assert.equal(top(), 100)
  scroll(800)
  click(latest())
  assert.deepEqual(heard, ['change'], 'only what happened while attached')
})

test('follow: attaching twice detaches the first', () => {
  const { root, scroll, heard } = setup()
  follow(root)
  follow(root)
  scroll(100)
  assert.deepEqual(heard, ['change'])
})
