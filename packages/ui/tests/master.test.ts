import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { compileManifestSync } from '@master/css-compiler/node'
import preset from '@master/css-preset/default-manifest.json' with { type: 'json' }

const root = new URL('../', import.meta.url)
const read = (file: string) => readFileSync(new URL(file, root), 'utf8')
const imports = [...read('master.css').matchAll(/@import\s+['"]\.\/([^'"]+)['"]/g)].map(match => match[1])
const components = readdirSync(new URL('components/', root)).filter(file => file.endsWith('.css')).map(file => file.slice(0, -4)).sort()
const pkg = JSON.parse(read('package.json'))

function compile(files: string[]) {
  const result = compileManifestSync(files.map(read).join('\n\n'), { baseManifest: preset as never })
  const problems = result.diagnostics.filter(diagnostic => diagnostic.severity === 'error' || diagnostic.severity === 'warning')
  assert.deepEqual(problems, [], `${files.join(', ')} reported diagnostics`)
  return result
}

test('master.css imports the theme first and every component stylesheet', () => {
  assert.equal(imports[0], 'theme.css')
  assert.deepEqual(imports.slice(1).map(file => file.replace(/^components\/(.+)\.css$/, '$1')).sort(), components)
})

test('every imported file is published', () => {
  assert.ok(pkg.files.includes('master.css'))
  assert.ok(pkg.files.includes('theme.css'))
  assert.ok(pkg.files.includes('components/*.css'))
  assert.equal(pkg.exports['.'].style, './master.css')
})

test('the complete library compiles against the Master CSS preset', () => {
  const { nativeClassNames } = compile(imports)
  for (const name of ['btn', 'btn-primary', 'btn-icon', 'badge', 'badge-corner', 'spinner', 'switch', 'select', 'segmented', 'segment', 'tabs', 'tab']) {
    assert.ok(nativeClassNames.includes(name), `missing native class .${name}`)
  }
})

for (const component of components) {
  test(`components/${component}.css compiles on its own with theme.css`, () => {
    const { nativeClassNames } = compile(['theme.css', `components/${component}.css`])
    assert.ok(nativeClassNames.length > 0)
  })
}
