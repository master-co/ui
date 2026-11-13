/**
 * Local translations, by hand:
 *
 *   node --import tsx scripts/i18n.ts audit                     every problem the production gate would report
 *   node --import tsx scripts/i18n.ts keys                      the interface keys, and the ones each language lacks
 *   node --import tsx scripts/i18n.ts review <locale> <id>...   record an independent review of those editions
 *
 * A review records the hashes of the English source and of the translation as they stand. Run it only after a
 * reviewer other than the translator has compared the whole edition with its source and read it rendered.
 * Preparation and builds never call it.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { auditTranslations, reviewTranslation, type TranslationReviews } from '@master/internal-site/build/localization.ts'
import translationResources, { missingUIKeys, productUIKeys, translatedLocales } from '../i18n/resources.ts'

const reviewsFile = new URL('../i18n/reviews.json', import.meta.url)
const [command, ...args] = process.argv.slice(2)
const reviews = JSON.parse(await readFile(reviewsFile, 'utf8')) as TranslationReviews

if (command === 'keys') {
  console.log(JSON.stringify({ keys: await productUIKeys(), missing: await missingUIKeys() }, null, 2))
} else if (command === 'review') {
  const [locale, ...ids] = args
  if (!(translatedLocales as string[]).includes(locale) || !ids.length) throw new Error('Usage: review <locale> <resource id>...')
  const resources = await translationResources()
  for (const id of ids) {
    const resource = resources.find(resource => resource.id === id)
    if (!resource) throw new Error(`Unknown translation resource: ${id}`)
    reviews.resources[id] = { ...reviews.resources[id], [locale]: reviewTranslation(resource, locale) }
    console.log(`Reviewed ${id} [${locale}]`)
  }
  reviews.resources = Object.fromEntries(Object.entries(reviews.resources).sort(([a], [b]) => a.localeCompare(b)))
  await writeFile(reviewsFile, JSON.stringify(reviews, null, 2) + '\n')
} else if (command === 'audit' || !command) {
  const resources = await translationResources()
  const diagnostics = auditTranslations(resources, reviews)
  for (const issue of diagnostics) console.error(`${issue.id} [${issue.locale}] ${issue.reason}: ${issue.message}`)
  for (const [locale, keys] of Object.entries(await missingUIKeys())) {
    if (keys.length) console.error(`Missing ${locale} interface copy (${keys.length})`)
  }
  console.log(`Checked ${resources.length} translation resources; ${diagnostics.length} problems.`)
  if (diagnostics.length) process.exitCode = 1
} else {
  throw new Error(`Unknown command: ${command}`)
}
