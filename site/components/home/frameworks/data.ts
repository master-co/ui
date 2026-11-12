import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Server-only: the published @master/ui package, read as a project receives it. */
const root = dirname(fileURLToPath(import.meta.resolve('@master/ui/master.css')))

interface Manifest {
  frameworks: Record<string, { title: string }>
  components: Record<string, { contract: string } & Record<string, string>>
}

const manifest = JSON.parse(readFileSync(join(root, 'frameworks/manifest.json'), 'utf8')) as Manifest

/** Every component stylesheet, by name, in alphabetical order. */
export const stylesheets = readdirSync(join(root, 'components'))
  .filter(file => file.endsWith('.css'))
  .map(file => file.slice(0, -'.css'.length))
  .sort()

/** The framework components: each one's name, the contract it renders and its file in each framework. */
export const frameworkComponents = Object.entries(manifest.components).map(([name, entry]) => ({ name, contract: entry.contract, files: entry }))

/** The file `master-ui add <name>` copies for a framework, such as `stepper.tsx` or `Stepper.svelte`. */
export const frameworkFile = (name: string, framework: string) => manifest.components[name][framework]
