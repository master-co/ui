import defaultSource from '@master/ui/theme.css?raw'
import paperSource from '@master/ui/themes/paper.css?raw'

/*
 * Reads the two published themes at build time, so the homepage draws Paper from its own file instead of a
 * copy that could drift.
 */

interface Block { prelude: string, body: string }

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/** The top-level blocks of a stylesheet: each prelude and the text between its braces. */
function blocks(css: string): Block[] {
    const found: Block[] = []
    let depth = 0
    let start = 0
    let open = 0
    for (let index = 0; index < css.length; index++) {
        const character = css[index]
        if (character === '{') {
            if (depth === 0) open = index
            depth++
        } else if (character === '}') {
            depth--
            if (depth === 0) {
                found.push({ prelude: css.slice(start, open).trim(), body: css.slice(open + 1, index) })
                start = index + 1
            }
        } else if (character === ';' && depth === 0) {
            start = index + 1
        }
    }
    return found
}

/** The custom properties declared directly in a block body, in source order. */
function declarations(body: string): [string, string][] {
    return body.split(';')
        .map(declaration => declaration.trim())
        .filter(declaration => declaration.startsWith('--'))
        .map(declaration => {
            const colon = declaration.indexOf(':')
            return [declaration.slice(0, colon).trim(), declaration.slice(colon + 1).replace(/\s+/g, ' ').trim()]
        })
}

function parse(source: string) {
    const top = blocks(stripComments(source))
    const theme = declarations(top.filter(block => block.prelude === '@theme').map(block => block.body).join(';'))
    const layer = top.filter(block => block.prelude === '@layer theme').map(block => block.body).join('\n')
    return { theme, layer }
}

const moonstone = parse(defaultSource)
const paper = parse(paperSource)

/**
 * Paper's tokens scoped to one selector instead of the root. A custom property that reads another is resolved
 * where it is declared, so the default theme's derived tokens (`--color-line-subtle: var(--color-line-hair)`,
 * the texture ink) are declared again in the scope and read Paper's values there. The mixins Paper redefines
 * (the toned control) are compiled into components and cannot be scoped; the figure uses no toned control.
 */
export function paperScope(selector: string) {
    const derived = moonstone.theme.filter(([, value]) => value.includes('var('))
    const body = [...derived, ...paper.theme].map(([name, value]) => `${name}:${value}`).join(';')
    const layer = paper.layer.replace(/:root\s*,\s*:host/g, selector).replace(/\s+/g, ' ').trim()
    return `${selector}{${body}}${layer}`
}
