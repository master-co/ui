import shared from '@master/internal-site/common/translations.js'
import { locales } from '@master/internal-site/common/locales.js'
import en from './en.json' with { type: 'json' }
import tw from './tw.json' with { type: 'json' }
import ja from './ja.json' with { type: 'json' }
import ko from './ko.json' with { type: 'json' }
import cn from './cn.json' with { type: 'json' }

const local: Record<string, Record<string, string>> = { en, tw, ja, ko, cn }

/** Shared interface copy from the site platform, then Master UI copy. */
export default Object.fromEntries(locales.map(locale => [locale, { ...shared[locale], ...local[locale] }])) as Record<string, Record<string, string>>
