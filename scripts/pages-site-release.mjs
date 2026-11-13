// Delivers the documentation site through Cloudflare Pages' Git integration, only for a completed release.
//
// In the Release workflow, after @master/ui is released and verified (or for a push that releases nothing):
//   plan        decides whether this push delivers the site, and with which release's version
//   preflight   requires the release tag and the version the registry serves
//   identity    writes site-release.json, the public identity of this exact build, into site/out
//   manifest    records every output file once the site checks pass
//   deliver     publishes the manifest as a release asset, moves pages-stable to this commit and
//               waits for the Pages deployment and, in production mode, for the canonical origin
//   canonical   proves later, from a retained manifest, that the canonical origin serves that build
//
// In Cloudflare Pages, which builds pages-stable (scripts/build-site-hosted.sh):
//   hosted-prepare  requires a completed release of this commit and its published manifest
//   hosted-verify   requires the same output, byte for byte, and that pages-stable still points here
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { channels, createManifest, jsonBytes, manifestName, manifestUrl, prepareIdentity, releaseMetadata, repository, sha256, validateManifest, validateRegistryEvidence, verifyOutput } from './pages-site-manifest.mjs'
import { advancePointer, downloadManifest, publishManifest, verifyLiveIdentity, waitForLiveIdentity, waitForPages } from './pages-release-github.mjs'

const git = args => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 30_000 }).trim()
const remote = `https://github.com/${repository}.git`
const manifestFile = 'release-artifacts/site.manifest.json'

const tagPatterns = { main: /^v(\d+)\.(\d+)\.(\d+)$/ }
// v0.0.0 is the baseline the first version is counted from; it was never published.
const baseline = 'v0.0.0'
const isReleaseTag = (tag, channel) => Boolean(tagPatterns[channel]?.test(tag)) && tag !== baseline

function tagTargets(refs) {
  const tags = new Map()
  for (const line of refs.trim().split('\n')) {
    const match = line.match(/^([a-f0-9]{40})\trefs\/tags\/(v[^\s]+?)(\^\{\})?$/)
    if (!match) continue
    const previous = tags.get(match[2]) ?? {}
    tags.set(match[2], { ...previous, [match[3] ? 'peeled' : 'object']: match[1] })
  }
  return new Map([...tags].map(([tag, target]) => [tag, target.peeled ?? target.object]))
}

/** The highest release tag of a channel, compared numerically. */
export function newestTag(tags, channel) {
  assert.ok(tagPatterns[channel], 'Only main can deliver the site')
  const parts = tag => tag.match(tagPatterns[channel]).slice(1).map(Number)
  return tags.filter(tag => isReleaseTag(tag, channel)).sort((a, b) => {
    const [x, y] = [parts(a), parts(b)]
    return x.map((value, index) => y[index] - value).find(Boolean) ?? 0
  })[0]
}

/**
 * The release a Pages source documents: the release tagged on that exact commit, or for a
 * site-only commit the channel's newest release, whose published manifest names this commit.
 */
export function selectReleaseTag(refs, revision, channel) {
  assert.ok(tagPatterns[channel], 'Only main can deliver the site')
  const targets = tagTargets(refs)
  const exact = [...targets].filter(([tag, target]) => isReleaseTag(tag, channel) && target === revision)
  assert.ok(exact.length <= 1, 'Require at most one actual release tag on this exact source commit')
  if (exact.length) return { tag: exact[0][0], releaseRevision: revision }
  const tag = newestTag([...targets.keys()], channel)
  assert.ok(tag, 'A published release on this channel is required')
  return { tag, releaseRevision: targets.get(tag) }
}

/**
 * Decides whether a push delivers the site. A release delivers with its own version, and so
 * does a rerun on the release commit. Every other push delivers with the newest release,
 * whatever files it changed: the commit policy gives each shipped behavior change a releasing
 * type, so commits that release nothing leave what users install unchanged. Only a pending
 * release, whose commits are not yet published, holds the site until it ships, so the site
 * never documents behavior users cannot install. Until the Pages repository variables exist,
 * nothing is delivered.
 */
export function planDelivery({ configured, released, version, channel, reachableTags, pendingRelease, tagAtHead }) {
  if (!configured) {
    return { deliver: false, reason: 'Cloudflare Pages delivery is not configured: set the CLOUDFLARE_PAGES_PROJECT, CLOUDFLARE_PAGES_SUBDOMAIN and CLOUDFLARE_PAGES_MODE repository variables.' }
  }
  if (released) {
    assert.match(version ?? '', /^\d+\.\d+\.\d+$/, 'A release delivers with its actual version')
    return { deliver: true, kind: 'release', version }
  }
  const tag = newestTag(reachableTags, channel)
  if (!tag) return { deliver: false, reason: `No ${channel} release precedes this commit.` }
  if (tagAtHead?.(tag)) return { deliver: true, kind: 'release', version: tag.slice(1) }
  // aronrepo reports a release type, or `false` when the commits release nothing.
  const pending = pendingRelease(tag)
  if (pending) {
    return { deliver: false, reason: `A ${pending} release is pending since ${tag} and not yet published; the site deploys with it.` }
  }
  return { deliver: true, kind: 'site', version: tag.slice(1) }
}

export function ciMetadata(env = process.env, runGit = git) {
  assert.equal(env.GITHUB_REPOSITORY, repository)
  assert.ok(['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME), 'Site delivery belongs to a push or a rerun of main')
  assert.equal(runGit(['rev-parse', 'HEAD']), env.GITHUB_SHA, 'Checkout differs from the site source')
  assert.ok(['release', 'site'].includes(env.SITE_DELIVERY), 'Plan the delivery before building the site')
  const channel = env.GITHUB_REF_NAME
  const tag = `v${env.PUBLIC_VERSION}`
  const releaseRevision = runGit(['rev-parse', '--verify', `refs/tags/${tag}^{commit}`])
  const metadata = releaseMetadata({ repository, revision: env.GITHUB_SHA, releaseRevision, version: env.PUBLIC_VERSION,
    tag, channel, deliveryBranch: channels[channel]?.deliveryBranch,
    project: env.PAGES_PROJECT, subdomain: env.PAGES_SUBDOMAIN, origin: env.PUBLIC_URL })
  assert.ok(['bootstrap', 'production'].includes(env.PAGES_RELEASE_MODE), 'Choose an explicit bootstrap or production delivery mode')
  if (env.SITE_DELIVERY === 'release') assert.equal(releaseRevision, metadata.revision, 'Actual release tag differs from this source')
  else assert.notEqual(releaseRevision, metadata.revision, 'A tagged release commit delivers through its release')
  return metadata
}

export function hostedMetadata(env = process.env, runGit = git) {
  assert.equal(env.CF_PAGES, '1', 'This command is exclusively the verified Pages Git release build')
  const channel = Object.keys(channels).find(name => channels[name].deliveryBranch === env.CF_PAGES_BRANCH)
  assert.ok(channel, 'Pages must build the release-success delivery branch')
  assert.match(env.CF_PAGES_COMMIT_SHA ?? '', /^[a-f0-9]{40}$/)
  assert.equal(runGit(['rev-parse', 'HEAD']), env.CF_PAGES_COMMIT_SHA, 'Cloudflare source identity differs')
  const { tag, releaseRevision } = selectReleaseTag(runGit(['ls-remote', '--tags', remote, 'v*']), env.CF_PAGES_COMMIT_SHA, channel)
  const metadata = releaseMetadata({ repository, revision: env.CF_PAGES_COMMIT_SHA, releaseRevision, version: tag.slice(1), tag, channel,
    deliveryBranch: env.CF_PAGES_BRANCH, project: env.MASTER_UI_PAGES_PROJECT,
    subdomain: env.MASTER_UI_PAGES_SUBDOMAIN, origin: channels[channel].origin })
  for (const [name, expected] of Object.entries({ PUBLIC_VERSION: metadata.version, PUBLIC_URL: metadata.origin })) {
    if (env[name] !== undefined) assert.equal(env[name], expected, `Configured ${name} differs from the actual release`)
  }
  const url = new URL(env.CF_PAGES_URL)
  assert.equal(url.protocol, 'https:')
  assert.ok(!url.username && !url.password && !url.port && url.pathname === '/' && !url.search && !url.hash)
  const prefix = url.hostname.slice(0, -(metadata.subdomain.length + 1))
  assert.equal(url.hostname, `${prefix}.${metadata.subdomain}`, 'Cloudflare is building a different Pages project subdomain')
  assert.match(prefix, /^[a-f0-9]{8}$/, 'An immutable Pages deployment URL is required')
  return metadata
}

/** The public packages of the workspace, which the documented release published together. */
async function publicPackages(root = '.') {
  const names = []
  for (const directory of await readdir(path.join(root, 'packages'), { withFileTypes: true })) {
    if (!directory.isDirectory()) continue
    let pkg
    try { pkg = JSON.parse(await readFile(path.join(root, 'packages', directory.name, 'package.json'), 'utf8')) } catch (error) {
      if (error.code === 'ENOENT') continue
      throw error
    }
    if (!pkg.private) names.push(pkg.name)
  }
  return names.sort()
}

// Pages applies Wrangler vars on every deployment, replacing dashboard plaintext values.
// Retain the build inputs in that same source of truth; never copy process.env or masked
// dashboard secret bindings into the configuration.
export function hostedBuildConfig(config, input, { packageManager, nodeVersion = process.versions.node }) {
  const metadata = releaseMetadata(input)
  assert.match(packageManager ?? '', /^bun@\d+\.\d+\.\d+$/, 'The hosted build requires a pinned Bun version')
  assert.match(nodeVersion, /^\d+\.\d+\.\d+$/, 'The actual hosted Node version is required')
  assert.equal(config.pages_build_output_dir, 'site/out', 'Pages must publish the verified output directory')
  const vars = {
    BUN_VERSION: packageManager.slice(4), NODE_VERSION: nodeVersion, SKIP_DEPENDENCY_INSTALL: '1',
    MASTER_UI_PAGES_PROJECT: metadata.project, MASTER_UI_PAGES_SUBDOMAIN: metadata.subdomain
  }
  const result = { ...config, vars: { ...config.vars, ...vars } }
  if (config.env?.production) result.env = { ...config.env,
    production: { ...config.env.production, vars: { ...config.env.production.vars, ...vars } } }
  return result
}

export async function verifyPublicRegistry(registry, metadata, fetchApi = fetch) {
  validateRegistryEvidence(registry, metadata)
  for (const pkg of registry.packages) {
    const response = await fetchApi(`${registry.url}${encodeURIComponent(pkg.name)}/${encodeURIComponent(pkg.version)}`, {
      headers: { accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(15_000)
    })
    assert.equal(response.status, 200, `Published registry version is unavailable: ${pkg.name}`)
    const value = await response.json()
    assert.equal(value.name, pkg.name)
    assert.equal(value.version, metadata.version)
    assert.equal(value.gitHead, metadata.releaseRevision, `Published package source differs: ${pkg.name}`)
    assert.equal(value.dist?.integrity, pkg.integrity, `Published archive differs: ${pkg.name}`)
    if (pkg.provenance) assert.ok(value.dist?.attestations?.url, `Published provenance is missing: ${pkg.name}`)
  }
}

/**
 * Registry evidence read from npm itself: every public package of the documented release,
 * built from its tagged source and still the latest dist-tag. The release job has already
 * installed that version and compared it with the source (scripts/verify-package.mjs).
 */
export async function registryFromNpm(metadata, names, fetchApi = fetch) {
  const url = 'https://registry.npmjs.org/'
  const channel = 'latest'
  const read = async address => {
    const response = await fetchApi(address, { headers: { accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(15_000) })
    assert.equal(response.status, 200, `Published registry metadata is unavailable: ${address}`)
    return response.json()
  }
  const packages = []
  for (const name of names) {
    const tags = await read(`${url}-/package/${encodeURIComponent(name)}/dist-tags`)
    assert.equal(tags[channel], metadata.version, `The ${channel} dist-tag moved past the documented release: ${name}`)
    const value = await read(`${url}${encodeURIComponent(name)}/${encodeURIComponent(metadata.version)}`)
    assert.equal(value.gitHead, metadata.releaseRevision, `Published package source differs: ${name}`)
    packages.push({ name, version: metadata.version, integrity: value.dist?.integrity, provenance: Boolean(value.dist?.attestations?.url) })
  }
  const registry = { url, channel, packages: packages.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0) }
  validateRegistryEvidence(registry, metadata)
  assert.deepEqual(registry.packages.map(pkg => pkg.name), names, 'The site release must cover every public package')
  return registry
}

async function ciRegistry(metadata) {
  const registry = await registryFromNpm(metadata, await publicPackages())
  await verifyPublicRegistry(registry, metadata)
  return registry
}

async function writeGitHubFile(name, lines) {
  const file = process.env[name]
  assert.ok(file, `${name} is required`)
  await writeFile(file, lines.map(line => `${line}\n`).join(''), { flag: 'a' })
}

async function plan() {
  const channel = process.env.GITHUB_REF_NAME
  assert.ok(Object.hasOwn(channels, channel), 'Only main can deliver the site')
  // aronrepo is installed by then; the hosted builder never plans, so it stays a lazy import.
  const { explainRange, getVersionTags } = await import('aronrepo/node')
  const cwd = process.cwd()
  const reachableTags = getVersionTags(cwd, 'HEAD')
  // The same release policy as the release job decides whether those commits still await a release.
  const tag = newestTag(reachableTags, channel)
  const pending = tag ? (await explainRange(cwd, tag, 'HEAD')).release : undefined
  const head = git(['rev-parse', 'HEAD'])
  const result = planDelivery({
    configured: ['PAGES_PROJECT', 'PAGES_SUBDOMAIN', 'PAGES_RELEASE_MODE'].some(name => process.env[name]),
    released: process.env.RELEASED === 'true', version: process.env.RELEASE_VERSION, channel, reachableTags,
    pendingRelease: () => pending, tagAtHead: name => git(['rev-parse', '--verify', `refs/tags/${name}^{commit}`]) === head
  })
  await writeGitHubFile('GITHUB_OUTPUT', [`deliver=${result.deliver}`])
  if (!result.deliver) {
    console.log(`::notice title=Site delivery deferred::${result.reason}`)
    return
  }
  await writeGitHubFile('GITHUB_ENV', [`PUBLIC_VERSION=${result.version}`, `SITE_DELIVERY=${result.kind}`])
  console.log(`Delivering the site with ${result.kind === 'release' ? 'its release' : 'the unchanged package of'} v${result.version}.`)
}

async function deliver(metadata) {
  const file = 'release-artifacts/site-delivery.json'
  let receipt = { schemaVersion: 2, attempts: [] }
  try { receipt = JSON.parse(await readFile(file, 'utf8')) } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  assert.equal(receipt.schemaVersion, 2, 'Preserve and reconcile an unfamiliar delivery receipt before retrying')
  assert.ok(Array.isArray(receipt.attempts))
  const attempt = { sequence: receipt.attempts.length + 1, ...metadata, mode: process.env.PAGES_RELEASE_MODE,
    runId: process.env.GITHUB_RUN_ID ?? null, runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    startedAt: new Date().toISOString(), status: 'running', phase: 'intent',
    immutablePagesVerified: false, canonicalVerified: false, writes: [], events: [] }
  receipt.attempts.push(attempt)
  const save = async (phase, values = {}) => {
    Object.assign(attempt, values, { phase, updatedAt: new Date().toISOString() })
    attempt.events.push({ phase, at: attempt.updatedAt })
    await mkdir(path.dirname(file), { recursive: true })
    const temporary = `${file}.${process.pid}.tmp`
    await writeFile(temporary, jsonBytes(receipt))
    await rename(temporary, file)
  }
  const onWrite = async ({ operation, stage, httpStatus }) => {
    assert.ok(['create-manifest', 'advance-pointer', 'create-pointer'].includes(operation))
    if (stage === 'before') attempt.writes.push({ operation, outcome: 'unknown', startedAt: new Date().toISOString() })
    else {
      const write = attempt.writes.at(-1)
      assert.equal(write?.operation, operation)
      Object.assign(write, { httpStatus, respondedAt: new Date().toISOString(),
        outcome: httpStatus >= 200 && httpStatus < 300 ? 'acknowledged'
          : [400, 401, 403, 404, 409, 422].includes(httpStatus) ? 'rejected' : 'unknown' })
    }
    await save(`${operation}-${stage}`)
  }
  await save('intent')
  try {
    await save('verify-input')
    const manifest = JSON.parse(await readFile(manifestFile, 'utf8'))
    await verifyOutput('site/out', manifest, metadata)
    await verifyPublicRegistry(manifest.registry, metadata)
    await save('publish-manifest', { manifestSha256: sha256(jsonBytes(manifest)),
      asset: { name: manifestName(metadata), url: manifestUrl(metadata), verified: false } })
    const options = { token: process.env.GITHUB_TOKEN, onWrite }
    const asset = await publishManifest(metadata, jsonBytes(manifest), options)
    await save('advance-pointer', { asset: { ...asset, verified: true },
      pointer: { branch: metadata.deliveryBranch, requestedRevision: metadata.revision, verified: false } })
    const startedAt = new Date().toISOString()
    const pointer = await advancePointer(metadata, options)
    await save('wait-pages', { pointer: { ...attempt.pointer, ...pointer, verified: true, revision: metadata.revision } })
    // Keep release concurrency held until the external build actually deploys.
    const proof = await waitForPages(metadata, { ...options, startedAt: pointer.advanced ? startedAt : asset.createdAt, manifest })
    await save('pages-verified', { pages: proof, immutablePagesVerified: true })
    if (attempt.mode === 'production') {
      await save('verify-canonical')
      // Fixtures shorten the window; production waits up to ten minutes for the custom domain.
      const timeout = process.env.PAGES_CANONICAL_TIMEOUT_MS ? Number(process.env.PAGES_CANONICAL_TIMEOUT_MS) : undefined
      await waitForLiveIdentity(metadata.origin, metadata, manifest, { timeout })
      await save('canonical-verified', { canonicalVerified: true })
    }
    await save('complete', { status: 'success' })
    console.log(JSON.stringify(attempt))
  } catch {
    // Never serialize Error messages, response bodies, request headers or token
    // values. Unknown write outcomes stay unknown until a later read proves them.
    const phase = attempt.phase
    await save(phase, { status: 'failed', failure: { phase, code: 'PAGES_DELIVERY_NOT_VERIFIED' } })
    throw new Error(`Pages delivery failed during ${phase}; inspect ${file} before retrying`)
  }
}

async function main(command, argument) {
  if (command === 'canonical') {
    assert.ok(argument, 'The retained exact public release manifest is required')
    const localBytes = await readFile(argument)
    const manifest = JSON.parse(localBytes)
    const metadata = validateManifest(manifest)
    assert.equal(tagTargets(git(['ls-remote', '--tags', remote, 'v*'])).get(metadata.tag), metadata.releaseRevision, 'The documented release tag moved')
    const downloaded = await downloadManifest(metadata)
    assert.ok(downloaded.bytes.equals(localBytes), 'Retained manifest differs from its public release asset')
    await verifyPublicRegistry(manifest.registry, metadata)
    await verifyLiveIdentity(metadata.origin, metadata, manifest)
    const proof = { revision: metadata.revision, version: metadata.version, origin: metadata.origin,
      canonicalVerified: true, manifestSha256: sha256(localBytes), checkedAt: new Date().toISOString() }
    await mkdir('release-artifacts', { recursive: true })
    await writeFile('release-artifacts/site-canonical.json', jsonBytes(proof))
    console.log(JSON.stringify(proof))
    return
  }
  if (command === 'hosted-prepare') {
    assert.ok(argument, 'A temporary evidence directory is required')
    const metadata = hostedMetadata()
    const { manifest, bytes } = await downloadManifest(metadata)
    assert.deepEqual(manifest.registry.packages.map(pkg => pkg.name), await publicPackages())
    await verifyPublicRegistry(manifest.registry, metadata)
    await mkdir(argument, { recursive: true })
    await writeFile(path.join(argument, 'manifest.json'), bytes)
    await writeFile(path.join(argument, 'environment'), Object.entries({
      PUBLIC_VERSION: metadata.version, PUBLIC_URL: metadata.origin
    }).map(([key, value]) => `${key}=${value}`).join('\n') + '\n')
    console.log(`Prepared ${metadata.tag} at ${metadata.revision}; public registry and release manifest verified.`)
    return
  }
  if (command === 'hosted-verify') {
    const metadata = hostedMetadata()
    const manifest = JSON.parse(await readFile(path.join(argument, 'manifest.json'), 'utf8'))
    await prepareIdentity('site/out', metadata)
    await verifyPublicRegistry(manifest.registry, metadata)
    const proof = await verifyOutput('site/out', manifest, metadata)
    const pointer = git(['ls-remote', '--heads', remote, `refs/heads/${metadata.deliveryBranch}`])
    assert.equal(pointer, `${metadata.revision}\trefs/heads/${metadata.deliveryBranch}`, 'A newer delivery superseded this Pages build')
    // Only after source, registry, complete output inventory and delivery pointer verify.
    // This build-local configuration is outside site/out and the immutable CI manifest.
    const configPath = 'wrangler.jsonc'
    const config = JSON.parse(await readFile(configPath, 'utf8'))
    const { packageManager } = JSON.parse(await readFile('package.json', 'utf8'))
    const next = hostedBuildConfig(config, metadata, { packageManager })
    const temporaryConfig = `${configPath}.verified`
    try {
      await writeFile(temporaryConfig, jsonBytes(next))
      await rename(temporaryConfig, configPath)
    } finally { await rm(temporaryConfig, { force: true }) }
    console.log(JSON.stringify(proof))
    return
  }
  if (command === 'plan') return plan()
  const metadata = ciMetadata()
  if (command === 'preflight') await ciRegistry(metadata)
  else if (command === 'identity') await prepareIdentity('site/out', metadata)
  else if (command === 'manifest') {
    const manifest = await createManifest('site/out', metadata, await ciRegistry(metadata))
    await mkdir(path.dirname(manifestFile), { recursive: true })
    await writeFile(manifestFile, jsonBytes(manifest))
    console.log(`Verified ${manifest.files.length} exact output files for ${metadata.tag} at ${metadata.revision}.`)
  } else if (command === 'deliver') await deliver(metadata)
  else throw new Error('Expected plan, preflight, identity, manifest, deliver, canonical, hosted-prepare or hosted-verify')
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main(process.argv[2], process.argv[3])
}
