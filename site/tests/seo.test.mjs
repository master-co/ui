import assert from 'node:assert/strict'
import { test } from 'node:test'
import { completeGraph, editionOf, pageOf, pngSize, renderSitemap } from '../scripts/seo.mjs'

const origin = 'https://ui.master.co'
const page = (head, body = '') => `<!doctype html><html><head>${head}</head><body>${body}</body></html>`

test('an edition shares its pathname with the other editions of the page', () => {
  assert.deepEqual(editionOf('/components/button'), { locale: 'en', identity: '/components/button' })
  assert.deepEqual(editionOf('/tw/components/button'), { locale: 'tw', identity: '/components/button' })
  assert.deepEqual(editionOf('/ja'), { locale: 'ja', identity: '/' })
  assert.deepEqual(editionOf('/'), { locale: 'en', identity: '/' })
})

test('only an indexable page with a canonical URL on the origin is listed', () => {
  assert.equal(pageOf(page('<title>x</title>'), origin), undefined)
  assert.equal(pageOf(page('<meta name="robots" content="noindex"><link rel="canonical" href="https://ui.master.co/404">'), origin), undefined)
  assert.equal(pageOf(page('<link rel="canonical" href="https://elsewhere.dev/a">'), origin), undefined)
  // A tag written inside an inline script is not the page's.
  assert.equal(pageOf(page('<script>"<link rel=\\"canonical\\" href=\\"https://ui.master.co/a\\">"</script>'), origin), undefined)
  assert.equal(pageOf(page('<link rel="canonical" href="https://ui.master.co/ko/guide/theme">'), origin).url, 'https://ui.master.co/ko/guide/theme')
})

test('the Open Graph identity is completed once, from the canonical URL', () => {
  const html = page('<link rel="canonical" href="https://ui.master.co/tw/guide/theme"><meta property="og:title" content="主題">')
  const completed = completeGraph(html, pageOf(html, origin))
  assert.match(completed, /<meta property="og:url" content="https:\/\/ui\.master\.co\/tw\/guide\/theme">/)
  assert.match(completed, /<meta property="og:type" content="article">/)
  assert.match(completed, /<meta property="og:locale" content="zh_TW"><\/head>/)
  assert.equal(completeGraph(completed, pageOf(completed, origin)), completed)
  const component = page('<link rel="canonical" href="https://ui.master.co/components/button">')
  assert.match(completeGraph(component, pageOf(component, origin)), /og:type" content="website"/)
})

test('a PNG card the site serves gets its size and its text alternative', () => {
  const sizeOf = url => url.startsWith('https://ui.master.co/') && url.endsWith('.png') ? { width: 1200, height: 630 } : undefined
  const html = page('<link rel="canonical" href="https://ui.master.co/components/button"><meta property="og:title" content="Button &amp; more">'
    + '<meta property="og:image" content="https://ui.master.co/og/0123abcd.png"><meta name="twitter:image" content="https://ui.master.co/og/0123abcd.png">')
  const completed = completeGraph(html, pageOf(html, origin), sizeOf)
  for (const tag of ['<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">', '<meta property="og:image:type" content="image/png">',
    '<meta property="og:image:alt" content="Button &amp; more">', '<meta name="twitter:image:alt" content="Button &amp; more">']) assert.ok(completed.includes(tag), tag)
  // A cover keeps the text alternative it was given.
  const cover = page('<link rel="canonical" href="https://ui.master.co/"><meta property="og:title" content="Master UI">'
    + '<meta property="og:image" content="https://ui.master.co/brand/cover.png"><meta property="og:image:alt" content="The hero">')
  const covered = completeGraph(cover, pageOf(cover, origin), sizeOf)
  assert.ok(covered.includes('<meta name="twitter:image:alt" content="The hero">'))
  assert.equal(covered.match(/og:image:alt/g).length, 1)
  const elsewhere = page('<link rel="canonical" href="https://ui.master.co/"><meta property="og:image" content="https://cdn.example/card.png">')
  assert.doesNotMatch(completeGraph(elsewhere, pageOf(elsewhere, origin), sizeOf), /og:image:width/)
})

test('a PNG is measured from its header', () => {
  const header = Buffer.alloc(24)
  header.write('\x89PNG\r\n\x1a\n', 0, 'latin1'); header.write('IHDR', 12, 'latin1'); header.writeUInt32BE(2400, 16); header.writeUInt32BE(1260, 20)
  assert.deepEqual(pngSize(header), { width: 2400, height: 1260 })
  assert.throws(() => pngSize(Buffer.alloc(24)), /PNG/)
})

test('sitemap bytes do not depend on the order in which pages and locales were found', () => {
  const groups = new Map([
    ['/z', new Map([['ja', 'https://ui.master.co/ja/z'], ['en', 'https://ui.master.co/z']])],
    ['/a', new Map([['tw', 'https://ui.master.co/tw/a?x=1&y=2']])]
  ])
  const reversed = new Map([...groups].reverse().map(([key, editions]) => [key, new Map([...editions].reverse())]))
  const xml = renderSitemap(groups)
  assert.equal(renderSitemap(reversed), xml)
  assert.deepEqual([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]), [
    'https://ui.master.co/tw/a?x=1&amp;y=2', 'https://ui.master.co/z', 'https://ui.master.co/ja/z'
  ])
  assert.equal(xml.match(/hreflang="x-default" href="https:\/\/ui\.master\.co\/z"/g)?.length, 2)
  assert.equal(xml.match(/hreflang="ja"/g)?.length, 2)
})
