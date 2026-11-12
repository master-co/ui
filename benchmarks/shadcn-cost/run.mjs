#!/usr/bin/env node
/**
 * What six common components cost a page: Master UI and shadcn/ui, built for production the standard way.
 *
 *   node benchmarks/shadcn-cost/run.mjs [--shadcn 4.23.0] [--bases base,radix] [--keep]
 *
 * Everything is installed and built in a temporary directory outside the repository; nothing is installed here.
 *
 * shadcn/ui: `shadcn init -t vite` creates a Vite + React + Tailwind CSS v4 app, as its documentation
 * prescribes, and `shadcn add` writes the components into it. Each case renders one small demo of one component
 * (or all six) and is built with `vite build`. Only the files a case uses are in `src/components/ui` while it
 * builds, because Tailwind writes a utility for every class it finds in the sources. React, React DOM and the
 * scheduler are split into a chunk of their own, so the JavaScript is reported with and without the runtime.
 *
 * Master UI: the same demo written as markup in `index.html`, its stylesheets compiled from the repository's
 * `packages/ui` exactly as the package build compiles `dist/standalone.css` (the theme once, then each
 * component the demo uses and every component it composes), after the reset the components assume
 * (`@master/css-preset/base.css`, the counterpart of Tailwind's preflight), and a behavior script only where
 * the component needs one. It is built with the same version of Vite and its defaults.
 *
 * Both sides are measured the same way: every file `dist/index.html` loads on first paint (the page, its
 * stylesheets, its module scripts and their preloads), raw and gzipped with node:zlib at its default level.
 */
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { arch, cpus, platform, release, tmpdir, totalmem } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { gzipSync } from 'node:zlib'

const { values: options } = parseArgs({
  options: {
    shadcn: { type: 'string', default: '4.23.0' },
    bases: { type: 'string', default: 'base,radix' },
    keep: { type: 'boolean', default: false },
  },
})

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '../..')
const ui = join(repo, 'packages/ui')
const work = mkdtempSync(join(tmpdir(), 'master-ui-shadcn-cost-'))
const env = { ...process.env, CI: '1', npm_config_audit: 'false', npm_config_fund: 'false', npm_config_update_notifier: 'false' }
const log = (...line) => console.log('·', ...line)
const run = (command, args, cwd) => execFileSync(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' })
const npx = (args, cwd) => run('npx', ['-y', ...args], cwd)
const version = (directory, name) => JSON.parse(readFileSync(join(directory, 'node_modules', name, 'package.json'), 'utf8')).version

/** The six components, and all of them on one page. */
const cases = ['none', 'button', 'card', 'dialog', 'tabs', 'select', 'tooltip', 'all']
const six = cases.filter(name => name !== 'none' && name !== 'all')

/* ------------------------------------------------------------------------------------------------ measuring */

const sizeOf = content => ({ raw: content.length, gzip: gzipSync(content).length })
const add = (a, b) => ({ raw: a.raw + b.raw, gzip: a.gzip + b.gzip })
const zero = () => ({ raw: 0, gzip: 0 })

/**
 * Every file the built page loads before it is interactive: the HTML, each stylesheet, each module script and
 * each module it preloads. A file named `react-*.js` is the React chunk the shadcn build splits off.
 */
function measure(out) {
  const html = readFileSync(join(out, 'index.html'))
  const files = new Set()
  for (const [tag] of html.toString().matchAll(/<(?:script|link)\b[^>]*>/g)) {
    const url = tag.match(/\b(?:src|href)="([^"]+)"/)?.[1]
    if (!url || /^(?:https?:)?\/\//.test(url)) continue
    if (/^<script/.test(tag) || /rel="(?:stylesheet|modulepreload)"/.test(tag)) files.add(url.replace(/^\.?\//, ''))
  }
  const result = { html: sizeOf(html), css: zero(), js: zero(), react: zero(), files: [] }
  for (const file of [...files].sort()) {
    const size = sizeOf(readFileSync(join(out, file)))
    const kind = file.endsWith('.css') ? 'css' : 'js'
    const isReact = kind === 'js' && /^react-/.test(basename(file))
    result[kind] = add(result[kind], size)
    if (isReact) result.react = add(result.react, size)
    result.files.push({ file, kind: isReact ? 'react' : kind, ...size })
  }
  result.jsWithoutReact = { raw: result.js.raw - result.react.raw, gzip: result.js.gzip - result.react.gzip }
  result.total = add(add(result.html, result.css), result.js)
  return result
}

/* ------------------------------------------------------------------------------------------------ shadcn/ui */

/** One small demo per component, the same words as the Master UI pages. `trigger` composes a Button into a trigger. */
function shadcnDemos(base) {
  const trigger = (Part, props, children) => base === 'radix'
    ? `<${Part} asChild><Button${props}>${children}</Button></${Part}>`
    : `<${Part} render={<Button${props} />}>${children}</${Part}>`
  const selectItems = `[{ label: "Astro", value: "astro" }, { label: "Next.js", value: "next" }, { label: "SvelteKit", value: "sveltekit" }]`
  return {
    button: {
      imports: ['import { Button } from "@/components/ui/button"'],
      jsx: '<Button>Save changes</Button>',
    },
    card: {
      imports: ['import { Button } from "@/components/ui/button"', 'import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"'],
      jsx: `<Card>
        <CardHeader>
          <CardTitle>Team plan</CardTitle>
          <CardDescription>For up to ten people.</CardDescription>
        </CardHeader>
        <CardContent><p>Shared projects, roles and a single invoice.</p></CardContent>
        <CardFooter><Button>Upgrade</Button></CardFooter>
      </Card>`,
    },
    dialog: {
      imports: ['import { Button } from "@/components/ui/button"', 'import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"'],
      jsx: `<Dialog>
        ${trigger('DialogTrigger', ' variant="outline"', 'Delete project')}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this project?</DialogTitle>
            <DialogDescription>Its deployments are removed and its domains stop resolving.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            ${trigger('DialogClose', ' variant="outline"', 'Cancel')}
            <Button variant="destructive">Delete project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>`,
    },
    tabs: {
      imports: ['import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"'],
      jsx: `<Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">Profile settings</TabsContent>
        <TabsContent value="billing">Billing settings</TabsContent>
        <TabsContent value="members">Members of the workspace</TabsContent>
      </Tabs>`,
    },
    select: {
      imports: ['import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"'],
      jsx: base === 'radix'
        ? `<Select defaultValue="astro">
        <SelectTrigger aria-label="Framework"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="astro">Astro</SelectItem>
          <SelectItem value="next">Next.js</SelectItem>
          <SelectItem value="sveltekit">SvelteKit</SelectItem>
        </SelectContent>
      </Select>`
        : `<Select items={${selectItems}} defaultValue="astro">
        <SelectTrigger aria-label="Framework"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="astro">Astro</SelectItem>
          <SelectItem value="next">Next.js</SelectItem>
          <SelectItem value="sveltekit">SvelteKit</SelectItem>
        </SelectContent>
      </Select>`,
    },
    tooltip: {
      imports: ['import { Button } from "@/components/ui/button"', 'import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"'],
      jsx: `<TooltipProvider>
        <Tooltip>
          ${trigger('TooltipTrigger', ' variant="outline"', 'Deploy')}
          <TooltipContent>Ship the current branch</TooltipContent>
        </Tooltip>
      </TooltipProvider>`,
    },
  }
}

function shadcnApp(name, demos) {
  const parts = name === 'none' ? [] : name === 'all' ? six : [name]
  const imports = [...new Set(parts.flatMap(part => demos[part].imports))]
  return `${imports.join('\n')}

export default function App() {
  return (
    <main>
      ${parts.map(part => demos[part].jsx).join('\n      ') || null}
    </main>
  )
}
`
}

/** The UI files a case needs: each one it imports and, recursively, each one those import. */
function closure(names, stash) {
  const needed = new Set()
  const visit = name => {
    if (needed.has(name)) return
    needed.add(name)
    const source = readFileSync(join(stash, `${name}.tsx`), 'utf8')
    for (const [, dependency] of source.matchAll(/from "@\/components\/ui\/([a-z-]+)"/g)) visit(dependency)
  }
  names.forEach(visit)
  return [...needed]
}

function shadcn(base) {
  const root = join(work, `shadcn-${base}`)
  mkdirSync(root)
  log(`shadcn/ui (${base}): shadcn@${options.shadcn} init -t vite`)
  npx([`shadcn@${options.shadcn}`, 'init', '-t', 'vite', '-b', base, '-d', '-n', 'app', '-y', '--no-monorepo'], root)
  const app = join(root, 'app')
  log(`shadcn/ui (${base}): add ${six.join(' ')}`)
  run(join(app, 'node_modules/.bin/shadcn'), ['add', ...six, '-y', '-o'], app)
  const config = JSON.parse(readFileSync(join(app, 'components.json'), 'utf8'))

  /*
   * What a component costs, not what the template demonstrates: the entry renders the app and nothing else (the
   * template's theme provider and its keyboard shortcut go), the webfont the template imports goes (Master UI
   * ships none, and a font is a choice of its own), and so does every file Tailwind would otherwise scan.
   */
  const stash = join(root, 'stash')
  cpSync(join(app, 'src/components/ui'), stash, { recursive: true })
  rmSync(join(app, 'src/components'), { recursive: true, force: true })
  rmSync(join(app, 'src/assets'), { recursive: true, force: true })
  rmSync(join(app, 'public'), { recursive: true, force: true })
  for (const file of ['README.md', 'src/App.css']) rmSync(join(app, file), { force: true })
  writeFileSync(join(app, 'src/main.tsx'), `import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
`)
  const css = readFileSync(join(app, 'src/index.css'), 'utf8')
  const fonts = css.match(/^@import ["']@fontsource[^\n]*\n/gm) ?? []
  writeFileSync(join(app, 'src/index.css'), fonts.reduce((text, line) => text.replace(line, ''), css))
  writeFileSync(join(app, 'index.html'), readFileSync(join(app, 'index.html'), 'utf8').replace(/\s*<link rel="icon"[^>]*>/, ''))
  const vite = readFileSync(join(app, 'vite.config.ts'), 'utf8')
  writeFileSync(join(app, 'vite.config.ts'), vite.replace(/\n\s*resolve: \{/, `
  build: {
    // The React runtime in a chunk of its own, so it can be reported apart. Nothing else changes.
    rolldownOptions: {
      output: { codeSplitting: { groups: [{ name: "react", test: /[\\\\/]node_modules[\\\\/](react|react-dom|scheduler)[\\\\/]/ }] } },
    },
  },
  resolve: {`))

  const demos = shadcnDemos(base)
  const results = {}
  for (const name of cases) {
    const parts = name === 'none' ? [] : name === 'all' ? six : [name]
    rmSync(join(app, 'src/components'), { recursive: true, force: true })
    mkdirSync(join(app, 'src/components/ui'), { recursive: true })
    const used = [...new Set(parts.flatMap(part => demos[part].imports).flatMap(line => [...line.matchAll(/@\/components\/ui\/([a-z-]+)/g)].map(match => match[1])))]
    for (const file of closure(used, stash)) cpSync(join(stash, `${file}.tsx`), join(app, `src/components/ui/${file}.tsx`))
    writeFileSync(join(app, 'src/App.tsx'), shadcnApp(name, demos))
    const out = join(root, 'out', name)
    run(process.execPath, [join(app, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', out, '--emptyOutDir', '--logLevel', 'warn'], app)
    results[name] = measure(out)
    log(`shadcn/ui (${base}) ${name}: css ${results[name].css.gzip} B, js ${results[name].js.gzip} B gzipped`)
  }
  const packages = ['shadcn', 'react', 'react-dom', 'vite', 'tailwindcss', '@tailwindcss/vite', '@vitejs/plugin-react', base === 'radix' ? 'radix-ui' : '@base-ui/react', 'class-variance-authority', 'lucide-react', 'tw-animate-css', 'tailwind-merge', 'clsx', 'cn', 'lightningcss', 'rolldown']
  const versions = Object.fromEntries(packages.filter(name => existsSync(join(app, 'node_modules', name, 'package.json'))).map(name => [name, version(app, name)]))
  return { app, versions, style: config.style, results }
}

/* ------------------------------------------------------------------------------------------------ Master UI */

const uiRequire = createRequire(join(ui, 'package.json'))
const { compileManifestSync } = await import(pathToFileURL(uiRequire.resolve('@master/css-compiler/node')).href)
const { createRenderSessionSync } = await import(pathToFileURL(uiRequire.resolve('@master/css/node')).href)
const preset = JSON.parse(readFileSync(uiRequire.resolve('@master/css-preset/default-manifest.json'), 'utf8'))
const resetCss = readFileSync(uiRequire.resolve('@master/css-preset/base.css'), 'utf8')
const read = file => readFileSync(join(ui, file), 'utf8')
const strip = css => css.replace(/\/\*[\s\S]*?\*\//g, '')
const imports = [...read('master.css').matchAll(/@import\s+['"]\.\/([^'"]+)['"]/g)].map(match => match[1])
const contracts = new Map(imports.filter(file => file !== 'theme.css').map(file => {
  const contract = JSON.parse(read(file.replace(/\.css$/, '.json')))
  return [contract.name, { ...contract, file }]
}))

/** The version of a package the Master UI build resolves, read from the package.json above its entry. */
function packageVersion(name) {
  let directory = dirname(uiRequire.resolve(name))
  while (!existsSync(join(directory, 'package.json')) || JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')).name !== name) {
    if (directory === dirname(directory)) return null
    directory = dirname(directory)
  }
  return JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')).version
}

/** The same compile as `standalone()` in packages/ui/scripts/build.ts, for the theme and the given stylesheets. */
function standalone(files) {
  const tokens = []
  for (const block of strip(read('theme.css')).matchAll(/@theme\s*\{([\s\S]*?)\n\}/g)) {
    for (const match of block[1].matchAll(/(?:^|[;{\s])(--[a-z][a-z0-9-]*)\s*:/g)) if (!tokens.includes(match[1])) tokens.push(match[1])
  }
  const scheme = '@layer base{:root{color-scheme:light dark}[data-theme="light"],:host([data-theme="light"]){color-scheme:light}[data-theme="dark"],:host([data-theme="dark"]){color-scheme:dark}}'
  const compiled = compileManifestSync(['theme.css', ...files].map(read).join('\n\n'), { baseManifest: preset })
  const problems = compiled.diagnostics.filter(diagnostic => diagnostic.severity === 'error' || diagnostic.severity === 'warning')
  if (problems.length) throw new Error(`The stylesheets do not compile:\n${JSON.stringify(problems, null, 2)}`)
  const session = createRenderSessionSync({ manifest: compiled.manifest })
  try {
    const every = `.master-ui-tokens{${tokens.map((token, at) => `--t${at}:var(${token})`).join(';')}}`
    const theme = session.ensureStylesheetResources(`${compiled.css}\n${every}`).snapshot().cssText
    return `@layer theme, base, defaults, components, utilities;\n${scheme}\n${theme}\n${compiled.css}`
  } finally { session.dispose() }
}

/** A contract and every contract it composes, in the order master.css imports them. */
function stylesheets(names) {
  const needed = new Set()
  const visit = name => {
    if (needed.has(name)) return
    needed.add(name)
    for (const dependency of contracts.get(name).composes ?? []) visit(dependency)
  }
  names.forEach(visit)
  return [...contracts.values()].filter(contract => needed.has(contract.name)).map(contract => contract.file)
}

/** The same demos as markup. `script` is what the page needs from the published behaviors, if anything. */
const masterDemos = {
  button: { contracts: ['button'], html: '<button type="button" class="btn btn-primary">Save changes</button>' },
  card: {
    contracts: ['card', 'button'],
    html: `<article class="card">
      <header class="card-header">
        <h2 class="card-title">Team plan</h2>
        <p class="card-description">For up to ten people.</p>
      </header>
      <div class="card-body"><p>Shared projects, roles and a single invoice.</p></div>
      <footer class="card-footer"><button type="button" class="btn btn-primary">Upgrade</button></footer>
    </article>`,
  },
  dialog: {
    contracts: ['dialog', 'button'],
    html: `<button type="button" class="btn" commandfor="delete-project" command="show-modal">Delete project</button>
    <dialog id="delete-project" class="dialog" closedby="any" aria-labelledby="delete-project-title">
      <header class="dialog-header">
        <h2 class="dialog-title" id="delete-project-title">Delete this project?</h2>
        <p class="dialog-description">Its deployments are removed and its domains stop resolving.</p>
      </header>
      <footer class="dialog-footer">
        <button type="button" class="btn" commandfor="delete-project" command="close">Cancel</button>
        <button type="button" class="btn btn-danger" commandfor="delete-project" command="close">Delete project</button>
      </footer>
    </dialog>`,
  },
  tabs: {
    contracts: ['tabs'],
    script: `import { tabs } from './behaviors/tabs.js'\n\ntabs(document.querySelector('.tabs[role="tablist"]'))\n`,
    html: `<div class="tabs" role="tablist" aria-label="Account">
      <button type="button" class="tabs-item" role="tab" id="tab-profile" aria-selected="true" aria-controls="panel-profile">Profile</button>
      <button type="button" class="tabs-item" role="tab" id="tab-billing" aria-selected="false" aria-controls="panel-billing" tabindex="-1">Billing</button>
      <button type="button" class="tabs-item" role="tab" id="tab-members" aria-selected="false" aria-controls="panel-members" tabindex="-1">Members</button>
    </div>
    <div role="tabpanel" id="panel-profile" aria-labelledby="tab-profile">Profile settings</div>
    <div role="tabpanel" id="panel-billing" aria-labelledby="tab-billing" hidden>Billing settings</div>
    <div role="tabpanel" id="panel-members" aria-labelledby="tab-members" hidden>Members of the workspace</div>`,
  },
  select: {
    contracts: ['select'],
    html: `<select class="select" aria-label="Framework">
      <option class="select-option" value="astro" selected>Astro</option>
      <option class="select-option" value="next">Next.js</option>
      <option class="select-option" value="sveltekit">SvelteKit</option>
    </select>`,
  },
  tooltip: {
    contracts: ['tooltip', 'button'],
    html: `<button type="button" class="btn" interestfor="tip-deploy">Deploy</button>
    <div id="tip-deploy" popover="hint" class="tooltip">Ship the current branch</div>`,
  },
}

/** Not one of the six: a select drawn as a combobox, the case where Master UI needs a behavior to choose a value. */
const combobox = {
  contracts: ['combobox'],
  script: `import { combobox } from './behaviors/combobox.js'\n\ncombobox(document.querySelector('.combobox'))\n`,
  html: `<div class="combobox">
      <div class="input-group">
        <input class="input-group-field" role="combobox" aria-label="Framework" aria-expanded="false" aria-controls="framework-list" aria-autocomplete="list" autocomplete="off">
        <button type="button" class="combobox-toggle" tabindex="-1" aria-label="Show frameworks"></button>
      </div>
      <div id="framework-list" popover="manual" class="listbox" role="listbox" aria-label="Frameworks">
        <div class="listbox-option" role="option" id="framework-astro" aria-checked="true">Astro</div>
        <div class="listbox-option" role="option" id="framework-next" aria-checked="false">Next.js</div>
        <div class="listbox-option" role="option" id="framework-sveltekit" aria-checked="false">SvelteKit</div>
      </div>
    </div>`,
}

function masterUi(viteVersion) {
  const app = join(work, 'master-ui')
  mkdirSync(app)
  writeFileSync(join(app, 'package.json'), `${JSON.stringify({ name: 'master-ui-cost', private: true, type: 'module' }, null, 2)}\n`)
  log(`Master UI: npm install vite@${viteVersion}`)
  run('npm', ['install', '--save-exact', `vite@${viteVersion}`], app)
  cpSync(join(ui, 'behaviors'), join(app, 'behaviors'), { recursive: true })
  const pages = { ...Object.fromEntries(cases.map(name => [name, name === 'none' ? [] : name === 'all' ? six.map(part => masterDemos[part]) : [masterDemos[name]]])), combobox: [combobox] }
  const results = {}
  for (const [name, demos] of Object.entries(pages)) {
    const files = stylesheets(demos.flatMap(demo => demo.contracts))
    writeFileSync(join(app, 'ui.css'), `${resetCss}\n${standalone(files)}`)
    const scripts = demos.map(demo => demo.script).filter(Boolean)
    rmSync(join(app, 'main.js'), { force: true })
    if (scripts.length) writeFileSync(join(app, 'main.js'), scripts.join('\n'))
    writeFileSync(join(app, 'index.html'), `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>master-ui-app</title>
    <link rel="stylesheet" href="./ui.css" />
  </head>
  <body>
    <main>
    ${demos.map(demo => demo.html).join('\n    ')}
    </main>${scripts.length ? '\n    <script type="module" src="./main.js"></script>' : ''}
  </body>
</html>
`)
    const out = join(work, 'master-ui-out', name)
    run(process.execPath, [join(app, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', out, '--emptyOutDir', '--logLevel', 'warn'], app)
    results[name] = { ...measure(out), stylesheets: files, behaviors: demos.flatMap(demo => [...(demo.script ?? '').matchAll(/behaviors\/([a-z-]+)\.js/g)].map(match => match[1])) }
    log(`Master UI ${name}: css ${results[name].css.gzip} B, js ${results[name].js.gzip} B gzipped`)
  }
  return { versions: { vite: version(app, 'vite'), lightningcss: version(app, 'lightningcss'), rolldown: version(app, 'rolldown') }, results }
}

/* ------------------------------------------------------------------------------------------------ run */

const bases = options.bases.split(',').map(base => base.trim()).filter(Boolean)
const shadcnRuns = Object.fromEntries(bases.map(base => [base, shadcn(base)]))
const viteVersion = Object.values(shadcnRuns)[0].versions.vite
const master = masterUi(viteVersion)
const uiPackage = JSON.parse(read('package.json'))
const tag = (() => { try { return run('git', ['describe', '--tags', '--always', '--dirty'], repo).trim() } catch { return null } })()
const commit = (() => { try { return run('git', ['rev-parse', 'HEAD'], repo).trim() } catch { return null } })()
const npmVersion = run('npm', ['--version'], repo).trim()

const results = {
  $comment: 'Written by benchmarks/shadcn-cost/run.mjs. Sizes are bytes; gzip is node:zlib at its default level (6). See README.md for the method.',
  date: new Date().toISOString(),
  command: `node benchmarks/shadcn-cost/run.mjs --shadcn ${options.shadcn} --bases ${bases.join(',')}`,
  machine: { platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model ?? null, cores: cpus().length, memory: totalmem(), node: process.version, npm: npmVersion },
  method: {
    measured: 'Every file dist/index.html loads on first paint: the HTML page, each stylesheet, each module script and each modulepreload. Raw bytes and gzip (node:zlib, default level).',
    build: 'vite build with Vite defaults (Lightning CSS minifies CSS, Oxc minifies JS, Baseline Widely Available targets). The shadcn/ui build adds one codeSplitting group that puts react, react-dom and scheduler in a chunk of their own.',
    shadcn: 'shadcn init -t vite -b <base> -d (the default preset of that base), then shadcn add button card dialog tabs select tooltip. The entry renders <App /> only (the template theme provider goes), the template webfont import goes, and only the component files a case uses are in src/components/ui while it builds.',
    masterUi: 'index.html with the demo as markup, one stylesheet: @master/css-preset/base.css (the reset, the counterpart of Tailwind preflight) and the theme plus each component the demo uses and composes, compiled from packages/ui as its build compiles dist/standalone.css; a behavior module only where the component needs one.',
    select: 'Master UI select is a native <select class="select"> with no script. The combobox case shows the cost when a select is drawn as a combobox, which needs the combobox behavior.',
  },
  versions: {
    masterUi: { '@master/ui': uiPackage.version ?? null, git: tag, commit, ...Object.fromEntries(['@master/css', '@master/css-compiler', '@master/css-preset'].map(name => [name, packageVersion(name)])), ...master.versions },
    shadcn: Object.fromEntries(Object.entries(shadcnRuns).map(([base, entry]) => [base, { style: entry.style, ...entry.versions }])),
  },
  cases: [...cases, 'combobox'],
  masterUi: master.results,
  shadcn: Object.fromEntries(Object.entries(shadcnRuns).map(([base, entry]) => [base, entry.results])),
}

writeFileSync(join(here, 'results.json'), `${JSON.stringify(results, null, 2)}\n`)
log(`Wrote ${join(here, 'results.json')}`)
if (options.keep) log(`Kept the projects in ${work}`)
else rmSync(work, { recursive: true, force: true })
