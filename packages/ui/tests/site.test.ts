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
