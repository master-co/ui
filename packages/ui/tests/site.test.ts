import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { check, createIndex, format, parse } from '../check/index.js'
import { contracts, utilities } from './support.ts'

/**
 * The documentation is the largest body of Master UI markup there is, so it is also the checker's test: every
 * preview on every page must satisfy the contracts, and a contract that reports correct markup is wrong.
 */
const content = new URL('../../../site/content/', import.meta.url)
const index = createIndex(contracts())

function pages(directory: URL): URL[] {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory)
    return entry.isDirectory() ? pages(url) : entry.name === 'content.mdx' ? [url] : []
  })
}

/** The markup of each preview: the template literal passed as `html`, or exported to be passed to several. */
function previews(source: string) {
  return [...source.matchAll(/(?:html=\{|export const \w+ = )`([\s\S]*?)`/g)].map(match => ({ html: match[1], line: source.slice(0, match.index).split('\n').length }))
}

for (const page of pages(content)) {
  const name = page.pathname.slice(content.pathname.length)
  const found = previews(readFileSync(page, 'utf8'))
  if (!found.length) continue
  test(`${name}: every preview satisfies the contracts`, () => {
    const preset = utilities('library')
    try {
      const known = (className: string) => index.classes.has(className) || preset.has(className)
      const problems = found.flatMap(({ html, line }) => {
        const unknown = [...new Set(parse(html).flatMap(element => element.classes))].filter(className => !known(className))
        return [
          ...check(html, index, { knows: known, strict: true }).map(diagnostic => format([{ ...diagnostic, line: diagnostic.line + line - 1 }], name)),
          ...unknown.map(className => `${name}:${line} "${className}" is neither a contract class nor a preset utility`),
        ]
      })
      assert.deepEqual(problems, [])
    } finally { preset.dispose() }
  })
}

/**
 * The working examples in `site/examples` are markup and modules shared by a preview, its Code view, the Markdown
 * export and the registry. Their markup is held to the contracts like any preview, and what they name is real: the
 * files, the root a module mounts on, the contracts and the packages, which are the site's and never the library's.
 */
const examples = new URL('../../../site/examples/', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('manifest.json', examples), 'utf8')) as { examples: Record<string, { html: string, script?: string, files?: string[], contracts: string[], dependencies?: Record<string, string> }> }
const sitePackage = JSON.parse(readFileSync(new URL('../../../site/package.json', import.meta.url), 'utf8'))
const library = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

for (const [id, entry] of Object.entries(manifest.examples)) {
  test(`example ${id}: its markup satisfies the contracts`, () => {
    const html = readFileSync(new URL(entry.html, examples), 'utf8')
    const preset = utilities('library')
    try {
      const known = (className: string) => index.classes.has(className) || preset.has(className)
      const unknown = [...new Set(parse(html).flatMap(element => element.classes))].filter(className => !known(className))
      assert.deepEqual(check(html, index, { knows: known, strict: true }).map(diagnostic => format([diagnostic], entry.html)), [])
      assert.deepEqual(unknown, [], 'a class that is neither a contract class nor a preset utility')
    } finally { preset.dispose() }
  })

  test(`example ${id}: its files, its root, its contracts and its packages are real`, () => {
    for (const file of [entry.html, ...(entry.script ? [entry.script] : []), ...(entry.files ?? [])]) assert.ok(existsSync(new URL(file, examples)), `${file} is missing`)
    // The markup and the module are the example's own; a file it imports may be another example's, which it shares.
    for (const file of [entry.html, ...(entry.script ? [entry.script] : [])]) assert.ok(file.startsWith(`${id}/`), `${file} is not in the example's folder`)
    for (const file of (entry.files ?? []).filter(file => !file.startsWith(`${id}/`))) {
      assert.ok(Object.keys(manifest.examples).some(other => file.startsWith(`${other}/`) && [manifest.examples[other].script, ...(manifest.examples[other].files ?? [])].includes(file)), `${file} is shared from an example that does not list it`)
    }
    assert.match(readFileSync(new URL(entry.html, examples), 'utf8'), new RegExp(`data-example="${id}"`), 'the markup names the root its module mounts on')
    if (entry.script) assert.match(readFileSync(new URL(entry.script, examples), 'utf8'), /export function mount\(/, 'the module starts with mount(root)')
    for (const name of entry.contracts) assert.ok(contracts().some(contract => contract.name === name), `${name} is not a contract`)
    for (const [dependency, version] of Object.entries(entry.dependencies ?? {})) {
      assert.equal(sitePackage.dependencies?.[dependency] ?? sitePackage.devDependencies?.[dependency], version, `${dependency} is not the site's, at exactly ${version}`)
      assert.ok(!library.dependencies?.[dependency] && !library.peerDependencies?.[dependency], `${dependency} must not become a dependency of @master/ui`)
    }
  })
}
