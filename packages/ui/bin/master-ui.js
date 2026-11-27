#!/usr/bin/env node
/**
 * master-ui: read the contracts, check markup against them, and take ownership of a component's source.
 *
 *   master-ui list [--json]             every contract, one line each
 *   master-ui contract <name…>          one contract as JSON: classes, states, properties, example; a class
 *                                       name finds the contract it belongs to
 *   master-ui check [paths…]            report markup that breaks a contract, a stylesheet of the library that
 *                                       is loaded twice, and a project rule that redraws a component; with a
 *                                       material in master-ui.json, a component used before it was adopted;
 *                                       accepts files, directories and globs (--strict: a class that only looks
 *                                       like one and a redrawn component are errors, --json)
 *   master-ui init                      write ui/index.css, one @import per stylesheet (--directory=src/ui for
 *                                       another place than ui/, --force to write it again)
 *   master-ui own <name…>               copy a component's stylesheet, contract and behavior into the project
 *                                       (--force to replace a copy that is already there)
 *   master-ui add [name…]               copy a React, Svelte or Vue component into the project, or list them
 *                                       without a name (--framework=react, remembered; --directory=src/lib/ui
 *                                       for another place than ui/; --force)
 *   master-ui status [--json]           which owned or added components changed upstream since they were taken;
 *                                       exits with 2 when one did
 *   master-ui diff <name…>              what changed upstream in an owned or added component
 *   master-ui accept <name…>            record that upstream's current version has been merged
 *
 * It has no dependency. Where the project keeps its copies, which components it owns or added, where its own
 * contracts are (`contracts`, globs beside ui/*.json) and its material (`material`: the stylesheets that give
 * components the project's face, the samples that show them and the components it adopted) are read from
 * master-ui.json.
 */
import { createHash } from 'node:crypto'
import { existsSync, globSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beside, check, checkImports, checkMaterial, checkStyles, createIndex, declared, format, imports as importsOf, parse, styles as stylesOf } from '../check/index.js'

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8'))
const cwd = process.cwd()
const configFile = join(cwd, 'master-ui.json')
const [command, ...rest] = process.argv.slice(2)
const flags = new Set(rest.filter(argument => argument.startsWith('--')).map(argument => argument.split('=')[0]))
const option = (/** @type {string} */ name) => rest.find(argument => argument.startsWith(`--${name}=`))?.split('=').slice(1).join('=')
const names = rest.filter(argument => !argument.startsWith('--'))
const read = (/** @type {string} */ file) => readFileSync(file, 'utf8')
const hash = (/** @type {string} */ text) => createHash('sha256').update(text).digest('hex').slice(0, 16)
const fail = (/** @type {string} */ message) => { console.error(message); process.exit(1) }

/**
 * @typedef {{ version: string | null, files: Record<string, string> }} Taken What was copied, and a hash of each file as it was.
 * @typedef {{ stylesheets?: string[], samples?: string[], adopted?: string[] }} Material A material of the project's own:
 *   the stylesheets that give components its face, the samples that show each one, and the components adopted.
 * @returns {{ directory: string, entry: string, contracts?: string[], framework?: string, material?: Material, owned: Record<string, Taken>, components: Record<string, Taken & { framework: string }> }}
 */
function config() {
  const defaults = { directory: 'ui', entry: 'ui/index.css', owned: {}, components: {} }
  return existsSync(configFile) ? { ...defaults, ...JSON.parse(read(configFile)) } : defaults
}
const save = (/** @type {ReturnType<typeof config>} */ value) => writeFileSync(configFile, `${JSON.stringify(value, null, 2)}\n`)

/** The stylesheets of the library in the order master.css imports them. */
const imports = [...read(join(pkgRoot, 'master.css')).matchAll(/@import\s+['"]\.\/([^'"]+)['"]/g)].map(match => match[1])
const stylesheetOf = (/** @type {string} */ name) => imports.find(file => file.endsWith(`/${name}.css`))

/**
 * The custom properties the library keeps to itself: every one its stylesheets declare or read that is neither a
 * token of the theme nor a property a contract lists. A project rule that sets one restyles by an internal name.
 */
function internals(/** @type {any[]} */ all) {
  const strip = (/** @type {string} */ text) => text.replace(/\/\*[\s\S]*?\*\//g, '')
  const theme = strip(read(join(pkgRoot, 'theme.css')))
  const tokens = new Set([...theme.matchAll(/(--[a-z][\w-]*)\s*:/g)].map(match => match[1]))
  const listed = new Set(all.flatMap(contract => (contract.properties ?? []).map((/** @type {{ name: string }} */ property) => property.name)))
  const used = new Set(imports.flatMap(file => [...strip(read(join(pkgRoot, file))).matchAll(/--[a-z][\w-]*/g)].map(match => match[0])))
  return new Set([...used].filter(name => !tokens.has(name) && !listed.has(name)))
}

/** The files a glob or a list of globs names, relative to the project. */
const matching = (/** @type {string[] | string | undefined} */ patterns) => [...new Set([patterns ?? []].flat().flatMap(pattern => globSync(pattern, { cwd })))].map(file => file.replaceAll('\\', '/')).sort()

/** Markup files a sample imports, and theirs: a sample shows what the components it renders render. */
function reach(/** @type {string[]} */ files) {
  const markup = ['.astro', '.svelte', '.vue', '.jsx', '.tsx', '.html']
  const seen = new Set(files)
  const pending = [...files]
  while (pending.length) {
    const file = /** @type {string} */ (pending.pop())
    const source = read(join(cwd, file)).replace(/\/\*[\s\S]*?\*\//g, '')
    for (const match of source.matchAll(/\b(?:import|from)\s*(?:[^'"\n;]*?\bfrom\s*)?['"](\.{1,2}\/[^'"?]+)['"]/g)) {
      const base = join(dirname(join(cwd, file)), match[1])
      const found = [base, ...markup.map(extension => `${base}${extension}`)].find(candidate => markup.some(extension => candidate.endsWith(extension)) && existsSync(candidate))
      if (!found) continue
      const path = relative(cwd, found).replaceAll('\\', '/')
      if (path.startsWith('..') || seen.has(path)) continue
      seen.add(path)
      pending.push(path)
    }
  }
  return [...seen]
}

/**
 * Every contract that applies to this project: the library's, then the project's own. A project contract
 * with the name of a library contract replaces it, which is what owning a component means.
 */
function contracts() {
  /** @type {Map<string, any>} */
  const found = new Map()
  for (const file of imports.filter(file => file !== 'theme.css')) {
    const contract = JSON.parse(read(join(pkgRoot, file.replace(/\.css$/, '.json'))))
    found.set(contract.name, { ...contract, source: `@master/ui/${file.replace(/\.css$/, '.json')}` })
  }
  const settings = config()
  const patterns = [`${settings.directory}/*.json`, ...(settings.contracts ?? [])]
  for (const file of patterns.flatMap(pattern => globSync(pattern, { cwd }))) {
    try {
      const contract = JSON.parse(read(join(cwd, file)))
      if (contract?.name && Array.isArray(contract.classes)) found.set(contract.name, { ...contract, source: file })
    } catch { /* not a contract */ }
  }
  return [...found.values()]
}

/** Whether a class is a Master CSS preset utility, when the project has Master CSS installed. */
async function utilities() {
  try {
    const { createRequire } = await import('node:module')
    const require = createRequire(join(cwd, 'package.json'))
    const { createRenderSessionSync } = await import(require.resolve('@master/css/node'))
    const manifest = JSON.parse(read(require.resolve('@master/css-preset/default-manifest.json')))
    const engine = createRenderSessionSync({ manifest })
    const cache = new Map()
    return (/** @type {string} */ name) => {
      if (!cache.has(name)) cache.set(name, !engine.ensureClassRules([name]).invalidClassNames.includes(name))
      return cache.get(name)
    }
  } catch { return undefined }
}

/** A line diff by longest common subsequence: enough to show what changed in a stylesheet. */
function diff(/** @type {string} */ before, /** @type {string} */ after) {
  const a = before.split('\n')
  const b = after.split('\n')
  const table = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1))
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1])
  /** @type {string[]} */
  const lines = []
  let i = 0
  let j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { lines.push(`  ${a[i]}`); i++; j++ } else if (j < b.length && (i === a.length || table[i][j + 1] >= table[i + 1][j])) lines.push(`+ ${b[j++]}`)
    else lines.push(`- ${a[i++]}`)
  }
  // Keep three lines of context around each change.
  const keep = lines.map((line, at) => lines.slice(Math.max(0, at - 3), at + 4).some(near => !near.startsWith('  ')))
  return lines.filter((_, at) => keep[at]).join('\n')
}

/** The files of a component as the installed package has them. */
function upstream(/** @type {string} */ name) {
  const stylesheet = stylesheetOf(name)
  if (!stylesheet) fail(`"${name}" is not a Master UI stylesheet. Run "master-ui list".`)
  const contract = JSON.parse(read(join(pkgRoot, /** @type {string} */ (stylesheet).replace(/\.css$/, '.json'))))
  /** @type {Record<string, string>} */
  const files = { [`${name}.css`]: read(join(pkgRoot, /** @type {string} */ (stylesheet))), [`${name}.json`]: `${JSON.stringify({ ...contract, $schema: 'https://ui.master.co/contract.schema.json' }, null, 2)}\n` }
  if (contract.behavior) {
    // A behavior may share a small module with others (`./internal.js`); the copy needs it beside it.
    const pending = [`${contract.behavior}.js`]
    while (pending.length) {
      const file = /** @type {string} */ (pending.pop())
      if (files[file]) continue
      files[file] = read(join(pkgRoot, 'behaviors', file))
      for (const match of files[file].matchAll(/from\s+['"]\.\/([\w-]+\.js)['"]/g)) pending.push(match[1])
    }
  }
  return { stylesheet: /** @type {string} */ (stylesheet), files }
}

/** The framework components the package has: what each renders and its file in each framework. */
const manifest = JSON.parse(read(join(pkgRoot, 'frameworks/manifest.json')))

/** The framework a project uses, when its package.json names exactly one. */
function detect() {
  try {
    const { dependencies = {}, devDependencies = {} } = JSON.parse(read(join(cwd, 'package.json')))
    const found = Object.keys(manifest.frameworks).filter(name => manifest.frameworks[name].package in dependencies || manifest.frameworks[name].package in devDependencies)
    return found.length === 1 ? found[0] : undefined
  } catch { return undefined }
}

/**
 * The files of a framework component as the installed package has them: the component and what it imports
 * from beside it. A behavior the project owns is imported from the project's copy.
 */
function shell(/** @type {string} */ name, /** @type {string} */ framework, /** @type {string} */ directory) {
  const entry = manifest.components[name]?.[framework]
  const available = Object.keys(manifest.components).join(', ')
  if (!manifest.frameworks[framework]) fail(`"${framework}" is not a framework Master UI has components for. It has: ${Object.keys(manifest.frameworks).join(', ')}.`)
  if (!entry) {
    fail(stylesheetOf(name)
      ? `"${name}" has no ${manifest.frameworks[framework].title} component: it is a class on a native element, so its markup is the same in every framework. Read it with "master-ui contract ${name}".\nThe components are: ${available}.`
      : `No component is named "${name}". The components are: ${available}.`)
  }
  const from = join(pkgRoot, 'frameworks', framework)
  /** @type {Record<string, string>} */
  const files = {}
  const pending = [entry]
  while (pending.length) {
    const file = /** @type {string} */ (pending.pop())
    if (files[file] !== undefined) continue
    // Owning a behavior may copy internal.js as its support file. Other components still use the package's copy.
    files[file] = read(join(from, file)).replace(/(['"])@master\/ui\/behaviors\/([\w-]+\.js)\1/g, (whole, quote, behavior) => behavior !== 'internal.js' && existsSync(join(directory, behavior)) ? `${quote}./${behavior}${quote}` : whole)
    for (const match of files[file].matchAll(/from\s+['"]\.\/([\w.-]+)['"]/g)) {
      // An import may name the file as it is, without its extension, or as the `.js` its `.ts` compiles to.
      const found = [match[1], `${match[1]}.ts`, `${match[1]}.tsx`, match[1].replace(/\.js$/, '.ts')].find(candidate => existsSync(join(from, candidate)))
      if (found) pending.push(found)
    }
  }
  return files
}

/** Everything the project took from the package: the components it owns and the framework components it added. */
function taken(/** @type {ReturnType<typeof config>} */ settings) {
  return [
    ...Object.entries(settings.owned).map(([name, record]) => ({ name, record, files: () => upstream(name).files })),
    ...Object.entries(settings.components).map(([name, record]) => ({ name, record, files: () => shell(name, record.framework, join(cwd, settings.directory)) })),
  ]
}

const commands = {
  list() {
    const all = contracts()
    if (flags.has('--json')) return console.log(JSON.stringify(all.map(({ name, title, tier, category, description, use, script }) => ({ name, title, tier, category, description, use, script })), null, 2))
    const width = Math.max(...all.map(contract => contract.name.length))
    for (const contract of all) console.log(`${contract.name.padEnd(width)}  ${contract.description}`)
  },

  contract() {
    if (!names.length) fail('Name a contract: master-ui contract button')
    const all = contracts()
    const index = createIndex(all)
    for (const name of names) {
      const contract = all.find(item => item.name === name) ?? index.classes.get(name)?.contract
      if (!contract) fail(`No contract is named "${name}" and no contract has a class "${name}". Run "master-ui list".`)
      console.log(JSON.stringify(contract, null, 2))
    }
  },

  async check() {
    // Markup is checked against the contracts; stylesheets and modules are read for how they import the library,
    // and stylesheets and the <style> of templates for what they redraw.
    const markup = 'html,htm,astro,svelte,vue,jsx,tsx,mdx,erb,php,njk,liquid,hbs'
    const sources = `${markup},css,scss,sass,less,pcss,postcss,js,mjs,cjs,ts,mts,cts`
    const isMarkup = (/** @type {string} */ file) => !/\.(?:css|scss|sass|less|pcss|postcss|[cm]?[jt]s)$/.test(file)
    const settings = config()
    const patterns = names.length ? names : [`**/*.{${sources}}`]
    const found = [...new Set(patterns.flatMap(pattern => {
      const path = resolve(cwd, pattern)
      const kind = statSync(path, { throwIfNoEntry: false })
      if (kind?.isFile()) return [path]
      const directory = kind?.isDirectory() ? path : cwd
      const glob = kind?.isDirectory() ? `**/*.{${sources}}` : pattern
      return globSync(glob, { cwd: directory, exclude: file => /(^|\/)(node_modules|dist|out|build|\.git|\.astro|\.next|\.svelte-kit)(\/|$)/.test(file) }).map(file => resolve(directory, file))
    }).map(file => {
      const path = relative(cwd, file)
      // macOS can spell the working directory as /var or /private/var. Keep one spelling for both.
      if (path.startsWith(`..${sep}`) || isAbsolute(path)) {
        const physical = relative(cwd, realpathSync(file))
        if (!physical.startsWith(`..${sep}`) && !isAbsolute(physical)) return physical.replaceAll('\\', '/')
      }
      return path.replaceAll('\\', '/')
    }))]
    const files = found.filter(isMarkup)
    const all = contracts()
    const index = createIndex(all)
    const knows = await utilities()
    const strict = flags.has('--strict')
    /** @type {Map<string, import('../check/index.js').Diagnostic[]>} */
    const byFile = new Map(files.map(file => [file, check(read(resolve(cwd, file)), index, { knows, strict })]))
    const add = (/** @type {{ file: string, diagnostics: import('../check/index.js').Diagnostic[] }[]} */ results) => {
      for (const { file, diagnostics } of results) byFile.set(file, [...byFile.get(file) ?? [], ...diagnostics])
    }
    const loaded = found.map(file => ({ file, imports: importsOf(read(resolve(cwd, file)), file) })).filter(item => item.imports.length)
    add(checkImports(loaded, { entry: settings.entry }))

    // What the project's own rules redraw. A component's own stylesheet, the project's copy of one or one it
    // wrote beside its contract, is where that component is drawn, so it is not read, nor the bases kept to merge.
    const library = new Set(imports.map(file => file.replace(/^.*\//, '').replace(/\.css$/, '')))
    const ownSheets = new Set(all.filter(contract => !String(contract.source).startsWith('@master/ui/')).map(contract => String(contract.source).replace(/\.json$/, '.css')))
    const documents = new Map(files.map(file => [file, parse(read(resolve(cwd, file)))]))
    const styled = found.filter(file => /\.(?:css|scss|less|pcss|postcss|html?|astro|svelte|vue)$/i.test(file) && !ownSheets.has(file) && !file.startsWith(`${settings.directory}/.base/`))
      .map(file => {
        const source = read(resolve(cwd, file))
        // Svelte and Astro scope a component's <style> to its own markup, and Vue does with `scoped`.
        const scoped = /\.(?:svelte|astro)$/i.test(file) ? !/<style\b[^>]*\bis:global\b/i.test(source) : /\.vue$/i.test(file) && /<style\b[^>]*\bscoped\b/i.test(source)
        return { file, styles: stylesOf(source, file), beside: scoped ? beside([documents.get(file) ?? []], index) : undefined }
      })
      .filter(item => item.styles.rules.length || item.styles.mixins.size)
    const theme = stylesOf(read(join(pkgRoot, 'theme.css')), 'theme.css')
    const drawnHere = declared(imports.filter(file => file !== 'theme.css').map(file => stylesOf(read(join(pkgRoot, file)), file)), theme.mixins)
    add(checkStyles(styled, index, { beside: beside([...documents.values()], index), declared: drawnHere, internal: internals(all), mixins: theme.mixins.keys(), own: all.filter(contract => !library.has(contract.name)).map(contract => contract.name), strict }))

    // A material of the project's own: each component is adopted once, and shown, before a page uses it.
    if (settings.material) {
      const samples = matching(settings.material.samples)
      const shown = reach(samples).map(file => ({ file, elements: documents.get(file) ?? parse(read(join(cwd, file))) }))
      add(checkMaterial(files.filter(file => !samples.includes(file)).map(file => ({ file, elements: /** @type {any} */ (documents.get(file)) })), index, {
        adopted: settings.material.adopted ?? [],
        own: all.filter(contract => !library.has(contract.name)).map(contract => contract.name),
        samples: shown,
        stylesheets: [settings.material.stylesheets ?? []].flat(),
        config: { file: 'master-ui.json', source: read(configFile) },
      }))
    }

    const results = [...byFile].map(([file, diagnostics]) => ({ file, diagnostics: diagnostics.sort((a, b) => a.line - b.line || a.column - b.column) })).filter(result => result.diagnostics.length)
    const reported = results.flatMap(result => result.diagnostics)
    if (flags.has('--json')) console.log(JSON.stringify({ files: found.length, results }, null, 2))
    else {
      for (const { file, diagnostics } of results) console.log(format(diagnostics, file))
      const errors = reported.filter(diagnostic => diagnostic.severity === 'error').length
      console.log(`${results.length ? '\n' : ''}${found.length} files checked: ${errors} errors, ${reported.length - errors} warnings.`)
    }
    if (reported.some(diagnostic => diagnostic.severity === 'error')) process.exitCode = 1
  },

  init() {
    const settings = config()
    if (option('directory')) {
      settings.directory = /** @type {string} */ (option('directory'))
      settings.entry = `${settings.directory}/index.css`
    }
    const entry = join(cwd, settings.entry)
    if (existsSync(entry) && !flags.has('--force')) fail(`${settings.entry} exists. Pass --force to write it again.`)
    mkdirSync(dirname(entry), { recursive: true })
    writeFileSync(entry, [
      '/*',
      ' * Master UI, one import per stylesheet. Import this file after `@import \'@master/css\'`.',
      ' * Delete a line to leave a component out. `master-ui own <name>` points a line at your own copy.',
      ' * This file stands in place of `@import \'@master/ui\'` and is the one source of the library: no other',
      ' * stylesheet and no module imports one of these stylesheets again.',
      ' */',
      ...imports.map(file => `@import '@master/ui/${file}';`),
      '',
    ].join('\n'))
    save(settings)
    console.log(`Wrote ${settings.entry} (${imports.length} imports) and master-ui.json.\nImport it after the preset:\n\n  @import '@master/css';\n  @import './${settings.entry}';`)
  },

  own() {
    if (!names.length) fail('Name what to own: master-ui own button')
    const settings = config()
    const directory = join(cwd, settings.directory)
    for (const name of names) {
      const { stylesheet, files } = upstream(name)
      mkdirSync(join(directory, '.base'), { recursive: true })
      for (const [file, content] of Object.entries(files)) {
        // The base is what was taken: with it, a later upstream change can be merged into an edited copy.
        writeFileSync(join(directory, '.base', file), content)
        if (existsSync(join(directory, file)) && !flags.has('--force')) {
          if (read(join(directory, file)) !== content) console.log(`  kept ${settings.directory}/${file} (it exists; pass --force to replace it)`)
        } else writeFileSync(join(directory, file), content)
      }
      settings.owned[name] = { version: pkg.version ?? null, files: Object.fromEntries(Object.entries(files).map(([file, content]) => [file, hash(content)])) }
      const entry = join(cwd, settings.entry)
      const line = `@import '@master/ui/${stylesheet}';`
      const own = `@import './${relative(dirname(entry), join(directory, `${name}.css`)).replaceAll('\\', '/')}';`
      if (existsSync(entry) && read(entry).includes(line)) {
        writeFileSync(entry, read(entry).replace(line, own))
        console.log(`Own ${name}: ${Object.keys(files).map(file => `${settings.directory}/${file}`).join(', ')}; ${settings.entry} now imports your copy.`)
      } else {
        console.log(`Own ${name}: ${Object.keys(files).map(file => `${settings.directory}/${file}`).join(', ')}.\n  Replace the library's import of it with your copy:\n    - ${line}\n    + ${own}\n  If you import all of '@master/ui', run "master-ui init" first to get one import per stylesheet.\n  If modules import it (import '@master/ui/${stylesheet}'), point those imports at your copy instead.`)
      }
      save(settings)
    }
  },

  add() {
    const settings = config()
    const framework = option('framework') ?? settings.framework ?? detect()
    if (!framework) fail(`Say which framework: master-ui add combobox --framework=react. It is one of: ${Object.keys(manifest.frameworks).join(', ')}.`)
    if (!manifest.frameworks[framework]) fail(`"${framework}" is not a framework Master UI has components for. It has: ${Object.keys(manifest.frameworks).join(', ')}.`)
    // A framework may keep its source somewhere of its own: src/lib in SvelteKit, app in Nuxt.
    if (option('directory')) {
      settings.directory = /** @type {string} */ (option('directory'))
      if (!existsSync(join(cwd, settings.entry))) settings.entry = `${settings.directory}/index.css`
    }
    const directory = join(cwd, settings.directory)
    if (!names.length) {
      const width = Math.max(...Object.keys(manifest.components).map(name => name.length))
      console.log(`The ${manifest.frameworks[framework].title} components. Every other contract is a class on a native element: its markup is the same in every framework.\n`)
      for (const [name, entry] of Object.entries(manifest.components)) console.log(`${name.padEnd(width)}  ${entry[framework]}`)
      return
    }
    for (const name of names) {
      const files = shell(name, /** @type {string} */ (framework), directory)
      mkdirSync(join(directory, '.base'), { recursive: true })
      for (const [file, content] of Object.entries(files)) {
        writeFileSync(join(directory, '.base', file), content)
        if (existsSync(join(directory, file)) && !flags.has('--force')) {
          if (read(join(directory, file)) !== content) console.log(`  kept ${settings.directory}/${file} (it exists; pass --force to replace it)`)
        } else writeFileSync(join(directory, file), content)
      }
      settings.framework = framework
      settings.components[name] = { framework: /** @type {string} */ (framework), version: pkg.version ?? null, files: Object.fromEntries(Object.entries(files).map(([file, content]) => [file, hash(content)])) }
      console.log(`Add ${name}: ${Object.keys(files).map(file => `${settings.directory}/${file}`).join(', ')}.\n  It renders the markup of "master-ui contract ${manifest.components[name].contract}" and needs that stylesheet from @master/ui.`)
    }
    save(settings)
  },

  status() {
    const settings = config()
    const rows = taken(settings).map(({ name, record, files: read_ }) => {
      const files = read_()
      const changed = Object.entries(files).filter(([file, content]) => record.files[file] !== hash(content)).map(([file]) => file)
      const edited = Object.keys(files).filter(file => existsSync(join(cwd, settings.directory, file)) && hash(read(join(cwd, settings.directory, file))) !== record.files[file])
      return { name, taken: record.version, upstream: changed, edited }
    })
    if (flags.has('--json')) return console.log(JSON.stringify(rows, null, 2))
    if (!rows.length) return console.log('This project neither owns nor added a component. Everything follows @master/ui.')
    for (const row of rows) console.log(`${row.name}  ${row.upstream.length ? `upstream changed: ${row.upstream.join(', ')} (master-ui diff ${row.name})` : 'upstream unchanged'}${row.edited.length ? `; edited here: ${row.edited.join(', ')}` : ''}`)
    if (rows.some(row => row.upstream.length)) process.exitCode = 2
  },

  diff() {
    if (!names.length) fail('Name an owned or added component: master-ui diff button')
    const settings = config()
    for (const name of names) {
      const found = taken(settings).filter(item => item.name === name)
      if (!found.length) fail(`This project neither owns nor added "${name}".`)
      for (const [file, content] of found.flatMap(item => Object.entries(item.files()))) {
        const base = join(cwd, settings.directory, '.base', file)
        if (!existsSync(base)) { console.log(`# ${file}: no base copy; compare ${settings.directory}/${file} with the package by hand`); continue }
        const changes = diff(read(base), content)
        console.log(changes ? `# ${file}: taken (-) and upstream now (+)\n${changes}\n` : `# ${file}: unchanged upstream`)
      }
    }
  },

  accept() {
    if (!names.length) fail('Name an owned or added component: master-ui accept button')
    const settings = config()
    for (const name of names) {
      const found = taken(settings).filter(item => item.name === name)
      if (!found.length) fail(`This project neither owns nor added "${name}".`)
      mkdirSync(join(cwd, settings.directory, '.base'), { recursive: true })
      for (const { record, files: read_ } of found) {
        const files = read_()
        for (const [file, content] of Object.entries(files)) writeFileSync(join(cwd, settings.directory, '.base', file), content)
        record.version = pkg.version ?? null
        record.files = Object.fromEntries(Object.entries(files).map(([file, content]) => [file, hash(content)]))
      }
      console.log(`${name}: upstream's current version is now the base. Your copy in ${settings.directory}/ was not touched.`)
    }
    save(settings)
  },
}

if (!command || command === 'help' || command === '--help' || !(command in commands)) {
  if (command && command !== 'help' && command !== '--help') console.error(`"${command}" is not a command of master-ui.\n`)
  const source = read(fileURLToPath(import.meta.url)).split('\n')
  console.log(source.slice(2, source.indexOf(' */')).map(line => line.replace(/^ \* ?/, '')).join('\n'))
  process.exit(command && command !== 'help' && command !== '--help' ? 1 : 0)
}
await commands[/** @type {keyof typeof commands} */ (command)]()
