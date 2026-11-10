/**
 * Generate the documentation sidebar and the search index from content metadata.
 * Runs before `astro dev`, `astro build` and type checks.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { generateSearchPages } from '@master/internal-site/utils/search-pages'
import type { DefinedMetadata } from '@master/internal-site/types/Metadata'

/** Sidebar category order; unknown categories follow alphabetically. */
const categoryOrder = ['Getting started', 'Overview', 'Materials', 'Actions', 'Forms', 'Navigation', 'Overlays', 'Feedback', 'Display']

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

const pages: (DefinedMetadata & { order?: number })[] = []
for (const file of metadataFiles) {
  const { default: metadata } = await import(pathToFileURL(file).href)
  if (!metadata.draft && metadata.category) pages.push(metadata)
}

const titleOf = (page: DefinedMetadata) => {
  const title = page.title as string | { absolute?: string, default?: string } | undefined
  return (page.other?.subject ?? (typeof title === 'string' ? title : title?.absolute ?? title?.default ?? '')).toLowerCase()
}
const rank = (name: string) => {
  const index = categoryOrder.indexOf(name)
  return index === -1 ? categoryOrder.length : index
}

const categories = [...new Set(pages.map(page => page.category!))]
  .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
  .map(name => ({
    name,
    pages: pages
      .filter(page => page.category === name)
      .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || titleOf(a).localeCompare(titleOf(b)))
  }))

await writeIfChanged(join(site, '.categories/docs.json'), JSON.stringify(categories, null, 2) + '\n')
console.log(`Generated .categories/docs.json (${categories.length} categories, ${pages.length} pages)`)

await generateSearchPages({ cwd: site, defaultLocale: 'en', locales: ['en'], dictionariesDir: join(site, 'i18n'), write: true })
