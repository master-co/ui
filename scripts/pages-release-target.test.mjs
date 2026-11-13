import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assertPagesTarget, verifyPagesTarget } from './pages-release-target.mjs'

const expected = { name: 'fixture' }
const project = { name: 'fixture', production_branch: 'pages-stable', domains: ['fixture.pages.dev', 'ui.master.co'] }

test('the site release requires the matching project, production branch and hostname', () => {
  assert.doesNotThrow(() => assertPagesTarget(project, expected))
  for (const wrong of [
    { ...project, name: 'another-project' },
    { ...project, production_branch: 'main' },
    { ...project, production_branch: 'codex/pages-stable' },
    { ...project, domains: ['fixture.pages.dev'] },
    { ...project, domains: ['css.master.co'] }
  ]) assert.throws(() => assertPagesTarget(wrong, expected))
  assert.throws(() => assertPagesTarget(project, { ...expected, channel: 'next' }), /Only main/)
})

test('missing credentials and unsuccessful API responses cannot pass target verification', async () => {
  await assert.rejects(verifyPagesTarget({}, () => { throw new Error('must not fetch') }), /Missing/)
  const env = { CLOUDFLARE_API_TOKEN: 'fixture-token', CLOUDFLARE_ACCOUNT_ID: 'fixture-account', PAGES_PROJECT: expected.name }
  const fetchProject = async (url, options) => {
    assert.equal(new URL(url).hostname, 'api.cloudflare.com')
    assert.equal(options.method, undefined, 'the check only uses GET')
    assert.equal(options.redirect, 'error')
    return { ok: true, json: async () => ({ success: true, result: project }) }
  }
  await verifyPagesTarget(env, fetchProject)
  await assert.rejects(verifyPagesTarget(env, async () => ({ ok: false, status: 403 })), /HTTP 403/)
  await assert.rejects(verifyPagesTarget(env, async () => ({ ok: true, json: async () => ({ success: false }) })), /not successful/)
})
