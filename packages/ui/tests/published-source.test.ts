import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { verifyPublishedSource, verifySiteUIInstance } from '../../../scripts/verify-package-source.mjs'

const write = (root: string, file: string, content: string) => {
  const path = join(root, file)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}
const authored = ['master.css', 'theme.css', 'contract.schema.json', 'components/button.css', 'components/button.json', 'layouts/form.css', 'themes/paper.css', 'behaviors/menu.js', 'frameworks/react/Menu.tsx', 'check/index.js', 'bin/master-ui.js', 'README.md', 'LICENSE']

test('registry identity compares all authored families while permitting generated output and release metadata', t => {
  const directory = mkdtempSync(join(tmpdir(), 'ui-published-source-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const local = join(directory, 'local'), published = join(directory, 'published')
  for (const file of authored) for (const root of [local, published]) write(root, file, `source of ${file}\n`)
  write(local, 'dist/standalone.css', 'local generated output')
  write(published, 'dist/standalone.css', 'published generated output')
  write(local, 'package.json', '{"name":"@master/ui"}')
  write(published, 'package.json', '{"name":"@master/ui","version":"0.0.2"}')
  assert.equal(verifyPublishedSource(published, local), authored.length)
  for (const file of authored) {
    write(published, file, 'a stale or changed public source')
    assert.throws(() => verifyPublishedSource(published, local), { message: `Published UI source differs: ${file}` })
    write(published, file, `source of ${file}\n`)
  }
  rmSync(join(published, 'behaviors/menu.js'))
  assert.throws(() => verifyPublishedSource(published, local), /inventory differs/)
  write(published, 'behaviors/menu.js', 'source of behaviors/menu.js\n')
  write(published, 'components/obsolete.css', 'a component no longer in the workspace')
  assert.throws(() => verifyPublishedSource(published, local), /inventory differs/)
})

test('site identity rejects a nested shared-shell UI copy and a registry copy used by the site', t => {
  const directory = mkdtempSync(join(tmpdir(), 'ui-site-instance-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const fixture = (kind: 'workspace' | 'nested' | 'registry') => {
    const workspace = join(directory, kind, 'packages/ui'), site = join(directory, kind, 'site')
    const platform = join(site, 'node_modules/@master/internal-site')
    const pkg = (name: string) => JSON.stringify({ name, exports: { './package.json': './package.json' } })
    write(workspace, 'package.json', pkg('@master/ui'))
    write(site, 'package.json', '{"private":true}')
    write(platform, 'package.json', pkg('@master/internal-site'))
    const link = join(site, 'node_modules/@master/ui')
    if (kind === 'registry') write(link, 'package.json', pkg('@master/ui'))
    else symlinkSync(workspace, link, 'dir')
    if (kind === 'nested') write(join(platform, 'node_modules/@master/ui'), 'package.json', pkg('@master/ui'))
    return { workspace, manifest: join(site, 'package.json') }
  }
  const shared = fixture('workspace')
  assert.equal(verifySiteUIInstance(shared.manifest, shared.workspace), realpathSync(shared.workspace))
  const nested = fixture('nested')
  assert.throws(() => verifySiteUIInstance(nested.manifest, nested.workspace), /shared shell resolves a separate UI instance/)
  const registry = fixture('registry')
  assert.throws(() => verifySiteUIInstance(registry.manifest, registry.workspace), /site resolves a separate UI instance/)
})
