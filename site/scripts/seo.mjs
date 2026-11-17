import { readFileSync } from 'node:fs'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { languageOf, locales } from '@master/internal-site/common/locales.js'

const graphLocales = { en: 'en_US', tw: 'zh_TW', ja: 'ja_JP', ko: 'ko_KR', cn: 'zh_CN' }
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')

/** The locale a published pathname belongs to and the pathname it shares with its other editions. */
export function editionOf(pathname) {
  const segment = pathname.split('/')[1]
  const locale = locales.includes(segment) && segment !== 'en' ? segment : 'en'
  return { locale, identity: locale === 'en' ? pathname : pathname.slice(locale.length + 1) || '/' }
}

/**
 * Reads a built page's head. A page is listed when it declares a canonical URL on the site's origin and is not
 * `noindex`; the shared shell writes both, so the sitemap and the page always agree.
 */
export function pageOf(html, origin) {
  const head = /<head\b[^>]*>([\s\S]*?)<\/head>/i.exec(html)
  if (!head) return
  const metadata = head[1].replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
  const robots = /<meta name="robots" content="([^"]*)"/.exec(metadata)?.[1]
  if (robots && /\bnoindex\b/i.test(robots)) return
  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(metadata)?.[1]
  if (!canonical) return
  const url = new URL(canonical.replaceAll('&amp;', '&'))
  if (url.origin !== origin) return
  return { url: url.href, ...editionOf(url.pathname), metadata, end: head.index + head[0].length - '</head>'.length }
}

/**
 * Completes a page's Open Graph and X (Twitter) card from its canonical URL: the shared shell writes the title, the
 * description and the image, but not where the page lives, what it is, its language, or the size and the text
 * alternative of a PNG card the site serves. Attribute values already in the head are copied as they are written.
 */
export function completeGraph(html, page, sizeOf = () => undefined) {
  const has = (key, name) => page.metadata.includes(`${key}="${name}"`)
  const content = name => new RegExp(`<meta (?:property|name)="${name}" content="([^"]*)"`).exec(page.metadata)?.[1]
  const tags = [
    ['property', 'og:url', escape(page.url)],
    ['property', 'og:type', page.identity.startsWith('/guide/') ? 'article' : 'website'],
    ['property', 'og:locale', graphLocales[page.locale]]
  ]
  // A PNG card the site serves gets its size; one without a text alternative shows the page's title, so that is it.
  const image = content('og:image')
  const size = image && sizeOf(image.replaceAll('&amp;', '&'))
  if (size) {
    tags.push(['property', 'og:image:type', 'image/png'], ['property', 'og:image:width', String(size.width)], ['property', 'og:image:height', String(size.height)])
    const alt = content('og:image:alt') ?? content('og:title')
    tags.push(['property', 'og:image:alt', alt], ['name', 'twitter:image:alt', alt])
  }
  const missing = tags.filter(([key, name, value]) => value && !has(key, name))
  if (!missing.length) return html
  const written = missing.map(([key, name, value]) => `<meta ${key}="${name}" content="${value}">`).join('')
  return html.slice(0, page.end) + written + html.slice(page.end)
}

/** Width and height from a PNG's IHDR chunk. */
export function pngSize(bytes) {
  if (bytes.toString('latin1', 1, 4) !== 'PNG' || bytes.toString('latin1', 12, 16) !== 'IHDR') throw new Error('Not a PNG')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

/** One `<url>` per edition, each listing every edition of the page; the order never depends on the file walk. */
export function renderSitemap(groups) {
  const sorted = [...groups].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
  const entries = sorted.flatMap(([, editions]) => {
    const present = locales.flatMap(locale => editions.has(locale) ? [[locale, editions.get(locale)]] : [])
    if (present.length === 1) return [`  <url>\n    <loc>${escape(present[0][1])}</loc>\n  </url>`]
    const alternates = present.map(([locale, url]) => `    <xhtml:link rel="alternate" hreflang="${languageOf(locale)}" href="${escape(url)}"/>`)
    if (editions.has('en')) alternates.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${escape(editions.get('en'))}"/>`)
    return present.map(([, url]) => `  <url>\n    <loc>${escape(url)}</loc>\n${alternates.join('\n')}\n  </url>`)
  })
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`
}

/** Completes every built page's Open Graph tags, then writes `sitemap.xml` and the `robots.txt` that names it. */
export async function writeSeoIn(directory, origin) {
  origin = new URL(origin).origin
  const sizes = new Map()
  /** The pixel size of a PNG this site serves, read from its header. */
  const sizeOf = url => {
    const { origin: from, pathname } = new URL(url, origin)
    if (from !== origin || !pathname.endsWith('.png')) return
    if (!sizes.has(pathname)) sizes.set(pathname, pngSize(readFileSync(join(directory, decodeURIComponent(pathname)))))
    return sizes.get(pathname)
  }
  const groups = new Map()
  const files = (await readdir(directory, { recursive: true })).filter(file => file.endsWith('.html')).sort()
  for (const file of files) {
    const path = join(directory, file)
    const html = await readFile(path, 'utf8')
    const page = pageOf(html, origin)
    if (!page) continue
    if (!groups.has(page.identity)) groups.set(page.identity, new Map())
    groups.get(page.identity).set(page.locale, page.url)
    const completed = completeGraph(html, page, sizeOf)
    if (completed !== html) await writeFile(path, completed)
  }
  if (!groups.size) throw new Error('No indexable page declares a canonical URL on ' + origin)
  await writeFile(join(directory, 'sitemap.xml'), renderSitemap(groups))
  await writeFile(join(directory, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', origin).href}\n`)
}
