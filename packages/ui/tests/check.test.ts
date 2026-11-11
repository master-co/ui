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

test('JSX: attribute names are read as HTML reads them', () => {
  const handle = (attribute: string) => `<div className="splitter"><div className="splitter-handle" role="separator" ${attribute} aria-label="Resize" aria-valuenow={size}></div></div>`
  assert.deepEqual(codes(handle('tabIndex={0}')), [])
  assert.deepEqual(codes(handle('tabIndex="0"')), [])
  assert.deepEqual(codes(handle('tabIndex="2"')), ['attribute'])
  assert.deepEqual(codes(handle('')), ['attribute'])
})

test('Vue: a bound attribute is there, with a value that is not guessed at', () => {
  assert.deepEqual(codes('<div class="splitter"><div class="splitter-handle" role="separator" :tabindex="disabled ? -1 : 0" :aria-label="label" v-bind:aria-valuenow="size"></div></div>'), [])
  assert.deepEqual(codes('<button type="button" class="btn btn-square" :aria-label="label"><svg class="icon"></svg></button>'), [])
})

test('markup a script holds, or a template renders elsewhere, is not placed', () => {
  const tree = (rows: string) => `const rows = (list) => list.map(node => (\n  <li><div className="tree-item">{node.label}</div></li>\n))\n${rows}`
  assert.deepEqual(codes(tree('return <ul className="tree">{rows(nodes)}</ul>')), [], 'a part in a function, its root in the return')
  assert.deepEqual(codes('const option = cond ? <a className="listbox-option" role="option">A</a> : <div className="listbox-option" role="option">B</div>\nreturn <div className="listbox" role="listbox" aria-label="Commands">{option}</div>'), [])
  assert.deepEqual(codes('{#snippet row(node)}<li><div class="tree-item">{node.label}</div></li>{/snippet}\n<ul class="tree">{@render row(root)}</ul>'), [], 'a Svelte snippet')
  assert.deepEqual(codes('return <button className="btn-primary">Save</button>'), ['missing-base'], 'what does not depend on its place is still checked')
  assert.deepEqual(codes('<dialog class="dialog" aria-label="Rename"></dialog>\n<h2 class="dialog-title">Rename</h2>'), ['outside-root'], 'markup in a document is placed')
})

test('a class with a computed part is not guessed at', () => {
  assert.deepEqual(codes('<dialog open class="toast toast-{status}" aria-label="Saved"></dialog>', { strict: true }), [])
  assert.deepEqual(codes('<dialog open className={`toast toast-${status}`} aria-label="Saved"></dialog>', { strict: true }), [])
  assert.deepEqual(codes('<dialog open :class="`toast toast-${status}`" aria-label="Saved"></dialog>', { strict: true }), [])
  assert.deepEqual(codes('<dialog open class="toast toast-loud {extra}" aria-label="Saved"></dialog>', { strict: true }), ['unknown-class'], 'a whole word beside an expression is still read')
})

test('classes an expression chooses between are not counted together', () => {
  assert.deepEqual(codes('<dialog open class="toast" :class="{ \'toast-info\': status === \'info\', \'toast-danger\': status === \'danger\' }" aria-label="Saved"></dialog>'), [])
  assert.deepEqual(codes('<button className={large ? "btn btn-lg" : "btn btn-sm"}>Save</button>'), [])
  assert.deepEqual(codes('<button class="btn btn-sm btn-lg">Save</button>'), ['exclusive'])
})

test('Vue: v-bind without an argument spreads attributes, as {...props} does', () => {
  assert.deepEqual(codes('<button type="button" class="btn btn-square" v-bind="$attrs"><svg class="icon"></svg></button>'), [])
})

test('Svelte: what a snippet holds is rendered where it is asked for, wherever it is written', () => {
  const snippet = '{#snippet option(item)}\n  <div class="listbox-option" role="option">{item.label}</div>\n{/snippet}'
  assert.deepEqual(codes(`<dialog class="dialog command" aria-label="Commands">\n${snippet}\n<div class="listbox command-list" role="listbox" aria-label="Commands">{@render option(first)}</div></dialog>`), [])
  assert.deepEqual(codes(`<dialog class="dialog command" aria-label="Commands">\n${snippet}\n</dialog><div class="listbox-option" role="option">Stray</div><div class="listbox" role="listbox" aria-label="Other"></div>`), ['outside-root'], 'after the snippet ends, markup is placed again')
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
