import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { transformSync } from 'esbuild'
import { compileManifestSync } from '@master/css-compiler/node'
import { createRenderSessionSync } from '@master/css/node'
import { components as catalog } from '../../catalog'
import { closure as closureOf, compiledBytes, fragments, write, type Fragment, type ThemeFragments } from './assemble'

/*
 * What each stylesheet and behavior of @master/ui costs a page, measured at build time from the published
 * source. The compile is the one `packages/ui/scripts/build.ts` runs for `dist/standalone.css`: the theme first,
 * then the stylesheets, through the Master CSS compiler with the default preset, every token kept.
 *
 * Compiled CSS adds up exactly: the library's compiled rules are the theme's rules followed by each stylesheet's
 * own, in import order, and the theme layer grows only by a few shared resources (preset variables and
 * keyframes) that some stylesheets ask for. So every selection can be written out as fragments of the published
 * `standalone.css`, and this module checks that claim against the compiler before it is used. Gzip does not add
 * up, since text shared between stylesheets compresses once, so the page gzips the assembled selection itself.
 */

const require = createRequire(import.meta.url)
const uiRoot = dirname(fileURLToPath(import.meta.resolve('@master/ui/master.css')))
const read = (file: string) => readFileSync(join(uiRoot, file), 'utf8')
const preset = JSON.parse(readFileSync(require.resolve('@master/css-preset/default-manifest.json'), 'utf8'))
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const bytes = (text: string) => Buffer.byteLength(text)
const gzip = (text: string) => gzipSync(text).length

const imports = [...read('master.css').matchAll(/@import\s+['"]\.\/([^'"]+)['"]/g)].map(match => match[1])
const tokens: string[] = []
for (const block of strip(read('theme.css')).matchAll(/@theme\s*\{([\s\S]*?)\n\}/g)) {
    for (const match of block[1].matchAll(/(?:^|[;{\s])(--[a-z][a-z0-9-]*)\s*:/g)) if (!tokens.includes(match[1])) tokens.push(match[1])
}
const scheme = '@layer base{:root{color-scheme:light dark}[data-theme="light"],:host([data-theme="light"]){color-scheme:light}[data-theme="dark"],:host([data-theme="dark"]){color-scheme:dark}}'
const head = `@layer theme, base, defaults, components, utilities;\n${scheme}\n`

/** `standalone()` of packages/ui/scripts/build.ts for the theme and the given stylesheets, split at its seams. */
function compile(files: string[]) {
    const compiled = compileManifestSync(['theme.css', ...files].map(read).join('\n\n'), { baseManifest: preset as never })
    const session = createRenderSessionSync({ manifest: compiled.manifest as never })
    try {
        const every = `.master-ui-tokens{${tokens.map((token, at) => `--t${at}:var(${token})`).join(';')}}`
        const theme = session.ensureStylesheetResources(`${compiled.css}\n${every}`).snapshot().cssText as string
        return { theme, rules: compiled.css as string, css: `${head}${theme}\n${compiled.css}` }
    } finally { session.dispose() }
}

/** The top-level blocks of a piece of CSS, each as the exact text it occupies. */
function blocks(css: string) {
    const found: { start: number, end: number }[] = []
    let depth = 0
    let start = 0
    for (let index = 0; index < css.length; index++) {
        const character = css[index]
        if (character === '{') depth++
        else if (character === '}' && --depth === 0) {
            found.push({ start, end: index + 1 })
            start = index + 1
        }
    }
    return found
}

/** The declarations of a rule body, split on semicolons outside parentheses. */
function declarations(body: string) {
    const found: string[] = []
    let depth = 0
    let start = 0
    for (let index = 0; index < body.length; index++) {
        const character = body[index]
        if (character === '(') depth++
        else if (character === ')') depth--
        else if (character === ';' && depth === 0) {
            found.push(body.slice(start, index))
            start = index + 1
        }
    }
    found.push(body.slice(start))
    return found.filter(Boolean)
}

/**
 * A theme layer as the pieces a selection can switch on: the base layer, one rule of preset variables inserted
 * at a fixed place, and keyframes after the layer.
 */
function themeParts(theme: string, base?: string[]) {
    const [layer, ...rest] = blocks(theme)
    const prelude = '@layer theme{'
    const text = theme.slice(layer.start, layer.end)
    if (!text.startsWith(prelude)) throw new Error('The theme layer has an unexpected shape')
    const inner = text.slice(prelude.length, -1)
    const rules = blocks(inner).map(block => inner.slice(block.start, block.end))
    const extra = base ? rules.filter(rule => !base.includes(rule)) : []
    if (extra.length > 1) throw new Error('More than one rule of preset variables in the theme layer')
    const variables = extra[0]
    return {
        rules,
        at: variables ? rules.indexOf(variables) : -1,
        variables: variables ? declarations(variables.slice(variables.indexOf('{') + 1, -1)) : [],
        variablesPrelude: variables ? variables.slice(0, variables.indexOf('{') + 1) : '',
        keyframes: rest.map(block => theme.slice(block.start, block.end)),
    }
}

export interface CostUnit {
    name: string
    title: string
    category: string
    tier: 'component' | 'layout'
    /** The contracts this one composes, directly. */
    composes: string[]
    script: 'none' | 'optional' | 'required'
    behavior?: string
    /** UTF-16 offsets of its compiled rules in the published standalone.css. */
    rules: [number, number]
    /** Its compiled rules in UTF-8 bytes. */
    bytes: number
    /** The shared theme resources it asks for: indexes into `theme.variables` and `theme.keyframes`. */
    variables: number[]
    keyframes: number[]
}

export interface Behavior {
    name: string
    /** Minified ES module, as its own file. */
    raw: number
    gzip: number
    /** Other behavior modules it imports, such as `internal`. */
    imports: string[]
}

let cached: ReturnType<typeof measureNow> | undefined

/** Everything the cost section needs, measured once per process. */
export function measure() {
    cached ??= measureNow()
    return cached
}

function measureNow() {
    const files = imports.filter(file => file !== 'theme.css')
    const contracts = files.map(file => ({ file, ...JSON.parse(read(file.replace(/\.css$/, '.json'))) as { name: string, title: string, category: string, tier: 'component' | 'layout', composes?: string[], script: CostUnit['script'], behavior?: string } }))

    const themeOnly = compile([])
    const baseRules = themeParts(themeOnly.theme).rules
    const full = compile(files)
    const fullTheme = themeParts(full.theme, baseRules)
    const fullCss = full.css

    /* Each stylesheet alone after the theme: its rules are what it appends, its resources what it adds to the layer. */
    const singles = contracts.map(contract => {
        const alone = compile([contract.file])
        if (!alone.rules.startsWith(themeOnly.rules)) throw new Error(`${contract.name}: its compiled rules do not follow the theme's`)
        const parts = themeParts(alone.theme, baseRules)
        return {
            contract,
            rules: alone.rules.slice(themeOnly.rules.length),
            variables: parts.variables.map(variable => fullTheme.variables.indexOf(variable)),
            keyframes: parts.keyframes.map(keyframe => fullTheme.keyframes.indexOf(keyframe)),
            css: alone.css,
        }
    })

    /** The theme layer for a set of resources, written the way the compiler writes it. */
    const themeFor = (variables: Set<number>, keyframes: Set<number>) => {
        const rules = [...baseRules]
        const chosen = fullTheme.variables.filter((_, index) => variables.has(index))
        if (chosen.length) rules.splice(fullTheme.at, 0, `${fullTheme.variablesPrelude}${chosen.join(';')}}`)
        return `@layer theme{${rules.join('')}}${fullTheme.keyframes.filter((_, index) => keyframes.has(index)).join('')}`
    }
    const assemble = (names: Set<string>) => {
        const chosen = singles.filter(single => names.has(single.contract.name))
        const theme = themeFor(new Set(chosen.flatMap(single => single.variables)), new Set(chosen.flatMap(single => single.keyframes)))
        return `${head}${theme}\n${themeOnly.rules}${chosen.map(single => single.rules).join('')}`
    }

    /*
     * The claim the page rests on, checked against the compiler: every stylesheet alone, the whole library, and a
     * mixed selection that composes others assemble to exactly what the compiler writes for them.
     */
    const problems: string[] = []
    for (const single of singles) {
        if (single.variables.includes(-1) || single.keyframes.includes(-1)) problems.push(`${single.contract.name}: a resource the whole library does not have`)
        else if (assemble(new Set([single.contract.name])) !== single.css) problems.push(`${single.contract.name}: assembled alone, it differs from its compile`)
    }
    if (assemble(new Set(contracts.map(contract => contract.name))) !== fullCss) problems.push('the whole library differs from its compile')

    const byName = new Map(contracts.map(contract => [contract.name, contract]))
    const closure = (names: string[]) => {
        const needed = new Set<string>()
        const visit = (name: string) => {
            if (needed.has(name) || !byName.has(name)) return
            needed.add(name)
            for (const dependency of byName.get(name)!.composes ?? []) visit(dependency)
        }
        names.forEach(visit)
        return needed
    }
    const exactCss = (names: string[]) => {
        const needed = closure(names)
        const css = assemble(needed)
        return { css, needed }
    }
    const check = closure(defaultSelection)
    if (assemble(check) !== compile(files.filter((_, index) => check.has(contracts[index].name))).css) problems.push('the default selection differs from its compile')

    /*
     * The published file the page fetches to gzip a selection. Its banner line aside, it must be this compile;
     * otherwise (a stale `dist/` during development) the page offers compiled sizes only.
     */
    const published = readFileSync(join(uiRoot, 'dist/standalone.css'), 'utf8')
    const banner = published.slice(0, published.indexOf('\n') + 1)
    const servable = banner.startsWith('/*!') && published.slice(banner.length) === fullCss && !problems.length
    const offset = banner.length
    const locate = (text: string, from = 0): Fragment => {
        const at = fullCss.indexOf(text, from)
        if (at < 0) throw new Error('A fragment is missing from the full compile')
        return { range: [offset + at, offset + at + text.length], bytes: bytes(text) }
    }

    /* The theme as fragments of the published file. */
    const layerAt = fullCss.indexOf('@layer theme{', head.length)
    const fullRules = fullTheme.rules
    const before = fullRules.slice(0, fullTheme.at < 0 ? fullRules.length : fullTheme.at).join('')
    const after = fullTheme.at < 0 ? '' : fullRules.slice(fullTheme.at + 1).join('')
    const variablesRule = fullTheme.at < 0 ? '' : fullRules[fullTheme.at]
    const variablesAt = fullCss.indexOf(variablesRule, layerAt)
    let cursor = variablesAt + fullTheme.variablesPrelude.length
    const variableFragments = fullTheme.variables.map(variable => {
        const fragment = locate(variable, cursor)
        cursor = fragment.range[1] - offset
        return fragment
    })
    const keyframesFrom = fullCss.indexOf(fullTheme.keyframes[0] ?? '\n', variablesAt)
    let keyframeCursor = keyframesFrom
    const keyframeFragments = fullTheme.keyframes.map(keyframe => {
        const fragment = locate(keyframe, keyframeCursor)
        keyframeCursor = fragment.range[1] - offset
        return fragment
    })
    const rulesAt = fullCss.length - full.rules.length
    let rulesCursor = rulesAt + themeOnly.rules.length
    const units: CostUnit[] = singles.map(single => {
        const start = rulesCursor
        rulesCursor += single.rules.length
        return {
            name: single.contract.name,
            title: single.contract.title,
            category: single.contract.category,
            tier: single.contract.tier,
            composes: single.contract.composes ?? [],
            script: single.contract.script,
            behavior: single.contract.behavior,
            rules: [offset + start, offset + rulesCursor],
            bytes: bytes(single.rules),
            variables: single.variables,
            keyframes: single.keyframes,
        }
    })
    if (rulesCursor !== fullCss.length) problems.push('the rules do not end where the file does')

    const theme: ThemeFragments = {
        head: locate(head),
        /** The layer up to where the preset variables go, and from there to its end. */
        before: locate(`@layer theme{${before}`, head.length),
        after: locate(`${after}}`, variablesAt),
        variablesPrelude: { range: [offset + variablesAt, offset + variablesAt + fullTheme.variablesPrelude.length] as [number, number], bytes: bytes(fullTheme.variablesPrelude) },
        variables: variableFragments,
        keyframes: keyframeFragments,
        /** The line break between the layer and the rules, and the theme's own compiled rules. */
        rules: { range: [offset + rulesAt - 1, offset + rulesAt + themeOnly.rules.length] as [number, number], bytes: bytes(`\n${themeOnly.rules}`) },
    }

    /* The page cuts selections from the published file; each stylesheet alone and the whole library must come out whole. */
    if (servable) {
        const cut = (names: string[]) => {
            const list = fragments(theme, closureOf(units, names))
            return { css: write(published, list), bytes: compiledBytes(list) }
        }
        for (const single of singles) {
            const { css, bytes: size } = cut([single.contract.name])
            const expected = closureOf(units, [single.contract.name]).length === 1 ? single.css : assemble(closure([single.contract.name]))
            if (css !== expected || size !== bytes(expected)) problems.push(`${single.contract.name}: cut from the published file, it differs`)
        }
        const all = cut(units.map(unit => unit.name))
        if (all.css !== fullCss || all.bytes !== bytes(fullCss)) problems.push('the whole library, cut from the published file, differs')
        const chosen = cut(defaultSelection)
        if (chosen.css !== assemble(closure(defaultSelection))) problems.push('the default selection, cut from the published file, differs')
    }

    /* Behaviors: each module minified as its own file, imports kept, so a module two behaviors share counts once. */
    const behaviorFiles = readdirSync(join(uiRoot, 'behaviors')).filter(file => file.endsWith('.js') && file !== 'index.js').sort()
    const behaviors: Behavior[] = behaviorFiles.map(file => {
        const source = read(`behaviors/${file}`)
        const code = transformSync(source, { loader: 'js', format: 'esm', minify: true, target: 'es2022' }).code
        return {
            name: file.replace(/\.js$/, ''),
            raw: bytes(code),
            gzip: gzip(code),
            imports: [...source.matchAll(/from\s+['"]\.\/([a-z-]+)\.js['"]/g)].map(match => match[1]),
        }
    })

    /* Exact figures for what the page shows before any script runs. */
    const selectionCss = exactCss(defaultSelection)
    /* The library as every selection is cut from it: the compile without the published file's banner, so all of it is 100%. */
    const libraryRaw = bytes(fullCss)
    const ordered = [...catalog.map(entry => entry.slug).filter(slug => units.some(unit => unit.name === slug)), ...units.map(unit => unit.name).filter(name => !catalog.some(entry => entry.slug === name))]
    const categories: string[] = []
    for (const name of ordered) {
        const category = units.find(unit => unit.name === name)!.category
        if (!categories.includes(category)) categories.push(category)
    }

    return {
        exact: !problems.length,
        problems,
        /** The published file the page gzips selections from, and whether it matches this compile. */
        file: { url: '/standalone.css', length: published.length, servable: servable && !problems.length },
        theme,
        units,
        order: ordered,
        categories,
        behaviors,
        defaultSelection,
        selection: { names: [...selectionCss.needed], raw: bytes(selectionCss.css), gzip: gzip(selectionCss.css) },
        library: { raw: libraryRaw, gzip: gzip(fullCss), minified: minifiedGzip(fullCss), count: units.length },
        base: { raw: bytes(read('dist/base.css')), gzip: gzip(read('dist/base.css')) },
    }
}

/** The whole library through a minifier, for one sentence: what a bundler takes off. */
function minifiedGzip(css: string) {
    const code = transformSync(css, { loader: 'css', minify: true }).code
    return { raw: bytes(code), gzip: gzip(code), minifier: `esbuild ${(require('esbuild/package.json') as { version: string }).version}` }
}

/** A settings page: the components most products start from. */
export const defaultSelection = ['button', 'card', 'input', 'select', 'checkbox', 'switch', 'dialog', 'tabs', 'tooltip', 'badge']
