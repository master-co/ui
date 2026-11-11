/**
 * Generate the documentation sidebars and the search index from content metadata.
 * Each section of the site (the guide, components, layouts, blocks) has a sidebar of its own, so a reader
 * of one tier is not handed the list of another. Runs before `astro dev`, `astro build` and type checks.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { generateSearchPages } from '@master/internal-site/utils/search-pages'
import type { DefinedMetadata } from '@master/internal-site/types/Metadata'

/** Sidebar category order; unknown categories follow alphabetically. */
const categoryOrder = [
  'Getting started', 'Customizing', 'Building', 'Reference', 'Overview',
  // Components: parts with a material, a state or a platform behavior.
  'Materials', 'Structure', 'Actions', 'Forms', 'Navigation', 'Overlays', 'Feedback', 'Display', 'Typography',
  // Layouts: where regions go and what scrolls.
  'Layout basics', 'Page layouts',
  // Blocks: one stretch of a page with a purpose.
  'Marketing blocks', 'Application blocks'
]

const site = fileURLToPath(new URL('../', import.meta.url))
const content = join(site, 'content')

async function writeIfChanged(file: string, data: string) {
  if (await readFile(file, 'utf8').catch(() => undefined) === data) return
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, data)
}

const metadataFiles = (await readdir(content, { recursive: true }))
  .filter(file => file.endsWith('metadata.ts'))
  .map(file => join(content, file))
  .filter(file => existsSync(join(dirname(file), 'content.mdx')) || existsSync(join(dirname(file), 'page.astro')))
  .sort()

type Page = DefinedMetadata & { order?: number }
/** Pages by section: the first folder under `content`. */
const sections = new Map<string, Page[]>()
for (const file of metadataFiles) {
  const { default: metadata } = await import(pathToFileURL(file).href)
  if (metadata.draft || !metadata.category) continue
  const section = relative(content, file).split(sep)[0]
  sections.set(section, [...sections.get(section) ?? [], metadata])
}

const titleOf = (page: DefinedMetadata) => {
  const title = page.title as string | { absolute?: string, default?: string } | undefined
  return (page.other?.subject ?? (typeof title === 'string' ? title : title?.absolute ?? title?.default ?? '')).toLowerCase()
}
const rank = (name: string) => {
  const index = categoryOrder.indexOf(name)
  return index === -1 ? categoryOrder.length : index
}

const categoriesOf = (pages: Page[]) => [...new Set(pages.map(page => page.category!))]
  .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
  .map(name => ({
    name,
    pages: pages
      .filter(page => page.category === name)
      .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || titleOf(a).localeCompare(titleOf(b)))
  }))

for (const [section, pages] of sections) {
  const categories = categoriesOf(pages)
  await writeIfChanged(join(site, `.categories/${section}.json`), JSON.stringify(categories, null, 2) + '\n')
  console.log(`Generated .categories/${section}.json (${categories.length} categories, ${pages.length} pages)`)
}

await generateSearchPages({ cwd: site, defaultLocale: 'en', locales: ['en'], dictionariesDir: join(site, 'i18n'), write: true })

// What a program reads: llms.txt, each page as Markdown, the contracts, the compiled CSS and the registry.
await import('./exports.ts')
