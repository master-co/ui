import { defineSite } from '@master/internal-site/config'
import translations from './i18n/translations'

const section = (name: string) => new URL(import.meta.resolve(`@master/internal-site/sections/${name}.astro`))
const document = {
  layout: new URL('./layouts/Doc.astro', import.meta.url),
  dictionaries: new URL('./dictionaries.ts', import.meta.url),
  categories: new URL('./.categories/docs.json', import.meta.url)
}

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
    localizablePathnameRoots: ['guide', 'components'],
    translations
  },
  // The guide and components share one documentation shell and sidebar; the components overview leaves the sidebar out.
  sections: { home: section('home'), page: section('page'), guide: section('guide'), components: new URL('./sections/components.astro', import.meta.url) },
  navigation: { guide: new URL('./.categories/docs.json', import.meta.url) },
  documents: { guide: document, components: document },
  styles: { site: new URL('./styles/site.ts', import.meta.url) }
})
