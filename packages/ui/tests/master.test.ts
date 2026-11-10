import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { compileManifestSync } from '@master/css-compiler/node'
import preset from '@master/css-preset/default-manifest.json' with { type: 'json' }

const root = new URL('../', import.meta.url)
const read = (file: string) => readFileSync(new URL(file, root), 'utf8')
const imports = [...read('master.css').matchAll(/@import\s+['"]\.\/([^'"]+)['"]/g)].map(match => match[1])
const components = readdirSync(new URL('components/', root)).filter(file => file.endsWith('.css')).map(file => file.slice(0, -4)).sort()
const pkg = JSON.parse(read('package.json'))

function compile(files: string[]) {
  const result = compileManifestSync(files.map(read).join('\n\n'), { baseManifest: preset as never })
  const problems = result.diagnostics.filter(diagnostic => diagnostic.severity === 'error' || diagnostic.severity === 'warning')
  assert.deepEqual(problems, [], `${files.join(', ')} reported diagnostics`)
  return result
}

test('master.css imports the theme first and every component stylesheet', () => {
  assert.equal(imports[0], 'theme.css')
  assert.deepEqual(imports.slice(1).map(file => file.replace(/^components\/(.+)\.css$/, '$1')).sort(), components)
})

test('every imported file is published', () => {
  assert.ok(pkg.files.includes('master.css'))
  assert.ok(pkg.files.includes('theme.css'))
  assert.ok(pkg.files.includes('components/*.css'))
  assert.equal(pkg.exports['.'].style, './master.css')
})

test('the complete library compiles against the Master CSS preset', () => {
  const { nativeClassNames } = compile(imports)
  for (const name of [
    'sheet', 'well', 'tray', 'card', 'card-media', 'card-header', 'card-title', 'card-description', 'card-action', 'card-body', 'card-footer', 'card-split', 'divider',
    'icon', 'btn', 'btn-primary', 'btn-square', 'btn-group', 'link',
    'input', 'input-auto', 'input-group', 'input-group-field', 'input-group-addon', 'field', 'field-hint', 'field-error', 'select', 'select-option',
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
  ]) {
    assert.ok(nativeClassNames.includes(name), `missing native class .${name}`)
  }
})

for (const component of components) {
  test(`components/${component}.css compiles on its own with theme.css`, () => {
    const { nativeClassNames } = compile(['theme.css', `components/${component}.css`])
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

for (const component of components) {
  test(`components/${component}.css reaches parts by class, never by element type or child combinator`, () => {
    for (const selector of selectors(`components/${component}.css`)) {
      assert.ok(!selector.includes('>'), `${component}: child combinator in "${selector}"`)
      assert.ok(!elementTypes.test(selector), `${component}: element type in "${selector}"`)
    }
  })
}
