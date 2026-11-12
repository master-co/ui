import assert from 'node:assert/strict'
import { readdirSync, readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'

/** The authored files that specimens, source panels and generated registry items consume. */
const authored = file => /^(?:master\.css|theme\.css|contract\.schema\.json)$/u.test(file)
  || /^(?:components|layouts|themes)\/[^/]+\.(?:css|json)$/u.test(file)
  || /^behaviors\/[^/]+\.js$/u.test(file)
  || /^(?:frameworks|check|bin)\//u.test(file)
  || /^(?:readme|licen[cs]e|copying)(?:\.[^/]+)?$/iu.test(file)

/** @param {string} root @returns {string[]} */
function sourceFiles(root) {
  const walk = (directory = '') => readdirSync(join(root, directory), { withFileTypes: true }).flatMap(entry => {
    const file = directory ? `${directory}/${entry.name}` : entry.name
    if (entry.isDirectory()) return ['node_modules', 'dist', '.git'].includes(entry.name) ? [] : walk(file)
    return authored(file) ? [file] : []
  })
  return walk().sort()
}

/** Compare the complete authored file set, not merely files present in both copies.
 * Generated dist and package version metadata are verified separately by package installation.
 * @param {string} publishedRoot @param {string} workspaceRoot
 */
export function verifyPublishedSource(publishedRoot, workspaceRoot) {
  const expected = sourceFiles(workspaceRoot)
  const actual = sourceFiles(publishedRoot)
  assert.ok(expected.includes('master.css') && expected.includes('theme.css'), 'UI workspace source is incomplete')
  assert.deepEqual(actual, expected, 'Published UI authored file inventory differs from the workspace')
  for (const file of expected) {
    assert.ok(readFileSync(join(publishedRoot, file)).equals(readFileSync(join(workspaceRoot, file))), `Published UI source differs: ${file}`)
  }
  return expected.length
}

/** The site's imports and its shared shell must resolve the same workspace UI instance.
 * @param {string} siteManifest @param {string} workspaceRoot
 */
export function verifySiteUIInstance(siteManifest, workspaceRoot) {
  const siteRequire = createRequire(resolve(siteManifest))
  const platformRequire = createRequire(siteRequire.resolve('@master/internal-site/package.json'))
  const expected = realpathSync(workspaceRoot)
  for (const [owner, require] of [['site', siteRequire], ['shared shell', platformRequire]]) {
    const actual = realpathSync(dirname(require.resolve('@master/ui/package.json')))
    assert.equal(actual, expected, `The ${owner} resolves a separate UI instance`)
  }
  return expected
}
