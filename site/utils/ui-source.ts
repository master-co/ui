import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Server-only access to the published @master/ui source, read exactly as consumers receive it. */
const entry = fileURLToPath(import.meta.resolve('@master/ui/master.css'))
const root = dirname(entry)

const read = (file: string) => readFileSync(join(root, file), 'utf8').trim()

/** Files imported by `master.css`, in import order. */
export function uiFiles() {
  return [...readFileSync(entry, 'utf8').matchAll(/@import\s+['"]\.\/([^'"]+)['"]/g)].map(match => match[1])
}

/** The complete library with its imports inlined, for compiling isolated previews. */
export function uiSource() {
  return uiFiles().map(read).join('\n\n')
}

/** One published stylesheet: a component such as `button`, or a layout such as `shell` with `directory: 'layouts'`. */
export function componentSource(name: string, directory: 'components' | 'layouts' = 'components') {
  return read(`${directory}/${name}.css`)
}
