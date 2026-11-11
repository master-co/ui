import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { type Browser } from 'playwright'

/** Native elements matter here: a div-only fixture misses the browser's th, button and field defaults. */
export const geometryMarkup = `
<main style="max-width:720px;margin:24px auto;display:grid;gap:20px">
  <div class="sheet sheet-flat" style="overflow:hidden">
    <table class="table"><thead><tr class="table-row"><th class="table-heading" scope="col">Project</th><th class="table-heading table-numeric" scope="col">Builds</th></tr></thead>
      <tbody><tr class="table-row"><th class="table-cell table-primary" scope="row">Atlas</th><td class="table-cell table-numeric">128</td></tr>
      <tr class="table-row"><th class="table-cell" scope="rowgroup">Archive</th><td class="table-cell">No builds</td></tr></tbody></table>
  </div>
  <div role="table" class="table"><div role="row" class="table-row"><div role="rowheader" class="table-cell">Atlas</div><div role="cell" class="table-cell">Ready</div></div></div>
  <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:20px">
    <div class="tray" data-held="well"><div class="well" style="--well-radius:var(--radius-surface);padding:20px">A recessed panel</div></div>
    <div class="tray" data-held="code-block"><pre class="code-block" tabindex="0" style="--code-radius:var(--radius-surface)"><code>npm install @master/ui</code></pre></div>
    <div class="tray" data-held="code-panel"><div class="code-panel" style="--code-radius:var(--radius-surface)"><div class="code-header"><span class="code-title">main.css</span><button class="btn" type="button">Copy</button></div><pre class="code-block" tabindex="0"><code class="code-line">@import '@master/ui';</code><code class="code-line code-line-highlight">/* A deliberately long highlighted line stays inside its own horizontal scrolling region. */</code></pre></div></div>
    <div class="tray" data-held="window"><div class="window window-flat" style="--window-radius:var(--radius-surface)"><div class="window-bar"><span class="window-controls"></span><span class="window-title">Preview</span></div><div class="window-body" style="padding:20px">A framed preview</div></div></div>
    <div class="tray" data-held="alert"><div class="alert" style="--alert-radius:var(--radius-surface)"><div class="alert-body"><p class="alert-title">Build queued</p><p class="alert-description">Your deployment is waiting.</p></div></div></div>
    <div class="well" data-default-well style="padding:20px">Default well radius</div>
  </div>
  <div style="display:flex;align-items:center;gap:12px"><button class="btn" data-control type="button">Deploy</button><input class="input" data-control aria-label="Project" value="Atlas" style="width:140px"><select class="select" data-control aria-label="Region"><option class="select-option">Tokyo</option><option class="select-option">Frankfurt</option></select></div>
  <div class="input-group"><input class="input-group-field" aria-label="Domain" value="atlas.dev"><button class="btn" type="button">Copy</button></div>
  <div class="segmented"><button type="button" class="segmented-item" aria-pressed="true">Preview</button><button type="button" class="segmented-item" aria-pressed="false">Code</button><button type="button" class="segmented-item" disabled>Unavailable</button></div>
  <div class="tabs"><button type="button" class="tabs-item" role="tab" aria-selected="true">Overview</button><button type="button" class="tabs-item" role="tab" aria-selected="false">Usage</button><button type="button" class="tabs-item" role="tab" disabled>Unavailable</button></div>
  <button type="button" class="btn" popovertarget="geometry-menu">Actions</button>
  <div id="geometry-menu" class="menu" popover><button type="button" class="menu-item">Rename</button><button type="button" class="menu-item" disabled>Unavailable</button><button type="button" class="menu-item" aria-disabled="true">Unavailable action</button><label class="menu-item menu-item-danger"><input class="menu-input" type="checkbox" disabled>Unavailable choice</label></div>
  <div class="listbox" role="listbox" aria-label="Results"><div class="listbox-option" role="option" aria-selected="true" aria-checked="true"><div class="listbox-body">Project<span class="listbox-description">Selected description</span></div><span class="listbox-end">Hint</span></div><div class="listbox-option" role="option" aria-disabled="true">Unavailable result</div></div>
  <dialog class="dialog"><div class="dialog-header"><h2 class="dialog-title">Publish deployment</h2></div><div class="dialog-body">The browser owns this modal.</div><div class="dialog-footer"><button class="btn" type="button">Cancel</button></div></dialog>
  <dialog class="dialog command" aria-label="Search commands"><label class="command-search"><input class="command-input" type="search" role="combobox" aria-label="Search commands" aria-expanded="true" aria-controls="geometry-results"></label><div class="listbox command-list" id="geometry-results" role="listbox" aria-label="Commands"><div class="listbox-empty">No commands match.</div></div></dialog>
</main>`

export async function verifyComponentGeometry(browser: Browser, { theme, scheme, direction = 'ltr', screenshot, touch = false, forcedColors = false }: {
  theme: 'default' | 'paper' | 'round'
  scheme: 'light' | 'dark'
  direction?: 'ltr' | 'rtl'
  screenshot?: string
  touch?: boolean
  forcedColors?: boolean
}) {
  const page = await browser.newPage({ viewport: { width: 800, height: 1000 }, colorScheme: scheme, reducedMotion: 'reduce', hasTouch: touch, forcedColors: forcedColors ? 'active' : 'none' })
  try {
    await page.setContent(`<html dir="${direction}" style="color-scheme:${scheme}"><body>${geometryMarkup}</body></html>`)
    await page.addStyleTag({ content: readFileSync(new URL(`../../dist/${theme === 'paper' ? 'themes/paper.css' : 'standalone.css'}`, import.meta.url), 'utf8') })
    if (theme === 'round') await page.addStyleTag({ content: ':root{--corner-shape:round;--corner-scale:1}' })
    const values = await page.evaluate(() => {
      const read = {
        style(selector: string) { return getComputedStyle(document.querySelector(selector)!) },
        radius(selector: string) { return parseFloat(this.style(selector).borderTopLeftRadius) },
      }
      const root = read.style(':root')
      return {
        weight: root.getPropertyValue('--font-weight-control').trim(),
        coarse: matchMedia('(pointer: coarse)').matches,
        forcedColors: matchMedia('(forced-colors: active)').matches,
        roleDisplays: [...document.querySelectorAll('[role="table"],[role="row"],[role="rowheader"],[role="cell"]')].map(element => getComputedStyle(element).display),
        rowHeaders: [...document.querySelectorAll('[scope="row"],[scope="rowgroup"],[role="rowheader"]')].map(element => ({ weight: getComputedStyle(element).fontWeight, align: getComputedStyle(element).textAlign })),
        numeric: read.style('td.table-numeric').textAlign,
        bodyWeight: read.style('td.table-cell').fontWeight,
        held: [...document.querySelectorAll('[data-held]')].map(parent => {
          const outer = parent.getBoundingClientRect(), inner = parent.firstElementChild!.getBoundingClientRect()
          return {
            kind: (parent as HTMLElement).dataset.held,
            inset: parseFloat(getComputedStyle(parent).paddingLeft),
            actualInsets: [inner.left - outer.left, inner.top - outer.top, outer.right - inner.right, outer.bottom - inner.bottom],
            gap: parseFloat(getComputedStyle(parent).borderTopLeftRadius) - parseFloat(getComputedStyle(parent.firstElementChild!).borderTopLeftRadius),
            shape: getComputedStyle(parent.firstElementChild!).getPropertyValue('corner-shape'),
            parentShape: getComputedStyle(parent).getPropertyValue('corner-shape'),
          }
        }),
        defaultWellRadius: read.radius('[data-default-well]'),
        inputRadius: read.radius('.input'),
        childCode: { radius: read.radius('.code-panel .code-block'), shadow: read.style('.code-panel .code-block').boxShadow, background: read.style('.code-panel .code-block').backgroundColor },
        controlHeights: [...document.querySelectorAll('[data-control]')].map(element => element.getBoundingClientRect().height),
        groupRadiusGap: read.radius('.input-group') - read.radius('.input-group .btn'),
        segmentRadiusGap: read.radius('.segmented') - read.radius('.segmented-item'),
        segmentInset: parseFloat(read.style('.segmented').paddingLeft),
        tabWeights: [...document.querySelectorAll('.tabs-item')].map(element => getComputedStyle(element).fontWeight),
      }
    })
    for (const header of values.rowHeaders) assert.deepEqual(header, { weight: values.weight, align: 'start' }, 'native and ARIA row headers agree')
    assert.deepEqual(values.roleDisplays, ['table', 'table-row', 'table-cell', 'table-cell'], 'standalone CSS lays out role-based tables without generated utilities')
    assert.equal(values.numeric, 'end', 'numeric cells retain their logical end alignment')
    assert.equal(values.bodyWeight, '400', 'ordinary values do not acquire header emphasis')
    for (const held of values.held) {
      assert.ok(Math.abs(held.gap - held.inset) < .02, `${held.kind}: the radius-box difference matches the actual tray inset`)
      assert.ok(held.actualInsets.every(inset => Math.abs(inset - held.inset) < .1), `${held.kind}: all four layout insets match`)
      assert.equal(held.shape, held.parentShape, `${held.kind}: holder and held root use the same corner model`)
    }
    assert.equal(values.defaultWellRadius, values.inputRadius, 'an unconfigured well keeps its original control radius')
    assert.equal(values.childCode.radius, 0, 'an inner code block has no separate rounded boundary')
    assert.equal(values.childCode.shadow, 'none', 'a code panel owns one well')
    assert.match(values.childCode.background, /^rgba\([^)]*, 0\)$/, 'the inner block remains transparent, including in forced colors')
    assert.equal(values.coarse, touch)
    assert.equal(values.forcedColors, forcedColors)
    for (const height of values.controlHeights) assert.ok(Math.abs(height - (touch ? 44 : 38)) < .5, `native control height: ${height}`)
    assert.ok(Math.abs(values.groupRadiusGap - 4) < .02, 'input group inset is subtracted after scaling')
    assert.ok(Math.abs(values.segmentRadiusGap - values.segmentInset) < .02, 'segmented inset is added after scaling')
    assert.equal(new Set(values.tabWeights).size, 1, 'tab state never changes label weight')
    const code = page.locator('.code-panel .code-block')
    assert.ok(await code.evaluate(element => element.scrollWidth > element.clientWidth), 'long code remains horizontally scrollable')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'the code scroller does not widen the page')
    await code.focus()
    await code.press('ArrowRight')
    assert.equal(await code.evaluate(element => getComputedStyle(element).outlineOffset), '-2px', 'code focus stays inside its clipping panel')
    const field = page.locator('input.input')
    await field.focus()
    if (values.forcedColors) assert.equal(await field.evaluate(element => getComputedStyle(element).outlineWidth), '2px', 'forced colors keep an explicit focus outline')
    else assert.notEqual(await field.evaluate(element => getComputedStyle(element).boxShadow), 'none', 'field focus keeps a visible boundary')
    await page.locator('[popovertarget="geometry-menu"]').click()
    const menu = page.locator('#geometry-menu')
    assert.equal(await menu.evaluate(element => element.matches(':popover-open')), true)
    const menuGeometry = await menu.evaluate(element => ({ outer: parseFloat(getComputedStyle(element).borderRadius), inner: parseFloat(getComputedStyle(element.querySelector('.menu-item')!).borderRadius), inset: parseFloat(getComputedStyle(element).paddingLeft), border: getComputedStyle(element).borderTopWidth }))
    assert.ok(Math.abs(menuGeometry.outer - menuGeometry.inner - menuGeometry.inset) < .02)
    assert.equal(menuGeometry.border, '0px', 'native popover border does not double the UI contour')
    if (!touch) for (const disabled of await menu.locator('.menu-item:disabled, .menu-item[aria-disabled="true"], .menu-item:has(.menu-input:disabled)').all()) {
      const before = await disabled.evaluate(element => ({ color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor }))
      await disabled.hover()
      assert.deepEqual(await disabled.evaluate(element => ({ color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor })), before, 'disabled rows do not acquire an enabled hover treatment')
    }
    await page.keyboard.press('Escape')
    const unavailable = page.locator('.listbox-option[aria-disabled="true"]')
    if (!touch) {
      await page.mouse.move(0, 0)
      const rest = await unavailable.evaluate(element => ({ color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor }))
      await unavailable.hover()
      assert.deepEqual(await unavailable.evaluate(element => ({ color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor })), rest, 'disabled listbox options retain their resting treatment')
    }
    if (forcedColors) {
      const ink = await page.locator('.listbox-option[aria-selected="true"]').evaluate(element => ({
        label: getComputedStyle(element).color,
        description: getComputedStyle(element.querySelector('.listbox-description')!).color,
        end: getComputedStyle(element.querySelector('.listbox-end')!).color,
        check: getComputedStyle(element, '::after').backgroundColor,
      }))
      assert.equal(ink.description, ink.label, 'selected descriptions inherit the system foreground')
      assert.equal(ink.end, ink.label, 'selected hints inherit the system foreground')
      assert.equal(ink.check, ink.label, 'selected check marks inherit the system foreground')
    }
    await page.locator('dialog:not(.command)').evaluate((element: HTMLDialogElement) => element.showModal())
    assert.equal(await page.locator('dialog:not(.command)').evaluate(element => getComputedStyle(element).borderTopWidth), '0px', 'native dialog border does not double the UI contour')
    await page.keyboard.press('Escape')
    await page.locator('dialog:not(.command)').waitFor({ state: 'hidden' })
    await page.locator('dialog.command').evaluate((element: HTMLDialogElement) => element.showModal())
    const search = page.locator('.command-input')
    await search.focus()
    await search.press('ArrowRight')
    if (forcedColors) {
      const focus = await search.evaluate(element => ({ visible: element.matches(':focus-visible'), width: getComputedStyle(element).outlineWidth, style: getComputedStyle(element).outlineStyle, offset: getComputedStyle(element).outlineOffset }))
      assert.deepEqual(focus, { visible: true, width: '2px', style: 'solid', offset: '-2px' }, 'an empty command search keeps an inset system focus indicator')
    }
    await page.keyboard.press('Escape')
    await page.locator('dialog.command').waitFor({ state: 'hidden' })
    if (screenshot) await page.screenshot({ path: screenshot, fullPage: true })
    return values
  } finally { await page.close() }
}
