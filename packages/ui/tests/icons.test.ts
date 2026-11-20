import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { notices, readLock, sync, version } from '../scripts/icons.ts'

/**
 * The library draws its icons inline and depends on no icon package, so nothing but this test holds a drawing to
 * its source. Every icon in a component, a contract example, a preview and a mask is a drawing of the Master Icons
 * release pinned in package.json, at the master its viewBox names.
 */
const fix = 'run "bun run icons --write" in packages/ui'
const result = sync()

test('every inline icon and mask is a drawing of the pinned Master Icons release', () => {
  assert.deepEqual(result.problems.map(problem => `${problem.file}:${problem.line} ${problem.message}`), [], fix)
})

test('icons.lock.json records the drawings in use and the release they came from', () => {
  const lock = JSON.parse(readFileSync(new URL('../scripts/icons.lock.json', import.meta.url), 'utf8'))
  assert.equal(lock['@master/icons'], version, fix)
  assert.deepEqual(readLock(), result.lock, fix)
})

test('THIRD_PARTY_NOTICES.md keeps the notice of every drawing made after another work, and is published', () => {
  assert.equal(readFileSync(new URL('../THIRD_PARTY_NOTICES.md', import.meta.url), 'utf8'), notices(result.lock), fix)
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.ok(manifest.files.includes('THIRD_PARTY_NOTICES.md'))
})

test('@master/icons is pinned to one version and is not a dependency of the published package', () => {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.match(manifest.devDependencies['@master/icons'], /^\d+\.\d+\.\d+$/)
  assert.equal(manifest.devDependencies['@master/icons'], version)
  assert.equal(manifest.dependencies?.['@master/icons'], undefined)
  assert.equal(manifest.peerDependencies['@master/icons'], undefined)
})

test('a drawing painted as a background image is not black: it has no ink to take, so it carries a mid grey', () => {
  for (const [file, property] of [['carousel.css', '--carousel-chevron'], ['select.css', '--select-indicator']] as const) {
    const source = readFileSync(new URL(`../components/${file}`, import.meta.url), 'utf8')
    const value = new RegExp(`${property}: url\\("([^"]+)"\\)`).exec(source)?.[1]
    assert.ok(value, `${file} sets ${property}`)
    assert.match(value, /stroke='%23[0-9a-f]{3,6}'/, `${property} is a background image, drawn in a grey that reads on a light and a dark face`)
  }
})
