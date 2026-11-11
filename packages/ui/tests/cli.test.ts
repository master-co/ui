import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The command a project runs: it looks up contracts, checks markup and takes ownership of a component. */
const bin = fileURLToPath(new URL('../bin/master-ui.js', import.meta.url))
function project() {
  const cwd = mkdtempSync(join(tmpdir(), 'master-ui-'))
  const run = (...args: string[]) => {
    const result = spawnSync(process.execPath, [bin, ...args], { cwd, encoding: 'utf8' })
    return { status: result.status, out: result.stdout, err: result.stderr }
  }
  return { cwd, run, read: (file: string) => readFileSync(join(cwd, file), 'utf8'), write: (file: string, content: string) => writeFileSync(join(cwd, file), content), has: (file: string) => existsSync(join(cwd, file)), remove: () => rmSync(cwd, { recursive: true, force: true }) }
}

test('list and contract answer from the contracts', () => {
  const { run, remove } = project()
  try {
    assert.match(run('list').out, /^button\s+A raised control/m)
    assert.equal(JSON.parse(run('contract', 'btn-primary').out).name, 'button', 'a class name finds its contract')
    assert.equal(run('contract', 'nothing-like-this').status, 1)
    const help = run()
    assert.match(help.out, /master-ui own/)
    assert.doesNotMatch(help.out, /^import /m, 'help prints the header comment and nothing after it')
  } finally { remove() }
})

test('check reports what breaks a contract and fails the command', () => {
  const { run, write, remove } = project()
  try {
    write('good.html', '<button type="button" class="btn btn-primary">Save</button>')
    assert.equal(run('check', 'good.html').status, 0)
    write('bad.html', '<button class="btn-primary">Save</button>\n<div class="dialog"></div>')
    const bad = run('check', 'bad.html', '--json')
    assert.equal(bad.status, 1)
    assert.deepEqual(JSON.parse(bad.out).results[0].diagnostics.map((diagnostic: { code: string }) => diagnostic.code).sort(), ['element', 'label', 'missing-base'])
  } finally { remove() }
})

test('a project contract is read, and one with a library name replaces it', () => {
  const { run, write, remove } = project()
  try {
    run('init')
    write('ui/price-tag.json', JSON.stringify({ name: 'price-tag', title: 'Price tag', tier: 'component', category: 'Display', description: 'A price.', use: 'A price.', script: 'none', classes: [{ name: 'price-tag', kind: 'root', description: 'The price' }, { name: 'price-tag-sale', kind: 'modifier', of: 'price-tag', description: 'On sale' }], example: '<span class="price-tag">$12</span>' }))
    assert.match(run('list').out, /^price-tag\s+A price\./m)
    write('page.html', '<span class="price-tag-sale">$9</span>')
    assert.match(run('check', 'page.html').out, /missing-base "price-tag-sale"/)
  } finally { remove() }
})

test('own copies a component with everything its behavior imports, and tracks upstream', () => {
  const { run, read, write, has, remove } = project()
  try {
    assert.equal(run('init').status, 0)
    assert.match(read('ui/index.css'), /@import '@master\/ui\/components\/menu\.css';/)
    assert.equal(run('own', 'menu').status, 0)
    for (const file of ['menu.css', 'menu.json', 'menu.js', '.base/menu.css']) assert.ok(has(`ui/${file}`), `ui/${file}`)
    for (const match of read('ui/menu.js').matchAll(/from\s+['"]\.\/([\w-]+\.js)['"]/g)) assert.ok(has(`ui/${match[1]}`), `ui/${match[1]}, which menu.js imports`)
    assert.match(read('ui/index.css'), /@import '\.\/menu\.css';/)
    assert.doesNotMatch(read('ui/index.css'), /@master\/ui\/components\/menu\.css/)
    assert.equal(JSON.parse(read('ui/menu.json')).name, 'menu')

    assert.match(run('status').out, /menu\s+upstream unchanged/)
    write('ui/menu.css', `${read('ui/menu.css')}\n/* ours */\n`)
    assert.match(run('status').out, /edited here: menu\.css/)

    // Upstream moves on: the recorded hash no longer matches what the package has.
    const config = JSON.parse(read('master-ui.json'))
    config.owned.menu.files['menu.css'] = 'changed'
    write('master-ui.json', JSON.stringify(config))
    write('ui/.base/menu.css', read('ui/.base/menu.css').replace('.menu', '.menu-before'))
    const status = run('status')
    assert.equal(status.status, 2)
    assert.match(status.out, /upstream changed: menu\.css/)
    assert.match(run('diff', 'menu').out, /^- .*menu-before/m)
    assert.equal(run('accept', 'menu').status, 0)
    assert.match(run('status').out, /upstream unchanged; edited here: menu\.css/)
    assert.match(read('ui/menu.css'), /\/\* ours \*\//, 'accept never touches the project\'s copy')
  } finally { remove() }
})

const manifest = JSON.parse(readFileSync(new URL('../frameworks/manifest.json', import.meta.url), 'utf8')) as { frameworks: Record<string, { package: string }>, components: Record<string, Record<string, string>> }

for (const framework of Object.keys(manifest.frameworks)) {
  test(`add copies a ${framework} component with what it imports from beside it, and tracks upstream`, () => {
    const { run, read, write, has, remove } = project()
    try {
      assert.equal(run('add', 'combobox').status, 1, 'the framework is asked for when the project names none')
      const added = run('add', 'combobox', 'dialog', `--framework=${framework}`)
      assert.equal(added.status, 0, added.err)
      for (const name of ['combobox', 'dialog']) {
        const file = manifest.components[name][framework]
        assert.ok(has(`ui/${file}`), `ui/${file}`)
        assert.ok(has(`ui/.base/${file}`), 'the base copy')
        for (const match of read(`ui/${file}`).matchAll(/from\s+['"]\.\/([\w.-]+)['"]/g)) assert.ok([match[1], `${match[1]}.ts`, `${match[1]}.tsx`, match[1].replace(/\.js$/, '.ts')].some(candidate => has(`ui/${candidate}`)), `ui/${match[1]}, which ${file} imports`)
      }
      assert.match(read(`ui/${manifest.components.combobox[framework]}`), /@master\/ui\/behaviors\/combobox\.js/, 'the behavior stays in the package')
      const config = JSON.parse(read('master-ui.json'))
      assert.equal(config.framework, framework)
      assert.deepEqual(Object.keys(config.components), ['combobox', 'dialog'])

      assert.equal(run('add', 'tabs').status, 0, 'the framework is remembered')
      assert.match(run('add').out, new RegExp(`^combobox\\s+${manifest.components.combobox[framework].replace('.', '\\.')}$`, 'm'), 'without a name it lists the components')
      const button = run('add', 'button')
      assert.equal(button.status, 1)
      assert.match(button.err, /class on a native element/, 'a contract without a component is markup')

      assert.match(run('status').out, /combobox\s+upstream unchanged/)
      const file = manifest.components.combobox[framework]
      write(`ui/${file}`, `${read(`ui/${file}`)}\n// ours\n`)
      assert.match(run('status').out, new RegExp(`edited here: ${file.replace('.', '\\.')}`))
      const kept = run('add', 'combobox')
      assert.match(kept.out, /kept ui\//, 'an edited copy is kept')
      assert.match(read(`ui/${file}`), /\/\/ ours/)
      assert.match(run('diff', 'combobox').out, /unchanged upstream/)
      assert.equal(run('accept', 'combobox').status, 0)
    } finally { remove() }
  })
}

test('add reads the framework from package.json, and imports a behavior the project owns from its copy', () => {
  const { run, read, write, remove } = project()
  try {
    write('package.json', JSON.stringify({ dependencies: { react: '^19.0.0' } }))
    assert.equal(run('own', 'combobox').status, 0)
    assert.equal(run('add', 'combobox').status, 0)
    assert.match(read('ui/combobox.tsx'), /from '\.\/combobox\.js'/)
    assert.doesNotMatch(read('ui/combobox.tsx'), /@master\/ui\/behaviors/)
    assert.equal(run('add', 'combobox', '--framework=solid').status, 1)
  } finally { remove() }
})
