import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { transform } from 'esbuild'
import { compile, compileModule } from 'svelte/compiler'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '../../..')
/** Where the components and the examples that use them are written. */
const sources = [join(root, 'frameworks/svelte'), here]

/** Where a source is compiled to: `Name.svelte` and `name.svelte.ts` to `name.svelte.js`, `name.ts` to `name.js`. */
const compiledName = (name: string) => name.replace(/\.svelte(\.ts)?$/, '.svelte.js').replace(/\.ts$/, '.js')

/**
 * Compile every component, the module with runes beside them, the examples and the list of them, for a
 * browser or for a server, into `.compiled/svelte/<client|server>` with the folders they have in the
 * package. No bundler: a compiled file stands where its source does, so a relative import of a component
 * only gains `.js`.
 * @param into The folder under `.compiled/svelte`, so two test files that compile at once write apart.
 * @returns What the compiler warned of, and a function that imports a compiled file by its source path.
 */
export async function build(generate: 'client' | 'server', into: string = generate) {
  const out = join(here, '../.compiled/svelte', into)
  await rm(out, { recursive: true, force: true })
  const warnings: string[] = []
  for (const directory of sources) {
    for (const name of await readdir(directory)) {
      const filename = join(directory, name)
      let code: string
      if (name.endsWith('.svelte')) {
        const result = compile(await readFile(filename, 'utf8'), { generate, filename, dev: true, runes: true })
        warnings.push(...result.warnings.map(warning => `${name}: ${warning.code}: ${warning.message}`))
        code = result.js.code
      } else if (name.endsWith('.svelte.ts')) {
        // The compiler reads JavaScript in a module: the types are taken off first.
        const plain = await transform(await readFile(filename, 'utf8'), { loader: 'ts', tsconfigRaw: { compilerOptions: { verbatimModuleSyntax: true } } })
        code = compileModule(plain.code, { generate, filename, dev: true }).js.code
      } else if (name === 'fixtures.ts') {
        code = (await transform(await readFile(filename, 'utf8'), { loader: 'ts' })).code
      } else continue
      const target = join(out, relative(root, directory), compiledName(name))
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, code.replace(/(\bfrom\s*|\bimport\s*)(['"])(\.{1,2}\/[^'"]+\.svelte)\2/g, '$1$2$3.js$2'))
    }
  }
  return {
    warnings,
    load: (source: string) => import(pathToFileURL(join(out, compiledName(source))).href),
  }
}
