import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'parse5'
import sax from 'sax'
import { languageOf, locales } from '@master/internal-site/common/locales.js'
import { editionOf } from '../scripts/seo.mjs'
import { markdownReferences, preserveFences } from '../utils/portable-links.ts'

const directory = resolve(fileURLToPath(new URL('../', import.meta.url)), process.env.MASTER_UI_SITE_OUTPUT || 'out')
const read = file => readFile(resolve(directory, file), 'utf8')
const origin = new URL(process.env.PUBLIC_URL || 'https://ui.master.co').origin

function sitemapEntries(xml) {
  const entries = new Map()
  const parser = sax.parser(true, { xmlns: true })
  let entry, loc = false
  parser.onopentag = node => {
    if (node.local === 'url') entry = { url: '', languages: new Map() }
    if (node.local === 'loc') loc = true
    if (node.local === 'link') {
      assert.equal(node.uri, 'http://www.w3.org/1999/xhtml')
      const { hreflang, href, rel } = node.attributes
      assert.equal(rel.value, 'alternate')
      assert.ok(!entry.languages.has(hreflang.value), href.value)
      entry.languages.set(hreflang.value, href.value)
    }
  }
  parser.ontext = text => { if (loc) entry.url += text }
  parser.onclosetag = name => {
    if (name === 'loc') loc = false
    if (name === 'url') {
      assert.ok(!entries.has(entry.url), 'Duplicate sitemap URL ' + entry.url)
      entries.set(entry.url, entry.languages)
    }
  }
  parser.write(xml).close()
  return entries
}

function inspectHtml(html) {
  const ids = new Set(), links = new Set(), head = []
  let headings = 0, lang
  function walk(node, inHead = false) {
    const attrs = Object.fromEntries((node.attrs || []).map(attr => [attr.name, attr.value]))
    if (node.tagName === 'html') lang = attrs.lang
    if (node.tagName === 'h1') headings++
    if (attrs.id) ids.add(attrs.id)
    if (node.tagName === 'a' && attrs.href) links.add(attrs.href)
    if (inHead && node.tagName) head.push({ tag: node.tagName, ...attrs, text: node.childNodes?.[0]?.value })
    // A code sample, script or inert template cannot contain article navigation.
    if (['pre', 'script', 'style', 'template'].includes(node.tagName)) return
    for (const child of node.childNodes || []) walk(child, node.tagName === 'head')
  }
  walk(parse(html))
  return { ids, links, head, lang, headings }
}

test('published HTML, sitemap, language indexes and portable documents agree', async () => {
  const files = new Set(await readdir(directory, { recursive: true }))
  const sitemap = sitemapEntries(await read('sitemap.xml'))
  assert.ok((await read('robots.txt')).split('\n').includes('Sitemap: ' + origin + '/sitemap.xml'))
  const pages = new Map(), anchors = new Map(), outbound = new Map(), groups = new Map()
  const titles = new Set(), descriptions = new Set()
  const articlePath = /^\/(?:tw\/|ja\/|ko\/|cn\/)?(?:guide|components|charts|blocks|pages)\/[^/]+$/
  for (const file of files) {
    if (!file.endsWith('.html') || file.startsWith('demo/')) continue
    const pathname = file === 'index.html' ? '/' : '/' + file.slice(0, -5)
    const html = await read(file)
    const { ids, links, head, lang, headings } = inspectHtml(html)
    if (/(?:^|\/)404$/.test(pathname)) {
      assert.ok(head.some(tag => tag.name === 'robots' && tag.content.includes('noindex')), pathname)
      continue
    }
    const url = origin + pathname
    const { locale, identity } = editionOf(pathname)
    const llms = (locale === 'en' ? '' : '/' + locale) + '/llms.txt'
    const only = predicate => {
      const tags = head.filter(predicate)
      assert.equal(tags.length, 1, pathname + ' ' + predicate)
      return tags[0]
    }
    assert.ok(Buffer.byteLength(html) < 2_000_000, pathname + ' exceeds the HTML crawl budget')
    assert.equal(only(tag => tag.rel === 'canonical').href, url)
    assert.ok(!head.some(tag => tag.name === 'robots' && /none|noindex/i.test(tag.content)), pathname)
    assert.equal(headings, 1, pathname)
    assert.equal(lang, languageOf(locale), pathname)
    for (const [value, seen] of [[only(tag => tag.tag === 'title').text, titles], [only(tag => tag.name === 'description').content, descriptions]]) {
      assert.ok(value?.trim() && !seen.has(lang + ':' + value), pathname + ' missing or duplicate: ' + value)
      seen.add(lang + ':' + value)
    }
    assert.equal(only(tag => tag.property === 'og:url').content, url)
    const image = new URL(only(tag => tag.property === 'og:image').content)
    assert.ok(image.origin === origin && files.has(image.pathname.slice(1)), image.href)
    assert.equal(only(tag => tag.rel === 'describedby').href, origin + llms)
    const markdown = head.filter(tag => tag.rel === 'alternate' && tag.type === 'text/markdown')
    assert.deepEqual(markdown.map(tag => tag.href), articlePath.test(pathname) ? [url + '.md'] : [], pathname)
    const alternateTags = head.filter(tag => tag.hreflang)
    const alternates = new Map(alternateTags.map(tag => [tag.hreflang, tag.href]))
    assert.equal(alternates.size, alternateTags.length, pathname)
    assert.deepEqual(alternates, sitemap.get(url), pathname)
    if (!groups.has(identity)) groups.set(identity, new Map())
    groups.get(identity).set(lang, url)
    const schemas = head.filter(tag => tag.type === 'application/ld+json').map(tag => JSON.parse(tag.text))
    if (pathname === '/') assert.ok(schemas.some(schema => schema['@type'] === 'WebSite' && schema.name === 'Master UI' && schema.url === url))
    if (identity !== '/') {
      const trail = schemas.find(schema => schema['@type'] === 'BreadcrumbList')?.itemListElement
      assert.ok(trail?.length >= 2, pathname)
      assert.equal(trail.at(-1).item, url)
      trail.forEach((item, i) => assert.ok(item.name && item.position === i + 1 && sitemap.has(item.item), item.item))
    }
    pages.set(pathname, locale)
    anchors.set(pathname, ids)
    outbound.set(pathname, links)
  }
  assert.equal(pages.size, sitemap.size)
  for (const editions of groups.values()) {
    const expected = new Map(editions)
    if (expected.has('en')) expected.set('x-default', expected.get('en'))
    for (const url of editions.values()) assert.deepEqual(sitemap.get(url), editions.size === 1 ? new Map() : expected, url)
  }

  for (const locale of locales) {
    const prefix = locale === 'en' ? '' : '/' + locale
    const indexPath = prefix + '/llms.txt'
    const index = markdownReferences(await read(indexPath.slice(1))).links.map(link => new URL(link.url, origin).pathname)
    const search = JSON.parse(await read('search/' + locale + '.json'))
    const searchable = [...pages].filter(([path, lang]) => lang === locale && editionOf(path).identity !== '/').map(([path]) => path)
    assert.deepEqual(search.map(entry => entry.url).sort(), searchable.sort(), 'Search routes for ' + locale)
    const articles = [...pages].filter(([pathname, lang]) => lang === locale && articlePath.test(pathname)).map(([pathname]) => pathname + '.md')
    assert.deepEqual(index.filter(path => path.endsWith('.md')).sort(), articles.sort(), indexPath)
    if (locale === 'en') assert.deepEqual(index.filter(path => path.endsWith('/llms.txt')).sort(), locales.filter(lang => lang !== 'en').map(lang => '/' + lang + '/llms.txt').sort())
    outbound.set(indexPath, index)
  }
  for (const file of files) {
    if (!file.endsWith('.md') || !articlePath.test('/' + file.slice(0, -3))) continue
    const pathname = '/' + file
    assert.ok(pages.has(pathname.slice(0, -3)), 'Orphan Markdown ' + pathname)
    const markdown = await read(file)
    preserveFences(markdown, prose => { assert.doesNotMatch(prose, /^<ComponentLinks\b/m, file); return prose })
    const refs = markdownReferences(markdown)
    anchors.set(pathname, refs.anchors)
    outbound.set(pathname, refs.links.map(link => link.url))
  }
  for (const [page, links] of outbound) for (const href of links) {
    const url = new URL(href, origin + page)
    if (url.origin !== origin) continue
    const path = decodeURIComponent(url.pathname)
    assert.ok(anchors.has(path) || files.has(path.slice(1)), page + ' links to missing ' + href)
    if (url.hash && anchors.has(path)) assert.ok(anchors.get(path).has(decodeURIComponent(url.hash.slice(1))), page + ' links to missing ' + href)
  }
})
