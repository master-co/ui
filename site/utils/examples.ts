import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

/**
 * The working examples: one source for the preview that runs, the Code view that shows it, the Markdown a
 * program reads and the registry item a project copies. Nothing about an example is written twice.
 */
const directory = fileURLToPath(new URL('../examples/', import.meta.url))

export interface Example {
  title: string
  description: string
  /** The markup the page holds, relative to `site/examples`. */
  html: string
  /** The module that starts it: `mount(root)` returns the function that stops it. */
  script?: string
  /** What else it imports, such as its data. */
  files?: string[]
  /** The Master UI contracts it uses. */
  contracts: string[]
  /** Packages beyond @master/css and @master/ui, at the versions the site installs. */
  dependencies?: Record<string, string>
  preview: { height: number, tabletHeight?: number, phoneHeight?: number, bodyClass?: string, size?: 'desktop' | 'tablet' | 'phone' }
}

const read = (): Record<string, Example> => JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8')).examples
export const examples: Record<string, Example> = read()

/** One example, read from the manifest as it is now, so an edit shows without a restart. */
export function example(id: string) {
  const found = read()[id]
  if (!found) throw new Error(`No example is named ${id}. There are: ${Object.keys(examples).join(', ') || 'none'}`)
  return found
}

const language = (path: string) => path.endsWith('.html') ? 'html' : path.endsWith('.css') ? 'css' : path.endsWith('.json') ? 'json' : 'js'

/** Every file of an example, in the order a reader meets them: the markup, the module, then what it imports. */
export function exampleFiles(id: string) {
  const { html, script, files = [] } = example(id)
  // A file is named from the example's own folder, so one it shares with another example keeps the relative
  // path its imports use: `../filter-bar/query.js`.
  return [html, ...(script ? [script] : []), ...files].map(path => ({
    path,
    name: path.startsWith(`${id}/`) ? path.slice(id.length + 1) : `../${path}`,
    lang: language(path),
    content: readFileSync(join(directory, path), 'utf8').trimEnd(),
  }))
}

/** The markup, as the preview runs it and a page holds it. */
export const exampleHtml = (id: string) => readFileSync(join(directory, example(id).html), 'utf8').trim()

/** The URL of the bundle a preview loads from the site's own origin; the engines of one example load with it alone. */
export const exampleScriptUrl = (id: string) => `/examples/${id}.js`

/** What a reader installs and writes to run the example in a project of their own. */
export function exampleSetup(id: string) {
  const { dependencies = {}, script } = example(id)
  const packages = ['@master/css', '@master/ui', ...Object.entries(dependencies).map(([name, version]) => `${name}@${version}`)]
  return {
    install: `npm install ${packages.join(' ')}`,
    start: script ? `import { mount } from './${script.split('/').slice(1).join('/')}'\n\nconst unmount = mount(document.querySelector('[data-example="${id}"]'))\n// Call unmount() when the page leaves the example, to release what it holds.` : '',
  }
}

const bundles = new Map<string, { stamp: string, bundle: Promise<string> }>()

/** When the example's own files last changed: a bundle is made again after an edit, as a dev server needs. */
function stamp(id: string) {
  const folder = join(directory, id)
  return readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => statSync(join(entry.parentPath, entry.name)).mtimeMs)
    .join()
}

/**
 * The example's module and what it imports, bundled for the preview. It mounts on the example's root and
 * unmounts when the document is hidden for good, so an editor, a chart, an object URL or a listener it holds
 * is released with the preview.
 */
export function exampleBundle(id: string) {
  // In development every request builds, so an edit shows at once; a failed build is never kept.
  if (import.meta.env?.DEV) return bundle(id)
  if (!bundles.has(id)) bundles.set(id, bundle(id).catch((error) => { bundles.delete(id); throw error }))
  return bundles.get(id)!
}

async function bundle(id: string) {
  const { script } = example(id)
  if (!script) return ''
  const result = await build({
    stdin: {
      contents: `import { mount } from './${script.split('/').slice(1).join('/')}'\nconst root = document.querySelector(${JSON.stringify(`[data-example="${id}"]`)})\nif (root) {\n  const unmount = mount(root)\n  addEventListener('pagehide', (event) => { if (!event.persisted) unmount?.() })\n}`,
      resolveDir: join(directory, dirname(script)),
      loader: 'js',
    },
    bundle: true,
    format: 'esm',
    minify: true,
    write: false,
    target: 'es2022',
    conditions: ['browser', 'production'],
    legalComments: 'eof',
  })
  return result.outputFiles[0].text
}
