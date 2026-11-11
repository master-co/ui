import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dom } from './dom.ts'
import * as behaviors from '../../behaviors/index.js'

/**
 * The index is the one door to the behaviors: every reference script a contract names is exported from it,
 * and `attach` finds each pattern by its root class.
 */
const directory = (name: string) => new URL(`../../${name}/`, import.meta.url)
const contracts = readdirSync(directory('components'))
  .filter(file => file.endsWith('.json'))
  .map(file => JSON.parse(readFileSync(new URL(file, directory('components')), 'utf8')) as { name: string, behavior?: string, example?: string })
const driven = contracts.filter(contract => contract.behavior)
const exported = behaviors as unknown as Record<string, unknown>

test('index: there are contracts that name a behavior', () => {
  assert.ok(driven.length >= 11, `only ${driven.length} contracts name a behavior`)
})

for (const contract of driven) {
  test(`index: ${contract.name}.json names a behavior that has a file and an export`, () => {
    assert.ok(existsSync(new URL(`${contract.behavior}.js`, directory('behaviors'))), `behaviors/${contract.behavior}.js is missing`)
    assert.equal(typeof exported[contract.behavior!], 'function', `index.js does not export ${contract.behavior}`)
  })
}

test('index: every behavior file is exported under its own name', async () => {
  const files = readdirSync(directory('behaviors')).filter(file => file.endsWith('.js') && !['index.js', 'internal.js'].includes(file))
  for (const file of files) {
    const name = file.replace(/\.js$/, '')
    const module = await import(new URL(file, directory('behaviors')).href)
    assert.equal(typeof module[name], 'function', `${file} does not export ${name}`)
    assert.equal(exported[name], module[name], `index.js does not export ${name} from ${file}`)
  }
  assert.equal(typeof exported.attach, 'function')
})

const page = `<div class="splitter" style="--splitter-size: 36%">
  <div class="splitter-pane">Files</div>
  <div class="splitter-handle" role="separator" tabindex="0" aria-label="Resize the file list" aria-valuenow="36" aria-valuemin="15" aria-valuemax="85"></div>
  <div class="splitter-pane">Editor</div>
</div>
<div class="wheel" role="group" aria-label="Repeat every">
  <div class="wheel-column" role="listbox" aria-label="Interval" tabindex="0">
    <div class="wheel-option" role="option" aria-selected="true">Hour</div>
    <div class="wheel-option" role="option" aria-selected="false">Day</div>
  </div>
</div>
<figure class="compare">
  <img class="compare-before" src="/photos/valley-raw.jpg" alt="Before" width="800" height="500">
  <img class="compare-after" src="/photos/valley-graded.jpg" alt="After">
  <input type="range" class="compare-range" min="0" max="100" value="50" aria-label="Show more of the graded picture">
</figure>`

test('index: attach finds a splitter, a wheel and a comparison, and its return detaches them all', () => {
  const { document, one, key, type } = dom(page)
  const handle = one('.splitter-handle')
  const column = one('.wheel-column')
  const range = one('.compare-range')
  const position = () => one('.compare').style.getPropertyValue('--compare-position')

  const detach = behaviors.attach(document as unknown as Document)
  assert.equal(typeof detach, 'function')
  assert.equal(key(handle, 'ArrowRight'), true)
  assert.equal(handle.getAttribute('aria-valuenow'), '41')
  assert.equal(key(column, 'ArrowDown'), true)
  type(range, '70')
  assert.equal(position(), '70%')

  detach()
  assert.equal(key(handle, 'ArrowRight'), false)
  assert.equal(handle.getAttribute('aria-valuenow'), '41')
  assert.equal(key(column, 'ArrowDown'), false)
  type(range, '20')
  assert.equal(position(), '70%')
})

test('index: attach reads the document when it is given nothing', () => {
  const { one, key } = dom(page)
  const detach = behaviors.attach()
  assert.equal(key(one('.splitter-handle'), 'End'), true)
  detach()
  assert.equal(key(one('.splitter-handle'), 'Home'), false)
})

test('index: attach takes an element, and attaches to it when it is a pattern itself', () => {
  const { one, key } = dom(page)
  const detach = behaviors.attach(one('.splitter'))
  assert.equal(key(one('.splitter-handle'), 'ArrowRight'), true)
  assert.equal(key(one('.wheel-column'), 'ArrowDown'), false, 'a pattern outside the root is not attached')
  detach()
  assert.equal(key(one('.splitter-handle'), 'ArrowRight'), false)
})

test('index: attach leaves the list of a combobox and of a command palette to them', () => {
  const { document, one, key } = dom(`<div class="combobox"><div class="listbox" role="listbox" tabindex="0" id="inside" aria-label="Inside"><div role="option">One</div><div role="option">Two</div></div></div>
<div class="command"><div class="listbox" role="listbox" tabindex="0" id="palette" aria-label="Palette"><div role="option">One</div><div role="option">Two</div></div></div>
<div class="listbox" role="listbox" tabindex="0" id="alone" aria-label="Alone"><div role="option">One</div><div role="option">Two</div></div>`)
  const detach = behaviors.attach(document as unknown as Document)
  assert.equal(key(one('#alone'), 'ArrowDown'), true, 'a listbox that stands alone has its keys')
  assert.equal(key(one('#inside'), 'ArrowDown'), false)
  assert.equal(key(one('#palette'), 'ArrowDown'), false)
  detach()
  assert.equal(key(one('#alone'), 'ArrowDown'), false)
})

test('index: attach takes the example of every contract that names a behavior', () => {
  const { document } = dom(driven.map(contract => contract.example ?? '').join('\n'))
  const detach = behaviors.attach(document as unknown as Document)
  detach()
})
