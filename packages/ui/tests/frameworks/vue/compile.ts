import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { transform } from 'esbuild'
import { compileScript, parse } from 'vue/compiler-sfc'

/**
 * Compile the Vue components and their fixtures to modules Node can import, with no bundler: each `.vue`
 * file to one script with its template inline, each `.ts` beside them with its types taken out. A compiled
 * file stands where its source does under the package, so a relative import only changes its extension.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const out = join(root, 'tests/frameworks/.compiled/vue')
const sources = ['frameworks/vue', 'tests/frameworks/vue']

/** Point a relative import of a component or a helper at what it was compiled to. */
function rewrite(code: string, from: string) {
  return code.replace(/(\bfrom\s*|\bimport\s*)(["'])(\.{1,2}\/[^"']+)\2/g, (whole, keyword: string, quote: string, specifier: string) => {
    if (/\.(vue|ts)$/.test(specifier)) return `${keyword}${quote}${specifier.replace(/\.(vue|ts)$/, '.js')}${quote}`
    if (existsSync(`${resolve(dirname(from), specifier)}.ts`)) return `${keyword}${quote}${specifier}.js${quote}`
    return whole
  })
}

/** Compile every source. Returns the URL of a source's compiled module, by its path from the package. */
export async function compile() {
  for (const folder of sources) {
    await mkdir(join(out, folder), { recursive: true })
    for (const name of await readdir(join(root, folder))) {
      const file = join(root, folder, name)
      const source = await readFile(file, 'utf8')
      let script: string
      if (name.endsWith('.vue')) {
        const { descriptor, errors } = parse(source, { filename: file })
        if (errors.length) throw errors[0]
        // The template becomes the render function of the script; nothing is hoisted out as an HTML string.
        script = compileScript(descriptor, { id: relative(root, file), inlineTemplate: true, templateOptions: { compilerOptions: { hoistStatic: false } } }).content
      } else if (name.endsWith('.ts') && name !== 'compile.ts') script = source
      else continue
      const { code } = await transform(script, { loader: 'ts', format: 'esm', target: 'es2023', sourcefile: file })
      await writeFile(join(out, folder, name.replace(/\.(vue|ts)$/, '.js')), rewrite(code, file))
    }
  }
  return (source: string) => pathToFileURL(join(out, source.replace(/\.(vue|ts)$/, '.js'))).href
}
