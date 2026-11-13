import { demoDocument } from '@master/internal-site/demo/reference/document.ts'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import config from 'virtual:master-ui/preview-output'

/**
 * Previews render in the typography the theme guide recommends: Geist with its stylistic sets, light regular text.
 * The document has no canvas of its own. The tray's stage shows through it, so a specimen stands on the stage's
 * material (plain, dots or stripes) and a page paints its own surface.
 */
export const previewHead = `<style>
@font-face { font-family: Geist; font-style: normal; font-weight: 100 900; font-display: block; src: url("/fonts/GeistVariable.woff2") format("woff2"); }
@font-face { font-family: "IBM Plex Mono"; font-style: normal; font-weight: 400; font-display: block; src: url("/fonts/IBMPlexMono-Regular.woff2") format("woff2"); }
:root { --font-sans: Geist; --font-mono: "IBM Plex Mono"; --font-feature-sans: "ss02", "ss03", "ss04", "ss06", "ss07", "ss08"; }
html { background: transparent; }
body { font-family: var(--font-family-sans); font-feature-settings: var(--font-feature-sans); font-weight: 350; -webkit-font-smoothing: antialiased; }
</style>`

/** Fill the reserved specimen stage without stretching grid rows or leaving compact controls at its top. */
export const specimenHead = `${previewHead}<style>
@layer theme,base,defaults,components,utilities;
@layer defaults { body { align-content: safe center; } }
body { min-height: 100dvh; }
</style>`

const specimens = new Map<string, string>()

/** The same example runs in every language. Reuse its compiled iframe while prerendering nearby editions. */
export function previewDocument(section: Parameters<typeof demoDocument>[0], scene: Parameters<typeof demoDocument>[1]) {
  if (!import.meta.env.PROD) return demoDocument(section, scene)
  const key = JSON.stringify([section.css, scene])
  const previous = specimens.get(key)
  if (previous !== undefined) return previous
  // The compiler appends the specimen stylesheet immediately before the end of the head.
  // Put it in a shared file so neither the iframe nor its hydration data repeats the entire library.
  const document = demoDocument(section, scene).replace(
    /<style>(@layer theme,base,defaults,components,utilities;[\s\S]*?)<\/style>(?=<\/head>)/,
    (_, css: string) => {
      const filename = createHash('sha256').update(css).digest('hex') + '.css'
      const directory = new URL('preview-styles/', config)
      mkdirSync(directory, { recursive: true })
      writeFileSync(new URL(filename, directory), css)
      return `<link rel="stylesheet" href="/preview-styles/${filename}">`
    }
  )
  if (specimens.size >= 32) specimens.delete(specimens.keys().next().value!)
  specimens.set(key, document)
  return document
}
