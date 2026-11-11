#!/usr/bin/env node
/**
 * master-ui: read the contracts, check markup against them, and take ownership of a component's source.
 *
 *   master-ui list                      every contract, one line each
 *   master-ui contract <name>           one contract as JSON: classes, states, properties, example
 *   master-ui check [paths…]            report markup that breaks a contract
 *   master-ui init                      write ui/index.css, one @import per component
 *   master-ui own <name…>               copy a component's stylesheet, contract and behavior into the project
 *   master-ui add <name…>               copy a React, Svelte or Vue component into the project (--framework=react)
 *   master-ui status                    which owned or added components changed upstream since they were taken
 *   master-ui diff <name>               what changed upstream in an owned or added component
 *   master-ui accept <name…>            record that upstream's current version has been merged
 *
 * It has no dependency. A project's own contracts and the components it owns are read from master-ui.json.
 */
import { createHash } from 'node:crypto'
import { existsSync, globSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { check, createIndex, format } from '../check/index.js'

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
 * @returns {{ directory: string, entry: string, contracts?: string[], framework?: string, owned: Record<string, Taken>, components: Record<string, Taken & { framework: string }> }}
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
    files[file] = read(join(from, file)).replace(/(['"])@master\/ui\/behaviors\/([\w-]+\.js)\1/g, (whole, quote, behavior) => existsSync(join(directory, behavior)) ? `${quote}./${behavior}${quote}` : whole)
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
    for (const name of names) {
      const index = createIndex(all)
      const contract = all.find(item => item.name === name) ?? index.classes.get(name)?.contract
      if (!contract) fail(`No contract is named "${name}" and no contract has a class "${name}". Run "master-ui list".`)
      console.log(JSON.stringify(contract, null, 2))
    }
  },

  async check() {
    const patterns = names.length ? names : ['**/*.{html,htm,astro,svelte,vue,jsx,tsx,mdx,erb,php,njk,liquid,hbs}']
    const files = [...new Set(patterns.flatMap(pattern => existsSync(join(cwd, pattern)) && statSync(join(cwd, pattern)).isFile()
      ? [pattern]
      : globSync(existsSync(join(cwd, pattern)) ? `${pattern}/**/*.{html,htm,astro,svelte,vue,jsx,tsx,mdx,erb,php,njk,liquid,hbs}` : pattern, { cwd, exclude: path => /(^|\/)(node_modules|dist|out|build|\.git|\.astro|\.next|\.svelte-kit)(\/|$)/.test(path) })))]
    const index = createIndex(contracts())
    const knows = await utilities()
    const results = files.map(file => ({ file, diagnostics: check(read(join(cwd, file)), index, { knows, strict: flags.has('--strict') }) })).filter(result => result.diagnostics.length)
    const all = results.flatMap(result => result.diagnostics)
    if (flags.has('--json')) console.log(JSON.stringify({ files: files.length, results }, null, 2))
    else {
      for (const { file, diagnostics } of results) console.log(format(diagnostics, file))
      const errors = all.filter(diagnostic => diagnostic.severity === 'error').length
      console.log(`${results.length ? '\n' : ''}${files.length} files checked: ${errors} errors, ${all.length - errors} warnings.`)
    }
    if (all.some(diagnostic => diagnostic.severity === 'error')) process.exitCode = 1
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
        if (existsSync(join(directory, file)) && !flags.has('--force')) console.log(`  kept ${settings.directory}/${file} (it exists; pass --force to replace it)`)
        else writeFileSync(join(directory, file), content)
      }
      settings.owned[name] = { version: pkg.version ?? null, files: Object.fromEntries(Object.entries(files).map(([file, content]) => [file, hash(content)])) }
      const entry = join(cwd, settings.entry)
      const line = `@import '@master/ui/${stylesheet}';`
      const own = `@import './${relative(dirname(entry), join(directory, `${name}.css`)).replaceAll('\\', '/')}';`
      if (existsSync(entry) && read(entry).includes(line)) {
        writeFileSync(entry, read(entry).replace(line, own))
        console.log(`Own ${name}: ${Object.keys(files).map(file => `${settings.directory}/${file}`).join(', ')}; ${settings.entry} now imports your copy.`)
      } else {
        console.log(`Own ${name}: ${Object.keys(files).map(file => `${settings.directory}/${file}`).join(', ')}.\n  Replace the library's import of it with your copy:\n    - ${line}\n    + ${own}\n  If you import all of '@master/ui', run "master-ui init" first to get one import per stylesheet.`)
      }
      save(settings)
    }
  },

  add() {
    const settings = config()
    const framework = option('framework') ?? settings.framework ?? detect()
    if (!framework) fail(`Say which framework: master-ui add combobox --framework=react. It is one of: ${Object.keys(manifest.frameworks).join(', ')}.`)
    const directory = join(cwd, settings.directory)
    if (!names.length) {
      const width = Math.max(...Object.keys(manifest.components).map(name => name.length))
      console.log(`The ${manifest.frameworks[framework]?.title ?? framework} components. Every other contract is a class on a native element: its markup is the same in every framework.\n`)
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
    if (!rows.length) return console.log('This project owns no component. Everything follows @master/ui.')
    for (const row of rows) console.log(`${row.name}  ${row.upstream.length ? `upstream changed: ${row.upstream.join(', ')} (master-ui diff ${row.name})` : 'upstream unchanged'}${row.edited.length ? `; edited here: ${row.edited.join(', ')}` : ''}`)
    if (rows.some(row => row.upstream.length)) process.exitCode = 2
  },

  diff() {
    if (!names.length) fail('Name an owned component: master-ui diff button')
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
    if (!names.length) fail('Name an owned component: master-ui accept button')
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
  const source = read(fileURLToPath(import.meta.url)).split('\n')
  console.log(source.slice(2, source.indexOf(' */')).map(line => line.replace(/^ \* ?/, '')).join('\n'))
  process.exit(command && command !== 'help' && command !== '--help' ? 1 : 0)
}
await commands[/** @type {keyof typeof commands} */ (command)]()
