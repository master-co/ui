import { existsSync, readFileSync } from 'node:fs'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseFragment } from 'parse5'
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
  const tags = parseFragment(metadata).childNodes
  const attr = (node, name) => node?.attrs?.find(item => item.name === name)?.value
  const meta = (key, name) => tags.find(node => node.tagName === 'meta' && attr(node, key) === name)
  if (tags.some(tag => tag.tagName === 'meta' && attr(tag, 'name')?.toLowerCase() === 'robots' && /\b(?:noindex|none)\b/i.test(attr(tag, 'content') ?? ''))) return
  const canonical = tags.find(node => node.tagName === 'link' && attr(node, 'rel') === 'canonical')
  const href = attr(canonical, 'href')
  if (!href) return
  const url = new URL(href, origin)
  if (url.origin !== origin) return
  const title = attr(meta('property', 'og:title'), 'content')
  return { url: url.href, title, ...editionOf(url.pathname), metadata, end: head.index + head[0].length - '</head>'.length }
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
  const pages = new Map()
  const files = (await readdir(directory, { recursive: true })).filter(file => file.endsWith('.html')).sort()
  for (const file of files) {
    const html = await readFile(join(directory, file), 'utf8')
    const page = pageOf(html, origin)
    if (!page) continue
    const pathname = new URL(page.url).pathname
    if (pages.has(pathname)) throw new Error('Duplicate canonical URL: ' + page.url)
    pages.set(pathname, { ...page, file })
    if (!groups.has(page.identity)) groups.set(page.identity, new Map())
    groups.get(page.identity).set(page.locale, page.url)
  }
  for (const [pathname, page] of pages) {
    const path = join(directory, page.file)
    const html = await readFile(path, 'utf8')
    const prefix = page.locale === 'en' ? '' : '/' + page.locale
    const index = prefix + '/llms.txt'
    if (!existsSync(join(directory, index))) throw new Error('Missing agent index: ' + index)
    const links = [`<link rel="describedby" href="${escape(origin + index)}">`]
    if (existsSync(join(directory, pathname + '.md'))) {
      links.push(`<link rel="alternate" type="text/markdown" href="${escape(page.url + '.md')}">`)
    }
    let schema
    if (pathname === '/') {
      schema = { '@type': 'WebSite', name: 'Master UI', url: page.url }
    } else if (page.identity !== '/') {
      const section = page.identity.split('/')[1]
      const overview = pages.get(prefix + '/' + (section === 'guide' ? 'guide/introduction' : section))
      const crumbs = [{ name: 'Master UI', url: origin + (prefix || '/') }]
      if (overview && overview.url !== page.url) crumbs.push({ name: overview.title, url: overview.url })
      crumbs.push({ name: page.title, url: page.url })
      schema = { '@type': 'BreadcrumbList', itemListElement: crumbs.map(({ name, url }, index) => ({
        '@type': 'ListItem', position: index + 1, name, item: url
      })) }
    }
    if (schema) {
      const json = JSON.stringify({ '@context': 'https://schema.org', ...schema }).replaceAll('<', '\\u003c')
      links.push(`<script type="application/ld+json">${json}</script>`)
    }
    const added = links.filter(tag => !html.slice(0, page.end).includes(tag)).join('')
    const graph = completeGraph(html, page, sizeOf)
    const completed = graph.slice(0, page.end) + added + graph.slice(page.end)
    if (html !== completed) await writeFile(path, completed)
  }
  if (!groups.size) throw new Error('No indexable page declares a canonical URL on ' + origin)
  await writeFile(join(directory, 'sitemap.xml'), renderSitemap(groups))
  await writeFile(join(directory, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', origin).href}\n`)
}
