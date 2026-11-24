import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { sharePreviewAssetsIn, sharedSplits, topLevelBoundaries } from '../scripts/preview-assets.mjs'
import { addSpeculationRules, speculationRules } from '../scripts/speculation-rules.mjs'

const site = fileURLToPath(new URL('../', import.meta.url))
const sha256 = value => createHash('sha256').update(value).digest('hex')
const srcdoc = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
const props = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll("'", '&#39;').replaceAll('"', '&quot;')

test('a top-level boundary ignores braces in strings and comments', () => {
    const css = '@layer a,b;.x{content:"}"}/* } */@layer a{.y{color:red}}'
    assert.deepEqual(topLevelBoundaries(css).map(end => css.slice(0, end)), ['@layer a,b;', '@layer a,b;.x{content:"}"}', css])
})

test('each theme splits where its previews stop sharing, at the same place for every preview', () => {
    const library = '@layer theme,base,defaults,components,utilities;' + Array.from({ length: 40 }, (_, index) => `@layer components{.c${index}{color:red}}`).join('')
    const paper = '@layer theme,base,defaults,components,utilities;' + Array.from({ length: 30 }, (_, index) => `@layer components{.p${index}{color:blue}}`).join('')
    const own = name => `@layer theme{:root{--${name}:1}}@layer utilities{.${name}{gap:1px}}`
    const sheets = new Map([['a', library + own('a')], ['b', library + own('b')], ['c', library + own('c')], ['d', paper + own('d')], ['e', paper + own('e')], ['f', own('f')]])
    const splits = sharedSplits(sheets)
    for (const name of ['a', 'b', 'c']) assert.equal(splits.get(name), library.length)
    for (const name of ['d', 'e']) assert.equal(splits.get(name), paper.length)
    assert.equal(splits.has('f'), false)
})

test('previews link the shared stylesheet and their own, and load large scripts as files', async () => {
    const out = await mkdtemp(path.join(tmpdir(), 'master-ui-preview-delivery-'))
    try {
        await mkdir(path.join(out, 'preview-styles'))
        await mkdir(path.join(out, 'components'))
        const library = '@layer theme,base,defaults,components,utilities;' + '@layer components{.btn{color:red}}'.repeat(20)
        const css = { a: library + '@layer utilities{.p-lg{padding:1.5rem}}', b: library + '@layer utilities{.gap-md{gap:1rem}}' }
        for (const value of Object.values(css)) await writeFile(path.join(out, 'preview-styles', `${sha256(value)}.css`), value)
        const bundle = `"use strict";var MasterUI=(()=>{const s='</div>&"';return {attach(){}}})();\n;MasterUI.attach()`.padEnd(20_000, ' ')
        const documentOf = (value, script) => `<!doctype html><html lang="en"><head><style>a{}</style><link rel="stylesheet" href="/preview-styles/${sha256(value)}.css"></head><body><p>'Tom' & "Jerry"</p>${script ? `<script>${bundle}</script>` : ''}<script>small()</script></body></html>`
        const island = document => `<astro-island uid="x" props="${props(JSON.stringify({ title: [0, 'Title'], document: [0, document] }))}"><iframe title="Title" srcdoc="${srcdoc(document)}"></iframe></astro-island>`
        const page = `<!doctype html><html><head></head><body>${island(documentOf(css.a, true))}${island(documentOf(css.b, false))}</body></html>`
        await writeFile(path.join(out, 'components/demo.html'), page)
        await mkdir(path.join(out, 'demo'))
        await writeFile(path.join(out, 'demo/search.html'), documentOf(css.a, true))

        await sharePreviewAssetsIn(out)

        const html = await readFile(path.join(out, 'components/demo.html'), 'utf8')
        const decode = value => value.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&')
        const documents = [...html.matchAll(/\ssrcdoc="([^"]*)"/g)].map(([, value]) => decode(value))
        const hydrated = [...html.matchAll(/\sprops="([^"]*)"/g)].map(([, value]) => JSON.parse(decode(value)).document[1])
        assert.deepEqual(hydrated, documents, 'the island hydrates the document its iframe was written with')
        assert.equal(await readFile(path.join(out, 'demo/search.html'), 'utf8'), documents[0],
            'the standalone preview loads the same styles and scripts as its embedded edition')

        const shared = sha256(library)
        for (const [index, value] of Object.values(css).entries()) {
            const links = [...documents[index].matchAll(/<link rel="stylesheet" href="\/preview-styles\/([0-9a-f]{64})\.css">/g)].map(([, name]) => name)
            assert.equal(links.length, 2)
            assert.equal(links[0], shared)
            const files = await Promise.all(links.map(name => readFile(path.join(out, 'preview-styles', `${name}.css`), 'utf8')))
            assert.equal(files.join(''), value, 'the two stylesheets are the original, in order')
        }
        const remaining = await readdir(path.join(out, 'preview-styles'))
        for (const value of Object.values(css)) assert.ok(!remaining.includes(`${sha256(value)}.css`), 'a split stylesheet is not deployed')

        const scripts = await readdir(path.join(out, 'preview-scripts'))
        assert.equal(scripts.length, 1)
        assert.equal(await readFile(path.join(out, 'preview-scripts', scripts[0]), 'utf8'), bundle)
        assert.match(documents[0], new RegExp(`<script src="/preview-scripts/${scripts[0]}"></script><script>small\\(\\)</script>`))
        assert.match(documents[0], /<p>'Tom' & "Jerry"<\/p>/)
        assert.ok(!html.includes('var MasterUI'), 'the bundle is not inline anywhere')
    } finally {
        await rm(out, { recursive: true, force: true })
    }
})

test('every page prefetches the pages its links lead to, once', () => {
    const page = '<!doctype html><html><head><title>x</title></head><body><iframe srcdoc="&lt;head>&lt;/head>"></iframe></body></html>'
    const ruled = addSpeculationRules(page)
    assert.equal(ruled.match(/type="speculationrules"/g).length, 1)
    assert.ok(ruled.indexOf('type="speculationrules"') < ruled.indexOf('</head>'))
    assert.equal(addSpeculationRules(ruled), ruled)
    assert.equal(speculationRules.prefetch[0].eagerness, 'moderate')
})

test('content-named assets are cached for good and the fonts for a month', async () => {
    const headers = await readFile(path.join(site, 'public/_headers'), 'utf8')
    for (const directory of ['_astro', 'preview-styles', 'preview-scripts']) {
        assert.match(headers, new RegExp(`^/${directory}/\\*\\n  Cache-Control: public, max-age=31536000, immutable$`, 'm'))
    }
    assert.match(headers, /^\/fonts\/\*\n  Cache-Control: public, max-age=2592000, stale-while-revalidate=31536000$/m)
    assert.doesNotMatch(headers, /\/assets\/fonts/)
})
