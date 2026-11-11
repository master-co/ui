import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, transform } from 'esbuild'
import { compile, compileModule } from 'svelte/compiler'

/**
 * A page of the guide shows a framework component running. A preview is a document of its own, so the
 * example is rendered to HTML on the server, as a project would render it, and gets one script that
 * hydrates it: the Svelte runtime, the example, the component it uses and the behavior that component imports.
 */
const directory = fileURLToPath(new URL('../components/examples/', import.meta.url))
const library = '../../../packages/ui/frameworks/svelte/'

/** An example as it is written, with the component imported from where `master-ui add` puts it. */
export function exampleSource(name: string) {
  return readFileSync(join(directory, `${name}.svelte`), 'utf8').replaceAll(library, './ui/').trim()
}

const scripts = new Map<string, Promise<string>>()

/** The script that hydrates an example in a preview: `target` is the element that holds the server's HTML. */
export function exampleScript(name: string, target: string) {
  const key = `${name} ${target}`
  if (!scripts.has(key)) scripts.set(key, bundle(name, target))
  return scripts.get(key)!
}

async function bundle(name: string, target: string) {
  const result = await build({
    stdin: {
      contents: `import { hydrate } from 'svelte'\nimport Example from './${name}.svelte'\nhydrate(Example, { target: document.querySelector(${JSON.stringify(target)}) })`,
      resolveDir: directory,
      loader: 'js',
    },
    bundle: true,
    format: 'iife',
    minify: true,
    write: false,
    target: 'es2022',
    conditions: ['browser', 'production'],
    plugins: [{
      name: 'svelte',
      setup(esbuild) {
        // One runtime: the components live in another workspace, which would resolve a copy of Svelte of its
        // own, and a component compiled against one copy does not run in a page another one hydrates.
        esbuild.onResolve({ filter: /^svelte(\/|$)/ }, ({ path, kind, pluginData }) =>
          pluginData?.one ? undefined : esbuild.resolve(path, { resolveDir: directory, kind, pluginData: { one: true } }))
        // A module with runes is imported as the `.js` its `.ts` compiles to.
        esbuild.onResolve({ filter: /\.svelte\.js$/ }, ({ path, resolveDir }) => {
          const file = join(resolveDir, path)
          return existsSync(file) ? undefined : { path: file.replace(/\.js$/, '.ts') }
        })
        esbuild.onLoad({ filter: /\.svelte$/ }, ({ path }) => ({
          contents: compile(readFileSync(path, 'utf8'), { generate: 'client', css: 'injected', filename: path }).js.code,
          loader: 'js',
          resolveDir: dirname(path),
        }))
        esbuild.onLoad({ filter: /\.svelte\.ts$/ }, async ({ path }) => ({
          contents: compileModule((await transform(readFileSync(path, 'utf8'), { loader: 'ts', target: 'es2022' })).code, { generate: 'client', filename: path }).js.code,
          loader: 'js',
          resolveDir: dirname(path),
        }))
      },
    }],
  })
  return result.outputFiles[0].text
}
