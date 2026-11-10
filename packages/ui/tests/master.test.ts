import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { compileManifestSync } from '@master/css-compiler/node'
import { createRenderSessionSync } from '@master/css/node'
import preset from '@master/css-preset/default-manifest.json' with { type: 'json' }

const root = new URL('../', import.meta.url)
const read = (file: string) => readFileSync(new URL(file, root), 'utf8')
const imports = [...read('master.css').matchAll(/@import\s+['"]\.\/([^'"]+)['"]/g)].map(match => match[1])
const stylesheets = (directory: string) => readdirSync(new URL(`${directory}/`, root)).filter(file => file.endsWith('.css')).map(file => `${directory}/${file}`).sort()
/** Components have a material, a state or a platform behavior. Layouts only place regions, in the few cases utilities cannot. */
const components = stylesheets('components')
const layouts = stylesheets('layouts')
const pkg = JSON.parse(read('package.json'))

function compile(files: string[]) {
  const result = compileManifestSync(files.map(read).join('\n\n'), { baseManifest: preset as never })
  const problems = result.diagnostics.filter(diagnostic => diagnostic.severity === 'error' || diagnostic.severity === 'warning')
  assert.deepEqual(problems, [], `${files.join(', ')} reported diagnostics`)
  return result
}

test('master.css imports the theme first, then every component and every layout', () => {
  assert.equal(imports[0], 'theme.css')
  assert.deepEqual(imports.slice(1).sort(), [...components, ...layouts].sort())
  // A layout may be tuned by nothing and tunes nothing; it follows the components so its few rules read last.
  assert.ok(imports.findIndex(file => file.startsWith('layouts/')) > imports.findLastIndex(file => file.startsWith('components/')))
})

test('every imported file is published', () => {
  assert.ok(pkg.files.includes('master.css'))
  assert.ok(pkg.files.includes('theme.css'))
  assert.ok(pkg.files.includes('components/*.css'))
  assert.ok(pkg.files.includes('layouts/*.css'))
  assert.equal(pkg.exports['./layouts/*.css'], './layouts/*.css')
  assert.equal(pkg.exports['.'].style, './master.css')
})

test('the complete library compiles against the Master CSS preset', () => {
  const { nativeClassNames } = compile(imports)
  for (const name of [
    'sheet', 'well', 'tray', 'card', 'card-media', 'card-header', 'card-title', 'card-description', 'card-action', 'card-body', 'card-footer', 'card-split', 'divider',
    'icon', 'btn', 'btn-primary', 'btn-square', 'btn-group', 'link',
    'input', 'input-auto', 'input-group', 'input-group-field', 'input-group-addon', 'field', 'field-hint', 'field-error', 'input-group-wrap', 'heading', 'heading-xs', 'heading-sm', 'heading-lg', 'heading-xl', 'heading-2xl', 'heading-display', 'eyebrow', 'lead', 'lead-sm', 'lead-lg', 'sheet-inverse', 'dialog-drawer-start', 'page', 'shell', 'shell-fixed', 'shell-header', 'shell-sidebar', 'shell-main', 'shell-aside', 'shell-footer', 'shell-toggle', 'auto-grid', 'auto-grid-fit', 'form', 'form-row', 'form-section', 'form-heading', 'form-title', 'form-description', 'form-fields', 'form-actions', 'progress-ring', 'progress-ring-sm', 'progress-ring-lg', 'progress-ring-xl', 'badge-live',
    'navbar', 'navbar-floating', 'navbar-brand', 'navbar-nav', 'navbar-link', 'navbar-end', 'navbar-toggle', 'navbar-progress',
    'tabbar', 'tabbar-floating', 'tabbar-item', 'tabbar-label', 'toc', 'toc-title', 'toc-list', 'toc-link',
    'banner', 'banner-info', 'banner-success', 'banner-warning', 'banner-danger', 'banner-inverse', 'banner-brand', 'banner-dismissible', 'banner-content', 'banner-title', 'banner-action', 'banner-close',
    'figure', 'figure-framed', 'figure-center', 'figure-media', 'figure-caption', 'quote', 'quote-lg', 'quote-text', 'quote-source', 'quote-name',
    'mark', 'mark-brand', 'mark-underline', 'swatch', 'swatch-square', 'swatch-sm', 'swatch-lg', 'swatch-input',
    'splitter', 'splitter-pane', 'splitter-handle', 'message', 'message-sent', 'message-avatar', 'message-bubble', 'message-meta', 'message-typing',
    'composer', 'composer-field', 'composer-attachments', 'composer-toolbar', 'composer-end', 'composer-hint', 'expand', 'expand-toggle', 'expand-more', 'expand-less', 'select', 'select-option',
    'check', 'checkbox', 'radio', 'switch', 'slider', 'segmented', 'segmented-item', 'segmented-input',
    'tabs', 'tabs-item', 'breadcrumb', 'breadcrumb-item', 'breadcrumb-link',
    'dialog', 'dialog-header', 'dialog-title', 'dialog-description', 'dialog-body', 'dialog-footer', 'dialog-close', 'popover',
    'menu', 'menu-item', 'menu-input', 'menu-shortcut', 'menu-label', 'menu-separator', 'tooltip',
    'alert', 'alert-icon', 'alert-body', 'alert-title', 'alert-description', 'progress', 'skeleton', 'spinner',
    'accordion', 'accordion-item', 'accordion-trigger', 'accordion-content', 'avatar', 'avatar-image', 'avatar-status', 'avatar-group',
    'badge', 'badge-corner', 'kbd', 'code', 'code-block',
    'scroll-area', 'toolbar', 'toolbar-separator', 'chip', 'chip-input', 'chip-remove', 'choice', 'choice-body', 'choice-title', 'choice-description', 'choice-end',
    'rating', 'rating-input', 'dropzone', 'dropzone-input', 'dropzone-title', 'dropzone-description', 'fieldset', 'fieldset-legend',
    'nav', 'nav-item', 'nav-end', 'nav-label', 'nav-group', 'nav-toggle', 'nav-sub', 'pagination', 'pagination-gap', 'steps', 'steps-item', 'steps-title', 'steps-description', 'steps-body',
    'toast-region', 'toast', 'toast-icon', 'toast-body', 'toast-title', 'toast-description', 'toast-close', 'empty', 'empty-media', 'empty-title', 'empty-description', 'empty-actions',
    'table', 'table-row', 'table-heading', 'table-cell', 'carousel', 'carousel-slide',
    'listbox', 'listbox-option', 'listbox-body', 'listbox-description', 'listbox-end', 'listbox-group', 'listbox-label', 'listbox-separator', 'listbox-empty',
    'combobox', 'combobox-toggle', 'command', 'command-search', 'command-input', 'command-list', 'command-footer', 'command-hint',
    'calendar', 'calendar-header', 'calendar-title', 'calendar-grid', 'calendar-week', 'calendar-weekday', 'calendar-day',
    'tree', 'tree-item', 'tree-toggle', 'tree-group', 'tree-sub', 'otp', 'otp-slot', 'otp-separator', 'meter',
    'stepper', 'stepper-field',
    'heatmap', 'heatmap-lg', 'heatmap-cell',
    'code-numbered', 'code-line', 'code-line-highlight', 'code-line-added', 'code-line-removed', 'code-panel', 'code-header', 'code-title',
    'marquee', 'marquee-reverse', 'marquee-track', 'window', 'window-flat', 'window-bar', 'window-controls', 'window-title', 'window-address', 'window-end', 'window-body',
    'wheel', 'wheel-sm', 'wheel-column', 'wheel-option', 'wheel-separator', 'shimmer',
    'chart', 'chart-quiet', 'chart-values', 'chart-horizontal', 'chart-spark', 'chart-item', 'chart-label', 'chart-value',
    'file', 'file-sm', 'file-interactive', 'file-failed', 'file-page', 'file-thumb', 'file-body', 'file-name', 'file-meta', 'file-end', 'file-progress',
    'timeline', 'timeline-item', 'timeline-marker', 'timeline-body', 'timeline-title', 'timeline-description', 'timeline-time',
    'stat', 'stat-label', 'stat-row', 'stat-value', 'stat-delta', 'stat-description',
    'data-list', 'data-list-item', 'data-list-term', 'data-list-value', 'list', 'list-row', 'list-media', 'list-body', 'list-title', 'list-description', 'list-end',
  ]) {
    assert.ok(nativeClassNames.includes(name), `missing native class .${name}`)
  }
})

/**
 * A component class that is also a preset utility is painted twice, and the utility wins. `list-item` would
 * turn a flex row into `display: list-item`. The table parts are the exception on purpose: their utilities
 * set the display those parts have, so the same classes lay out a table built from roles.
 */
test('component classes do not collide with preset utilities', () => {
  const { nativeClassNames } = compile(imports)
  const engine = createRenderSessionSync({ manifest: preset as never })
  try {
    const collisions = nativeClassNames.filter(name => !engine.ensureClassRules([name]).invalidClassNames.includes(name))
    assert.deepEqual(collisions.sort(), ['table', 'table-cell', 'table-row'])
  } finally { engine.dispose() }
})

for (const file of [...components, ...layouts]) {
  test(`${file} compiles on its own with theme.css`, () => {
    const { nativeClassNames } = compile(['theme.css', file])
    assert.ok(nativeClassNames.length > 0)
  })
}

/**
 * Selectors of component rules: every line that opens a block, except at-rules and keyframe steps.
 * `::picker(select)` is the customizable select's list, a pseudo-element whose argument is not an element selector.
 */
function selectors(file: string) {
  return read(file).replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
    .map(line => line.trim())
    .filter(line => line.endsWith('{') && !line.startsWith('@') && !/^(from|to|\d+%)/.test(line))
    .map(line => line.slice(0, -1).trim().replaceAll('::picker(select)', '::picker()'))
}

const elementTypes = /(^|[\s,(>+~&])(a|button|input|label|select|textarea|svg|img|span|div|p|ul|ol|li|nav)(?=$|[\s,:.)[>+~])/

for (const file of [...components, ...layouts]) {
  test(`${file} reaches parts by class, never by element type or child combinator`, () => {
    for (const selector of selectors(file)) {
      assert.ok(!selector.includes('>'), `${file}: child combinator in "${selector}"`)
      assert.ok(!elementTypes.test(selector), `${file}: element type in "${selector}"`)
    }
  })
}

/**
 * A layout places regions and decides what scrolls. It owns no material: a face, an edge, a shadow or a corner
 * comes from a component standing in the region, so a layout never has to be matched to the material ladder.
 */
for (const file of layouts) {
  test(`${file} draws no material`, () => {
    const source = read(file).replace(/\/\*[\s\S]*?\*\//g, '')
    for (const property of ['background', 'background-color', 'background-image', 'box-shadow', 'border-radius', 'corner-shape', 'backdrop-filter', 'filter']) {
      assert.ok(!new RegExp(`(^|[\\s;{])${property}\\s*:`).test(source), `${file}: a layout declares ${property}`)
    }
  })
}
