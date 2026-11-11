/**
 * Build what a project without Master CSS, a registry and a tool need from the same source:
 *
 *   dist/standalone.css          the theme and every component as plain CSS, for a <link> or any bundler
 *   dist/themes/<name>.css       the same with another theme applied
 *   dist/base.css                the small reset the components assume (box-sizing, form control fonts)
 *   dist/contracts.json          every contract, with what was read from its stylesheet
 *   dist/theme.json              every token of the theme, with its value
 *   dist/behaviors/<name>.d.ts   the types of the behaviors, read from their JSDoc
 *
 * The source stays the CSS in this package; nothing here is written by hand twice.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { compileManifestSync } from '@master/css-compiler/node'
import { createRenderSessionSync } from '@master/css/node'
import preset from '@master/css-preset/default-manifest.json' with { type: 'json' }

const root = new URL('../', import.meta.url)
const read = (file: string) => readFileSync(new URL(file, root), 'utf8')
const write = (file: string, content: string) => {
  const url = new URL(`dist/${file}`, root)
  mkdirSync(new URL('./', url), { recursive: true })
  writeFileSync(url, content)
  return `dist/${file} ${(content.length / 1024).toFixed(1)} kB`
}
const list = (directory: string, extension: string) => existsSync(new URL(`${directory}/`, root)) ? readdirSync(new URL(`${directory}/`, root)).filter(file => file.endsWith(extension)).sort() : []
const pkg = JSON.parse(read('package.json'))
const imports = [...read('master.css').matchAll(/@import\s+['"]\.\/([^'"]+)['"]/g)].map(match => match[1])
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/** Every custom property a theme file declares in `@theme`, in source order. */
function themeTokens(source: string) {
  const tokens: string[] = []
  for (const block of strip(source).matchAll(/@theme\s*\{([\s\S]*?)\n\}/g)) {
    for (const match of block[1].matchAll(/(?:^|[;{\s])(--[a-z][a-z0-9-]*)\s*:/g)) if (!tokens.includes(match[1])) tokens.push(match[1])
  }
  return tokens
}

/**
 * Compile the library, with any extra theme files after it, to CSS a browser reads without Master CSS.
 * The engine emits a theme variable only when something reads it, so a stylesheet that reads every token is
 * registered beside the components: a project that links the file can use any token in its own CSS.
 */
/**
 * Which scheme the tokens resolve for. With Master CSS the preset says so; a page that links the compiled
 * file has no preset, and without this `light-dark()` gives the light value whatever the reader prefers.
 * A minifier that lowers `light-dark()` for older browsers needs the declaration too: without one it
 * writes values no browser reads, and every surface loses its color.
 */
const scheme = '@layer base{:root{color-scheme:light dark}[data-theme="light"],:host([data-theme="light"]){color-scheme:light}[data-theme="dark"],:host([data-theme="dark"]){color-scheme:dark}}'

function standalone(themes: string[] = []) {
  const source = [...imports, ...themes].map(read).join('\n\n')
  const compiled = compileManifestSync(source, { baseManifest: preset as never })
  const problems = compiled.diagnostics.filter(diagnostic => diagnostic.severity === 'error' || diagnostic.severity === 'warning')
  if (problems.length) throw new Error(`The library does not compile:\n${JSON.stringify(problems, null, 2)}`)
  const tokens = themeTokens(['theme.css', ...themes].map(read).join('\n'))
  const session = createRenderSessionSync({ manifest: compiled.manifest as never })
  try {
    const every = `.master-ui-tokens{${tokens.map((token, at) => `--t${at}:var(${token})`).join(';')}}`
    const theme = session.ensureStylesheetResources(`${compiled.css}\n${every}`).snapshot().cssText
    return { css: `@layer theme, base, defaults, components, utilities;\n${scheme}\n${theme}\n${compiled.css}`, theme, tokens, compiled }
  } finally { session.dispose() }
}

const banner = (what: string) => `/*! @master/ui${pkg.version ? ` ${pkg.version}` : ''} | ${what} | MIT License | https://ui.master.co */\n`
const report: string[] = []
rmSync(new URL('dist/', root), { recursive: true, force: true })

const base = standalone()
report.push(write('standalone.css', banner('Moonstone / Obsidian, every component, plain CSS') + base.css))
for (const file of list('themes', '.css')) {
  report.push(write(`themes/${file}`, banner(`${file.replace(/\.css$/, '')} theme, every component, plain CSS`) + standalone([`themes/${file}`]).css))
}

/** The reset the components assume. It is the preset's own base layer, so both ways of installing agree. */
const require = createRequire(import.meta.url)
report.push(write('base.css', banner('the base layer of the Master CSS preset') + readFileSync(require.resolve('@master/css-preset/base.css'), 'utf8')))

/** The theme as data: the last value each token is given at the root, light and dark in one. */
const values = new Map<string, string>()
for (const block of base.theme.matchAll(/:root,:host\{([^{}]*)\}/g)) {
  for (const declaration of block[1].split(/;(?![^(]*\))/)) {
    const at = declaration.indexOf(':')
    if (at > 0) values.set(declaration.slice(0, at).trim(), declaration.slice(at + 1).trim())
  }
}
report.push(write('theme.json', `${JSON.stringify({ name: pkg.name, version: pkg.version ?? null, tokens: base.tokens.map(name => ({ name, value: values.get(name) ?? null })) }, null, 2)}\n`))

/** Contracts, in the order master.css imports their stylesheets, each with what its stylesheet reads. */
const mixins = [...strip(read('theme.css')).matchAll(/@mixin\s+(--[a-z0-9-]+)/g)].map(match => match[1])
const contracts = imports.filter(file => file !== 'theme.css').map(file => {
  const contract = JSON.parse(read(file.replace(/\.css$/, '.json')))
  const source = strip(read(file))
  delete contract.$schema
  return {
    ...contract,
    stylesheet: file,
    tokens: base.tokens.filter(token => new RegExp(`var\\(${token}[,)]`).test(source)),
    mixins: mixins.filter(mixin => new RegExp(`@apply\\s+${mixin}\\b`).test(source)),
  }
})
report.push(write('contracts.json', `${JSON.stringify({ name: pkg.name, version: pkg.version ?? null, schema: 'https://ui.master.co/contract.schema.json', contracts }, null, 2)}\n`))

/**
 * The behaviors are JavaScript with JSDoc types, so that a page can paste one. A TypeScript project reads
 * the same types as declarations, written here; a behavior whose JSDoc does not hold fails the build.
 */
const behaviors = list('behaviors', '.js').map(file => new URL(`behaviors/${file}`, root).pathname)
const program = ts.createProgram(behaviors, {
  allowJs: true, checkJs: true, declaration: true, emitDeclarationOnly: true, strict: true, skipLibCheck: true,
  target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext,
  lib: ['lib.es2023.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'], types: [], outDir: new URL('dist/behaviors', root).pathname,
})
const declared: string[] = []
const emitted = program.emit(undefined, (file, text) => {
  mkdirSync(new URL('dist/behaviors/', root), { recursive: true })
  writeFileSync(file, text)
  declared.push(file)
})
const typeErrors = [...ts.getPreEmitDiagnostics(program), ...emitted.diagnostics].filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error)
if (typeErrors.length) throw new Error(`The behaviors do not type-check:\n${ts.formatDiagnostics(typeErrors, { getCanonicalFileName: name => name, getCurrentDirectory: () => new URL('.', root).pathname, getNewLine: () => '\n' })}`)
report.push(`dist/behaviors/*.d.ts ${declared.length} declarations`)

/**
 * The README's table of classes is written from the contracts, between two markers, so the package page on
 * npm lists exactly what the stylesheets define. A test fails when it is out of date.
 */
function readmeTable() {
  const rows = contracts.map(contract => `| ${contract.tier === 'layout' ? `${contract.title} (layout)` : contract.title} | ${contract.classes.map((entry: { name: string }) => `\`${entry.name}\``).join(', ')} |`)
  return ['| Stylesheet | Classes |', '| --- | --- |', ...rows].join('\n')
}
const readme = read('README.md')
const marked = readme.replace(/<!-- contracts:start -->[\s\S]*<!-- contracts:end -->/, `<!-- contracts:start -->\n${readmeTable()}\n<!-- contracts:end -->`)
if (marked !== readme) {
  writeFileSync(new URL('README.md', root), marked)
  report.push('README.md: the table of classes was rewritten from the contracts')
}

console.log(report.join('\n'))
