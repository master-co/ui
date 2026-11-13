/**
 * Everything the production translation gate holds to `i18n/reviews.json`: every MDX edition under `content`, the
 * Master UI interface dictionary and the shared shell dictionary. `astro build` loads this module through
 * `i18n.validation` in `site.config.ts`; `scripts/i18n.ts` audits it and records reviews.
 */
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { discoverDocumentResources, sharedInterfaceKeys, type TranslationResource } from '@master/internal-site/build/localization.ts'
import { locales } from '@master/internal-site/common/locales.js'
import sharedTranslations from '@master/internal-site/common/translations.js'
import { englishOnlySections } from './sections.ts'

const siteRoot = fileURLToPath(new URL('../', import.meta.url))
const contentRoot = path.join(siteRoot, 'content')

export const translatedLocales = locales.filter(locale => locale !== 'en')

/** Names that stay as written in every language: brands, products and the library's own component names. */
const untranslated = new Set(['GitHub', 'X', 'Discord', 'Master', 'Master CSS', 'Master Design', 'Master UI'])

/**
 * Source the translated pages render: the home page, the guide's layout and figures, and the shell's navigation.
 * The overviews of the English-only sections join this list when their section is translated.
 */
const interfaceRoots = ['components', 'layouts', 'sections', 'utils', 'content/page.astro', 'navigation.ts', 'app-config.ts']

/**
 * Data modules whose strings reach the page through `t(item.property)`. Each lists the properties that are prose;
 * the rest (slugs, code, values) is executable sample content that stays in English.
 */
const dataModules: Record<string, string[]> = {
  'components/catalog.ts': ['description', 'category'],
  'components/home/customize.ts': ['name', 'summary', 'alt'],
  'components/home/platform.ts': ['title', 'summary'],
  'components/home/frameworks/examples.ts': ['note'],
  'components/home/HomeThemes.astro': ['name', 'detail', 'reach', 'upstream'],
  'components/home/HomeLibrary.astro': ['name', 'link'],
  'components/home/HomeMarkup.astro': ['label'],
  'navigation.ts': ['name'],
  'content/page.astro': ['absolute', 'description']
}

async function sourceFiles(target: string): Promise<string[]> {
  const entries = await readdir(target, { withFileTypes: true }).catch(() => undefined)
  if (!entries) return [target]
  const result: string[] = []
  for (const entry of entries) {
    const file = path.join(target, entry.name)
    if (entry.isDirectory()) result.push(...await sourceFiles(file))
    else if (/\.(?:astro|svelte|ts)$/.test(entry.name) && !/\.(?:test|spec)\./.test(entry.name)) result.push(file)
  }
  return result
}

/** Read a quoted JavaScript string starting at `start`; `undefined` for a template with substitutions. */
function stringAt(source: string, start: number): string | undefined {
  const quote = source[start]
  let value = ''
  for (let index = start + 1; index < source.length; index++) {
    const char = source[index]
    if (char === '\\') { value += source[++index]; continue }
    if (char === quote) return value
    if (quote === '`' && char === '$' && source[index + 1] === '{') return undefined
    value += char
  }
}

/** Literal arguments of `t('…')`, and of the helpers that hand their first argument to `t`. */
export function translationKeys(source: string): string[] {
  const keys: string[] = []
  for (const match of source.matchAll(/(?<![\w.$])(?:t|count)\(\s*(?=['"`])/g)) {
    const value = stringAt(source, match.index + match[0].length)
    if (value?.trim()) keys.push(value)
  }
  return keys
}

/** String values of the given properties, written as `property: '…'`. */
export function propertyTexts(source: string, properties: string[]): string[] {
  const texts: string[] = []
  for (const match of source.matchAll(new RegExp(`(?<![\\w.$])(?:${properties.join('|')})\\s*:\\s*(?=['"\`])`, 'g'))) {
    const value = stringAt(source, match.index + match[0].length)
    if (value?.trim()) texts.push(value)
  }
  return texts
}

/** Every key of the Master UI interface dictionary, in a stable order. */
export async function productUIKeys(): Promise<string[]> {
  const keys = new Set<string>()
  for (const root of interfaceRoots) {
    for (const file of await sourceFiles(path.join(siteRoot, root))) {
      for (const key of translationKeys(await readFile(file, 'utf8'))) keys.add(key)
    }
  }
  for (const [file, properties] of Object.entries(dataModules)) {
    for (const text of propertyTexts(await readFile(path.join(siteRoot, file), 'utf8'), properties)) keys.add(text)
  }
  // The guide's sidebar categories, and keys only a dynamic `t(value)` reaches, listed by hand in `en.json`.
  for (const category of JSON.parse(await readFile(path.join(siteRoot, '.categories/guide.json'), 'utf8')) as { name: string }[]) keys.add(category.name)
  for (const key of Object.keys(JSON.parse(await readFile(path.join(siteRoot, 'i18n/en.json'), 'utf8')))) keys.add(key)
  return [...keys].filter(key => !untranslated.has(key) && !sharedTranslations.en[key]).sort()
}

async function dictionaries(): Promise<Record<string, Record<string, string>>> {
  return Object.fromEntries(await Promise.all(locales.map(async locale => [locale, JSON.parse(await readFile(path.join(siteRoot, 'i18n', `${locale}.json`), 'utf8'))])))
}

function dictionaryResource(id: string, keys: string[], dictionary: Record<string, Record<string, string>>): TranslationResource {
  return {
    id,
    source: JSON.stringify(Object.fromEntries(keys.map(key => [key, key]))),
    translations: Object.fromEntries(translatedLocales.map(locale => [locale,
      keys.every(key => dictionary[locale]?.[key]?.trim())
        ? JSON.stringify(Object.fromEntries(keys.map(key => [key, dictionary[locale][key]])))
        : undefined
    ]))
  }
}

/** Interface keys each language still lacks. */
export async function missingUIKeys(): Promise<Record<string, string[]>> {
  const keys = await productUIKeys()
  const local = await dictionaries()
  return Object.fromEntries(translatedLocales.map(locale => [locale, keys.filter(key => !local[locale]?.[key]?.trim())]))
}

export default async function translationResources(): Promise<TranslationResource[]> {
  const documents = (await discoverDocumentResources({ contentRoot }))
    .map(resource => englishOnlySections.includes(resource.id.split('/')[0]) ? { ...resource, locales: ['en'] } : resource)
  const keys = await productUIKeys()
  return [
    ...documents,
    dictionaryResource('ui/product', keys, await dictionaries()),
    dictionaryResource('ui/shared', [...new Set([...Object.keys(sharedTranslations.en), ...await sharedInterfaceKeys()])], sharedTranslations)
  ]
}
