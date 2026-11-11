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
