import shared from '@master/internal-site/common/translations.js'
import en from './en.json' with { type: 'json' }

/** Shared interface copy from the site platform, then Master UI copy. */
export default { en: { ...shared.en, ...en } } as Record<string, Record<string, string>>
