import { test } from 'node:test'
import assert from 'node:assert/strict'
import { beside, check, checkImports, checkMaterial, checkStyles, compoundClasses, createIndex, declared, imports, overlaps, parse, pseudoElement, styles, subject } from '../check/index.js'
import { contracts, imports as libraryFiles, read as readSource } from './support.ts'

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
  const classes = (markup: string) => parse(markup).flatMap(element => element.classes)
  assert.deepEqual(classes('<a className="btn">Talk to sales<ArrowRightIcon className="icon" /></a>'), ['btn', 'icon'], 'a component a word runs into is a tag')
  assert.deepEqual(classes('<p className="text">{rows.map<Row>(row => row.name)}{new Map<string, number>().size}</p>'), ['text'], 'a generic inside an element is still none')
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

/** How a project loads the library: what `imports` reads from one file, and what `checkImports` says of them together. */
const read = (source: string, file: string) => imports(source, file).map(item => `${item.from} ${item.scope} ${item.specifier}`)
const importCodes = (files: Record<string, string>, options = {}) => checkImports(Object.entries(files).map(([file, source]) => ({ file, imports: imports(source, file) })), options)
  .flatMap(result => result.diagnostics.map(diagnostic => `${result.file} ${diagnostic.code}`)).sort()

test('imports reads a stylesheet for the library and for one stylesheet of it', () => {
  assert.deepEqual(read('@import \'@master/css\';\n@import "@master/ui";', 'app.css'), ['css library @master/ui'])
  assert.deepEqual(read('@import \'@master/ui/master.css\' layer(components);', 'app.css'), ['css library @master/ui/master.css'])
  assert.deepEqual(read('@import url("@master/ui/components/button.css") layer(ui) screen;\n@import url(@master/ui/layouts/shell.css);', 'app.css'), ['css stylesheet @master/ui/components/button.css', 'css stylesheet @master/ui/layouts/shell.css'])
  assert.deepEqual(read('@use \'@master/ui/components/menu.css\';', 'app.scss'), ['css stylesheet @master/ui/components/menu.css'])
  assert.deepEqual(imports('\n  @import \'@master/ui\';', 'app.css').map(item => [item.line, item.column]), [[2, 3]])
})

test('imports leaves alone a comment, the theme, a relative path and anything that is not a stylesheet of the library', () => {
  assert.deepEqual(read('/*\n * Import after the preset:\n *   @import \'@master/ui\';\n */\n@import \'./theme.css\';\n@import \'./components/button.css\';', 'master.css'), [], 'the library\'s own entry')
  assert.deepEqual(read('/* @import \'@master/ui\'; @import \'@master/ui/themes/paper.css\'; */\n@theme { --color-brand: red }', 'paper.css'), [])
  assert.deepEqual(read('@import \'@master/ui/theme.css\';\n@import \'@master/ui/themes/paper.css\';\n@import \'@master/ui/standalone.css\';\n@reference \'@master/ui\';\n@import \'@master/ui-kit\';\n@import \'@master/ui/components/button.css.map\';', 'app.css'), [])
  assert.deepEqual(read('// import \'@master/ui/components/button.css\'\n/* import \'@master/ui\' */\nimport source from \'@master/ui/theme.css?raw\'\nimport raw from \'@master/ui/components/button.css?raw\'\nimport { attach } from \'@master/ui/behaviors\'\nimport contract from \'@master/ui/components/button.json\'\nconst entry = import.meta.resolve(\'@master/ui/master.css\')\nconst css = `@import \'@master/ui/components/button.css\';`', 'app.ts'), [])
  assert.deepEqual(read('```css\n@import \'@master/ui\';\n@import \'@master/ui/components/button.css\';\n```', 'content.mdx'), [], 'an example in Markdown')
})

test('imports reads a module, and the script and the style of a template', () => {
  assert.deepEqual(read('import \'@master/ui/components/input.css\'\nimport styles from "@master/ui/components/menu.css"\nawait import(\'@master/ui/layouts/shell.css\')\nrequire(\'@master/ui\')', 'main.ts'), ['script stylesheet @master/ui/components/input.css', 'script stylesheet @master/ui/components/menu.css', 'script stylesheet @master/ui/layouts/shell.css', 'script library @master/ui'])
  assert.deepEqual(read('---\nimport \'@master/ui/components/pager.css\'\n---\n<p>@import \'@master/ui\';</p>\n<style>\n  @import \'@master/ui/components/button.css\';\n</style>', 'Pager.astro'), ['script stylesheet @master/ui/components/pager.css', 'css stylesheet @master/ui/components/button.css'])
  assert.deepEqual(read('<script>\n  import \'@master/ui/components/slider.css\'\n</script>\n<input type="range" class="slider" aria-label="Zoom">', 'Zoom.svelte'), ['script stylesheet @master/ui/components/slider.css'])
  assert.deepEqual(read('<style>@import "@master/ui";</style><pre>@import \'@master/ui/components/button.css\';</pre>', 'index.html'), ['css library @master/ui'])
})

test('one route alone is left alone: the whole library once, or one module import per stylesheet', () => {
  assert.deepEqual(importCodes({ 'app.css': '@import \'@master/css\';\n@import \'@master/ui\';\n@import \'@master/ui/themes/paper.css\';' }), [])
  assert.deepEqual(importCodes({ 'app.css': '@import \'@master/css\';\n@import \'@master/ui/theme.css\';', 'Field.tsx': 'import \'@master/ui/components/input.css\'', 'Save.tsx': 'import \'@master/ui/components/button.css\'\nimport \'@master/ui/components/input.css\'' }), [])
})

test('a stylesheet of the library imported with a CSS @import is reported, with the module import to write', () => {
  const [result] = checkImports([{ file: 'src/app.css', imports: imports('@import \'@master/css\';\n@import \'@master/ui/theme.css\';\n@import \'@master/ui/components/button.css\' layer(components);', 'src/app.css') }])
  assert.equal(result.file, 'src/app.css')
  assert.deepEqual(result.diagnostics.map(({ code, severity, line, column }) => ({ code, severity, line, column })), [{ code: 'stylesheet-import', severity: 'error', line: 3, column: 1 }])
  assert.match(result.diagnostics[0].message, /src\/app\.css/)
  assert.match(result.diagnostics[0].message, /import '@master\/ui\/components\/button\.css'\./)
  assert.deepEqual(importCodes({ 'Card.vue': '<style>\n@import \'@master/ui/components/card.css\';\n</style>' }), ['Card.vue stylesheet-import'])
})

test('the whole library and a stylesheet on its own are two routes, reported where the stylesheet is imported', () => {
  const files = { 'app.css': '@import \'@master/css\';\n@import \'@master/ui\';', 'Field.tsx': 'import \'@master/ui/components/input.css\'\nimport \'@master/ui/components/select.css\'', 'Page.tsx': 'import \'./app.css\'' }
  assert.deepEqual(importCodes(files), ['Field.tsx mixed-imports'])
  const [{ diagnostics }] = checkImports(Object.entries(files).map(([file, source]) => ({ file, imports: imports(source, file) })))
  assert.equal(diagnostics.length, 1, 'once for a file, however many it imports')
  assert.match(diagnostics[0].message, /input\.css.*and 1 more in this file.*app\.css imports all of Master UI/)
  assert.deepEqual(importCodes({ 'main.ts': 'import \'@master/ui\'', 'Field.tsx': 'import \'@master/ui/components/input.css\'' }), ['Field.tsx mixed-imports'], 'the whole library as a module import')
  assert.deepEqual(importCodes({ 'app.css': '@import \'@master/ui\';', 'docs.css': '@import \'@master/ui/components/input.css\';' }), ['docs.css stylesheet-import'], 'a CSS @import of one stylesheet is already an error of its own')
})

test('the project\'s entry stands for the whole library and may import each stylesheet', () => {
  const entry = '/* Master UI, one import per stylesheet. */\n@import \'@master/ui/theme.css\';\n@import \'@master/ui/components/button.css\';\n@import \'./menu.css\';'
  assert.deepEqual(importCodes({ 'ui/index.css': entry, 'app.css': '@import \'./ui/index.css\';' }, { entry: 'ui/index.css' }), [])
  assert.deepEqual(importCodes({ 'ui/index.css': entry }), ['ui/index.css stylesheet-import'], 'only the entry master-ui.json names')
  assert.deepEqual(importCodes({ 'ui/index.css': entry, 'Field.tsx': 'import \'@master/ui/components/input.css\'' }, { entry: 'ui/index.css' }), ['Field.tsx mixed-imports'])
})

test('the whole library imported in two places is a warning', () => {
  const results = checkImports([{ file: 'app.css', imports: imports('@import \'@master/ui\';', 'app.css') }, { file: 'admin.css', imports: imports('@import \'@master/ui\';', 'admin.css') }])
  assert.deepEqual(results.flatMap(result => result.diagnostics.map(diagnostic => `${result.file} ${diagnostic.code} ${diagnostic.severity}`)).sort(), ['admin.css repeated-import warning', 'app.css repeated-import warning'])
  assert.match(results[0].diagnostics[0].message, /admin\.css/)
})

/** What the library's own stylesheets draw, as the command reads it for a project. */
const theme = styles(readSource('theme.css'), 'theme.css')
const drawn = declared(libraryFiles.filter(file => file !== 'theme.css').map(file => styles(readSource(file), file)), theme.mixins)
const internal = new Set(['--tone', '--segmented-inset'])
const restyled = (css: string, file = 'site.css', options: Parameters<typeof checkStyles>[2] = {}) => checkStyles([{ file, styles: styles(css, file) }], index, { declared: drawn, internal, mixins: theme.mixins.keys(), ...options }).flatMap(result => result.diagnostics)

test('styles reads rules with their nesting, through at-rules, and the mixins a stylesheet defines', () => {
  const found = styles('/* .btn { color: red } */\n@layer components {\n  .card {\n    padding: 1rem;\n    &:hover { color: red; }\n    .title { font-size: 2rem; }\n    @media (hover: hover) { background: blue; }\n  }\n}\n@keyframes spin { to { rotate: 1turn } }\n@mixin --raised { box-shadow: none; }\n.x { @apply --raised; }', 'a.css')
  assert.deepEqual(found.rules.map(rule => [rule.selectors.join(', '), rule.declarations.map(declaration => declaration.property).join(' ')]), [
    ['.card', 'padding'],
    ['.card:hover', 'color'],
    ['.card .title', 'font-size'],
    ['.card', 'background'],
    ['.x', ''],
  ])
  assert.deepEqual(found.rules[1].declarations[0], { property: 'color', value: 'red', line: 5, column: 15 })
  assert.deepEqual([...found.mixins.keys()], ['--raised'])
  assert.deepEqual(found.rules[4].applies.map(apply => apply.name), ['--raised'])
})

test('styles reads only the <style> of a template, where it is written', () => {
  const template = styles('<script>const css = ".btn { color: red }"</script>\n<button class="btn">Go</button>\n<style>\n  .go :global(.btn) { padding: 0 }\n</style>', 'Go.svelte')
  assert.deepEqual(template.rules.map(rule => rule.selectors[0]), ['.go :global(.btn)'])
  assert.equal(template.rules[0].declarations[0].line, 4)
})

test('a selector styles its last compound, by the classes that are not conditions', () => {
  assert.equal(subject('.toolbar > .btn.btn-quiet:hover'), '.btn.btn-quiet:hover')
  assert.equal(subject('.a :is(.b, .c) ~ .d[data-x="a b"]'), '.d[data-x="a b"]')
  assert.deepEqual(compoundClasses('.btn:not(.btn-quiet):has(.icon)[class~=".x"]'), ['btn'])
  assert.deepEqual(compoundClasses(':is(.input, .select):global(.dense)'), ['input', 'select', 'dense'])
  assert.equal(pseudoElement('.segmented::before'), 'before')
  assert.equal(pseudoElement('.input:not(:hover)'), '')
})

test('a shorthand and its longhands are one property, in either direction and in logical terms', () => {
  assert.ok(overlaps('background', 'background-color'))
  assert.ok(overlaps('padding-inline', 'padding-left'))
  assert.ok(overlaps('font', 'line-height'))
  assert.ok(overlaps('border-color', 'border-top-color'))
  assert.ok(overlaps('border-radius', 'border-top-left-radius'))
  assert.ok(!overlaps('border', 'border-radius'))
  assert.ok(!overlaps('color', 'background-color'))
  assert.ok(!overlaps('padding-block', 'padding-inline-end'))
})

test('a project rule that redraws a component is reported, with the steps that keep it tracked', () => {
  const [found] = restyled('.btn.action-outline { background: transparent; box-shadow: inset 0 0 0 1px currentColor; margin-inline: auto; }')
  assert.equal(found.code, 'material-override')
  assert.equal(found.severity, 'warning')
  assert.equal(found.contract, 'button')
  assert.match(found.message, /redeclares background, box-shadow, which button draws itself/)
  assert.match(found.message, /master-ui own button/)
  assert.equal(restyled('.toolbar .btn { background: none }', 'site.css', { strict: true })[0].severity, 'error')
})

test('public properties, tokens and where a component stands are the project\'s to set', () => {
  assert.deepEqual(restyled('.toolbar .btn { --btn-height: 2rem; --color-brand: red; margin: 0; width: 100%; grid-column: 1 / -1; }'), [])
  assert.deepEqual(restyled('.toolbar .btn { --project-own: 1; }'), [], 'a property the library never reads is the project\'s own')
  assert.deepEqual(restyled('.sheet { padding: 2rem }'), [], 'a sheet draws no padding of its own')
  assert.deepEqual(restyled('.link { font-size: 2rem }'), [], 'a link takes its type from its context')
})

test('an internal property, a library mixin and an undone pseudo-element are overrides too', () => {
  assert.match(restyled('.btn.save { --tone: red; }')[0].message, /sets the internal --tone/)
  assert.match(restyled('.btn.save:active { @apply --control-ink-pressed; }')[0].message, /applies --control-ink-pressed/)
  assert.match(restyled('.segmented::before { content: none }')[0].message, /redeclares content, which segmented draws/)
  assert.match(restyled('@mixin --flat { background: none } .btn.flat { @apply --flat; }')[0].message, /redeclares background/, 'a project mixin is read as if written in the rule')
})

test('a class of the project\'s own styles the components it shares an element with', () => {
  const markup = [parse('<div class="segmented paper-options"></div><span class="loading">x</span>')]
  const near = beside(markup, index)
  assert.deepEqual([...near.get('paper-options') ?? []], ['segmented'])
  assert.equal(restyled('.paper-options::before { content: none }', 'site.css', { beside: near })[0].contract, 'segmented')
  assert.deepEqual(restyled('.loading { color: red }', 'site.css', { beside: near }), [])
  // A template's <style> is scoped to its own markup: a class of the same name elsewhere is not this one.
  const scoped = checkStyles([{ file: 'Page.astro', styles: styles('<section class="paper-options"></section><style>.paper-options { background: red }</style>', 'Page.astro'), beside: new Map() }], index, { beside: near, declared: drawn })
  assert.deepEqual(scoped, [])
})

test('a component the project wrote with a contract of its own is its to draw', () => {
  const own = createIndex([...contracts(), { name: 'peg', title: 'Peg', tier: 'component', classes: [{ name: 'peg', kind: 'root', description: 'A peg' }] }])
  assert.deepEqual(checkStyles([{ file: 'a.css', styles: styles('.peg { background: var(--color-surface-raised); border-radius: 50% }', 'a.css') }], own, { own: ['peg'] }), [])
})

test('a surface painted by hand is a warning that names the components with that material', () => {
  const [found] = restyled('.doc-item fieldset { border: 1px solid var(--color-line-divider); border-radius: var(--radius-control); background: var(--color-surface-tray); }')
  assert.equal(found.code, 'hand-made-material')
  assert.equal(found.severity, 'warning')
  assert.match(found.message, /sheet, tray, well, card/)
  assert.equal(restyled('.box { @apply --surface-sheet; border-radius: 1rem }')[0].code, 'hand-made-material')
  assert.deepEqual(restyled('.mark::before { background: var(--color-surface-inverse); border-radius: 50% }'), [], 'a pseudo-element marks, it holds nothing')
  assert.deepEqual(restyled('.band { background: var(--color-surface-tray) }'), [], 'a tone without an edge or a corner is a band of the page')
})

test('Astro\'s class:list names its classes in an expression', () => {
  assert.deepEqual(parse('<span class:list={[\'badge\', \'publication\', { \'badge-outline\': isNew }]}>New</span>')[0].classes, ['badge', 'publication', 'badge-outline'])
})

test('a project with a material of its own reports a component used before it was adopted', () => {
  const page = { file: 'Page.svelte', elements: parse('<button class="btn">Go</button><div class="auto-grid"><span class="badge">1</span><span class="badge">2</span></div>') }
  const sample = { file: 'Samples.astro', elements: parse('<button class="btn btn-primary">Go</button>') }
  const results = checkMaterial([page], index, { adopted: ['button'], samples: [sample], stylesheets: ['src/materials.css'] })
  assert.deepEqual(results.flatMap(result => result.diagnostics.map(diagnostic => [result.file, diagnostic.code, diagnostic.contract])), [['Page.svelte', 'first-use', 'badge']], 'once per component; a layout owns no material')
  assert.match(results[0].diagnostics[0].message, /src\/materials\.css.*Samples\.astro.*material\.adopted/)
  assert.deepEqual(checkMaterial([page], index, { adopted: ['button'], own: ['badge'], samples: [sample] }), [], 'a component the project wrote is its material already')
})

test('an adopted component is a contract, and a sample shows it', () => {
  const source = '{\n  "material": { "adopted": ["button", "badge", "nothing"] }\n}\n'
  const results = checkMaterial([], index, { adopted: ['button', 'badge', 'nothing'], samples: [{ file: 'Samples.astro', elements: parse('<button class="btn">Go</button>') }], config: { file: 'master-ui.json', source } })
  assert.deepEqual(results[0].diagnostics.map(diagnostic => [diagnostic.code, diagnostic.contract, diagnostic.line]), [['unsampled', 'badge', 2], ['unsampled', 'nothing', 2]])
  assert.match(results[0].diagnostics[1].message, /is no contract/)
})
