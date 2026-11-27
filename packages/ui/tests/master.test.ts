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
 * Every rule of the library is in `components.ui`, a layer inside `components`. A rule a project writes in
 * `@layer components` is outside that inner layer, so it wins over a component whatever its specificity and
 * wherever a bundle puts it. One rule left in `components` itself would beat the project's rules of equal
 * specificity only when it happened to come later, and every other component always.
 */
test('every component and layout rule is in the components.ui layer', () => {
  for (const file of [...components, ...layouts]) {
    const source = code(file)
    const outside: string[] = []
    let depth = 0
    let start = 0
    for (let at = 0; at < source.length; at++) {
      if (source[at] === '{' && depth++ === 0) outside.push(source.slice(start, at).trim().replace(/\s+/g, ' '))
      else if (source[at] === '}' && --depth === 0) start = at + 1
      else if (source[at] === ';' && depth === 0) { outside.push(source.slice(start, at + 1).trim()); start = at + 1 }
    }
    assert.ok(outside.includes('@layer components.ui'), `${file} has no @layer components.ui block`)
    // Beside the layer a stylesheet may only define names: they draw nothing until a rule in the layer uses them.
    for (const prelude of outside) assert.match(prelude, /^@layer components\.ui$|^@(?:keyframes|property|position-try|counter-style) [\w-]+$/, `${file}: "${prelude}" is outside @layer components.ui`)
    assert.doesNotMatch(source.replace(/@layer components\.ui \{/g, ''), /@layer\b/, `${file} names another layer`)
  }
})

test('the compiled library keeps its rules in components.ui and puts none in components itself', () => {
  const { css } = compile(imports)
  assert.match(css, /@layer components\.ui\s*\{/)
  assert.doesNotMatch(css, /@layer components\s*\{/)
})

/**
 * A pseudo-element inside :is(), :where(), :not() or :has() is invalid, and a browser drops the whole rule without a
 * word. The compiler writes a mixin applied to a selector list as one rule on :is(<the list>), so a list whose
 * selectors end in ::after lost the vote's touch target, and one ending in ::before the sortable's sheet, while every
 * other test passed. Write one selector with the pseudo-element outside, `:is(.a, .b)::after`, instead.
 */
test('no compiled selector puts a pseudo-element inside :is(), :where(), :not() or :has()', () => {
  const { css } = compile(imports)
  const pseudoElement = /::?(?:before|after|marker|placeholder|backdrop|selection|first-line|first-letter|file-selector-button)\b|::[\w-]+/
  const dropped = new Set<string>()
  for (const match of css.matchAll(/:(?:is|where|not|has)\(/g)) {
    let at = match.index + match[0].length
    for (let depth = 1; at < css.length && depth; at++) {
      if (css[at] === '(') depth++
      else if (css[at] === ')') depth--
    }
    if (pseudoElement.test(css.slice(match.index + match[0].length, at - 1))) {
      dropped.add(css.slice(css.lastIndexOf('}', match.index) + 1, css.indexOf('{', at)).trim())
    }
  }
  assert.deepEqual([...dropped], [], 'these rules are invalid in every browser')
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

/**
 * A control is drawn the same at every pointer: on touch only its target grows. Its type is part of the drawing, so no
 * stylesheet raises it on a coarse pointer, not even to the 16px below which iOS zooms the page onto a focused field:
 * the page stops that zoom with its viewport (`/guide/installation#set-the-viewport`), once for every field.
 */
for (const file of [...components, ...layouts]) {
  test(`${file} keeps its type at every pointer`, () => {
    const source = code(file)
    for (const match of source.matchAll(/@media[^{]*pointer:\s*coarse[^{]*\{/g)) {
      const start = match.index + match[0].length
      let depth = 1
      let at = start
      for (; depth && at < source.length; at++) {
        if (source[at] === '{') depth++
        else if (source[at] === '}') depth--
      }
      const body = source.slice(start, at - 1)
      assert.ok(!/(^|[\s;{])font(-size)?\s*:/.test(body), `${file}:${source.slice(0, match.index).split('\n').length}: a coarse pointer changes the type`)
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
