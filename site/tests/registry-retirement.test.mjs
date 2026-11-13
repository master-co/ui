import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createServer } from 'node:net'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import worker from '../public/_worker.js'

const site = fileURLToPath(new URL('../', import.meta.url))
const retired = '/r/layout-arrangements.json'

test('only the retired item bypasses assets, including HEAD and query variants', async () => {
    const env = { ASSETS: { fetch() { throw new Error('Retired item reached static assets') } } }
    for (const method of ['GET', 'HEAD']) for (const query of ['', '?client=registry']) {
        const response = await worker.fetch(new Request(`https://ui.master.co${retired}${query}`, { method }), env)
        assert.equal(response.status, 410)
        assert.equal(response.headers.get('cache-control'), 'no-store')
        assert.equal(response.headers.get('access-control-allow-origin'), '*')
        assert.equal(response.headers.get('x-robots-tag'), 'noindex')
        assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
        assert.equal(response.headers.get('location'), null)
        if (method === 'HEAD') assert.equal(await response.text(), '')
        else assert.deepEqual(await response.json(), { error: 'Gone', message: 'The layout-arrangements registry item has been removed.' })
    }
    for (const pathname of ['/r/layout-arrangements.json/extra', '/r/layout-arrangements.json/', '/r/layout-unknown.json', '/r/layout-dashboard.json', '/guide/design']) {
        const request = new Request(`https://ui.master.co${pathname}`)
        const response = new Response('asset response', { status: 404 })
        assert.equal(await worker.fetch(request, { ASSETS: { fetch(value) { assert.equal(value, request); return response } } }), response)
    }
    const routes = JSON.parse(await readFile(path.join(site, 'public/_routes.json'), 'utf8'))
    assert.deepEqual(routes, { version: 1, include: [retired], exclude: [] })
})

test('actual Pages dispatch retires a stale asset while preserving static redirects and content', { timeout: 90_000 }, async () => {
    const scratch = await mkdtemp(path.join(tmpdir(), 'master-ui-retirement-'))
    let serverProcess
    let logs = ''
    try {
        const output = path.join(scratch, 'out')
        await cp(path.resolve(site, processEnvOutput()), output, { recursive: true })
        assert.deepEqual(await readFile(path.join(output, '_worker.js')), await readFile(path.join(site, 'public/_worker.js')))
        assert.deepEqual(await readFile(path.join(output, '_routes.json')), await readFile(path.join(site, 'public/_routes.json')))
        // Reproduce the removed asset still existing in a serving layer: the worker must win.
        await writeFile(path.join(output, retired), JSON.stringify({ name: 'layout-arrangements', files: [{ content: 'stale' }] }))
        const port = await freePort()
        const origin = `http://127.0.0.1:${port}`
        // Wrangler 4.129's bundled local runtime supports dates through 2026-09-10.
        // This tests standard Pages routing/Request/Response APIs; production keeps its configured date.
        serverProcess = spawn(path.join(site, '../node_modules/.bin/wrangler'), ['pages', 'dev', output, '--compatibility-date', '2026-09-10', '--ip', '127.0.0.1', '--port', String(port), '--inspector-port', '0', '--persist-to', path.join(scratch, 'state')], {
            cwd: site, env: { ...globalThis.process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' }, stdio: ['ignore', 'pipe', 'pipe']
        })
        serverProcess.stdout.on('data', chunk => { logs += chunk })
        serverProcess.stderr.on('data', chunk => { logs += chunk })
        let ready = false
        for (let attempt = 0; attempt < 200; attempt++) {
            if (serverProcess.exitCode !== null) throw new Error(`Wrangler exited: ${logs}`)
            try { if ((await fetch(origin + '/guide/design')).status === 200) { ready = true; break } } catch {}
            await new Promise(resolve => setTimeout(resolve, 100))
        }
        assert.ok(ready, `Pages did not start: ${logs}`)
        for (const method of ['GET', 'HEAD']) {
            const response = await fetch(origin + retired, { method, redirect: 'manual' })
            assert.equal(response.status, 410)
            assert.equal(response.headers.get('cache-control'), 'no-store')
            assert.equal(response.headers.get('access-control-allow-origin'), '*')
            if (method === 'HEAD') assert.equal(await response.text(), '')
            else assert.equal((await response.json()).error, 'Gone')
        }
        for (const name of ['app-shell', 'auto-grid', 'centered', 'dashboard', 'docs', 'holy-grail', 'master-detail', 'page', 'settings']) {
            const response = await fetch(`${origin}/r/layout-${name}.json`, { redirect: 'manual' })
            assert.equal(response.status, 301, name)
            const target = await fetch(new URL(response.headers.get('location'), origin))
            assert.equal(target.status, 200, name)
            assert.ok((await target.json()).files.length > 0, name)
        }
        assert.equal((await fetch(origin + '/r/layout-does-not-exist.json', { redirect: 'manual' })).status, 404)
        assert.equal(await (await fetch(origin + '/guide/design.md')).text(), await readFile(path.join(output, 'guide/design.md'), 'utf8'))
        const guide = await fetch(origin + '/tw/guide', { redirect: 'manual' })
        assert.equal(guide.status, 302)
        assert.equal(new URL(guide.headers.get('location'), origin).pathname, '/tw/guide/introduction')
        const missing = await fetch(origin + '/tw/components/unknown-component')
        assert.equal(missing.status, 404)
        assert.match(await missing.text(), /<html lang="zh-TW"/)
    } finally {
        if (serverProcess && serverProcess.exitCode === null) {
            serverProcess.kill('SIGTERM')
            await new Promise(resolve => serverProcess.once('exit', resolve))
        }
        await rm(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
    }
})

function processEnvOutput() { return globalThis.process.env.MASTER_UI_SITE_OUTPUT || 'out' }
async function freePort() {
    const server = createServer()
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    const port = server.address().port
    await new Promise(resolve => server.close(resolve))
    return port
}
