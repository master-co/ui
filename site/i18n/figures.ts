import { localeOfPathname } from '@master/internal-site/astro/site-context'
import tw from './figures.tw.json' with { type: 'json' }
import ja from './figures.ja.json' with { type: 'json' }
import ko from './figures.ko.json' with { type: 'json' }
import cn from './figures.cn.json' with { type: 'json' }

const dictionaries: Record<string, Record<string, string>> = { tw, ja, ko, cn }

export function figureTranslator({ url }: { url: URL }) {
  const dictionary = dictionaries[localeOfPathname(url.pathname)]
  return (text: string) => dictionary?.[text] ?? text
}
