import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const read = (file: string) => readFileSync(new URL(file, root), 'utf8')

/** Documentation consumes the site framework; the distributed UI must remain usable without it. */
test('published UI source depends on the styling engine, never the documentation shell', () => {
  const pkg = JSON.parse(read('package.json'))
  for (const dependencies of [pkg.dependencies, pkg.peerDependencies, pkg.optionalDependencies]) {
    assert.equal(dependencies?.['@master/internal-site'], undefined)
  }
  const files = (directory: string): string[] => readdirSync(new URL(directory, root), { withFileTypes: true }).flatMap(entry => {
    const path = `${directory}/${entry.name}`
    return entry.isDirectory() ? files(path) : /\.(?:css|js|ts|tsx|vue|svelte|json)$/.test(path) ? [path] : []
  })
  for (const file of ['master.css', 'theme.css', ...['components', 'layouts', 'themes', 'behaviors', 'frameworks', 'check', 'bin'].flatMap(files)]) {
    assert.ok(!read(file).includes('@master/internal-site'), `${file} depends on the documentation shell`)
  }
})
