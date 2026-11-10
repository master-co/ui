import translations from './i18n/translations'

export default Object.fromEntries(Object.entries(translations).map(([locale, dictionary]) => [locale, async () => dictionary])) as Record<string, () => Promise<Record<string, string>>>
