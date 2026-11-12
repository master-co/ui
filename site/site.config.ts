import { defineSite } from '@master/internal-site/config'
import translations from './i18n/translations'

const section = (name: string) => new URL(import.meta.resolve(`@master/internal-site/sections/${name}.astro`))
const library = new URL('./sections/library.astro', import.meta.url)
/** A section's own sidebar and pager order, written by `scripts/prepare.ts`. */
const categories = (name: string) => new URL(`./.categories/${name}.json`, import.meta.url)
const document = (name: string) => ({
  layout: new URL('./layouts/Doc.astro', import.meta.url),
  dictionaries: new URL('./dictionaries.ts', import.meta.url),
  categories: categories(name)
})

export default defineSite({
  id: 'ui',
  name: 'Master UI',
  origin: process.env.PUBLIC_URL || 'https://ui.master.co',
  content: new URL('./content/', import.meta.url),
  app: new URL('./app-config.ts', import.meta.url),
  highlighter: new URL(import.meta.resolve('@master/internal-site/css/highlight.ts')),
  // English first. Add locales together with i18n.validation (resources and reviews) when translating.
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
    hreflangOfLocale: { en: 'en' },
    nameOfLocale: { en: 'English' },
    localizablePathnameRoots: ['guide', 'components', 'blocks', 'pages'],
    translations
  },
  // The guide and the three sections of the library share one documentation shell, and each has a sidebar of its own.
  // A section's overview leaves the sidebar out, and so does every block and every page, which are shown at full width.
  sections: { home: section('home'), page: section('page'), guide: section('guide'), components: library, blocks: library, pages: library },
  navigation: { guide: categories('guide'), components: categories('components'), blocks: categories('blocks'), pages: categories('pages') },
  documents: { guide: document('guide'), components: document('components'), blocks: document('blocks'), pages: document('pages') },
  styles: { site: new URL('./styles/site.ts', import.meta.url) }
})
