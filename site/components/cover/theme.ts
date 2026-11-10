import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * The published @master/ui theme, scoped to `.cover`.
 * A cover is drawn in the library's own materials, while the site's chrome keeps its `--ui-*` tokens, so the
 * theme's `@theme` tokens and its corner settings are re-declared on the cover instead of on the page root.
 * They are read from the source consumers install: a change to the theme redraws every cover.
 */
export function coverTheme() {
  const source = readFileSync(fileURLToPath(import.meta.resolve('@master/ui/theme.css')), 'utf8')
  const block = (name: string) => {
    const body = source.match(new RegExp(`^${name}\\s*\\{\\n([\\s\\S]*?)\\n\\}`, 'm'))?.[1]
    if (!body) throw new Error(`@master/ui/theme.css has no ${name} block`)
    return body.replace(/\/\*[\s\S]*?\*\//g, '')
  }
  return `.cover {${block('@theme')}\n}\n${block('@layer theme').replaceAll(':root, :host', '.cover')}`
    .replace(/\n\s*\n/g, '\n')
}
