import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, compile, components, imports, layouts, read, utilities } from './support.ts'

const pkg = JSON.parse(read('package.json'))

test('master.css imports the theme first, then every component and every layout', () => {
  assert.equal(imports[0], 'theme.css')
  assert.deepEqual(imports.slice(1).sort(), [...components, ...layouts].sort())
  // A layout may be tuned by nothing and tunes nothing; it follows the components so its few rules read last.
  assert.ok(imports.findIndex(file => file.startsWith('layouts/')) > imports.findLastIndex(file => file.startsWith('components/')))
})

test('every imported file is published', () => {
  assert.ok(pkg.files.includes('master.css'))
  assert.ok(pkg.files.includes('theme.css'))
  assert.ok(pkg.files.includes('components/*.css'))
  assert.ok(pkg.files.includes('layouts/*.css'))
  assert.equal(pkg.exports['./layouts/*.css'], './layouts/*.css')
  assert.equal(pkg.exports['.'].style, './master.css')
})

test('the complete library compiles against the Master CSS preset', () => {
  // Which classes each stylesheet must define is its contract's business: see contracts.test.ts.
  assert.ok(compile(imports).nativeClassNames.length > 0)
})

/**
 * A component class that is also a preset utility is painted twice, and the utility wins. `list-item` would
 * turn a flex row into `display: list-item`. The table parts are the exception on purpose: their utilities
 * set the display those parts have, so the same classes lay out a table built from roles.
 */
test('component classes do not collide with preset utilities', () => {
  const { nativeClassNames } = compile(imports)
  const preset = utilities()
  try {
    assert.deepEqual(nativeClassNames.filter(name => preset.has(name)).sort(), ['table', 'table-cell', 'table-row'])
  } finally { preset.dispose() }
})

for (const file of [...components, ...layouts]) {
  test(`${file} compiles on its own with theme.css`, () => {
    const { nativeClassNames } = compile(['theme.css', file])
    assert.ok(nativeClassNames.length > 0)
  })
}

/**
 * Selectors of component rules: every line that opens a block, except at-rules and keyframe steps.
 * `::picker(select)` is the customizable select's list, a pseudo-element whose argument is not an element selector.
 */
function selectors(file: string) {
  return code(file).split('\n')
    .map(line => line.trim())
    .filter(line => line.endsWith('{') && !line.startsWith('@') && !/^(from|to|\d+%)/.test(line))
    .map(line => line.slice(0, -1).trim().replaceAll('::picker(select)', '::picker()'))
}

const elementTypes = /(^|[\s,(>+~&])(a|button|input|label|select|textarea|svg|img|span|div|p|ul|ol|li|nav)(?=$|[\s,:.)[>+~])/

for (const file of [...components, ...layouts]) {
  test(`${file} reaches parts by class, never by element type or child combinator`, () => {
    for (const selector of selectors(file)) {
      assert.ok(!selector.includes('>'), `${file}: child combinator in "${selector}"`)
      assert.ok(!elementTypes.test(selector), `${file}: element type in "${selector}"`)
    }
  })
}

/**
 * A layout places regions and decides what scrolls. It owns no material: a face, an edge, a shadow or a corner
 * comes from a component standing in the region, so a layout never has to be matched to the material ladder.
 */
for (const file of layouts) {
  test(`${file} draws no material`, () => {
    const source = code(file)
    for (const property of ['background', 'background-color', 'background-image', 'box-shadow', 'border-radius', 'corner-shape', 'backdrop-filter', 'filter']) {
      assert.ok(!new RegExp(`(^|[\\s;{])${property}\\s*:`).test(source), `${file}: a layout declares ${property}`)
    }
  })
}

/**
 * A color is a decision of the theme. A component names a token or mixes from one (`color-mix`, `currentColor`,
 * `transparent`, a system color in forced colors); it never writes a color of its own, so one theme file can
 * retune every face, edge and shadow. The stroke of an icon inside a data URL is the one place a token cannot reach.
 */
const literal = /(oklch|oklab|lch|lab|rgba?|hsla?|hwb|color)\(|#[0-9a-f]{3,8}\b/i

for (const file of [...components, ...layouts]) {
  test(`${file} writes no color of its own`, () => {
    const source = code(file).replace(/url\((?:"[^"]*"|'[^']*'|[^)]*)\)/g, 'url()')
    for (const [at, line] of source.split('\n').entries()) {
      assert.ok(!literal.test(line), `${file}:${at + 1}: a color literal in "${line.trim()}"; name a token in theme.css`)
    }
  })
}

test('the README lists the classes the contracts list', async () => {
  const { contracts } = await import('./support.ts')
  const readme = read('README.md')
  const table = /<!-- contracts:start -->([\s\S]*)<!-- contracts:end -->/.exec(readme)?.[1] ?? ''
  for (const contract of contracts()) {
    const row = table.split('\n').find(line => line.startsWith(`| ${contract.title} |`) || line.startsWith(`| ${contract.title} (layout) |`))
    assert.ok(row, `README.md has no row for ${contract.title}; run "bun run build"`)
    assert.deepEqual([...row!.matchAll(/`([^`]+)`/g)].map(match => match[1]), contract.classes.map(entry => entry.name), `README.md is out of date for ${contract.title}; run "bun run build"`)
  }
})

/**
 * A theme is tokens and mixins. It compiles after the library, and it never selects a component: a rule such
 * as `.btn { … }` in a theme is a component override that no contract knows about.
 */
for (const file of (await import('./support.ts')).themes) {
  test(`${file} compiles after the library and selects no component`, () => {
    compile([...imports, file])
    assert.deepEqual(code(file).split('\n').map(line => line.trim()).filter(line => line.endsWith('{') && /(^|[\s,])\.[a-z]/.test(line)), [])
  })
}
