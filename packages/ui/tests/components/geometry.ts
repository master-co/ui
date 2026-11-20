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
  <div class="input-group" data-trailing-popover><input class="input-group-field" aria-label="Starts" value="2026-11-04" readonly><button class="btn btn-quiet btn-square" type="button" popovertarget="geometry-picker" aria-label="Choose a date">D</button><div id="geometry-picker" class="popover" popover>Calendar</div></div>
  <div class="btn-group" data-split><button class="btn" type="button">Save</button><button class="btn btn-square" type="button" popovertarget="geometry-split" aria-label="More save options">V</button><div id="geometry-split" class="menu" popover><button type="button" class="menu-item">Save as</button></div></div>
  <div class="segmented"><button type="button" class="segmented-item" aria-pressed="true">Preview</button><button type="button" class="segmented-item" aria-pressed="false">Code</button><button type="button" class="segmented-item" disabled>Unavailable</button></div>
  <div class="tabs"><button type="button" class="tabs-item" role="tab" aria-selected="true">Overview</button><button type="button" class="tabs-item" role="tab" aria-selected="false">Usage</button><button type="button" class="tabs-item" role="tab" disabled>Unavailable</button></div>
  <button type="button" class="btn" popovertarget="geometry-menu">Actions</button>
  <div id="geometry-menu" class="menu" popover><button type="button" class="menu-item">Rename</button><button type="button" class="menu-item" disabled>Unavailable</button><button type="button" class="menu-item" aria-disabled="true">Unavailable action</button><label class="menu-item menu-item-danger"><input class="menu-input" type="checkbox" disabled>Unavailable choice</label></div>
  <div class="listbox" role="listbox" aria-label="Results"><div class="listbox-option" role="option" aria-selected="true" aria-checked="true"><div class="listbox-body">Project<span class="listbox-description">Selected description</span></div><span class="listbox-end">Hint</span></div><div class="listbox-option" role="option" aria-disabled="true">Unavailable result</div><div class="listbox-option" role="option" id="geometry-result" style="max-width: 16rem"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h14M5 15h14"/></svg><div class="listbox-body"><span id="geometry-result-title">Retune <mark class="mark">token</mark>s</span><span class="listbox-path"><span class="listbox-crumb">Guide</span><span class="listbox-crumb">Customizing with a long name</span><span class="listbox-crumb">Theming with a long name</span></span><span class="listbox-excerpt">Override a <mark class="mark">token</mark> after the import. Every component that reads it follows, and so does every theme, block and page built from them, whatever their order in the bundle.</span></div><span class="listbox-end">Hint</span></div></div>
  <ul class="list" data-meta-list><li class="list-row"><span class="avatar list-media">AL</span><div class="list-body"><p class="list-title">Ada Lovelace left a comment</p><p class="list-description">The hero reads much better.</p></div><p class="list-meta"><time datetime="2026-11-12">Yesterday</time><span class="badge badge-sm">Unread</span></p><span class="list-end"><button class="btn btn-quiet btn-square btn-sm" type="button" aria-label="Mark as read">R</button></span></li><li class="list-row"><div class="list-body"><p class="list-title">A row with no media and no end</p></div><p class="list-meta">Today</p></li></ul>
  <header style="display:flex;align-items:center;justify-content:space-between"><span>A header with no contour</span><span style="display:flex"><button class="btn btn-quiet btn-square btn-hang-end" data-hang type="button" aria-label="Open the menu">M</button></span></header>
  <div class="kanban"><section class="kanban-column" aria-label="To do"><ol class="kanban-items kanban-items-target" data-marked-list><li class="kanban-item">Brief</li><li class="kanban-item">Copy</li></ol></section></div>
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
        fieldFonts: [...document.querySelectorAll('input[data-control], select[data-control], .input-group')].map(element => getComputedStyle(element).fontSize),
        // Where a finger lands: the point 3px past the top edge of a button and a segment, and what takes it there.
        reach: ['.btn[data-control]', '.segmented-item'].map(selector => {
          const element = document.querySelector(selector)!, box = element.getBoundingClientRect()
          const above = document.elementFromPoint(box.left + box.width / 2, box.top - 3)
          return { selector, height: box.height, taken: above === element || element.contains(above) }
        }),
        groupRadiusGap: read.radius('.input-group') - read.radius('.input-group .btn'),
        // A button at the end of a group is 4px in on every side, though a popover it opens follows it in the markup.
        // No named helper in here: the compiler would wrap one in a function the page does not have.
        metaRows: [...document.querySelectorAll('[data-meta-list] .list-row')].map(row => ({
          rects: ['.list-media', '.list-body', '.list-meta', '.list-end'].map(selector => row.querySelector(selector)?.getBoundingClientRect() ?? null),
          row: row.getBoundingClientRect(),
          rtl: getComputedStyle(row).direction === 'rtl',
        })).map(({ rects: [media, body, meta, end], row, rtl }) => ({
          hasMedia: !!media,
          media: media ? media.top + media.height / 2 : null,
          end: end ? end.top + end.height / 2 : null,
          body: body!.top + body!.height / 2,
          under: meta!.top - body!.bottom,
          metaStart: rtl ? body!.right - meta!.right : meta!.left - body!.left,
          bodyStart: rtl ? row.right - body!.right : body!.left - row.left,
        })),
        hang: (() => {
          const button = document.querySelector('[data-hang]')!.getBoundingClientRect()
          return { width: button.width, height: button.height }
        })(),
        markedList: (() => {
          const list = document.querySelector('[data-marked-list]')!
          return { scroll: list.scrollHeight, client: list.clientHeight, line: getComputedStyle(list.lastElementChild!, '::after').height }
        })(),
        trailingInsets: (() => {
          const group = document.querySelector('[data-trailing-popover]')!.getBoundingClientRect()
          const button = document.querySelector('[data-trailing-popover] .btn')!.getBoundingClientRect()
          const rtl = getComputedStyle(document.documentElement).direction === 'rtl'
          return { end: rtl ? button.left - group.left : group.right - button.right, top: button.top - group.top, bottom: group.bottom - button.bottom }
        })(),
        // A split button's last button keeps its outer corners round, though its menu follows it in the markup.
        splitEnd: (() => {
          const last = getComputedStyle(document.querySelectorAll('[data-split] .btn')[1]!)
          const rtl = getComputedStyle(document.documentElement).direction === 'rtl'
          return { outer: parseFloat(rtl ? last.borderTopLeftRadius : last.borderTopRightRadius), inner: parseFloat(rtl ? last.borderTopRightRadius : last.borderTopLeftRadius) }
        })(),
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
    // A control keeps its size at every pointer; on touch only its target grows, past the edge of what is drawn.
    for (const height of values.controlHeights) assert.ok(Math.abs(height - 38) < .5, `native control height: ${height}`)
    // Its type too: the page's viewport, not a larger font, keeps iOS from zooming onto a focused field.
    for (const size of values.fieldFonts) assert.equal(size, '14px', 'a field keeps its type at every pointer')
    for (const reach of values.reach) assert.equal(reach.taken, touch, `${reach.selector} (${reach.height}px) takes a touch past its edge only on a coarse pointer`)
    assert.ok(Math.abs(values.groupRadiusGap - 4) < .02, 'input group inset is subtracted after scaling')
    for (const row of values.metaRows) {
      if (row.hasMedia) {
        assert.ok(Math.abs(row.media! - row.body!) < .6, `a list row's media centers on its title and description, not on a third line: ${row.media} vs ${row.body}`)
        assert.ok(Math.abs(row.end! - row.body!) < .6, `and so does its end: ${row.end} vs ${row.body}`)
      } else assert.ok(Math.abs(row.bodyStart) < .1, `a row with no media keeps its words on the row's edge: ${row.bodyStart}`)
      assert.ok(row.under > 0 && Math.abs(row.metaStart) < .1, `list-meta stands under the words, on their edge: ${row.under}, ${row.metaStart}`)
    }
    assert.equal(values.hang.width, values.hang.height, 'a hanging square button alone in a holder that fits it keeps its width')
    assert.equal(values.markedList.scroll, values.markedList.client, 'the line at the end of a kanban list does not lengthen the list')
    assert.equal(values.markedList.line, '2px', 'and it is drawn by the last item')
    for (const [side, inset] of Object.entries(values.trailingInsets)) assert.ok(Math.abs(inset - 4) < .1, `a group's end button stays 4px in at its ${side} with a popover after it: ${inset}`)
    assert.ok(values.splitEnd.outer > 0, 'a split button keeps its outer corners with its menu after it')
    assert.equal(values.splitEnd.inner, 0, 'a split button squares the corners where its buttons meet')
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
    // No helper is declared inside: the transform names an inner function with a helper the page does not have.
    const result = await page.locator('#geometry-result').evaluate((element) => {
      const [icon, title, end, path, body, excerpt] = ['.icon', '#geometry-result-title', '.listbox-end', '.listbox-path', '.listbox-body', '.listbox-excerpt'].map(selector => element.querySelector(selector)!)
      const [iconBox, titleBox, endBox, pathBox, bodyBox, excerptBox] = [icon, title, end, path, body, excerpt].map(target => target.getBoundingClientRect())
      return {
        icon: iconBox.top + iconBox.height / 2 - titleBox.top - titleBox.height / 2,
        end: endBox.top + endBox.height / 2 - titleBox.top - titleBox.height / 2,
        path: pathBox.height / parseFloat(getComputedStyle(path).lineHeight),
        pathFits: pathBox.right <= bodyBox.right + .5,
        excerpt: excerptBox.height / parseFloat(getComputedStyle(excerpt).lineHeight),
        clipped: excerpt.scrollHeight > excerpt.clientHeight,
        mark: getComputedStyle(excerpt.querySelector('.mark')!).color,
        title: getComputedStyle(title).color,
        muted: getComputedStyle(excerpt).color,
      }
    })
    assert.ok(Math.abs(result.icon) < 1, 'with an excerpt the icon stands on the title\'s line')
    assert.ok(Math.abs(result.end) < 1, 'with an excerpt the end stands on the title\'s line')
    assert.ok(Math.abs(result.path - 1) < .1 && result.pathFits, 'a path keeps one line and gives way inside the option')
    assert.ok(result.clipped && Math.abs(result.excerpt - 2) < .1, 'an excerpt longer than two lines is cut at two')
    if (!forcedColors) {
      assert.equal(result.mark, result.title, 'a match in an excerpt takes the title\'s ink')
      assert.notEqual(result.mark, result.muted)
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
