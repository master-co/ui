import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { chromium, firefox, webkit, type Browser, type Locator, type Page } from 'playwright'
import { createServer, type ViteDevServer } from 'vite'
import { verifyComponentGeometry } from '../components/geometry.ts'

/**
 * The framework components in a real browser. The scenarios run in happy-dom, which has no layout, no top
 * layer, no scrolling and no frames; this file is for what only a browser does: a dialog its trigger opens,
 * a popover placed against its button, a tooltip that shows, a wheel that turns, a toast that leaves.
 *
 * It serves the playground, which mounts every fixture of one framework on the compiled stylesheet, and
 * works each example as a reader would, with a real pointer and real keys. Run it with
 * `bun run test:browser`; set MASTER_UI_BROWSER to chromium (default), firefox or webkit.
 * Install the selected engine with `bun x playwright install <engine>` first.
 */
const engine = process.env.MASTER_UI_BROWSER ?? 'chromium'
const browsers = { chromium, firefox, webkit }
if (!(engine in browsers)) throw new Error(`Unknown MASTER_UI_BROWSER: ${engine}`)

let server: ViteDevServer
let browser: Browser
let origin: string

before(async () => {
  server = await createServer({
    configFile: fileURLToPath(new URL('./playground/vite.config.ts', import.meta.url)),
    // Its own port and cache, so it runs beside a playground someone has open.
    cacheDir: fileURLToPath(new URL('../../node_modules/.vite-browser-test', import.meta.url)),
    server: { port: 4329, strictPort: false },
    logLevel: 'error',
  })
  await server.listen()
  origin = server.resolvedUrls!.local[0]
  browser = await browsers[engine as keyof typeof browsers].launch()
})

after(async () => {
  await browser?.close()
  await server?.close()
})

/** Wait for something a browser does in its own time: a frame, a transition, a scroll that settles. */
async function until<T>(read: () => Promise<T>, wanted: (value: T) => boolean, message: string, timeout = 4000) {
  const start = Date.now()
  let value = await read()
  while (!wanted(value) && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, 50))
    value = await read()
  }
  assert.ok(wanted(value), `${message}: ${JSON.stringify(value)}`)
  return value
}

const open = (popover: Locator) => popover.evaluate(element => element.matches(':popover-open'))
const box = async (locator: Locator) => (await locator.boundingBox())!
const focused = (page: Page) => page.evaluate(() => (document.activeElement?.textContent ?? '').replace(/\s+/g, ' ').trim())

test(`${engine}: native defaults and composed surface geometry`, async (t) => {
  for (const theme of ['default', 'paper', 'round'] as const) for (const scheme of ['light', 'dark'] as const) {
    await t.test(`${theme}/${scheme}`, async () => {
      await verifyComponentGeometry(browser, { theme, scheme, direction: scheme === 'dark' ? 'rtl' : 'ltr' })
    })
  }
  await t.test('coarse pointer', async () => {
    await verifyComponentGeometry(browser, { theme: 'default', scheme: 'light', touch: true })
  })
  await t.test('forced colors', async () => {
    await verifyComponentGeometry(browser, { theme: 'default', scheme: 'light', forcedColors: true })
  })
})

test(`${engine}: a linked card owns its hover and focus inside a linked card`, async () => {
  const page = await browser.newPage()
  try {
    await page.setContent(`<article class="card" id="outer">
      <h2 class="card-title"><a class="card-link" id="outer-link" href="#outer">Outer</a></h2>
      <div class="card-body">
        <article class="card" id="inner">
          <h3 class="card-title"><a class="card-link" id="inner-link" href="#inner">Inner</a></h3>
        </article>
      </div>
    </article>`)
    await page.addStyleTag({ content: await readFile(new URL('../../dist/standalone.css', import.meta.url), 'utf8') + '\n.card { transition: none; }' })
    const outline = (link: string) => page.locator(link).evaluate(element => getComputedStyle(element, '::after').outlineStyle)
    const shadow = (card: string) => page.locator(card).evaluate(element => getComputedStyle(element).boxShadow)
    const [outer, inner] = await Promise.all([shadow('#outer'), shadow('#inner')])

    await page.locator('#outer-link').focus()
    assert.equal(await outline('#outer-link'), 'solid')
    assert.equal(await outline('#inner-link'), 'none')
    await page.locator('#inner-link').focus()
    assert.equal(await outline('#outer-link'), 'none')
    assert.equal(await outline('#inner-link'), 'solid')

    await page.locator('#inner-link').hover()
    await until(() => shadow('#inner'), value => value !== inner, 'the inner card lifts')
    assert.equal(await shadow('#outer'), outer, 'the inner link leaves the enclosing card at rest')
    await page.locator('#outer-link').hover()
    await until(() => shadow('#inner'), value => value === inner, 'the inner card returns to rest')
    await until(() => shadow('#outer'), value => value !== outer, 'the outer card lifts for its own link')
  } finally { await page.close() }
})

test(`${engine}: Composer sends with Enter and leaves the IME and Shift+Enter to the textarea`, async () => {
  const source = await readFile(new URL('../../../../site/content/components/composer/content.mdx', import.meta.url), 'utf8')
  const listener = source.match(/```js\n([\s\S]*?)\n```/)?.[1]
  assert.ok(listener)
  const page = await browser.newPage()
  try {
    await page.setContent('<form><textarea name="message"></textarea><output>0</output></form>')
    await page.addScriptTag({ content: `const field = document.querySelector('textarea');
      ${listener}
      field.form.addEventListener('submit', event => {
        event.preventDefault();
        const output = field.form.querySelector('output');
        output.value = Number(output.value) + 1;
      });` })
    const field = page.locator('textarea')
    assert.deepEqual(await field.evaluate(element => [
      { key: 'Enter', isComposing: true }, { key: 'Enter', keyCode: 229 },
    ].map(given => {
      const event = new KeyboardEvent('keydown', { ...given, bubbles: true, cancelable: true })
      element.dispatchEvent(event)
      if (given.keyCode === 229 && event.keyCode !== 229) throw new Error('The fixture did not produce keyCode 229')
      return event.defaultPrevented
    })), [false, false])
    assert.equal(await page.locator('output').textContent(), '0')
    await field.press('Shift+Enter')
    assert.equal(await field.inputValue(), '\n')
    await field.press('Enter')
    assert.equal(await page.locator('output').textContent(), '1')
  } finally { await page.close() }
})

test(`${engine}: the rich Select example mirrors its text and submits the native value`, async () => {
  const source = await readFile(new URL('../../../../site/content/components/select/content.mdx', import.meta.url), 'utf8')
  const markup = source.match(/name="icons"[^\n]*html=\{`([\s\S]*?)`\}/)?.[1]
  assert.ok(markup)
  const css = await readFile(new URL('../../dist/standalone.css', import.meta.url), 'utf8')
  for (const custom of [true, false]) {
    const page = await browser.newPage()
    try {
      await page.setContent(markup)
      await page.addStyleTag({ content: css + (custom ? '' : '\n.select, .select::picker(select) { appearance: auto; }') })
      const select = page.locator('select')
      assert.deepEqual(await select.evaluate((element: HTMLSelectElement) => [...element.options].map(option => option.label)), ['Email', 'Text message'])
      await select.selectOption({ label: 'Text message' })
      if (custom && await page.evaluate(() => CSS.supports('appearance', 'base-select'))) {
        assert.equal((await select.locator('selectedcontent').textContent())?.trim(), 'Text message')
        assert.equal(await select.locator('selectedcontent svg[aria-hidden="true"]').count(), 1)
      }
      await page.getByRole('button', { name: 'Save' }).click()
      assert.equal(await page.locator('output').textContent(), 'sms')
    } finally { await page.close() }
  }
})

test(`${engine}: searchable tabs honor an initial fragment after the behavior attaches`, async () => {
  const markup = `<div class="tabs" role="tablist" aria-label="Account">
    <button type="button" role="tab" aria-controls="profile" aria-selected="true">Profile</button>
    <button type="button" role="tab" aria-controls="billing" aria-selected="false">Billing</button>
  </div>
  <section id="profile" role="tabpanel">Profile settings</section>
  <section id="billing" role="tabpanel" hidden><p id="invoice">Invoice details</p></section>`
  const page = await browser.newPage()
  try {
    const url = new URL('searchable-tabs-test', origin).href
    await page.route(url, route => route.fulfill({ body: markup, contentType: 'text/html' }))
    await page.goto(`${url}#invoice`)
    const supported = await page.evaluate(() => 'onbeforematch' in document.documentElement)
    const source = await readFile(new URL('../../behaviors/tabs.js', import.meta.url), 'utf8')
    await page.addScriptTag({ content: `${source.replace('export function tabs', 'function tabs')}
      tabs(document.querySelector('.tabs'), { searchable: true });` })
    assert.equal(await page.getByRole('tab', { name: 'Billing' }).getAttribute('aria-selected'), String(supported))
    assert.equal(await page.locator('#invoice').isVisible(), supported)
    assert.equal(await page.getByRole('tabpanel').count(), 1)
  } finally { await page.close() }
})

test(`${engine}: Editable keeps a restored draft and follows native submission and reset`, async () => {
  const page = await browser.newPage()
  try {
    const contract = JSON.parse(await readFile(new URL('../../components/editable.json', import.meta.url), 'utf8'))
    const url = new URL('editable-form-test', origin).href
    await page.route(url, route => route.fulfill({
      contentType: 'text/html',
      body: `<form>${contract.example}<button>Submit</button><button type="reset">Reset</button></form><output></output>`,
    }))
    await page.goto(url)
    await page.addStyleTag({ content: await readFile(new URL('../../dist/standalone.css', import.meta.url), 'utf8') })
    const field = page.locator('.editable-field')
    const preview = page.locator('.editable-preview')
    const behavior = fileURLToPath(new URL('../../behaviors/editable.js', import.meta.url))
    const handle = await page.evaluateHandle(async path => {
      const { editable } = await import(path)
      const form = document.querySelector('form')!
      form.addEventListener('submit', event => {
        event.preventDefault()
        document.querySelector('output')!.value = String(new FormData(form).get('title'))
      })
      form.querySelector('input')!.value = 'Restored draft'
      return editable(form.querySelector('.editable'))
    }, `/@fs${behavior}`)
    assert.equal(await preview.textContent(), 'Restored draft')
    await preview.click()
    assert.equal(await field.inputValue(), 'Restored draft')
    await field.fill('Renamed')
    await field.press('Enter')
    const reset = page.getByRole('button', { name: 'Reset' })
    await page.locator('form').evaluate(form => form.addEventListener('reset', event => event.preventDefault(), { once: true }))
    await reset.click()
    await page.getByRole('button', { name: 'Submit' }).click()
    assert.equal(await page.locator('output').textContent(), 'Renamed')
    await reset.click()
    await until(() => preview.textContent(), value => value === 'Quarterly report', 'the preview follows the native reset')
    assert.equal(await handle.evaluate(controller => controller.value), 'Quarterly report')
    await page.getByRole('button', { name: 'Submit' }).click()
    assert.equal(await page.locator('output').textContent(), 'Quarterly report')
    await handle.evaluate(controller => { controller.value = '' })
    await page.getByRole('button', { name: 'Submit' }).click()
    assert.equal(await field.evaluate(element => document.activeElement === element), true)
    await field.fill('Corrected')
    await field.press('Enter')
    await page.getByRole('button', { name: 'Submit' }).click()
    assert.equal(await page.locator('output').textContent(), 'Corrected')
  } finally { await page.close() }
})

test(`${engine}: a Wheel starts on the authored selection before the behavior attaches`, async () => {
  const page = await browser.newPage()
  try {
    await page.setContent(`<div class="wheel"><div class="wheel-column" role="listbox" tabindex="0">
      <div class="wheel-option" role="option">First</div><div class="wheel-option" role="option">Second</div>
      <div class="wheel-option" role="option" aria-selected="true">Third</div>
      <div class="wheel-option" role="option">Fourth</div><div class="wheel-option" role="option">Fifth</div>
    </div></div>`)
    await page.addStyleTag({ content: await readFile(new URL('../../dist/standalone.css', import.meta.url), 'utf8') })
    const column = page.locator('.wheel-column')
    if (await page.evaluate(() => CSS.supports('scroll-initial-target', 'nearest'))) {
      await until(() => column.evaluate(element => {
        const chosen = element.querySelector('[aria-selected="true"]')!.getBoundingClientRect()
        return chosen.top + chosen.height / 2 - element.getBoundingClientRect().top - element.clientHeight / 2
      }), distance => Math.abs(distance) < 1, 'the initial scroll centers the selected option')
    } else {
      assert.equal(await column.evaluate(element => element.scrollTop), 0)
    }
  } finally { await page.close() }
})

for (const framework of ['react', 'svelte', 'vue']) {
  test(`${engine}/${framework}: every component, in a browser`, async (t) => {
    const page = await browser.newPage({ viewport: { width: 900, height: 800 } })
    const problems: string[] = []
    page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) problems.push(`${message.type()}: ${message.text()}`) })
    page.on('pageerror', error => problems.push(`thrown: ${error.message}`))
    await page.goto(`${origin}?only=${framework}`)
    await page.waitForSelector(`[data-framework="${framework}"] [data-example="toast"]`)
    const anchored = await page.evaluate(() => CSS.supports('position-area: block-end'))
    const scopedAnchor = await page.evaluate(() => CSS.supports('anchor-scope: --combobox') && CSS.supports('min-inline-size: anchor-size(--combobox inline)'))

    const example = (name: string) => page.locator(`[data-framework="${framework}"] [data-example="${name}"]`)
    const said = (name: string, text: string) => until(() => example(name).locator('output').innerText(), value => value === text, `${name} said`)

    await t.test('a fragment link selects a searchable tab and keeps its panel and application value in step', async () => {
      const view = example('tabs')
      const billing = view.getByRole('tab', { name: 'Billing' })
      const id = (await billing.getAttribute('aria-controls'))!
      const panel = view.locator('[role="tabpanel"]').filter({ hasText: 'Billing settings' })
      const supported = await page.evaluate(() => 'onbeforematch' in document.documentElement)
      assert.equal(await panel.getAttribute('hidden'), supported ? 'until-found' : '')
      if (supported) {
        await page.evaluate(id => {
          const link = document.createElement('a')
          link.href = `#${encodeURIComponent(id)}`
          link.click()
        }, id)
      } else await billing.click()
      await said('tabs', 'onValueChange: "billing"')
      assert.equal(await billing.getAttribute('aria-selected'), 'true')
      assert.equal(await billing.getAttribute('tabindex'), '0')
      assert.equal(await panel.getAttribute('hidden'), null)
      assert.equal(await view.getByRole('tabpanel').count(), 1)
    })

    await t.test('a dialog is opened by the browser from its trigger, and says so', async () => {
      const dialog = example('dialog').locator('dialog')
      const trigger = example('dialog').locator('button[command="show-modal"]')
      await trigger.click()
      await until(() => dialog.evaluate((element: HTMLDialogElement) => element.open && element.matches(':modal')), Boolean, 'the dialog is open and modal')
      await said('dialog', 'onOpenChange: true')
      await dialog.getByRole('button', { name: 'Cancel' }).click()
      await until(() => dialog.evaluate((element: HTMLDialogElement) => element.open), value => !value, 'a button with command="close" closes it')
      await said('dialog', 'onOpenChange: false')
      await trigger.focus()
      await trigger.press('Enter')
      await page.keyboard.press('Escape')
      await until(() => dialog.evaluate((element: HTMLDialogElement) => element.open), value => !value, 'Escape closes it')
      assert.equal(await trigger.evaluate(element => element === document.activeElement), true, 'focus returns to the trigger')
    })

    await t.test('a popover opens against its trigger and is dismissed by a press outside', async () => {
      const popover = example('popover').locator('.popover')
      const trigger = example('popover').locator('button[popovertarget]')
      await trigger.click()
      await until(() => open(popover), Boolean, 'the popover is open')
      const gap = (await box(popover)).y - ((await box(trigger)).y + (await box(trigger)).height)
      if (anchored) assert.ok(gap > 2 && gap < 10, `it sits under its trigger, ${gap}px away`)
      else {
        const bounds = await box(popover)
        assert.ok(Math.abs(bounds.x + bounds.width / 2 - 450) < 2, 'without anchors the popover remains centered and usable')
      }
      await said('popover', 'onOpenChange: true')
      await page.mouse.click(880, 10)
      await until(() => open(popover), value => !value, 'a press outside dismisses it')
      await said('popover', 'onOpenChange: false')
    })

    await t.test('a controlled popover opens from its declarative trigger', async () => {
      const controlled = await browser.newPage({ viewport: { width: 900, height: 800 } })
      try {
        await controlled.goto(`${origin}?only=${framework}&open-popover`)
        const popover = controlled.locator('[data-example="popover"] .popover')
        const trigger = controlled.locator('[data-example="popover"] button[popovertarget]')
        await until(() => open(popover), Boolean, 'the owner opens the popover')
        const hasSource = await controlled.evaluate(() => {
          const node = document.createElement('div')
          node.popover = 'manual'
          document.body.append(node)
          let read = false
          node.showPopover({ get source() { read = true; return undefined } })
          node.remove()
          return read
        })
        if (anchored && hasSource) {
          await until(async () => {
            const anchor = await box(trigger)
            const panel = await box(popover)
            return panel.y - anchor.y - anchor.height
          }, gap => gap > 2 && gap < 10, 'it sits under its source')
        }
      } finally { await controlled.close() }
    })

    await t.test('a tooltip shows for the control that names it', async (t) => {
      const tooltip = example('tooltip').locator('.tooltip')
      const trigger = example('tooltip').locator('button[interestfor]')
      if (!await page.evaluate(() => 'interestForElement' in HTMLButtonElement.prototype)) {
        await trigger.hover()
        assert.equal(await open(tooltip), false, 'without interest invokers the optional hint stays closed')
        assert.equal(await trigger.innerText(), 'Deploy', 'the control keeps its visible accessible name')
        await trigger.focus()
        assert.equal(await trigger.evaluate(element => element === document.activeElement), true)
        return
      }
      await trigger.hover()
      await until(() => open(tooltip), Boolean, 'interest in the control shows the tooltip')
      const above = (await box(trigger)).y - ((await box(tooltip)).y + (await box(tooltip)).height)
      assert.ok(above > 0 && above < 16, `it sits above its control, ${above}px away`)
      await page.mouse.move(880, 10)
      await until(() => open(tooltip), value => !value, 'it leaves with the pointer')
    })

    await t.test('a menu opens from its trigger, takes focus and the keys, and gives focus back', async () => {
      const menu = example('menu').locator('.menu')
      const trigger = example('menu').locator('button[popovertarget].btn')
      await trigger.focus()
      await trigger.press('Enter')
      await until(() => open(menu), Boolean, 'the menu is open')
      await until(() => focused(page), value => value.startsWith('Rename'), 'focus is on the first item')
      await page.keyboard.press('ArrowDown')
      assert.equal(await focused(page), 'Duplicate')
      await page.keyboard.press('End')
      assert.equal(await focused(page), 'Delete')
      await page.keyboard.press('Escape')
      await until(() => open(menu), value => !value, 'Escape closes it')
      assert.equal(await trigger.evaluate(element => element === document.activeElement), true, 'focus returns to the trigger')
    })

    await t.test('a context menu opens at the pointer', async () => {
      const menu = example('context-menu').locator('.menu')
      const target = example('context-menu').locator('.sheet')
      await target.click({ button: 'right', position: { x: 40, y: 12 } })
      await until(() => open(menu), Boolean, 'a right click opens it')
      const at = (await box(target)).x + 40
      assert.ok(Math.abs((await box(menu)).x - at) < 4, 'its corner is where the pointer was')
      await page.keyboard.press('Escape')
      await until(() => open(menu), value => !value, 'Escape closes it')
    })

    await t.test('a combobox filters as it is typed in, under its field, and gives the value of what is chosen', async () => {
      const field = example('combobox').locator('[role="combobox"]')
      const list = example('combobox').locator('[role="listbox"]')
      assert.equal(await field.inputValue(), 'Singapore', 'the first value is in the field')
      await field.fill('')
      await field.pressSequentially('fra')
      await until(() => open(list), Boolean, 'typing opens the list')
      assert.deepEqual(await list.locator('[role="option"]:visible').allInnerTexts().then(texts => texts.map(text => text.split('\n')[0])), ['Frankfurt'])
      const group = example('combobox').locator('.input-group')
      // The list grows into place as it enters.
      if (scopedAnchor) await until(async () => (await box(list)).width - (await box(group)).width, difference => Math.abs(difference) < 2, 'the list is as wide as the field')
      else assert.ok((await box(list)).width > 0, 'without scoped anchors the list retains its own usable width')
      const gap = (await box(list)).y - ((await box(group)).y + (await box(group)).height)
      assert.ok(gap > 2 && gap < 10, `the list sits under the whole field, ${gap}px away`)
      await page.keyboard.press('Enter')
      assert.equal(await field.inputValue(), 'Frankfurt')
      await said('combobox', 'onValueChange: "fra"')
      await until(() => open(list), value => !value, 'choosing closes the list')
    })

    await t.test('a listbox is walked with the keys', async () => {
      await example('listbox').locator('[role="listbox"]').focus()
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Enter')
      await said('listbox', 'onValueChange: "sin"')
      // With the chosen option out of view, a press must not scroll it back under the pointer: the click
      // would land on another option, or on none.
      const list = example('listbox').locator('[role="listbox"]')
      await list.evaluate((element: HTMLElement) => element.blur())
      const third = await box(list.locator('[role="option"]').nth(2))
      await page.evaluate(by => window.scrollBy(0, by), third.y - 2)
      await list.getByText('London').click()
      await said('listbox', 'onValueChange: "lhr"')
    })

    await t.test('a calendar chooses a day, turns its month and keeps focus on the day', async () => {
      const calendar = example('calendar')
      await calendar.locator('button[value="2026-11-20"]').click()
      await said('calendar', 'onValueChange: "2026-11-20"')
      await page.keyboard.press('PageDown')
      await until(() => calendar.locator('.calendar-title').innerText(), value => value === 'December 2026', 'PageDown shows the next month')
      await until(() => page.evaluate(() => (document.activeElement as HTMLButtonElement)?.value), value => value === '2026-12-20', 'focus is on the same day of it')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('Enter')
      await said('calendar', 'onValueChange: "2026-12-21"')
      assert.equal(await calendar.locator('[aria-selected="true"]').count(), 1)
    })

    await t.test('a calendar\'s title jumps to the months and back with real keys, and focus goes with it', async () => {
      const calendar = example('calendar')
      const title = () => calendar.locator('.calendar-title').innerText()
      const focused = () => page.evaluate(() => (document.activeElement as HTMLButtonElement)?.value)
      await calendar.locator('.calendar-title-button').click()
      await until(title, value => value === '2026', 'the title shows the months of the year')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await until(focused, value => value === '2026-12', 'Tab, past the next button, enters the months at the month shown')
      await page.keyboard.press('ArrowDown')
      await until(focused, value => value === '2027-03', 'ArrowDown goes three months on, into the next year')
      await page.keyboard.press('Enter')
      await until(title, value => value === 'March 2027', 'Enter on a month shows its days')
      await until(focused, value => value === '2027-03-21', 'with focus on the same day')
      await calendar.locator('.calendar-title-button').click()
      await calendar.locator('.calendar-title-button').click()
      await until(focused, value => value === '2027', 'in the years focus leaves the title for the grid')
      await page.keyboard.press('Escape')
      await until(title, value => value === 'March 2027', 'Escape goes back to the days')
      await until(focused, value => value === '2027-03-21')
    })

    await t.test('a one-time code fills slot by slot and says when it is complete', async () => {
      const slots = example('otp').locator('.otp-slot')
      assert.deepEqual(await slots.evaluateAll((all: HTMLInputElement[]) => all.map(slot => slot.value)), ['4', '8', '', '', '', ''])
      await slots.nth(2).click()
      await page.keyboard.type('7391')
      assert.deepEqual(await slots.evaluateAll((all: HTMLInputElement[]) => all.map(slot => slot.value)), ['4', '8', '7', '3', '9', '1'])
      await said('otp', 'onComplete: "487391"')
    })

    await t.test('a splitter is dragged and moved with the keys', async () => {
      const root = example('splitter').locator('.splitter')
      const handle = example('splitter').locator('.splitter-handle')
      const size = () => root.evaluate((element: HTMLElement) => parseFloat(element.style.getPropertyValue('--splitter-size')))
      assert.equal(await size(), 36)
      await root.scrollIntoViewIfNeeded()
      const at = await box(handle)
      await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2)
      await page.mouse.down()
      await page.mouse.move(at.x + at.width / 2 + 90, at.y + at.height / 2, { steps: 5 })
      await page.mouse.up()
      const dragged = await until(size, value => value > 40, 'a drag makes the first pane larger')
      await said('splitter', `onValueCommit: ${dragged}`)
      const pane = (await box(root.locator('.splitter-pane').first())).width / (await box(root)).width * 100
      assert.ok(Math.abs(pane - dragged) < 2, `the first pane is ${Math.round(pane)}% wide, as the size says`)
      await handle.focus()
      await page.keyboard.press('End')
      assert.equal(await size(), 80, 'End moves it to its greatest size')
    })

    await t.test('a stepper steps its number', async () => {
      await example('stepper').getByRole('button', { name: 'More seats' }).click()
      assert.equal(await example('stepper').locator('input').inputValue(), '5')
      await said('stepper', 'onValueChange: 5')
    })

    await t.test('a comparison moves with its range input', async () => {
      await example('compare').locator('.compare-range').focus()
      await page.keyboard.press('ArrowRight')
      await said('compare', 'onValueChange: 51')
    })

    await t.test('a tree selects a row and folds with the keys', async () => {
      const tree = example('tree')
      await tree.getByText('README.md').click()
      await said('tree', 'onValueChange: "README.md"')
      await page.keyboard.press('ArrowUp')
      assert.equal(await focused(page), 'themes')
      await page.keyboard.press('ArrowRight')
      assert.equal(await tree.getByRole('treeitem', { name: 'themes', exact: true }).getAttribute('aria-expanded'), 'true')
    })

    await t.test('a wheel turns to the next option and gives its value once it rests', async () => {
      const column = example('wheel').locator('.wheel-column').first()
      assert.ok(await column.evaluate(element => element.scrollTop) > 0, 'the first value is under the mark')
      const geometry = () => example('wheel').locator('.wheel-column').evaluateAll(columns => columns.map(column => ({
        top: column.scrollTop,
        height: column.clientHeight,
        scrollHeight: column.scrollHeight,
        padding: getComputedStyle(column).paddingBlock,
        options: [...column.querySelectorAll<HTMLElement>('.wheel-option')].map(option => ({
          value: option.dataset.value ?? option.textContent,
          selected: option.getAttribute('aria-selected'),
          offset: option.offsetTop,
          height: option.offsetHeight,
          center: option.getBoundingClientRect().top + option.getBoundingClientRect().height / 2 - column.getBoundingClientRect().top,
        })),
      })))
      const before = await geometry()
      await column.focus()
      await page.keyboard.press('ArrowDown')
      try {
        await said('wheel', 'onValueChange: ["11","30","pm"]')
        for (const [index, bounds] of [['08', '12'], ['00', '45'], ['am', 'pm']].entries()) {
          const current = example('wheel').locator('.wheel-column').nth(index)
          await current.focus()
          for (const [key, wanted] of [['Home', bounds[0]], ['End', bounds[1]]]) {
            await current.press(key)
            await until(() => current.locator('[aria-selected="true"]').getAttribute('data-value'), value => value === wanted, `${key} selects ${wanted}`)
            await until(async () => {
              const state = (await geometry())[index]
              const selected = state.options.find(option => option.selected === 'true')!
              return selected.center - state.height / 2
            }, distance => Math.abs(distance) < 1, `${key} centers ${wanted} under the mark`)
          }
        }
      } catch (error) {
        assert.fail(`${error}\nWheel geometry: ${JSON.stringify({ before, after: await geometry() })}`)
      }
    })

    await t.test('an avatar whose photo fails shows its initials, never a broken image', async () => {
      const avatar = example('avatar')
      await until(() => avatar.locator('.avatar-image').evaluate((image: HTMLImageElement) => image.hidden), Boolean, 'the failed photo is hidden')
      assert.equal(await avatar.locator('.avatar-fallback').isVisible(), true)
      assert.equal(await avatar.locator('.avatar').getAttribute('aria-label'), 'Alan Turing')
    })

    await t.test('a carousel scrolls a slide into view from its buttons and names the slide a scroll rests on', async () => {
      const view = example('carousel')
      const track = view.locator('.carousel')
      const current = () => view.locator('.carousel-dot[aria-current="true"]').getAttribute('aria-controls')
      const slides = await view.locator('.carousel-slide').evaluateAll((all: HTMLElement[]) => all.map(slide => slide.id))
      await view.scrollIntoViewIfNeeded()
      await view.locator('.carousel-next').click()
      await said('carousel', 'onValueChange: "borealis"')
      await until(current, value => value === slides[1], 'the second dot is current')
      await until(() => track.evaluate((element: HTMLElement) => element.scrollLeft), value => value > 0, 'the track has scrolled')
      await track.evaluate((element: HTMLElement) => element.scrollTo({ left: element.scrollWidth, behavior: 'instant' }))
      await said('carousel', 'onValueChange: "cirrus"')
      assert.equal(await view.locator('.carousel-next').isDisabled(), true, 'at the end next has nowhere to go')
    })

    await t.test('a schedule lists a day past its lanes in a popover, and moves by the month', async () => {
      const view = example('schedule')
      await view.scrollIntoViewIfNeeded()
      const more = view.locator('.schedule-more')
      assert.equal(await more.innerText(), '+1 more')
      await more.click()
      const list = view.locator('.popover:popover-open')
      await until(() => list.count(), value => value === 1, 'the day\'s list is open')
      assert.equal(await list.locator('.schedule-event').count(), 4)
      await page.keyboard.press('Escape')
      await view.locator('.schedule-view-next').click()
      await said('schedule', 'onValueChange: {"date":"2026-12-13","view":"month"}')
      assert.equal(await view.locator('.schedule-view-title').innerText(), 'December 2026')
    })

    await t.test('a chart shows the readout of the point under the pointer, and its legend hides a series', async () => {
      const view = example('chart')
      await view.scrollIntoViewIfNeeded()
      const readout = view.locator('.chart-tip')
      assert.equal(await readout.isVisible(), false, 'the readout waits for a point')
      await view.locator('.chart-point').nth(1).hover()
      await until(() => readout.isVisible(), Boolean, 'the readout shows for the point under the pointer')
      assert.equal(await readout.locator('.chart-tip-title').innerText(), 'Tue')
      assert.deepEqual(await readout.locator('.chart-tip-row').evaluateAll(rows => rows.map(row => `${row.querySelector('.chart-tip-name')?.textContent} ${row.querySelector('.chart-tip-value')?.textContent}`)), ['Production 58', 'Preview 31', 'Staging 9'])
      const plot = await box(view.locator('.chart-plot'))
      const tip = await box(readout)
      assert.ok(tip.x + tip.width > plot.x && tip.x < plot.x + plot.width && tip.y + tip.height > plot.y && tip.y < plot.y + plot.height, 'it stands by its point, over the plot')
      await view.locator('.chart-key', { hasText: 'Preview' }).click()
      await said('chart', 'onValueChange: ["Preview"]')
      await until(() => view.locator('.chart-line').count(), value => value === 2, 'the series leaves the plot')
      assert.equal(await view.getByRole('checkbox', { name: 'Preview' }).isChecked(), false)
      await until(() => readout.isVisible(), value => !value, 'the readout goes when the pointer leaves the plot')
    })

    await t.test('a gradient\'s stop is dragged along its bar and moved with the keys', async () => {
      const editor = example('gradient')
      await editor.scrollIntoViewIfNeeded()
      const stop = editor.locator('.gradient-stop[data-id="dawn"]')
      const bar = await box(editor.locator('.gradient-bar'))
      const at = await box(stop)
      await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2)
      await page.mouse.down()
      await page.mouse.move(bar.x + bar.width * .4, at.y + at.height / 2, { steps: 6 })
      await page.mouse.up()
      const moved = await until(() => stop.getAttribute('aria-valuenow'), value => Number(value) > 30 && Number(value) < 50, 'the stop follows the pointer')
      await stop.focus()
      await page.keyboard.press('ArrowRight')
      assert.equal(Number(await stop.getAttribute('aria-valuenow')), Number(moved) + 1)
      await until(() => editor.locator('output').innerText(), value => value.includes(`"offset":${Number(moved) + 1}`), 'the value comes out')
      assert.match(await editor.locator('.gradient-css').innerText(), new RegExp(`#ff6a00 ${Number(moved) + 1}%`))
    })

    await t.test('tabs switch their panels', async () => {
      const tabs = example('tabs')
      await tabs.getByRole('tab', { name: 'Billing' }).click()
      await said('tabs', 'onValueChange: "billing"')
      assert.deepEqual(await tabs.locator('[role="tabpanel"]:visible').allInnerTexts(), ['Billing settings'])
      await page.keyboard.press('ArrowLeft')
      await said('tabs', 'onValueChange: "profile"')
    })

    await t.test('a field joins its label to its control', async () => {
      await example('field').getByText('Work email').click()
      assert.equal(await example('field').locator('.input').evaluate(element => element === document.activeElement), true)
    })

    await t.test('a command palette opens with its shortcut, filters and runs a command', async () => {
      const dialog = example('command').locator('dialog')
      await page.keyboard.press('Control+k')
      await until(() => dialog.evaluate((element: HTMLDialogElement) => element.open), Boolean, 'the shortcut opens it')
      await said('command', 'onOpenChange: true')
      await page.keyboard.type('depl')
      assert.equal(await dialog.locator('[role="option"]:visible').count(), 1)
      await page.keyboard.press('Enter')
      await until(() => dialog.evaluate((element: HTMLDialogElement) => element.open), value => !value, 'running a command closes it')
      await said('command', 'onOpenChange: false')
    })

    await t.test('a toast is shown, leaves when it is dismissed, and leaves by itself when its time is up', async () => {
      const toasts = page.locator(`[data-framework="${framework}"] dialog.toast`)
      await example('toast').getByRole('button', { name: 'Show toasts' }).click()
      await until(() => toasts.count(), count => count === 2, 'two toasts are shown')
      assert.ok((await box(toasts.first())).height > 20, 'in the region, with a size')
      await toasts.nth(1).getByRole('button', { name: 'Dismiss' }).click()
      // A toast under the pointer waits: its clock stops while it is hovered.
      await page.mouse.move(10, 10)
      await until(() => toasts.count(), count => count === 1, 'a dismissed toast is removed once it has left')
      await until(() => toasts.count(), count => count === 0, 'a timed toast is removed when its time is up', 6000)
    })

    await t.test('a toast is updated in place, settles a promise, and holds while its action has focus', async () => {
      const toasts = page.locator(`[data-framework="${framework}"] dialog.toast`)
      // The same module the playground mounted, so the same queue.
      const call = (script: string) => page.evaluate(`import('/mount-${framework === 'react' ? 'react.tsx' : `${framework}.ts`}').then(({ toast }) => { ${script} })`)

      // An update starts the clock again: a toast updated near its end gets its whole time for the new words.
      await call(`window.updated = toast({ description: 'Uploading…', duration: 1200 })`)
      await until(() => toasts.count(), count => count === 1, 'the toast is shown')
      await toasts.first().evaluate(element => { (element as any).marked = true })
      await page.waitForTimeout(800)
      await page.evaluate(() => (window as any).updated.update({ description: 'Uploaded.', status: 'success', duration: 1200 }))
      await page.waitForTimeout(800)
      assert.equal(await toasts.count(), 1, 'still there after its first time ran out')
      assert.equal(await toasts.first().evaluate(element => (element as any).marked), true, 'the same element')
      // What the toast says is its body: the dismiss button beside it is an icon, which WebKit's innerText counts as a block of line breaks.
      assert.equal(await toasts.first().locator('.toast-body').innerText(), 'Uploaded.')
      await until(() => toasts.count(), count => count === 0, 'it leaves when the new time is up')

      // A promise: pending with a turning spinner and no clock, then the same toast says how it ended.
      await call(`window.finish = null; window.settled = toast.promise(new Promise(resolve => { window.finish = resolve }), { loading: 'Deploying…', success: value => ({ description: value + ' is live.', duration: 800 }), error: 'Failed.' })`)
      await until(() => toasts.count(), count => count === 1, 'a pending toast is shown')
      const pending = toasts.first()
      assert.equal(await pending.getAttribute('aria-busy'), 'true')
      assert.deepEqual(await pending.evaluate(element => element.getAnimations({ subtree: true }).flatMap(animation => 'animationName' in animation ? [animation.animationName] : [])), ['spinner-rotate'], 'the spinner turns and no clock runs')
      await page.waitForTimeout(700)
      await page.evaluate(() => (window as any).finish('atlas.dev'))
      await until(() => pending.getAttribute('aria-busy'), value => value === null, 'it settles')
      assert.equal(await pending.locator('.toast-body').innerText(), 'atlas.dev is live.')
      assert.match((await pending.getAttribute('class'))!, /toast-success/)
      await until(() => toasts.count(), count => count === 0, 'and leaves when its time is up')

      // The action is a real button: with focus on it the clock waits, and Enter runs it and dismisses the toast.
      await call(`window.undone = 0; toast({ title: 'Project archived', duration: 600, action: { label: 'Undo', onClick: () => { window.undone++ } } })`)
      await until(() => toasts.count(), count => count === 1, 'the toast with an action is shown')
      await page.mouse.move(10, 10)
      await toasts.first().getByRole('button', { name: 'Undo' }).focus()
      await page.waitForTimeout(1000)
      assert.equal(await toasts.count(), 1, 'it waits while its action holds focus')
      await page.keyboard.press('Enter')
      await until(() => toasts.count(), count => count === 0, 'the action dismisses it')
      assert.equal(await page.evaluate(() => (window as any).undone), 1, 'the action ran once')
    })

    await t.test('a kanban card is dragged across columns, moved with the keys and with the mover, and a drag near an end scrolls the board', async () => {
      const root = example('kanban').locator('.kanban')
      const sheet = root.locator('.kanban-preview')
      const item = (value: string) => root.locator(`.kanban-item[data-value="${value}"]`)
      const handle = (value: string) => item(value).locator('.kanban-handle')
      const board = () => root.locator('.kanban-column').evaluateAll(columns => columns.map(column => [...column.querySelectorAll('.kanban-item')].map(each => each.getAttribute('data-value')).join(',')))
      const marks = () => root.locator('.kanban-item-target, .kanban-items-target').count()
      const pressed = () => root.locator('.kanban-handle[aria-pressed="true"]').count()
      const active = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
      const middle = async (locator: Locator) => {
        const at = await box(locator)
        return { x: at.x + at.width / 2, y: at.y + at.height / 2 }
      }
      await root.scrollIntoViewIfNeeded()
      assert.deepEqual(await board(), ['brief,copy', 'site', '', 'name'])
      assert.equal(await root.evaluate(element => element.scrollWidth > element.clientWidth), true, 'four columns are wider than the board, which scrolls across')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, 'and the page does not')
      assert.equal(await root.locator('.kanban-column[data-value="review"] .kanban-empty').isVisible(), true, 'an empty column says so')

      // The pointer: nothing moves until the release; the sheet follows in the top layer.
      const from = await middle(handle('brief'))
      const site = await box(item('site'))
      await page.mouse.move(from.x, from.y)
      await page.mouse.down()
      await page.mouse.move(from.x + 2, from.y + 1)
      assert.equal(await pressed(), 0, 'a few pixels is still a press')
      await page.mouse.move(site.x + 40, site.y + site.height + 12, { steps: 8 })
      assert.equal(await pressed(), 1)
      await until(() => open(sheet), Boolean, 'the carried sheet is shown')
      assert.equal(await sheet.innerText(), 'Brief')
      const carried = await box(sheet)
      assert.ok(Math.abs(carried.width - site.width) < 1, 'the sheet is as wide as the item')
      assert.ok(carried.x < site.x + 40 && carried.x + carried.width > site.x + 40, 'and stands under the pointer')
      assert.equal(await root.locator('.kanban-column[data-value="doing"] .kanban-items-target').count(), 1, 'the end of the column under the pointer is marked')
      assert.deepEqual(await board(), ['brief,copy', 'site', '', 'name'], 'and no node has moved')
      const dimmed = await item('brief').evaluate(element => getComputedStyle(element).opacity)
      assert.ok(Number(dimmed) < 1, 'the carried item fades in its place')
      await page.mouse.up()
      await until(board, value => value[1] === 'site,brief', 'the release moves it')
      assert.deepEqual(await board(), ['copy', 'site,brief', '', 'name'])
      await until(() => example('kanban').locator('output').innerText(), value => value.startsWith('onValueChange: [{"value":"todo","items":["copy"]},{"value":"doing","items":["site","brief"]}'), 'the arrangement comes out')
      await until(() => open(sheet), value => !value, 'the sheet lands and leaves')
      await until(pressed, value => value === 0, 'and the handle lets go')
      assert.equal(await marks(), 0)
      assert.equal(await active(), 'Drag Brief', 'focus is on the handle of the item that moved')

      // Escape during a drag leaves the board as it was.
      const again = await middle(handle('brief'))
      await page.mouse.move(again.x, again.y)
      await page.mouse.down()
      await page.mouse.move(again.x - 300, again.y + 10, { steps: 6 })
      assert.ok(await marks() > 0)
      await page.keyboard.press('Escape')
      await page.mouse.up()
      await until(pressed, value => value === 0, 'Escape ends the drag')
      assert.deepEqual(await board(), ['copy', 'site,brief', '', 'name'])
      assert.equal(await marks(), 0)

      // The keys: a place is chosen, then committed; Tab commits and goes on.
      await handle('brief').focus()
      await page.keyboard.press('Enter')
      assert.equal(await pressed(), 1)
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('Home')
      assert.deepEqual(await board(), ['copy', 'site,brief', '', 'name'], 'choosing a place moves nothing')
      await page.keyboard.press('Space')
      await until(board, value => value[0] === 'brief,copy', 'Space commits the place')
      await until(active, value => value === 'Drag Brief', 'and the handle has focus again')
      await page.keyboard.press('Enter')
      await page.keyboard.press('End')
      await page.keyboard.press('Tab')
      await until(board, value => value[0] === 'copy,brief', 'Tab commits too')
      await until(pressed, value => value === 0)
      assert.notEqual(await active(), 'Drag Brief', 'and leaves the handle as Tab does')

      // The mover, opened and closed by the browser.
      const mover = root.locator('.kanban-mover')
      const popover = root.locator('.popover')
      await item('name').getByRole('button', { name: 'Move Name' }).click()
      await until(() => open(popover), Boolean, 'the move button opens the popover')
      assert.equal(await mover.locator('[name="column"]').inputValue(), 'done')
      await mover.locator('[name="column"]').selectOption('review')
      assert.deepEqual(await mover.locator('[name="position"] option').allInnerTexts(), ['1'])
      await mover.getByRole('button', { name: 'Move', exact: true }).click()
      await until(board, value => value[2] === 'name', 'submitting it moves the item into the empty column')
      await until(() => open(popover), value => !value, 'and closes the popover')
      await until(active, value => value === 'Drag Name', 'focus goes to the handle')
      assert.equal(await root.locator('.kanban-column[data-value="done"] .kanban-empty').isVisible(), true, 'the column it left is empty now')

      // Near the end of the board the drag scrolls it, and the place under the still pointer follows.
      // The popover's button may have scrolled the page: bring the whole board back into the window first.
      await root.evaluate((element) => { element.scrollLeft = 0; element.scrollIntoView({ block: 'center', behavior: 'instant' }) })
      // Its list may have scrolled to show the item the keys moved under it.
      await handle('copy').evaluate(element => element.closest('.kanban-items')!.scrollTo(0, 0))
      // The board takes no press while the items of the last move glide to their places: the glide is quick, and over first.
      await page.waitForFunction(() => !document.getAnimations().some(animation => (animation.effect as KeyframeEffect | null)?.pseudoElement?.startsWith('::view-transition')))
      const grip = await middle(handle('copy'))
      const edge = await box(root)
      await page.mouse.move(grip.x, grip.y)
      await page.mouse.down()
      await page.mouse.move(edge.x + edge.width - 8, grip.y + 30, { steps: 10 })
      await until(() => root.evaluate(element => element.scrollLeft), value => value > 60, 'the board scrolls across under the held pointer')
      await until(() => root.locator('.kanban-column[data-value="done"] .kanban-items-target').count(), value => value === 1, 'until the last column is the place')
      await page.mouse.up()
      await until(board, value => value[3] === 'copy', 'and the release lands there')
      await until(pressed, value => value === 0)
      const scrolled = await root.evaluate(element => element.scrollLeft)
      await page.waitForTimeout(120)
      assert.equal(await root.evaluate(element => element.scrollLeft), scrolled, 'nothing scrolls once the drag is over')
    })

    await t.test('the application invoker fallback opens and closes the native dialog', async () => {
      await page.goto(`${origin}?only=${framework}&invokers=fallback`)
      const dialog = example('dialog').locator('dialog')
      await example('dialog').getByRole('button', { name: 'Delete project', exact: true }).click()
      await until(() => dialog.evaluate((element: HTMLDialogElement) => element.open && element.matches(':modal')), Boolean, 'the application handler opens a modal')
      await said('dialog', 'onOpenChange: true')
      await dialog.getByRole('button', { name: 'Cancel' }).click()
      await until(() => dialog.evaluate((element: HTMLDialogElement) => element.open), value => !value, 'the application handler closes it')
      await said('dialog', 'onOpenChange: false')
    })

    await page.close()
    assert.deepEqual(problems, [], 'the page complained')
  })
}


test(`${engine}: a kanban card is dragged by touch from its handle, the only part that refuses to scroll`, async (t) => {
  if (engine !== 'chromium') return t.skip('touch is sent through the Chromium protocol')
  const context = await browser.newContext({ viewport: { width: 390, height: 760 }, hasTouch: true })
  const page = await context.newPage()
  const problems: string[] = []
  page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) problems.push(`${message.type()}: ${message.text()}`) })
  page.on('pageerror', error => problems.push(`thrown: ${error.message}`))
  try {
    await page.goto(`${origin}?only=react`)
    const root = page.locator('[data-example="kanban"] .kanban')
    await root.waitFor()
    // The playground is a desktop page: give the board the room a phone would.
    // And less height than its first column needs, so that column's list has somewhere to scroll: the list once
    // scrolled here only because the line of a place made it 2px longer.
    await root.evaluate((element: HTMLElement) => { element.style.width = '340px'; element.style.height = '8rem' })
    await root.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'start', behavior: 'instant' }))
    const session = await context.newCDPSession(page)
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', points: { x: number, y: number, id?: number }[]) => session.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(point => ({ x: Math.round(point.x), y: Math.round(point.y), id: point.id ?? 1 })) })
    const board = () => root.locator('.kanban-column').evaluateAll(columns => columns.map(column => [...column.querySelectorAll('.kanban-item')].map(each => each.getAttribute('data-value')).join(',')))
    const pressed = () => root.locator('.kanban-handle[aria-pressed="true"]').count()
    const column = await box(root.locator('.kanban-column').first())
    assert.ok(column.width >= 240 && column.width <= 340 - 32, `a column keeps a working width on a phone and leaves a peek of the next: ${column.width}px`)
    assert.equal(await root.evaluate(element => element.scrollWidth > element.clientWidth), true, 'the board scrolls across inside the room it is given')
    const handle = root.locator('.kanban-item[data-value="brief"] .kanban-handle')
    const target = await handle.evaluate((element) => {
      const reach = getComputedStyle(element, '::after')
      const move = element.parentElement!.querySelector('.kanban-move')
      const gap = move ? element.getBoundingClientRect().left - move.getBoundingClientRect().right : 0
      return { height: parseFloat(reach.height), width: parseFloat(reach.width), overlap: move ? -parseFloat(reach.left) - parseFloat(getComputedStyle(move, '::after').right) - gap : 0 }
    })
    assert.ok(target.height >= 44, `the grip's target is 44px tall on a touch screen: ${target.height}px`)
    assert.ok(target.width >= 34, `and reaches past the grip on its free side: ${target.width}px`)
    assert.ok(target.overlap <= 0, `the grip's target and the move button's do not lie over each other: ${target.overlap}px`)
    assert.equal(await handle.evaluate(element => getComputedStyle(element).touchAction), 'none')
    assert.notEqual(await root.locator('.kanban-item[data-value="brief"]').evaluate(element => getComputedStyle(element).touchAction), 'none', 'only the grip refuses to scroll')

    // A touch that starts on the grip carries the item; a second finger changes nothing.
    const grip = await box(handle)
    const from = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 }
    // The column is taller than the board: held near its foot, the finger scrolls the list until its end is the place.
    const list = root.locator('.kanban-column[data-value="todo"] .kanban-items')
    assert.ok(await list.evaluate(element => element.scrollHeight > element.clientHeight), 'the list has somewhere to scroll before anything is carried')
    const foot = (await box(root)).y + (await box(root)).height - 12
    await touch('touchStart', [from])
    for (let step = 1; step <= 6; step++) await touch('touchMove', [{ x: from.x + step * 2, y: from.y + step * (foot - from.y) / 6 }])
    await until(pressed, value => value === 1, 'the grip picks the item up')
    assert.equal(await root.evaluate(element => element.scrollLeft), 0, 'and the board does not scroll under it')
    await until(() => list.evaluate(element => element.scrollTop), value => value > 0, 'near the foot of the list, it scrolls')
    await until(() => root.locator('.kanban-column[data-value="todo"] .kanban-items-target').count(), value => value === 1, 'until the end of the column is the place')
    const held = { x: from.x + 12, y: foot }
    await touch('touchStart', [held, { x: 300, y: 500, id: 2 }])
    await touch('touchMove', [held, { x: 320, y: 420, id: 2 }])
    assert.equal(await pressed(), 1, 'a second finger does not end the drag')
    assert.equal(await root.locator('.kanban-column[data-value="todo"] .kanban-items-target').count(), 1, 'or move the place')
    // The second finger rests before it lifts, as a hand's does. Lifted while moving, it leaves a fling, and on
    // Linux the next tap only stops the fling and makes no click.
    await page.waitForTimeout(250)
    await touch('touchMove', [held, { x: 320, y: 420, id: 2 }])
    await touch('touchMove', [held])
    assert.equal(await pressed(), 1, 'nor does lifting it')
    await touch('touchEnd', [])
    await until(board, value => value[0] === 'copy,brief', 'lifting the finger moves it')
    await until(pressed, value => value === 0)

    // The button beside the grip does the same without a drag.
    await root.locator('.kanban-item[data-value="brief"]').getByRole('button', { name: 'Move Brief' }).tap()
    const mover = root.locator('.kanban-mover')
    await until(() => root.locator('.popover').evaluate(element => element.matches(':popover-open')), Boolean, 'a tap opens the mover')
    await mover.locator('[name="column"]').selectOption('review')
    await mover.getByRole('button', { name: 'Move', exact: true }).tap()
    await until(board, value => value[2] === 'brief', 'and the item is moved without a drag')
    assert.deepEqual(problems, [], 'the page complained')
  } finally { await context.close() }
})

test(`${engine}: a kanban keeps its marks in forced colors and holds still with reduced motion`, async () => {
  const context = await browser.newContext({ viewport: { width: 900, height: 700 }, forcedColors: 'active', reducedMotion: 'reduce' })
  const page = await context.newPage()
  try {
    await page.goto(`${origin}?only=vue`)
    const root = page.locator('[data-example="kanban"] .kanban')
    await root.waitFor()
    await root.scrollIntoViewIfNeeded()
    const pressed = () => root.locator('.kanban-handle[aria-pressed="true"]').count()
    const outline = (locator: Locator) => locator.evaluate(element => getComputedStyle(element).outlineStyle)
    assert.equal(await outline(root.locator('.kanban-column').first()), 'solid', 'a column is outlined where its tone is gone')
    const handle = root.locator('.kanban-item[data-value="brief"] .kanban-handle')
    await handle.focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    const well = root.locator('.kanban-column[data-value="review"] .kanban-empty')
    assert.equal(await outline(well), 'solid', 'the empty column that is the place is outlined')
    await page.keyboard.press('ArrowLeft')
    const line = await root.locator('.kanban-item-target').evaluate(element => [element.getAttribute('data-value'), getComputedStyle(element, '::before').height])
    assert.deepEqual(line, ['site', '2px'], 'the line of a place is drawn over the item it is before')
    await page.keyboard.press('Escape')
    assert.equal(await pressed(), 0)

    // With reduced motion the sheet does not glide to its place: the release ends everything at once.
    const at = await box(handle)
    const site = await box(root.locator('.kanban-item[data-value="site"]'))
    await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2)
    await page.mouse.down()
    await page.mouse.move(site.x + 30, site.y + site.height + 10, { steps: 6 })
    assert.equal(await root.locator('.kanban-preview').evaluate(element => element.matches(':popover-open')), true)
    assert.equal(await outline(root.locator('.kanban-preview')), 'solid', 'the carried sheet is outlined')
    await page.mouse.up()
    await until(() => root.locator('.kanban-column[data-value="doing"] .kanban-item').count(), value => value === 2, 'the item is moved')
    assert.equal(await root.locator('.kanban-preview').evaluate(element => element.classList.contains('kanban-preview-landing')), false)
    await until(pressed, value => value === 0, 'and the handle lets go at once')
  } finally { await context.close() }
})

test(`${engine}: segmented selection honors a changed reduced-motion preference`, async () => {
  const page = await browser.newPage({ reducedMotion: 'no-preference' })
  try {
    const css = await readFile(new URL('../../dist/standalone.css', import.meta.url), 'utf8')
    await page.setContent(`<style>${css}</style><div class="segmented" role="radiogroup" aria-label="View">
      <label class="segmented-item"><input class="segmented-input" type="radio" name="view" checked><span>Preview</span></label>
      <label class="segmented-item"><input class="segmented-input" type="radio" name="view"><span>Code</span></label>
    </div>`)
    const track = page.locator('.segmented')
    const motion = () => track.evaluate(element => {
      const style = getComputedStyle(element, '::before')
      return { property: style.transitionProperty, duration: style.transitionDuration }
    })
    const anchored = await page.evaluate(() => CSS.supports('anchor-scope: --segmented-thumb'))
    if (anchored) {
      const normal = await motion()
      assert.ok(normal.property.includes('left'))
      assert.ok(normal.duration.split(',').some(value => parseFloat(value) > 0), 'Ordinary motion remains available')
    }
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.getByRole('radio', { name: 'Preview' }).focus()
    await page.keyboard.press('ArrowRight')
    assert.equal(await page.getByRole('radio', { name: 'Code' }).isChecked(), true)
    if (anchored) {
      const reduced = await motion()
      assert.ok(reduced.property === 'none' || reduced.duration.split(',').every(value => parseFloat(value) === 0), `Reduced motion disables thumb travel: ${JSON.stringify(reduced)}`)
    }
    await page.keyboard.press('ArrowLeft')
    assert.equal(await page.getByRole('radio', { name: 'Preview' }).isChecked(), true, 'Native selection remains usable in the fallback too')
  } finally { await page.close() }
})
