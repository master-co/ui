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
      assert.equal(await toasts.first().innerText(), 'Uploaded.')
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
      assert.equal(await pending.innerText(), 'atlas.dev is live.')
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
