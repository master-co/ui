import { test } from 'node:test'
import assert from 'node:assert/strict'
import { check, createIndex, parse } from '../check/index.js'
import { contracts } from './support.ts'

/** The checker's own rules, each with markup that breaks it and markup that must be left alone. */
const index = createIndex(contracts())
const codes = (source: string, options = {}) => check(source, index, options).map(diagnostic => diagnostic.code)

test('a modifier needs its base on the same element', () => {
  assert.deepEqual(codes('<button class="btn-primary">Save</button>'), ['missing-base'])
  assert.deepEqual(codes('<button class="btn btn-primary">Save</button>'), [])
})

test('a part belongs inside its root', () => {
  assert.deepEqual(codes('<dialog class="dialog" aria-label="Rename"></dialog><h2 class="dialog-title">Rename</h2>'), ['outside-root'])
  assert.deepEqual(codes('<dialog class="dialog" aria-label="Rename"><h2 class="dialog-title">Rename</h2></dialog>'), [])
})

test('a part whose root is not in the file is a fragment and is left alone', () => {
  assert.deepEqual(codes('<h2 class="dialog-title">Rename</h2>'), [])
})

test('two modifiers of one group do not share an element', () => {
  assert.deepEqual(codes('<button class="btn btn-sm btn-lg">Save</button>'), ['exclusive'])
})

test('a class goes on the elements its contract names', () => {
  assert.deepEqual(codes('<div class="dialog" aria-label="Rename"></div>'), ['element'])
})

test('a required attribute is reported when it is missing or has another value', () => {
  assert.deepEqual(codes('<label>Alerts <input class="switch" type="checkbox"></label>'), ['attribute'])
  assert.deepEqual(codes('<label>Alerts <input class="switch" type="checkbox" role="switch"></label>'), [])
})

test('an element that needs a name gets one from text, an attribute or a label', () => {
  assert.deepEqual(codes('<button type="button" class="btn btn-square"><svg class="icon"></svg></button>'), ['label'])
  assert.deepEqual(codes('<button type="button" class="btn btn-square" aria-label="Close"><svg class="icon"></svg></button>'), [])
  assert.deepEqual(codes('<label for="volume">Volume</label><input id="volume" type="range" class="slider">'), [])
})

test('a class that only looks like one of ours is a warning, an error when strict, and nothing when the project knows it', () => {
  assert.deepEqual(check('<button class="btn btn-outline">Save</button>', index).map(({ code, severity }) => [code, severity]), [['unknown-class', 'warning']])
  assert.deepEqual(check('<button class="btn btn-outline">Save</button>', index, { strict: true }).map(({ severity }) => severity), ['error'])
  assert.deepEqual(codes('<button class="btn btn-outline">Save</button>', { knows: (name: string) => name === 'btn-outline' }), [])
})

test('JSX: className is read, an expression is not guessed at, and a generic is not a tag', () => {
  assert.deepEqual(codes('const state = useState<string>("")\nreturn <button className="btn-primary">Save</button>'), ['missing-base'])
  assert.deepEqual(codes('<button className={clsx("btn-primary", props.className)}>Save</button>'), [])
  assert.deepEqual(codes('<Button className="btn-square" />'), [], 'a component may add the base itself')
  assert.deepEqual(codes('<button {...props} className="btn btn-square" />'), [])
})

test('Svelte, Vue and Astro class directives make the element dynamic', () => {
  assert.deepEqual(codes('<button class="btn" class:btn-primary={primary}>Save</button>'), [])
  assert.deepEqual(codes('<button :class="{ \'btn-primary\': primary }">Save</button>'), [])
  assert.deepEqual(codes('<button class:list={["btn-primary", extra]}>Save</button>'), [])
})

test('comments, scripts and styles are not markup', () => {
  assert.deepEqual(codes('<!-- <button class="btn-primary"> --><script>if (a < b) { "<div class=\\"dialog\\">" }</script><style>.btn-primary { color: red }</style>'), [])
})

test('positions point at the element', () => {
  const [diagnostic] = check('<main>\n  <button class="btn-primary">Save</button>\n</main>', index)
  assert.deepEqual([diagnostic.line, diagnostic.column], [2, 3])
})

test('the parser keeps the tree', () => {
  const [list, item] = parse('<ul class="nav"><li><a class="nav-item" href="/">Home</a></li></ul>')
  assert.equal(list.tag, 'ul')
  assert.equal(item.parent, list)
  assert.equal(list.text, true)
})
