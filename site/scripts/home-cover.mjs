/**
 * Draws the home page's social cards from each edition's own hero: the brand, the version pill, the headline and the
 * lead on the left, and the tilted plane of the library's components on the right, at 1200×630 and twice the pixels.
 * English is `public/brand/master-ui-og.png`; every other edition is `master-ui-og.<locale>.png`. Run it against the
 * site served anywhere, after a change to the hero or its words:
 *
 *   bun run dev
 *   node site/scripts/home-cover.mjs http://localhost:3300
 *
 * The card is committed; builds never draw it. Motion is reduced, so the plane stands still where the page lays it.
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const origin = process.argv[2]
if (!origin) throw new Error('Pass the origin that serves the site, such as http://localhost:3300')
const editions = { en: '/', tw: '/tw', ja: '/ja', ko: '/ko', cn: '/cn' }
const { chromium } = createRequire(new URL('../../packages/ui/package.json', import.meta.url))('playwright')

/** The hero as a card: no controls, the actions out, the words larger and centered in the height. */
const card = `
  .home-header a:not(.ui-header-brand), .home-header button { visibility: hidden !important }
  .ui-hero-actions { display: none !important }
  .ui-hero { height: 630px !important; min-height: 0 !important }
  .ui-hero-body { height: 100% !important; display: flex !important; align-items: center !important; padding-block: 24px 0 !important }
  .ui-hero-reading { margin-inline-start: 24px !important }
  .ui-hero-title { font-size: 60px !important }
  /* Japanese runs longer and breaks between any two characters: break it at phrases, a little smaller. */
  .ui-hero-title:lang(ja) { font-size: 52px !important; word-break: auto-phrase !important }
  /* The Simplified Chinese headline has no comma to break at: two even lines. */
  .ui-hero-title:lang(zh-CN) { max-width: 7.2em !important; text-wrap: balance !important }
  .ui-hero-lead { max-width: 30rem !important }
`

const browser = await chromium.launch()
try {
  for (const [locale, pathname] of Object.entries(editions)) {
    const output = fileURLToPath(new URL(`../public/brand/master-ui-og${locale === 'en' ? '' : '.' + locale}.png`, import.meta.url))
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2, colorScheme: 'light', reducedMotion: 'reduce' })
    await page.goto(new URL(pathname, origin).href, { waitUntil: 'load' })
    // A development server may reload the page once while it settles; draw what stands after it.
    await page.waitForTimeout(3000)
    await page.waitForLoadState('load')
    await page.addStyleTag({ content: card })
    await page.evaluate(async () => {
      await document.fonts.ready
      // Only the pictures in the card; a lazy one further down never loads, and its decode never settles.
      const inView = [...document.images].filter(image => image.getBoundingClientRect().top < innerHeight)
      await Promise.race([Promise.all(inView.map(image => image.decode().catch(() => {}))), new Promise(done => setTimeout(done, 5000))])
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(500)
    await page.screenshot({ path: output, clip: { x: 0, y: 0, width: 1200, height: 630 } })
    await page.close()
    console.log(`Wrote ${output}`)
  }
} finally {
  await browser.close()
}
