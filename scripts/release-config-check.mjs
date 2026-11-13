// Holds the release workflow to its contract: npm publishes through trusted publishing alone, and the
// site is delivered through the pages-stable Git ref only after a completed release, without any
// Cloudflare credential. Run with `bun run check:release`.
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { YAML } from 'bun'

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
const releaseWorkflow = YAML.parse(read('.github/workflows/release.yml'))
const ciWorkflow = YAML.parse(read('.github/workflows/ci.yml'))

assert.equal(releaseWorkflow.concurrency['cancel-in-progress'], false, 'Keep the release serialized while Pages builds')

const release = releaseWorkflow.jobs.release
assert.equal(release.permissions['id-token'], 'write', 'npm trusted publishing requires GitHub OIDC permission')
const install = release.steps.findIndex(step => /^npm install --global npm@/m.test(step.run ?? ''))
const publish = release.steps.findIndex(step => /bun x aronrepo release\b/.test(step.run ?? ''))
assert.ok(install >= 0 && publish > install, 'Install the OIDC publishing npm CLI before publication')
for (const env of [releaseWorkflow.env, release.env, ...release.steps.map(step => step.env)]) {
  for (const key of Object.keys(env ?? {})) {
    assert.doesNotMatch(key, /^npm_|^node_auth_token$/i, 'The release must not inject npm credentials or config')
  }
}

const site = releaseWorkflow.jobs['deploy-site']
assert.deepEqual(site.needs, ['release', 'verify-registry'], 'Site delivery follows the release and its registry check')
for (const condition of [`needs.release.result == 'success'`, `needs.verify-registry.result == 'success'`,
  `needs.release.outputs.released == 'false'`, `needs.verify-registry.result == 'skipped'`]) {
  assert.ok(site.if.includes(condition), `Site delivery is missing a release gate: ${condition}`)
}
assert.deepEqual(site.permissions, { contents: 'write', checks: 'read' })
assert.equal(site.env.PUBLIC_VERSION, undefined, 'The delivery plan sets the documented version, with or without a release')
assert.equal(site.env.PUBLIC_URL, 'https://ui.master.co', 'Only the canonical site is delivered')
// One Pages project serves the site; the same repository variables as Master CSS name it.
for (const [name, variable] of [['PAGES_PROJECT', 'CLOUDFLARE_PAGES_PROJECT'], ['PAGES_SUBDOMAIN', 'CLOUDFLARE_PAGES_SUBDOMAIN'], ['PAGES_RELEASE_MODE', 'CLOUDFLARE_PAGES_MODE']]) {
  assert.equal(site.env[name], `\${{ vars.${variable} }}`)
}
const planStep = site.steps.find(step => step.id === 'plan')
assert.equal(planStep?.run, 'node scripts/pages-site-release.mjs plan')
assert.equal(planStep.env.RELEASED, '${{ needs.release.outputs.released }}')
assert.equal(planStep.env.RELEASE_VERSION, '${{ needs.release.outputs.version }}')
for (const step of site.steps.slice(site.steps.indexOf(planStep) + 1)) {
  assert.match(step.if ?? '', /steps\.plan\.outputs\.deliver == 'true'/, `Only a planned delivery may run: ${step.name}`)
}
for (const [file, workflow] of [['release.yml', releaseWorkflow], ['ci.yml', ciWorkflow]]) {
  assert.doesNotMatch(JSON.stringify(workflow), /CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID|wrangler pages deploy/, `${file}: Git delivery must not use Cloudflare credentials or upload commands`)
}
const siteRuns = site.steps.map(step => step.run ?? '').join('\n')
let position = -1
for (const command of ['pages-site-release.mjs plan', 'pages-site-release.mjs preflight', 'bun run build', 'pages-site-release.mjs identity',
  'bun run test:site-hosting', 'bun run test:site\n', 'pages-site-release.mjs manifest', 'pages-site-release.mjs deliver']) {
  const next = siteRuns.indexOf(command, position + 1)
  assert.ok(next > position, `Site release command must follow its prerequisites: ${command.trim()}`)
  position = next
}
const delivery = site.steps.find(step => step.run === 'node scripts/pages-site-release.mjs deliver')
assert.equal(delivery.env.GITHUB_TOKEN, '${{ secrets.GITHUB_TOKEN }}')
assert.equal(site.steps.filter(step => step.env?.GITHUB_TOKEN).length, 1, 'Do not expose the repository write token while building the site')
const receipt = site.steps.find(step => step.uses === 'actions/upload-artifact@v7' && step.with.path === 'release-artifacts/site-delivery.json')
assert.equal(receipt?.if, '${{ always() && steps.plan.outputs.deliver == \'true\' }}', 'Keep the receipt when a delivery step fails after an external write')
assert.equal(receipt.with.name, 'site-delivery-${{ github.sha }}-${{ github.run_attempt }}', 'Retain each workflow attempt independently')

const hosted = read('scripts/build-site-hosted.sh')
assert.ok(hosted.indexOf('hosted-prepare') < hosted.indexOf('bun install --frozen-lockfile'), 'Prove the release before installing')
assert.ok(hosted.indexOf('hosted-verify') > hosted.indexOf('bun run build'), 'Verify the output after building it')
assert.doesNotMatch(hosted, /^\s*eval\b/m, 'Never evaluate downloaded release metadata as shell code')
assert.equal(JSON.parse(read('package.json')).scripts['build:site:cloudflare-pages'], 'bash scripts/build-site-hosted.sh')
assert.equal(JSON.parse(read('wrangler.jsonc')).pages_build_output_dir, 'site/out', 'Pages reads the root Wrangler configuration')
assert.ok(!existsSync(new URL('../site/wrangler.jsonc', import.meta.url)), 'Keep one Wrangler configuration, at the Pages root')

const validation = ciWorkflow.jobs.validate.steps.map(step => step.run ?? '').join('\n')
for (const command of ['bun run check:release', 'bun run test:release']) assert.ok(validation.includes(command), `CI must run ${command}`)

process.stdout.write('Validated OIDC-only npm publication and gated, exact-output Pages Git delivery without Cloudflare credentials.\n')
