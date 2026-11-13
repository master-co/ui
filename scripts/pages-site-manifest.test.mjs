import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { createManifest, identityPath, inventoryDigest, manifestName, prepareIdentity, releaseMetadata, validateManifest, verifyOutput } from './pages-site-manifest.mjs'

const metadata = { repository: 'master-co/ui', revision: 'a'.repeat(40), releaseRevision: 'a'.repeat(40), version: '0.0.7', tag: 'v0.0.7',
  channel: 'main', deliveryBranch: 'pages-stable', project: 'fixture', subdomain: 'fixture-suffix.pages.dev', origin: 'https://ui.master.co' }
const registry = { url: 'https://registry.npmjs.org/', channel: 'latest', packages: [
  { name: '@master/ui', version: metadata.version, integrity: 'sha512-YQ==', provenance: true }
] }

async function fixture(t) {
  const out = await mkdtemp(path.join(tmpdir(), 'master-ui-pages-manifest-'))
  t.after(() => rm(out, { recursive: true, force: true }))
  await mkdir(path.join(out, 'assets'))
  await writeFile(path.join(out, 'index.html'), '<!doctype html><p>Release fixture</p>')
  await writeFile(path.join(out, 'assets/a.css'), 'a{color:red}')
  await writeFile(path.join(out, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n')
  await writeFile(path.join(out, '_worker.js'), 'export default {}')
  await writeFile(path.join(out, '_routes.json'), '{"version":1}')
  await prepareIdentity(out, metadata)
  const manifest = await createManifest(out, metadata, registry)
  return { out, manifest }
}

test('the external manifest covers every final file, including a non-recursive public identity', async t => {
  const { out, manifest } = await fixture(t)
  assert.equal(manifest.files.length, 6)
  assert.ok(manifest.files.some(file => file.path === identityPath))
  const identity = JSON.parse(await readFile(path.join(out, identityPath)))
  assert.equal(identity.payloadDigest, inventoryDigest(manifest.files.filter(file => file.path !== identityPath)))
  assert.equal(identity.revision, metadata.revision)
  assert.ok(!('manifestSha256' in identity) && !('accountId' in identity) && !('mode' in identity))
  assert.deepEqual(await verifyOutput(out, manifest, metadata), { revision: metadata.revision, version: metadata.version, files: 6, buildDigest: manifest.buildDigest })
})

test('same source and bytes reproduce independently of checkout/output paths', async t => {
  const first = await fixture(t), second = await fixture(t)
  assert.notEqual(first.out, second.out)
  assert.deepEqual(first.manifest, second.manifest)
  await prepareIdentity(first.out, metadata)
  await verifyOutput(first.out, first.manifest, metadata)
})

for (const mutation of ['content', 'missing', 'renamed', 'extra-hidden', 'identity', 'symlink']) {
  test(`an output change (${mutation}) cannot reuse the verified manifest`, async t => {
    const { out, manifest } = await fixture(t)
    const css = path.join(out, 'assets/a.css')
    if (mutation === 'content') await writeFile(css, 'a{color:blue}')
    if (mutation === 'missing') await rm(css)
    if (mutation === 'renamed') await rename(css, path.join(out, 'assets/b.css'))
    if (mutation === 'extra-hidden') await writeFile(path.join(out, '.unexpected'), 'unexpected')
    if (mutation === 'identity') await writeFile(path.join(out, identityPath), '{}')
    if (mutation === 'symlink') await symlink('index.html', path.join(out, 'linked.html'))
    await assert.rejects(verifyOutput(out, manifest, metadata))
  })
}

test('a manifest requires the identity of this exact delivery to be written first', async t => {
  const { out } = await fixture(t)
  // Another release, project or origin writes another identity, so the same bytes cannot be reused.
  for (const other of [{ ...metadata, version: '0.0.8', tag: 'v0.0.8' }, { ...metadata, project: 'other' }, { ...metadata, revision: 'c'.repeat(40) }]) {
    await assert.rejects(createManifest(out, other, { ...registry, packages: registry.packages.map(pkg => ({ ...pkg, version: other.version })) }), /identity/)
  }
  await writeFile(path.join(out, 'assets/a.css'), 'a{color:blue}')
  await assert.rejects(createManifest(out, metadata, registry), /identity/)
})

test('the Pages worker that retires a registry item must be part of every delivered build', async t => {
  const { out } = await fixture(t)
  await rm(path.join(out, '_worker.js'))
  await assert.rejects(prepareIdentity(out, metadata), /_worker\.js/)
  await writeFile(path.join(out, '_worker.js'), 'export default {}')
  await rm(path.join(out, '_routes.json'))
  await assert.rejects(prepareIdentity(out, metadata), /_routes\.json/)
})

test('manifest identity, registry integrity and exact path inventory fail closed', async t => {
  const { manifest } = await fixture(t)
  for (const mutate of [
    m => { m.revision = 'b'.repeat(40) }, m => { m.project = 'another-project' },
    m => { m.deliveryBranch = 'main' }, m => { m.origin = 'https://css.master.co' },
    m => { m.files[0].path = '../escape' }, m => { m.files[0].path = '/absolute' },
    m => { m.files[0].path = 'assets\\escape' }, m => { m.files.push(m.files[0]) },
    m => { m.files.pop() }, m => { m.registry.packages[0].version = '1.0.0' },
    m => { m.registry.packages[0].integrity = 'bad-integrity' }, m => { m.registry.channel = 'next' },
    m => { m.files = m.files.filter(file => file.path !== '_worker.js'); m.buildDigest = inventoryDigest(m.files) },
    m => { m.extra = true }
  ]) {
    const wrong = structuredClone(manifest); mutate(wrong)
    assert.throws(() => validateManifest(wrong, metadata))
  }
})

test('logical channel, actual version and delivery ref are deliberately distinct', () => {
  assert.equal(releaseMetadata(metadata).deliveryBranch, 'pages-stable')
  assert.equal(manifestName(metadata), `site-main-${metadata.revision}.manifest.json`)
  assert.throws(() => releaseMetadata({ ...metadata, channel: 'next' }), /Only main/)
  assert.throws(() => releaseMetadata({ ...metadata, version: '0.1.0-rc.1', tag: 'v0.1.0-rc.1' }), /released version/)
  assert.throws(() => releaseMetadata({ ...metadata, version: '0.0.0', tag: 'v0.0.0' }), /baseline/)
  assert.throws(() => releaseMetadata({ ...metadata, tag: 'v0.0.8' }), /tag/)
  assert.throws(() => releaseMetadata({ ...metadata, deliveryBranch: 'main' }))
  assert.throws(() => releaseMetadata({ ...metadata, origin: 'https://fixture.pages.dev' }))
  assert.throws(() => releaseMetadata({ ...metadata, subdomain: 'https://fixture.pages.dev/' }))
  assert.throws(() => releaseMetadata({ ...metadata, repository: 'fork/ui' }))
})
