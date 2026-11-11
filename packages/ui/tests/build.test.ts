import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * What the build writes for a project without Master CSS, and for TypeScript. The compiled stylesheet
 * stands alone, so whatever the preset would have said for it, it has to say itself.
 */
const root = new URL('../', import.meta.url)
execFileSync(process.execPath, ['--import', 'tsx', fileURLToPath(new URL('scripts/build.ts', root))], { cwd: fileURLToPath(root), stdio: 'ignore' })
const read = (file: string) => readFileSync(new URL(`dist/${file}`, root), 'utf8')

for (const file of ['standalone.css', ...readdirSync(new URL('dist/themes/', root)).map(name => `themes/${name}`)]) {
  test(`dist/${file} says which color scheme its tokens resolve for`, () => {
    const css = read(file)
    assert.ok(css.includes('light-dark('), 'the tokens are written with light-dark()')
    assert.match(css, /:root\{color-scheme:light dark\}/, 'follows the reader\'s preference')
    assert.match(css, /\[data-theme="dark"\][^{]*\{color-scheme:dark\}/, 'and data-theme pins a scheme, as with the preset')
    assert.match(css, /^[^\n]*\n@layer theme, base, defaults, components, utilities;/, 'after the layers are declared')
  })
}

test('the behaviors have declarations for TypeScript', () => {
  const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'))
  for (const file of readdirSync(new URL('behaviors/', root)).filter(name => name.endsWith('.js'))) {
    assert.ok(existsSync(new URL(`dist/behaviors/${file.replace(/\.js$/, '.d.ts')}`, root)), `dist/behaviors/${file.replace(/\.js$/, '.d.ts')}`)
  }
  assert.equal(pkg.exports['./behaviors/*.js'].types, './dist/behaviors/*.d.ts')
})
