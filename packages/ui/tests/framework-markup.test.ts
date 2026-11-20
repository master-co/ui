import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { transformSync } from 'esbuild'
import { compile as compileSvelte } from 'svelte/compiler'
import { compileScript, compileTemplate, parse as parseVue } from 'vue/compiler-sfc'
import { check, createIndex, format, parse } from '../check/index.js'
import { printMarkup, printSource, UnsupportedMarkup, type IconImport, type MarkupLanguage, type PageScript } from '../../../site/utils/framework-markup.ts'
import { contracts, utilities } from './support.ts'

/**
 * A preview's Code view offers its markup in HTML, React, Svelte and Vue, printed from the HTML by
 * `site/utils/framework-markup.ts`. Every preview on the site is held to what that promises: each language is the same
 * markup, so the checker reads the same classes in it and finds nothing wrong, and each is a file its framework
 * compiles. React's is type-checked against React's own types, since a reader pastes it into TypeScript.
 *
 * In a framework a Master Icons drawing is its component, so those three also import: the markup is checked with the
 * component standing where the drawing was, and every import has to be an entry the pinned release publishes.
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
    // A preview that runs the behaviors says so on its tag, before the markup or after it.
    behaviors: /\sbehaviors[\s/>]/.test(source.slice(source.lastIndexOf('<', match.index), match.index) + (/^[^<]*>/.exec(source.slice(match.index + match[0].length)) ?? [''])[0]),
  }))
}

interface Printed { where: string, language: MarkupLanguage, code: string, markup: string, imports: IconImport[], root?: string, script?: PageScript, html: string }
const printed: Printed[] = []
/** What a framework was not given, and why. */
const withheld: { where: string, language: MarkupLanguage, reason: string }[] = []
for (const page of pages(content)) {
  const name = fileURLToPath(page).slice(fileURLToPath(content).length)
  for (const { html, line, behaviors } of previews(readFileSync(page, 'utf8'))) {
    for (const language of languages) {
      try {
        printed.push({ where: `${name}:${line}`, language, code: printMarkup(html, language, { behaviors }), ...printSource(html, language, { behaviors }), html })
      } catch (error) {
        if (!(error instanceof UnsupportedMarkup)) throw new Error(`${name}:${line} (${language}): ${(error as Error).message}`)
        withheld.push({ where: `${name}:${line}`, language, reason: error.message })
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
      // A chart component writes the `chart` class itself, so the file that uses it has one fewer for each.
      ...([...classes(code), ...(code.match(/<Chart\s/g) ?? []).map(() => 'chart')].sort().join(' ') === classes(html).join(' ') ? [] : [`${where} (${language}): the classes differ from the HTML's`]),
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
  // A pattern with a script is printed as a whole component; any other preview is an expression to return.
  const file = ({ code, markup, imports, root, script }: Printed, number: number) => root || script ? code :
    `${imports.map(({ name, from, named }) => `import ${named ? `{ ${name} }` : name} from '${from}'\n`).join('')}export function Preview${number}() {\n  return (\n${markup}\n  )\n}\n`
  for (const [number, entry] of react.entries()) {
    assert.doesNotThrow(() => transformSync(file(entry, number), { loader: 'tsx', jsx: 'automatic' }), entry.where)
  }
  // The files are imagined beside the tests, so React's types resolve from the package's own dependencies.
  const directory = fileURLToPath(new URL('./previews/', import.meta.url))
  const files = new Map(react.map((entry, number) => [`${directory}preview-${number}.tsx`, file(entry, number)]))
  // A chart preview imports the copy `npx master-ui add chart` makes; here that is the package's own component.
  files.set(`${directory}ui/chart.ts`, 'export { Chart } from \'../../../frameworks/react/chart\'\n')
  const options: ts.CompilerOptions = { jsx: ts.JsxEmit.ReactJSX, strict: true, noEmit: true, skipLibCheck: true, target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, types: [], lib: ['lib.es2023.d.ts', 'lib.dom.d.ts'] }
  const host = ts.createCompilerHost(options)
  const read = host.readFile.bind(host)
  const exists = host.fileExists.bind(host)
  const source = host.getSourceFile.bind(host)
  host.readFile = file => files.get(file) ?? read(file)
  host.fileExists = file => files.has(file) || exists(file)
  host.getSourceFile = (file, version, ...rest) => files.has(file) ? ts.createSourceFile(file, files.get(file)!, version) : source(file, version, ...rest)
  const directories = host.directoryExists?.bind(host)
  host.directoryExists = path => path.replace(/\/$/, '') === `${directory}ui` || path.replace(/\/$/, '') === directory.replace(/\/$/, '') || (directories?.(path) ?? true)
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
    const template = /<template>\n([\s\S]*)\n<\/template>$/.exec(code)![1]
    const result = compileTemplate({ source: template, filename: 'Preview.vue', id: 'preview' })
    const errors = result.errors.map(error => `${where}: ${typeof error === 'string' ? error : error.message}`)
    // A file with a setup script is compiled whole, so an import or a script of the page's that is not JavaScript is found.
    if (code.startsWith('<script setup>')) {
      const { descriptor, errors: broken } = parseVue(code, { filename: 'Preview.vue' })
      errors.push(...broken.map(error => `${where}: ${error.message}`))
      try { compileScript(descriptor, { id: 'preview' }) } catch (error) { errors.push(`${where}: ${(error as Error).message}`) }
    }
    return errors
  })
  assert.deepEqual(problems, [])
})

test('a framework imports each Master Icons drawing as its component, and HTML keeps the drawing', () => {
  const data = new URL('../../../node_modules/@master/icons/dist/data/native/', import.meta.url)
  const packages = { react: '@master/icons-react', svelte: '@master/icons-svelte', vue: '@master/icons-vue' }
  let icons = 0
  for (const { where, language, code, markup, imports } of printed) {
    if (language === 'html') {
      assert.deepEqual(imports, [], where)
      continue
    }
    for (const { name, from } of imports.filter(entry => !entry.from.startsWith('./ui/'))) {
      const [, entry] = new RegExp(`^${packages[language]}/native/((?:16|20|24)/soft/[a-z0-9-]+)$`).exec(from) ?? []
      assert.ok(entry && existsSync(new URL(`${entry}.js`, data)), `${where} (${language}): ${from} is not an entry of the release`)
      assert.ok(markup.includes(`<${name} `), `${where} (${language}): ${name} is imported and not used`)
      assert.ok(code.includes(`import ${name} from '${from}'`), where)
      icons++
    }
    assert.doesNotMatch(markup, /<svg class(?:Name)?="icon[ "]/, `${where} (${language}): an icon is still drawn inline`)
  }
  assert.ok(icons > 500, 'the previews import their icons')
  const own = printMarkup('<button type="button" class="btn btn-square" aria-label="Search"><svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/></svg></button>', 'react')
  assert.match(own, /<svg className="icon" viewBox="0 0 16 16"/, 'a drawing the release does not hold stays inline')
  assert.doesNotMatch(own, /import/)
  const labelled = printMarkup('<svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Add"><path d="M3 8L13 8"/><path d="M8 3L8 13"/></svg>', 'vue')
  assert.match(labelled, /<PlusIcon class="icon" aria-label="Add" \/>/, 'a labelled icon keeps its label, which the component reads')
})

test('a pattern with a script attaches its behaviors in every language', () => {
  const scripted = printed.filter(entry => entry.language === 'html' && entry.code.includes('import { attach } from \'@master/ui/behaviors\''))
  assert.ok(scripted.length > 100, `only ${scripted.length} previews run the behaviors`)
  for (const language of ['react', 'svelte', 'vue'] as const) {
    const attached = printed.filter(entry => entry.language === language && entry.root && !entry.script)
    const charts = printed.filter(entry => entry.language === language && entry.imports.some(({ from }) => /^\.\/ui\/[Cc]hart/.test(from)))
    assert.ok(charts.length > 30, `${language} draws ${charts.length} previews with the chart component`)
    for (const { where, code } of charts) assert.doesNotMatch(code, /MasterUI|DOMContentLoaded|attach\(/, `${where} (${language})`)
    assert.ok(attached.length + charts.length > scripted.length * .75, `${language} attaches the behaviors in ${attached.length} and draws ${charts.length} of ${scripted.length} previews`)
    for (const { where, code } of printed.filter(entry => entry.language === language && entry.root && entry.script)) assert.match(code, /\battach_*\(/, `${where} (${language})`)
    for (const { where, code } of attached) {
      assert.match(code, /import \{ attach \} from '@master\/ui\/behaviors'/, where)
      assert.match(code, { react: /useEffect\(\(\) => attach\(root\.current!\), \[\]\)[\s\S]* ref=\{root\}/, svelte: / \{@attach attach\}/, vue: /onUnmounted\(\(\) => detach\?\.\(\)\)[\s\S]* ref="root"/ }[language], where)
    }
  }
  assert.doesNotMatch(printMarkup('<p class="text">Plain</p>', 'react'), /attach/)
})

test('a script that only calls behaviors with options is made with the component, and any other script stays HTML', () => {
  const scripted = printed.filter(entry => entry.script)
  assert.ok(scripted.length >= 24, `${scripted.length} files make the calls of a page's script`)
  for (const { where, language, code, script, root } of scripted) {
    const at = `${where} (${language})`
    assert.doesNotMatch(code, /MasterUI|DOMContentLoaded|addEventListener|setTimeout|setInterval/, `${at}: only the behaviors are called`)
    for (const name of script!.behaviors) assert.match(code, new RegExp(`import \\{[^}]*\\b${name}\\b[^}]*\\} from '@master/ui/behaviors'`), at)
    assert.match(code, /detach_*\.forEach\(stop => stop\(\)\)/, `${at}: what the behaviors return is called when the component goes`)
    if (root) assert.match(code, /\battach\(/, `${at}: the behaviors in the markup are attached beside the calls`)
  }
  // The page's application is no framework's: its preview is withheld for that reason, by name.
  const application = withheld.filter(({ reason }) => /application/.test(reason))
  assert.ok(application.length > 0 && application.length % 3 === 0, 'React, Svelte and Vue withhold the same previews')
  for (const page of ['countdown', 'odometer', 'busy', 'keypad', 'snippet']) assert.ok(application.some(({ where }) => where.startsWith(`components/${page}/`)), `${page} keeps its script in HTML`)
  const late = printMarkup('<div class="calendar" id="stay"></div>\n<script>\naddEventListener(\'DOMContentLoaded\', function () {\n  MasterUI.calendar(document.getElementById(\'stay\'), { range: true })\n})\n</script>', 'react', { behaviors: true })
  assert.match(late, /const detach = \[\n {6}attach\(root\.current!\),\n {6}calendar\(document\.getElementById\('stay'\)!, \{ range: true \}\),\n {4}\]\n {4}return \(\) => detach\.forEach\(stop => stop\(\)\)/, 'a script that waited for the document is called after the behaviors, and every one is undone')
  assert.throws(() => printMarkup('<button class="btn" id="save">Save</button>\n<script>\n  document.getElementById(\'save\').addEventListener(\'click\', function () {})\n</script>', 'svelte'), UnsupportedMarkup)
  assert.throws(() => printMarkup('<div class="calendar" id="stay"></div>\n<script>\n  var picker = MasterUI.calendar(document.getElementById(\'stay\'))\n  picker.value = \'2026-11-04\'\n</script>', 'vue', { behaviors: true }), UnsupportedMarkup, 'a call whose result the page goes on to use is the page\'s')
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
