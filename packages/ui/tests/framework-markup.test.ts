import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { transformSync } from 'esbuild'
import { compile as compileSvelte } from 'svelte/compiler'
import { compileTemplate } from 'vue/compiler-sfc'
import { check, createIndex, format, parse } from '../check/index.js'
import { printMarkup, UnsupportedMarkup, type MarkupLanguage } from '../../../site/utils/framework-markup.ts'
import { contracts, utilities } from './support.ts'

/**
 * A preview's Code view offers its markup in HTML, React, Svelte and Vue, printed from the HTML by
 * `site/utils/framework-markup.ts`. Every preview on the site is held to what that promises: each language is the same
 * markup, so the checker reads the same classes in it and finds nothing wrong, and each is a file its framework
 * compiles. React's is type-checked against React's own types, since a reader pastes it into TypeScript.
 */
const content = new URL('../../../site/content/', import.meta.url)
const index = createIndex(contracts())
const languages = ['html', 'react', 'svelte', 'vue'] as const satisfies readonly MarkupLanguage[]

function pages(directory: URL): URL[] {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory)
    return entry.isDirectory() ? pages(url) : entry.name === 'content.mdx' ? [url] : []
  })
}

/** The markup of each preview, as the page's template literal gives it to the component. */
function previews(source: string) {
  return [...source.matchAll(/(?:html=\{|export const \w+ = )`([\s\S]*?)`/g)].map(match => ({
    html: match[1].replace(/\\([`\\$])/g, '$1'),
    line: source.slice(0, match.index).split('\n').length,
  }))
}

interface Printed { where: string, language: MarkupLanguage, code: string, html: string }
const printed: Printed[] = []
for (const page of pages(content)) {
  const name = fileURLToPath(page).slice(fileURLToPath(content).length)
  for (const { html, line } of previews(readFileSync(page, 'utf8'))) {
    for (const language of languages) {
      try {
        printed.push({ where: `${name}:${line}`, language, code: printMarkup(html, language), html })
      } catch (error) {
        if (!(error instanceof UnsupportedMarkup)) throw new Error(`${name}:${line} (${language}): ${(error as Error).message}`)
      }
    }
  }
}

const classes = (markup: string) => parse(markup).flatMap(element => element.classes).sort()

test('every language of every preview is the same markup to the checker', () => {
  const preset = utilities('library')
  try {
    const known = (className: string) => index.classes.has(className) || preset.has(className)
    const problems = printed.flatMap(({ where, language, code, html }) => [
      ...check(code, index, { knows: known, strict: true }).map(diagnostic => `${language} ${format([diagnostic], where)}`),
      ...(classes(code).join(' ') === classes(html).join(' ') ? [] : [`${where} (${language}): the classes differ from the HTML's`]),
    ])
    assert.deepEqual(problems, [])
  } finally { preset.dispose() }
})

test('the frameworks are offered for most previews', () => {
  const html = printed.filter(entry => entry.language === 'html').length
  for (const language of ['react', 'svelte', 'vue'] as const) {
    assert.ok(printed.filter(entry => entry.language === language).length > html * .75, `${language} is offered for too few previews`)
  }
})

test('React: every preview is JSX that type-checks against React\'s types', () => {
  const react = printed.filter(entry => entry.language === 'react')
  for (const { where, code } of react) {
    assert.doesNotThrow(() => transformSync(code, { loader: 'tsx', jsx: 'automatic' }), where)
  }
  // The files are imagined beside the tests, so React's types resolve from the package's own dependencies.
  const directory = fileURLToPath(new URL('./previews/', import.meta.url))
  const files = new Map(react.map(({ code }, number) => [`${directory}preview-${number}.tsx`, `export function Preview${number}() {\n  return (\n${code}\n  )\n}\n`]))
  const options: ts.CompilerOptions = { jsx: ts.JsxEmit.ReactJSX, strict: true, noEmit: true, skipLibCheck: true, target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, types: [], lib: ['lib.es2023.d.ts', 'lib.dom.d.ts'] }
  const host = ts.createCompilerHost(options)
  const read = host.readFile.bind(host)
  const exists = host.fileExists.bind(host)
  const source = host.getSourceFile.bind(host)
  host.readFile = file => files.get(file) ?? read(file)
  host.fileExists = file => files.has(file) || exists(file)
  host.getSourceFile = (file, version, ...rest) => files.has(file) ? ts.createSourceFile(file, files.get(file)!, version) : source(file, version, ...rest)
  host.getCurrentDirectory = () => fileURLToPath(new URL('../', import.meta.url))
  const program = ts.createProgram([...files.keys()], options, host)
  const problems = ts.getPreEmitDiagnostics(program).map(diagnostic => {
    const number = Number(/preview-(\d+)/.exec(diagnostic.file?.fileName ?? '')?.[1])
    return `${react[number]?.where ?? diagnostic.file?.fileName}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`
  })
  assert.deepEqual(problems, [])
})

test('Svelte: every preview compiles', () => {
  const problems = printed.filter(entry => entry.language === 'svelte').flatMap(({ where, code }) => {
    try {
      compileSvelte(code, { generate: 'server', filename: 'Preview.svelte' })
      return []
    } catch (error) { return [`${where}: ${(error as Error).message}`] }
  })
  assert.deepEqual(problems, [])
})

test('Vue: every preview compiles', () => {
  const problems = printed.filter(entry => entry.language === 'vue').flatMap(({ where, code }) => {
    const template = code.replace(/^<template>\n/, '').replace(/\n<\/template>$/, '')
    const result = compileTemplate({ source: template, filename: 'Preview.vue', id: 'preview' })
    return result.errors.map(error => `${where}: ${typeof error === 'string' ? error : error.message}`)
  })
  assert.deepEqual(problems, [])
})

test('the printer keeps what each framework would change', () => {
  const markup = '<p class="text">Press <kbd class="kbd">⌘</kbd> <kbd class="kbd">K</kbd>.</p>\n<label class="check" for="alerts"><input id="alerts" class="switch" type="checkbox" role="switch" checked tabindex="-1"> Alerts</label>\n<button class="btn" commandfor="confirm" command="show-modal">Delete</button>\n<select class="select" aria-label="Plan"><option>Free</option><option selected>Pro</option></select>'
  const react = printMarkup(markup, 'react')
  assert.match(react, /^<>\n/)
  assert.match(react, /Press <kbd className="kbd">⌘<\/kbd> <kbd className="kbd">K<\/kbd>\./, 'a space that is read stays on its line')
  assert.match(react, /<label className="check" htmlFor="alerts">/)
  assert.match(react, /defaultChecked tabIndex=\{-1\} \/>/)
  assert.match(react, /\{\.\.\.\{ commandfor: 'confirm', command: 'show-modal' \}\}/)
  assert.match(react, /<select className="select" aria-label="Plan" defaultValue="Pro">/)
  assert.doesNotMatch(react, /selected/)
  assert.match(printMarkup(markup, 'vue'), /^<template>\n {2}<p class="text">/)
  assert.equal(printMarkup('<p class="text">{ braces }</p>', 'svelte'), '<p class="text">{\'{\'} braces {\'}\'}</p>')
  assert.throws(() => printMarkup('<template><li></li></template>', 'react'), UnsupportedMarkup)
  assert.throws(() => printMarkup('<div class="chart"></div><script>draw()</script>', 'vue'), UnsupportedMarkup)
})
