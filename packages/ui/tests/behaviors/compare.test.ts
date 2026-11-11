import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { compare } from '../../behaviors/compare.js'

/**
 * The handle of a comparison is a native range input, so the keys are the platform's. The behavior does one
 * thing: it copies the input's value into --compare-position on the root.
 */
const markup = (range = 'min="0" max="100" value="50"') => `<figure class="compare">
  <img class="compare-before" src="/photos/valley-raw.jpg" alt="The valley before grading: grey and flat" width="800" height="500">
  <img class="compare-after" src="/photos/valley-graded.jpg" alt="The valley after grading: warm light on the ridge">
  <input type="range" class="compare-range" ${range} aria-label="Show more of the graded picture">
</figure>`

function setup(range?: string) {
  const page = dom(markup(range))
  const root = page.one('.compare')
  const input = page.one('.compare-range')
  const position = () => root.style.getPropertyValue('--compare-position')
  return { ...page, root, input, position }
}

test('compare: the line follows the handle on input', () => {
  const { root, input, type, position } = setup()
  compare(root)
  type(input, '72')
  assert.equal(position(), '72%')
  type(input, '0')
  assert.equal(position(), '0%')
  type(input, '100')
  assert.equal(position(), '100%')
})

test('compare: the line starts where the handle is', () => {
  const { root, position } = setup('min="0" max="100" value="40"')
  compare(root)
  assert.equal(position(), '40%')
})

test('compare: the position is the value\'s share of the input\'s range', () => {
  const { root, input, type, position } = setup('min="10" max="60" value="35"')
  compare(root)
  assert.equal(position(), '50%')
  type(input, '60')
  assert.equal(position(), '100%')
  type(input, '10')
  assert.equal(position(), '0%')
})

test('compare: an input without min and max runs from 0 to 100', () => {
  const { root, input, type, position } = setup('value="25"')
  compare(root)
  assert.equal(position(), '25%')
  type(input, '80')
  assert.equal(position(), '80%')
})

test('compare: the keys stay the native input\'s, and nothing but --compare-position is set', () => {
  const { root, input, key, type } = setup()
  const before = input.getAttributeNames().sort()
  compare(root)
  for (const name of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']) assert.equal(key(input, name), false, name)
  type(input, '30')
  assert.equal(root.getAttribute('style'), '--compare-position: 30%;')
  assert.equal(root.getAttribute('class'), 'compare')
  assert.deepEqual(input.getAttributeNames().sort(), before)
})

test('compare: a disabled handle keeps the line where it is', () => {
  const { root, position } = setup('min="0" max="100" value="50" disabled')
  compare(root)
  assert.equal(position(), '50%')
})

test('compare: detach removes the listener', () => {
  const { root, input, type, position } = setup()
  const detach = compare(root)
  type(input, '20')
  detach()
  type(input, '90')
  assert.equal(position(), '20%')
  detach()
})

test('compare: attaching twice leaves one behavior', () => {
  const { root, input, type, position } = setup()
  let writes = 0
  const first = compare(root)
  const second = compare(root)
  const setProperty = root.style.setProperty.bind(root.style)
  root.style.setProperty = (...values: [string, string]) => { writes++; setProperty(...values) }
  type(input, '64')
  assert.equal(position(), '64%')
  assert.equal(writes, 1)
  first()
  type(input, '65')
  assert.equal(position(), '65%', 'the first detach is spent; the second behavior still listens')
  second()
  type(input, '66')
  assert.equal(position(), '65%')
})

test('compare: a root without a handle attaches nothing', () => {
  const { one } = dom('<figure class="compare"><img class="compare-before" alt=""></figure>')
  const root = one('.compare')
  const detach = compare(root)
  assert.equal(root.getAttribute('style'), null)
  detach()
})
