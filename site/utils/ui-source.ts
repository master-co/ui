import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSync } from 'esbuild'

/** Server-only access to the published @master/ui source, read exactly as consumers receive it. */
const entry = fileURLToPath(import.meta.resolve('@master/ui/master.css'))
const root = dirname(entry)

const read = (file: string) => readFileSync(join(root, file), 'utf8').trim()

/** Files imported by `master.css`, in import order. */
export function uiFiles() {
  return [...readFileSync(entry, 'utf8').matchAll(/@import\s+['"]\.\/([^'"]+)['"]/g)].map(match => match[1])
}

/**
 * The complete library with its imports inlined, for compiling isolated previews. Name a theme in
 * `@master/ui/themes` to compile it after the library, as a project that imports it would.
 */
export function uiSource(theme?: string) {
  return [...uiFiles().map(read), ...(theme ? [read(`themes/${theme}.css`)] : [])].join('\n\n')
}

/** One published theme, such as `paper`. */
export function themeSource(name: string) {
  return read(`themes/${name}.css`)
}

/** One published stylesheet: a component such as `button`, or a layout such as `shell` with `directory: 'layouts'`. */
export function componentSource(name: string, directory: 'components' | 'layouts' | 'themes' = 'components') {
  return read(`${directory}/${name}.css`)
}

/** The framework components of a contract: each one's source in every framework, as `master-ui add` copies it. */
export function frameworkSources(contractName: string) {
  const manifest = JSON.parse(read('frameworks/manifest.json')) as { frameworks: Record<string, { title: string }>, components: Record<string, Record<string, string>> }
  return Object.entries(manifest.components).filter(([, entry]) => entry.contract === contractName).map(([name, entry]) => ({
    name,
    sources: Object.entries(manifest.frameworks).map(([framework, { title }]) => ({ framework, title, file: entry[framework], code: read(`frameworks/${framework}/${entry[framework]}`) })),
  }))
}

/** A contract: what the stylesheet of that name promises. See `packages/ui/contract.schema.json`. */
export interface Contract {
  name: string
  title: string
  description: string
  classes: { name: string, kind: 'root' | 'part' | 'modifier', of?: string | string[], description: string }[]
  states?: { on: string, name: string, mark: string, description?: string }[]
  properties?: { name: string, on?: string, default?: string, description: string }[]
  keyboard?: { keys: string, action: string }[]
}

export function contract(name: string, directory: 'components' | 'layouts' = 'components') {
  return JSON.parse(read(`${directory}/${name}.json`)) as Contract
}

let bundle: string | undefined

/**
 * Every behavior as one classic script that defines `MasterUI`. A preview is a document of its own and cannot
 * import from the package, so it gets the published scripts bundled, unchanged in what they do.
 */
export function behaviorsScript() {
  bundle ??= buildSync({ entryPoints: [join(root, 'behaviors/index.js')], bundle: true, format: 'iife', globalName: 'MasterUI', write: false, minify: true, target: 'es2022' }).outputFiles[0].text
  return bundle
}
