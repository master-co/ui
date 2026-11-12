import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, extname, resolve, sep } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const { chromium, firefox, webkit } = createRequire(resolve(root, 'packages/ui/package.json'))('playwright')
const engine = process.env.MASTER_UI_BROWSER ?? 'chromium'
assert.ok({ chromium, firefox, webkit }[engine], `Unknown browser: ${engine}`)
const output = resolve(process.env.MASTER_UI_SITE_OUTPUT ?? resolve(root, 'site/out'))
const evidence = resolve(process.env.MASTER_UI_SITE_EVIDENCE ?? resolve(root, 'site/.cache/documentation-tests', engine))
const measurements = []
const noScripts = new WeakSet()
let browser, server, origin

async function serve(directory) {
  assert.ok(existsSync(resolve(directory, 'components/poll.html')), `Build the documentation before testing: ${directory}`)
  const http = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
      let file = resolve(directory, `.${pathname}`)
      if (file !== directory && !file.startsWith(directory + sep)) throw new Error('Outside output')
      if (!extname(file)) file += existsSync(file + '.html') ? '.html' : '/index.html'
      if (!(await stat(file)).isFile()) throw new Error('Not a file')
      const type = { '.html': 'text/html', '.md': 'text/markdown', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }[extname(file)] ?? 'application/octet-stream'
      response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' })
      response.end(await readFile(file))
    } catch { response.writeHead(404); response.end('Not found') }
  })
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve))
  return { server: http, origin: `http://127.0.0.1:${http.address().port}` }
}

before(async () => {
  await mkdir(evidence, { recursive: true })
  ;({ server, origin } = await serve(output))
  browser = await { chromium, firefox, webkit }[engine].launch()
})
after(async () => {
  await browser?.close()
  await new Promise(resolve => server ? server.close(resolve) : resolve())
  await mkdir(evidence, { recursive: true })
  await writeFile(resolve(evidence, 'measurements.json'), JSON.stringify({ engine, output, measurements }, null, 2))
})

const near = (actual, expected, message, tolerance = .5) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`)
async function settle(page) {
  if (noScripts.has(page)) return // Native CSS layout still runs; script callbacks do not.
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))) })
}
async function visit(page, route, textScale = 1) {
  const response = await page.goto(origin + route, { waitUntil: 'networkidle' })
  assert.equal(response.status(), 200)
  if (textScale !== 1) await page.addStyleTag({ content: `html { font-size: ${textScale * 100}% }` })
  await settle(page)
}
async function noOuterOverflow(page) {
  const size = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }))
  assert.ok(size.content <= size.viewport + 1, `Outer document overflows: ${JSON.stringify(size)}`)
}
async function box(locator) { const value = await locator.boundingBox(); assert.ok(value); return value }

async function capture(locator, name) {
  await locator.screenshot({ path: resolve(evidence, `${name}.png`) })
}

async function tableGeometry(page, stress = false) {
  if (stress) await page.locator('.contract-table td').first().evaluate(element => { element.textContent = '以鍵盤調整滑桿數值，保留清楚的狀態與說明。'.repeat(8) })
  const frame = page.locator('.contract-table').last()
  const table = await box(frame)
  const preview = await box(page.locator('[data-component-preview]').first())
  near(table.x, preview.x, 'Contract frame start follows the preview frame')
  near(table.width, preview.width, 'Contract frame width follows the preview frame')
  const material = await frame.evaluate(element => {
    const style = getComputedStyle(element)
    return { radius: parseFloat(style.borderTopLeftRadius), shadow: style.boxShadow, background: style.backgroundColor, width: element.clientWidth, scrollWidth: element.scrollWidth, overflow: style.overflowX }
  })
  assert.ok(material.radius > 0, 'The contract table has a real surface contour')
  assert.notEqual(material.background, 'rgba(0, 0, 0, 0)', 'The contract table surface is painted')
  assert.equal(await frame.getAttribute('role'), 'region')
  assert.equal(await frame.getAttribute('tabindex'), '0')
  assert.ok(await frame.getAttribute('aria-label'))
  assert.ok(['auto', 'scroll'].includes(material.overflow), 'Wide contract content scrolls in its frame')
  await noOuterOverflow(page)
  await frame.focus()
  const focus = await frame.evaluate(element => document.activeElement === element)
  assert.ok(focus, 'Keyboard can reach the overflow region')
  const focusPaint = await frame.evaluate(element => { const style = getComputedStyle(element); return { outline: style.outlineStyle, width: parseFloat(style.outlineWidth) } })
  assert.ok(focusPaint.outline !== 'none' && focusPaint.width > 0, 'The focused overflow region has a visible keyboard boundary')
  const reading = await frame.evaluate(element => {
    const table = element.querySelector('table')
    const defaults = [...element.querySelectorAll('td code')].map(code => {
      const range = document.createRange(), lines = new Map()
      const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode(); node; node = walker.nextNode()) for (let offset = 0; offset < node.textContent.length; offset++) {
        range.setStart(node, offset); range.setEnd(node, offset + 1)
        const rect = range.getBoundingClientRect()
        const top = Math.round(rect.top)
        if (rect.width && rect.height) lines.set(top, (lines.get(top) ?? '') + node.textContent[offset])
      }
      return { text: code.textContent.trim(), fragments: [...lines.values()] }
    })
    return { tableWidth: table.getBoundingClientRect().width, minimum: parseFloat(getComputedStyle(table).minWidth), rootFont: parseFloat(getComputedStyle(document.documentElement).fontSize), defaults }
  })
  assert.ok(reading.minimum >= reading.rootFont * 32 - .5, 'Contract tables retain a readable minimum width')
  assert.ok(reading.tableWidth >= reading.minimum - .5)
  for (const value of reading.defaults) {
    if (value.text.startsWith('var(')) assert.ok(value.fragments.length <= 2 && value.fragments.every(fragment => fragment.trim().length >= 5), `A long default wraps into readable fragments: ${JSON.stringify(value)}`)
    else assert.equal(value.fragments.length, 1, `Numeric default remains complete: ${JSON.stringify(value)}`)
  }
  assert.ok(reading.defaults.some(value => value.text === '.375rem'))
  let keyboardScroll = 0
  if (material.scrollWidth > material.width + 1) {
    await frame.press('ArrowRight')
    const handle = await frame.elementHandle()
    await page.waitForFunction(element => element.scrollLeft > 0, handle)
    await frame.evaluate(element => new Promise(resolve => {
      let previous = element.scrollLeft, stable = 0
      const tick = () => {
        const current = element.scrollLeft
        stable = Math.abs(current - previous) < .01 ? stable + 1 : 0
        previous = current
        if (stable >= 4) resolve(); else requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }))
    keyboardScroll = await frame.evaluate(element => element.scrollLeft)
    await frame.evaluate(element => element.scrollTo({ left: 0, behavior: 'instant' }))
    await page.waitForFunction(element => element.scrollLeft === 0, handle)
    await handle.dispose()
  }
  return { table, preview, material, reading, keyboardScroll, focusPaint }
}

async function copyGeometry(panel) {
  const overlay = panel.locator(':scope > .ui-copy')
  const outer = await box(panel), inner = await box(overlay)
  const gaps = { top: inner.y - outer.y, right: outer.x + outer.width - inner.x - inner.width, left: inner.x - outer.x, bottom: outer.y + outer.height - inner.y - inner.height }
  for (const [edge, gap] of Object.entries(gaps)) assert.ok(gap >= 3.5, `Copy background stays at least 4px inside the code contour (${edge}: ${gap}px)`)
  const radii = await panel.evaluate(element => {
    const owner = getComputedStyle(element), overlay = getComputedStyle(element.querySelector(':scope > .ui-copy'))
    return { outer: parseFloat(owner.borderStartEndRadius), inner: parseFloat(overlay.borderStartEndRadius), lower: parseFloat(overlay.borderEndEndRadius) }
  })
  near(radii.outer - radii.inner, gaps.right, 'Copy background shares the inset top corner')
  assert.equal(radii.lower, 0, 'The short copy overlay does not clamp its top corner with a second rounded end')
  return { outer, inner, gaps, radii }
}

async function pollGeometry(page, { state = true, forcedColors = false, reducedMotion = false, stress = false } = {}) {
  const tray = page.locator('[data-component-preview="several"]')
  if (stress) {
    await tray.locator('.ui-tray-title').evaluate(element => { element.textContent = '選擇多個答案，保留目前的值' })
    await tray.locator('[data-switch="view"] .segmented-item span').evaluateAll(elements => elements.forEach((element, index) => { element.textContent = index ? '程式碼' : '預覽' }))
  }
  await tray.scrollIntoViewIfNeeded()
  const frame = tray.locator('iframe')
  const preview = tray.locator('[data-demo-panel="preview"]')
  const source = tray.locator('[data-demo-panel="source"]')
  const viewport = tray.locator('[data-demo-viewport]')
  const header = tray.locator(':scope > .ui-tray-head')
  const before = { header: await box(header), panel: await box(preview), viewport: await box(viewport), iframe: await box(frame) }
  near(before.panel.y, before.header.y + before.header.height, 'Preview starts at the header bottom')
  const radii = await tray.evaluate(element => ({ outer: parseFloat(getComputedStyle(element).borderTopLeftRadius), inner: parseFloat(getComputedStyle(element.querySelector('[data-demo-viewport]')).borderTopLeftRadius), inset: parseFloat(getComputedStyle(element).paddingTop) }))
  near(radii.outer - radii.inner, radii.inset, 'Held window and tray are concentric')
  const iframeNode = await frame.elementHandle()
  if (state) {
    const choice = tray.frameLocator('iframe').getByLabel('Vue', { exact: false })
    await choice.focus()
    await choice.press('Space')
    assert.equal(await choice.isChecked(), true)
  }
  // Native keyboard radio navigation drives the CSS switch, without a bespoke click handler.
  await tray.locator('[data-view="preview"]').focus()
  await page.keyboard.press('ArrowRight')
  assert.equal(await tray.locator('[data-view="code"]').isChecked(), true)
  const code = await box(source)
  const copy = noScripts.has(page) ? undefined : await copyGeometry(source.locator('.code-panel'))
  const currentHeader = await box(header)
  near(code.y, currentHeader.y + currentHeader.height, 'Code starts at the same header edge')
  assert.equal(await preview.evaluate(element => getComputedStyle(element).visibility), 'hidden')
  assert.equal(await preview.evaluate(element => element.getBoundingClientRect().height), 0)
  const hiddenWidth = await frame.evaluate(element => element.getBoundingClientRect().width)
  near(hiddenWidth, before.iframe.width, 'Hidden iframe keeps its width')
  assert.equal(await iframeNode.evaluate(element => element === element.closest('[data-component-preview]').querySelector('iframe')), true)
  if (forcedColors) {
    const selected = tray.locator('.segmented-item:has([data-view="code"])')
    const indicator = await selected.evaluate(element => ({ style: getComputedStyle(element).outlineStyle, width: parseFloat(getComputedStyle(element).outlineWidth) }))
    assert.notEqual(indicator.style, 'none', 'Forced colors retains the selected/focused switch boundary')
    assert.ok(indicator.width > 0)
  }
  if (reducedMotion) {
    const transition = await tray.locator('[data-switch="view"]').evaluate(element => { const style = getComputedStyle(element, '::before'); return { property: style.transitionProperty, duration: style.transitionDuration, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches } })
    assert.ok(transition.reduced)
    assert.ok(transition.property === 'none' || transition.duration.split(',').every(value => parseFloat(value) <= .001), `Reduced motion removes segmented-thumb travel: ${JSON.stringify(transition)}`)
  }
  await page.keyboard.press('ArrowLeft')
  assert.equal(await tray.locator('[data-view="preview"]').isChecked(), true)
  near((await box(frame)).height, before.iframe.height, 'Returning to Preview preserves authored height')
  if (state) assert.equal(await tray.frameLocator('iframe').getByLabel('Vue', { exact: false }).isChecked(), true, 'The reader selection survives both switches')
  await iframeNode.dispose()
  await noOuterOverflow(page)
  return { before, code, radii, hiddenWidth, copy }
}

async function guideGeometry(page, stress = false) {
  const figure = page.locator('[data-guide-figure="introduction"]')
  const title = figure.locator(':scope > .ui-tray-head .ui-tray-title')
  assert.equal(await title.textContent(), 'Markup, contract and implementation')
  assert.equal(await figure.locator(':scope > .ui-stage.sheet.sheet-flat').count(), 1)
  const caption = figure.locator(':scope > .ui-tray-caption')
  assert.match(await caption.textContent(), /The contract joins markup to its implementation/)
  assert.equal(await figure.locator('.guide-figure-art').getAttribute('aria-hidden'), 'true')
  if (stress) await caption.locator('p').evaluate(element => { element.textContent += ' 合約把標記、狀態與實作連接起來；文字放大後仍能完整閱讀。'.repeat(5) })
  const typography = await caption.evaluate(element => {
    const outer = getComputedStyle(element), inner = getComputedStyle(element.querySelector('.guide-figure-caption'))
    return { outer: [outer.fontSize, outer.lineHeight, outer.color], inner: [inner.fontSize, inner.lineHeight, inner.color] }
  })
  assert.deepEqual(typography.inner, typography.outer, 'Guide captions inherit the shared tray typography')
  const bounds = await box(figure)
  for (const part of [title, figure.locator(':scope > .ui-stage'), caption]) {
    const child = await box(part)
    assert.ok(child.x >= bounds.x && child.x + child.width <= bounds.x + bounds.width + 1, 'Figure parts remain inside their holder')
  }
  await noOuterOverflow(page)
  return { figure: bounds, title: await box(title), caption: await box(caption) }
}

const cases = []
for (const width of [390, 768, 1280]) for (const colorScheme of ['light', 'dark']) for (const deviceScaleFactor of [1, 2]) cases.push({ width, colorScheme, deviceScaleFactor })
cases.push({ width: 320, colorScheme: 'light', deviceScaleFactor: 1, textScale: 2, stress: true, reducedMotion: true })
cases.push({ width: 320, colorScheme: 'dark', deviceScaleFactor: 2, textScale: 2, stress: true, forcedColors: true })
for (const scenario of cases) {
  const name = `${scenario.width}-${scenario.colorScheme}-dpr${scenario.deviceScaleFactor}${scenario.textScale ? '-text200-cjk' : ''}${scenario.forcedColors ? '-forced' : ''}${scenario.reducedMotion ? '-reduced' : ''}`
  test(`${engine}: document surfaces ${name}`, { timeout: 90000 }, async () => {
    const page = await browser.newPage({ viewport: { width: scenario.width, height: 1000 }, colorScheme: scenario.colorScheme, deviceScaleFactor: scenario.deviceScaleFactor, hasTouch: scenario.width < 768, locale: scenario.stress ? 'zh-TW' : 'en-US', reducedMotion: scenario.reducedMotion ? 'reduce' : 'no-preference', forcedColors: scenario.forcedColors ? 'active' : 'none' })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (['warning', 'error'].includes(message.type()) && /hydration|mismatch/i.test(message.text())) errors.push(message.text()) })
    try {
      await visit(page, '/components/slider', scenario.textScale)
      const environment = await page.evaluate(() => ({ dark: document.documentElement.classList.contains('dark'), dpr: devicePixelRatio, forcedColors: matchMedia('(forced-colors: active)').matches, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches }))
      assert.equal(environment.dark, scenario.colorScheme === 'dark', 'The actual document follows the requested scheme')
      assert.equal(environment.dpr, scenario.deviceScaleFactor)
      if (scenario.forcedColors) assert.equal(environment.forcedColors, true, 'Forced colors emulation is actually active')
      if (scenario.reducedMotion) assert.equal(environment.reducedMotion, true)
      const table = await tableGeometry(page, scenario.stress)
      if (scenario.deviceScaleFactor === 1 && !scenario.stress) await capture(page.locator('.contract-table').last(), `after-${name}-table`)
      await visit(page, '/components/poll#several-answers', scenario.textScale)
      const poll = await pollGeometry(page, scenario)
      if (scenario.deviceScaleFactor === 1 && !scenario.stress) await capture(page.locator('[data-component-preview="several"]'), `after-${name}-poll`)
      await visit(page, '/guide/introduction', scenario.textScale)
      const guide = await guideGeometry(page, scenario.stress)
      if (scenario.deviceScaleFactor === 1 && !scenario.stress) await capture(page.locator('[data-guide-figure="introduction"]'), `after-${name}-figure`)
      assert.deepEqual(errors, [], 'No hydration/runtime errors')
      measurements.push({ name, scenario, environment, table, poll, guide })
    } catch (error) { await page.screenshot({ path: resolve(evidence, `${name}-failure.png`), fullPage: true }); throw error }
    finally { await page.close() }
  })
}

test(`${engine}: static HTML, native switching and portable Design anchors work without site JavaScript`, { timeout: 45000 }, async () => {
  const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 1000 } })
  noScripts.add(page)
  try {
    await visit(page, '/components/poll#several-answers')
    assert.equal(await page.locator('[data-component-preview="several"] iframe').getAttribute('data-ready'), 'false')
    await pollGeometry(page, { state: false })
    await visit(page, '/guide/introduction')
    await guideGeometry(page)
    await visit(page, '/guide/design')
    const ids = ['ownership', 'native-behavior-and-explicit-contracts', 'moonstone-and-obsidian', 'choose-a-role-on-the-material-ladder', 'concentric-geometry-and-continuous-corners', 'state-feedback-on-a-stable-control', 'paper-demonstrates-a-different-material', 'customization-boundaries', 'components-layouts-and-blocks', 'guideline-to-implementation', 'review-a-change-together']
    const markdown = await (await fetch(origin + '/guide/design.md')).text()
    for (const id of ids) {
      assert.equal(await page.locator(`[id="${id}"]`).count(), 1)
      assert.ok(markdown.includes(`<a id="${id}"></a>`), `Portable anchor #${id}`)
    }
    await noOuterOverflow(page)
  } finally { await page.close() }
})

test(`${engine}: delayed preview hydration preserves SSR dimensions and native state`, { timeout: 45000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 1000 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (['warning', 'error'].includes(message.type()) && /hydration|mismatch/i.test(message.text())) errors.push(message.text()) })
  let requested
  const requestSeen = new Promise(resolve => { requested = resolve })
  let release
  const held = new Promise(resolve => { release = resolve })
  await page.route('**/PreviewViewport*.js', async route => { requested(); await held; await route.continue() })
  try {
    await page.goto(origin + '/components/poll#several-answers', { waitUntil: 'domcontentloaded' })
    const tray = page.locator('[data-component-preview="several"]')
    await tray.scrollIntoViewIfNeeded()
    await requestSeen
    await settle(page)
    const frame = tray.locator('iframe')
    assert.equal(await frame.getAttribute('data-ready'), 'false', 'The measured frame has not hydrated')
    const initial = await box(frame)
    const choice = tray.frameLocator('iframe').getByLabel('Vue', { exact: false })
    await choice.focus()
    await choice.press('Space')
    release()
    await page.waitForFunction(() => document.querySelector('[data-component-preview="several"] iframe')?.getAttribute('data-ready') === 'true')
    near((await box(frame)).height, initial.height, 'Hydration keeps SSR height')
    near((await box(frame)).width, initial.width, 'Hydration keeps SSR width')
    assert.equal(await tray.frameLocator('iframe').getByLabel('Vue', { exact: false }).isChecked(), true)
    assert.deepEqual(errors, [], 'Delayed hydration has no mismatch or runtime error')
  } finally { release(); await page.close() }
})

// Optional evidence from a preserved build; old geometry is recorded, never treated as the new contract.
test(`${engine}: matched original artifact evidence`, { skip: !process.env.MASTER_UI_SITE_BASELINE, timeout: 180000 }, async () => {
  const baseline = await serve(resolve(process.env.MASTER_UI_SITE_BASELINE))
  try {
    for (const width of [390, 768, 1280]) for (const colorScheme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, colorScheme, deviceScaleFactor: 1, hasTouch: width < 768 })
      const name = `${width}-${colorScheme}-dpr1`
      try {
        await page.goto(baseline.origin + '/components/slider', { waitUntil: 'networkidle' })
        await settle(page)
        const table = page.locator('.contract-table').last()
        await table.focus()
        const tableBox = await box(table)
        const previewBox = await box(page.locator('[data-component-preview]').first())
        await capture(table, `before-${name}-table`)
        await page.goto(baseline.origin + '/components/poll#several-answers', { waitUntil: 'networkidle' })
        const tray = page.locator('[data-component-preview="several"]')
        await tray.scrollIntoViewIfNeeded()
        const checkbox = tray.frameLocator('iframe').getByLabel('Vue', { exact: false })
        await checkbox.focus(); await checkbox.press('Space')
        const header = await box(tray.locator(':scope > .ui-tray-head'))
        const viewport = await box(tray.locator('.preview-window'))
        await tray.locator('[data-view="preview"]').focus(); await page.keyboard.press('ArrowRight')
        const code = await box(tray.locator('.code-panel'))
        const codeHeader = await box(tray.locator(':scope > .ui-tray-head'))
        await page.keyboard.press('ArrowLeft')
        await capture(tray, `before-${name}-poll`)
        await page.goto(baseline.origin + '/guide/introduction', { waitUntil: 'networkidle' })
        const figure = page.locator('[data-guide-figure="introduction"]')
        await capture(figure, `before-${name}-figure`)
        measurements.push({ baseline: true, name, table: tableBox, preview: previewBox, previewGap: viewport.y - header.y - header.height, sourceGap: code.y - codeHeader.y - codeHeader.height, figure: await box(figure) })
      } finally { await page.close() }
    }
  } finally { await new Promise(resolve => baseline.server.close(resolve)) }
})


test(`${engine}: narrow desktop keyboard reaches overflowing contract columns`, async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 1000 }, hasTouch: false })
  try {
    await visit(page, '/components/slider')
    const result = await tableGeometry(page)
    assert.ok(result.keyboardScroll > 0)
    measurements.push({ name: 'narrow-desktop-keyboard', ...result })
  } finally { await page.close() }
})

test(`${engine}: focused source code scrolls horizontally with the keyboard`, async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 1000 } })
  try {
    await visit(page, '/components/poll#several-answers')
    const tray = page.locator('[data-component-preview="several"]')
    await tray.locator('[data-view="preview"]').focus()
    await page.keyboard.press('ArrowRight')
    const pre = tray.locator('.ui-code pre')
    assert.equal(await pre.getAttribute('tabindex'), '0')
    const dimensions = await pre.evaluate(element => ({ client: element.clientWidth, content: element.scrollWidth }))
    assert.ok(dimensions.content > dimensions.client, 'The real source listing needs horizontal scrolling')
    await pre.focus()
    await pre.press('ArrowRight')
    const handle = await pre.elementHandle()
    await page.waitForFunction(element => element.scrollLeft > 0, handle, { timeout: 3000 })
    measurements.push({ name: 'source-keyboard', dimensions, scrollLeft: await pre.evaluate(element => element.scrollLeft) })
    await handle.dispose()
  } finally { await page.close() }
})


test(`${engine}: code copy background preserves the contour at rest and keyboard focus`, { timeout: 45000 }, async () => {
  for (const width of [390, 1280]) for (const colorScheme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, colorScheme })
    const name = `copy-${width}-${colorScheme}`
    try {
      await visit(page, '/components/poll#several-answers')
      const tray = page.locator('[data-component-preview="several"]')
      await tray.locator('[data-view="preview"]').focus(); await page.keyboard.press('ArrowRight')
      const panel = tray.locator('.code-panel')
      const geometry = await copyGeometry(panel)
      const crop = async state => {
        await panel.scrollIntoViewIfNeeded()
        const bounds = await box(panel)
        const x = Math.max(0, bounds.x - 2), y = Math.max(0, bounds.y - 2)
        await page.screenshot({ path: resolve(evidence, `${name}-${state}.png`), clip: { x, y, width: Math.min(width - x, bounds.width + 4), height: Math.min(132, bounds.height + 4) } })
      }
      await crop('rest')
      const button = panel.locator(':scope > .ui-copy button')
      await button.focus()
      const focus = await button.evaluate(element => ({ focused: document.activeElement === element, outline: getComputedStyle(element).outlineStyle, width: parseFloat(getComputedStyle(element).outlineWidth) }))
      assert.ok(focus.focused && focus.outline !== 'none' && focus.width > 0)
      await copyGeometry(panel)
      await crop('focus')
      measurements.push({ name, geometry, focus })
    } finally { await page.close() }
  }
})


test(`${engine}: page previews retain each new layout's geometry at all authored widths`, { timeout: 120000 }, async () => {
  for (const colorScheme of ['light', 'dark']) for (const layout of ['bento', 'masonry', 'breakout', 'sticky-stack']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, colorScheme })
    try {
      await visit(page, `/components/${layout}`)
      const tray = page.locator('[data-page-preview][data-component-preview="default"]')
      await tray.scrollIntoViewIfNeeded()
      const iframe = tray.locator('iframe'), handle = await iframe.elementHandle(), frame = await handle.contentFrame()
      await frame.locator(`.${layout}`).first().waitFor()
      for (const [size, width] of [['desktop', 1280], ['tablet', 768], ['phone', 390]]) {
        await tray.locator(`[data-size="${size}"]`).focus(); await page.keyboard.press('Space')
        await settle(page)
        const frameMetrics = await iframe.evaluate(element => ({ width: element.clientWidth, height: element.clientHeight, innerWidth: element.contentWindow.innerWidth, computedWidth: getComputedStyle(element).width, transform: getComputedStyle(element).transform, zoom: getComputedStyle(element).zoom, scale: getComputedStyle(element).getPropertyValue('--page-preview-scale'), target: getComputedStyle(element).getPropertyValue('--page-preview-width') }))
        near(frameMetrics.innerWidth, width, JSON.stringify(frameMetrics))
        const geometry = await frame.evaluate(name => {
          const root = document.querySelector(`.${name}`), style = getComputedStyle(root)
          const rect = element => { const box = element.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right } }
          const children = [...root.children].map(rect)
          return { width: innerWidth, root: rect(root), children, document: { content: document.documentElement.scrollWidth, width: document.documentElement.clientWidth }, containerWidth: root.clientWidth, computedWidth: style.width, bodyWidth: document.body.clientWidth, columns: style.gridTemplateColumns.split(' ').length, lanes: new Set(children.map(child => Math.round(child.x))).size, gridLanes: CSS.supports('display', 'grid-lanes'), wide: root.querySelector('.breakout-wide') ? rect(root.querySelector('.breakout-wide')) : null, full: root.querySelector('.breakout-full') ? rect(root.querySelector('.breakout-full')) : null }
        }, layout)
        assert.ok(geometry.document.content <= geometry.document.width + 1, `${layout}/${size} keeps overflow inside intended regions`)
        assert.ok(geometry.document.width >= width - 20, 'Scaling must not shrink the iframe layout viewport')
        assert.ok(geometry.children.every(child => child.width > 0 && child.height > 0))
        await capture(tray, `layout-${layout}-${colorScheme}-${size}`)
        measurements.push({ name: `layout-${layout}-${colorScheme}-${size}`, geometry })
        if (layout === 'bento') assert.equal(geometry.columns, { desktop: 4, tablet: 2, phone: 1 }[size], JSON.stringify(geometry))
        if (layout === 'masonry') assert.equal(geometry.lanes, { desktop: 6, tablet: 4, phone: 2 }[size])
        if (layout === 'breakout') {
          near(geometry.full.width, geometry.root.width, 'The full breakout band reaches the room edges', 1)
          assert.ok(geometry.wide.width >= geometry.children[0].width - 1)
          assert.ok(geometry.wide.x >= geometry.root.x - 1 && geometry.wide.right <= geometry.root.right + 1)
        }
        if (layout === 'sticky-stack') {
          const sticky = await frame.evaluate(() => {
            const first = document.querySelector('.sticky-stack-item')
            const initial = first.getBoundingClientRect().top
            window.scrollTo({ top: first.offsetTop + 150, behavior: 'instant' })
            return { initial }
          })
          await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
          const after = await frame.evaluate(() => ({ scroll: scrollY, top: document.querySelector('.sticky-stack-item').getBoundingClientRect().top, position: getComputedStyle(document.querySelector('.sticky-stack-item')).position }))
          assert.ok(after.scroll > 0)
          assert.equal(after.position, 'sticky')
          assert.ok(after.top >= 0 && after.top < sticky.initial, 'The first panel stops in view while its document scrolls')
          geometry.sticky = after
          await frame.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
        }
        const before = await box(iframe)
        near((await box(tray.locator('.preview-viewport'))).height, before.height, 'The stage reserves exactly the scaled iframe height')
        await tray.locator('[data-view="preview"]').focus(); await page.keyboard.press('ArrowRight')
        const source = await box(tray.locator('[data-demo-panel="source"]')), header = await box(tray.locator(':scope > .ui-tray-head'))
        near(source.y, header.y + header.height, 'Page source starts at the shared header bottom')
        await page.keyboard.press('ArrowLeft')
        near((await box(iframe)).width, before.width, 'Switching page source retains the selected viewport')
        near((await box(iframe)).height, before.height, 'Switching page source retains the authored viewport height')
        assert.equal(await handle.evaluate(element => element.isConnected), true)
        await noOuterOverflow(page)
      }
      await handle.dispose()
    } finally { await page.close() }
  }
})

test(`${engine}: framework source replacement preserves the running application's value`, async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 1000 } })
  try {
    await visit(page, '/guide/frameworks')
    const tray = page.locator('[data-component-preview="Region"]')
    await tray.scrollIntoViewIfNeeded()
    const input = tray.frameLocator('iframe').getByRole('combobox', { name: 'Region' })
    await input.fill('Tokyo'); await input.press('ArrowDown'); await input.press('Enter')
    assert.equal(await input.inputValue(), 'Tokyo')
    const application = tray.frameLocator('iframe').getByText('The application holds')
    assert.match(await application.textContent(), /hnd/)
    await tray.locator('[data-view="preview"]').focus(); await page.keyboard.press('ArrowRight')
    const source = await box(tray.locator('[data-demo-panel="source"]')), header = await box(tray.locator(':scope > .ui-tray-head'))
    near(source.y, header.y + header.height, 'Framework source starts at the shared header bottom')
    await page.keyboard.press('ArrowLeft')
    assert.equal(await input.inputValue(), 'Tokyo')
    assert.match(await application.textContent(), /hnd/)
    await noOuterOverflow(page)
  } finally { await page.close() }
})


test(`${engine}: scaled page guard activates once and permits real pointer scrolling`, { timeout: 30000 }, async () => {
  for (const width of [390, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    try {
      await visit(page, '/components/sticky-stack')
      const tray = page.locator('[data-page-preview][data-component-preview="default"]')
      await tray.scrollIntoViewIfNeeded()
      await page.waitForFunction(() => document.querySelector('[data-page-preview]').dataset.previewGuard === 'idle')
      const viewport = tray.locator('.preview-viewport'), frame = await (await tray.locator('iframe').elementHandle()).contentFrame()
      await viewport.click()
      assert.equal(await tray.getAttribute('data-preview-guard'), 'active')
      const parentScroll = await page.evaluate(() => scrollY)
      await viewport.hover(); await page.mouse.wheel(0, 250)
      await frame.waitForFunction(() => scrollY > 0)
      near(await page.evaluate(() => scrollY), parentScroll, 'An active frame receives its own wheel')
      await frame.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
      await frame.getByRole('link', { name: 'Choose another' }).click()
      assert.equal(await frame.evaluate(() => location.hash), '#repositories')
      await tray.locator('[data-view="preview"]').focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowLeft')
      assert.equal(await tray.getAttribute('data-preview-guard'), 'active', 'Source switching keeps the authored lifetime activation')
      await noOuterOverflow(page)
    } finally { await page.close() }
  }
})

test(`${engine}: scaled page viewport and native size controls work without JavaScript`, async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 1000 }, javaScriptEnabled: false })
  noScripts.add(page)
  try {
    await visit(page, '/components/bento')
    const tray = page.locator('[data-page-preview][data-component-preview="default"]')
    await tray.scrollIntoViewIfNeeded()
    const frame = tray.frameLocator('iframe')
    for (const [size, width, columns] of [['desktop', 1280, 4], ['tablet', 768, 2], ['phone', 390, 1]]) {
      await tray.locator(`[data-size="${size}"]`).focus(); await page.keyboard.press('Space')
      const actual = await frame.locator('.bento').evaluate(element => ({ width: document.documentElement.clientWidth, columns: getComputedStyle(element).gridTemplateColumns.split(' ').length }))
      assert.ok(actual.width >= width - 20 && actual.width <= width, JSON.stringify({ size, width, actual }))
      assert.equal(actual.columns, columns)
    }
    await noOuterOverflow(page)
  } finally { await page.close() }
})


// The previous registry published these ten layout items. A moved item must resolve to real JSON;
// the contractless arrangements page was removed from the registry in the 0.x taxonomy change.
test('retired registry names redirect only to generated registry items', async () => {
  const redirects = (await readFile(resolve(output, '_redirects'), 'utf8')).split('\n')
    .map(line => line.trim()).filter(line => line && !line.startsWith('#'))
    .map(line => { const [from, to, status] = line.split(/\s+/); return { from, to, status } })
  const match = pathname => {
    for (const rule of redirects) {
      const [prefix, suffix] = rule.from.split('*')
      const matches = suffix === undefined ? pathname === prefix : pathname.startsWith(prefix) && pathname.endsWith(suffix)
      if (matches) return { ...rule, target: rule.to.replace(':splat', suffix === undefined ? '' : pathname.slice(prefix.length, pathname.length - suffix.length)) }
    }
  }
  const registry = JSON.parse(await readFile(resolve(output, 'r/registry.json'), 'utf8'))
  const available = new Set(registry.items.map(item => item.name))
  for (const name of ['app-shell', 'auto-grid', 'centered', 'dashboard', 'docs', 'holy-grail', 'master-detail', 'page', 'settings']) {
    const pathname = `/r/layout-${name}.json`, rule = match(pathname)
    assert.ok(rule, `${pathname} lost its moved item`)
    assert.equal(rule.status, '301')
    const destination = JSON.parse(await readFile(resolve(output, '.' + rule.target), 'utf8'))
    assert.ok(available.has(destination.name), `${rule.target} must remain a listed registry item`)
    assert.ok(destination.files.length > 0, `${rule.target} must contain usable source`)
    assert.equal(rule.target, `/r/${destination.name}.json`)
  }
  assert.equal(match('/r/layout-arrangements.json'), undefined, 'Removed arrangements must not be redirected to nonexistent page JSON')
  assert.equal(existsSync(resolve(output, 'r/layout-arrangements.json')), false)
  assert.equal(match('/r/layout-does-not-exist.json'), undefined, 'Unknown names must not acquire speculative registry redirects')
})
