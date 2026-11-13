import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { range } from '../../behaviors/range.js'

/**
 * The range's behavior keeps its two native inputs apart. Their keys and dragging are the platform's, and
 * happy-dom moves neither: the tests set a value the way a key or the pointer does, the value and then an
 * `input`, and read what the behavior left in the input by the time the event reaches it.
 */
const markup = (start = '120', end = '380', step = '10') => `<div class="range" role="group" aria-label="Price">
  <input type="range" class="slider range-start" min="0" max="500" step="${step}" value="${start}" aria-label="Lowest price">
  <input type="range" class="slider range-end" min="0" max="500" step="${step}" value="${end}" aria-label="Highest price">
</div>`

function setup(options?: { distance?: number }, html = markup()) {
  const page = dom(html)
  const root = page.one('.range')
  const start = page.one<HTMLInputElement>('.range-start')
  const end = page.one<HTMLInputElement>('.range-end')
  /** What a listener on each input reads, in order. */
  const heard: string[] = []
  for (const input of [start, end]) input.addEventListener('input', () => heard.push(`${start.value}-${end.value}`))
  const detach = range(root, options)
  return { ...page, root, start, end, heard, detach }
}

test('range: a thumb moves freely while the two stay apart', () => {
  const { start, end, type, heard, errors } = setup({ distance: 50 })
  type(start, '200')
  type(end, '300')
  assert.deepEqual([start.value, end.value], ['200', '300'])
  assert.deepEqual(heard, ['200-380', '200-300'])
  assert.deepEqual(errors, [])
})

test('range: the start stops at the distance below the end, and the end does not move', () => {
  const { start, end, type, heard } = setup({ distance: 50 })
  type(start, '360')
  assert.deepEqual([start.value, end.value], ['330', '380'])
  assert.deepEqual(heard, ['330-380'], 'the input hears the corrected value')
  type(start, '500')
  assert.equal(start.value, '330', 'past the other thumb too')
})

test('range: the end stops at the distance above the start', () => {
  const { start, end, type } = setup({ distance: 50 })
  type(end, '130')
  assert.deepEqual([start.value, end.value], ['120', '170'])
  type(end, '0')
  assert.equal(end.value, '170')
})

test('range: without a distance the thumbs may meet but not cross', () => {
  const { start, end, type } = setup()
  type(start, '380')
  assert.equal(start.value, '380', 'they meet')
  type(start, '420')
  assert.equal(start.value, '380', 'they do not cross')
  type(end, '100')
  assert.equal(end.value, '380')
})

test('range: a listener around the range reads the corrected pair', () => {
  const { root, start, end, type } = setup({ distance: 40 })
  const pairs: string[] = []
  root.addEventListener('input', () => pairs.push(`${start.value}-${end.value}`))
  type(end, '140')
  assert.deepEqual(pairs, ['120-160'])
})

test('range: the keys and the pointer stay the inputs\' own', () => {
  const { start, key, pointer } = setup({ distance: 50 })
  assert.equal(key(start, 'ArrowRight'), false, 'ArrowRight is left to the input')
  assert.equal(key(start, 'Home'), false)
  assert.equal(pointer(start, 'pointerdown'), true, 'a press is not prevented')
})

test('range: an event of something else in the group is left alone', () => {
  const { root, start, end, document } = setup({ distance: 50 })
  const other = document.createElement('input')
  root.append(other)
  other.dispatchEvent(new (globalThis as any).Event('input', { bubbles: true }))
  assert.deepEqual([start.value, end.value], ['120', '380'])
})

test('range: detach removes the listener, and attaching twice keeps one', () => {
  const { root, start, type, detach } = setup({ distance: 50 })
  range(root, { distance: 100 })
  type(start, '300')
  assert.equal(start.value, '280', 'the second attachment replaced the first')
  detach()
  type(start, '300')
  assert.equal(start.value, '280', 'the first detach belongs to the replaced attachment')
  range(root, { distance: 100 })()
  type(start, '400')
  assert.equal(start.value, '400', 'detached, the thumbs may cross again')
})
