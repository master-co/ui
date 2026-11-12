import defaultSource from '@master/ui/theme.css?raw'

/*
 * The Customize section's four styles. Each is a theme file of tokens and nothing else: the same file is printed
 * in the section's code panel and scoped to that style's picture of the composition, so what is shown is what the
 * code does. A style that sets no value for a token keeps the default theme's.
 */

export type StyleId = 'editorial' | 'technical' | 'soft' | 'bold'

export interface Style {
    id: StyleId
    name: string
    /** What sets the style apart, in a few words. */
    summary: string
    /** The cover's text alternative. */
    alt: string
    groups: { label: string, tokens: [string, string][] }[]
    /** Corners drawn as circles everywhere, in place of the default theme's squircles. */
    circular?: boolean
}

const none = '0 0 0 0 transparent'
const flatLight: [string, string][] = [
    ['--color-highlight', 'transparent'],
    ['--color-lip', 'transparent'],
    ['--color-shade-1', 'transparent'],
    ['--color-shade-2', 'transparent'],
    ['--color-shade-3', 'transparent'],
    ['--color-shade-4', 'transparent'],
    ['--color-shade-5', 'transparent'],
]

export const styles: Style[] = [
    {
        id: 'editorial',
        name: 'Editorial',
        summary: 'Serif type, ruled edges, no shadow',
        alt: 'An engraving of the lake under a red sun, hatched in ink on cream paper',
        circular: true,
        groups: [
            {
                label: 'Type',
                tokens: [
                    ['--font-sans', "'Iowan Old Style', Charter, Georgia, serif"],
                    ['--font-weight-control', '400'],
                ],
            },
            {
                label: 'Shape: tight corners, and nothing travels',
                tokens: [
                    ['--radius-chip', '.125rem'],
                    ['--radius-control-sm', '.125rem'],
                    ['--radius-control', '.1875rem'],
                    ['--radius-control-lg', '.25rem'],
                    ['--radius-surface', '.25rem'],
                    ['--lift', '0px'],
                ],
            },
            {
                label: 'Surfaces: cream paper, and newsprint at night',
                tokens: [
                    ['--color-surface-base', 'light-dark(oklch(96.4% .014 84), oklch(19.5% .008 70))'],
                    ['--color-surface-raised', 'light-dark(oklch(98.6% .009 86), oklch(22.5% .009 70))'],
                    ['--color-surface-raised-low', 'var(--color-surface-raised)'],
                    ['--color-surface-inset', 'light-dark(oklch(94.4% .016 84), oklch(17% .008 70))'],
                    ['--color-surface-inset-hover', 'light-dark(oklch(92.8% .018 84), oklch(15.8% .008 70))'],
                    ['--color-surface-chip', 'light-dark(oklch(93.4% .017 84), oklch(100% 0 none / .07))'],
                    ['--color-surface-inverse', 'light-dark(oklch(44% .15 27), oklch(68% .14 30))'],
                ],
            },
            {
                label: 'Lines carry every edge',
                tokens: [
                    ['--color-line-hair', 'light-dark(oklch(25% .02 60 / .14), oklch(95% .02 84 / .13))'],
                    ['--color-line-contour', 'light-dark(oklch(25% .02 60 / .3), oklch(95% .02 84 / .26))'],
                    ['--color-line-divider', 'light-dark(oklch(25% .02 60 / .22), oklch(95% .02 84 / .2))'],
                    ['--color-line-strong', 'light-dark(oklch(25% .02 60 / .5), oklch(95% .02 84 / .44))'],
                    ['--color-line-mark', 'light-dark(oklch(25% .02 60 / .75), oklch(95% .02 84 / .66))'],
                ],
            },
            {
                label: 'Ink: warm black, and an oxblood accent',
                tokens: [
                    ['--color-text-strong', 'light-dark(oklch(21% .014 55), oklch(94% .014 84))'],
                    ['--color-text-body', 'light-dark(oklch(33% .016 55), oklch(84% .014 84))'],
                    ['--color-text-muted', 'light-dark(oklch(46% .018 60), oklch(71% .014 80))'],
                    ['--color-text-inverse', 'light-dark(oklch(97.5% .01 84), oklch(18% .01 40))'],
                    ['--color-focus', 'var(--color-text-strong)'],
                    ['--color-ink-high', 'var(--color-surface-inverse)'],
                    ['--color-ink-low', 'var(--color-surface-inverse)'],
                    ['--color-ink-high-hover', 'light-dark(oklch(49% .16 27), oklch(73% .13 30))'],
                    ['--color-ink-low-hover', 'var(--color-ink-high-hover)'],
                    ['--color-ink-pressed', 'light-dark(oklch(39% .14 27), oklch(62% .14 30))'],
                    ['--color-ink-highlight', 'transparent'],
                    ['--color-ink-edge', 'transparent'],
                ],
            },
            {
                label: 'Depth: a rule, not a shadow',
                tokens: [
                    ...flatLight,
                    ['--shadow-pressed', 'inset 0 0 0 1px var(--color-line-contour)'],
                    ['--shadow-flat', '0 0 0 1px var(--color-line-contour)'],
                    ['--shadow-raised', '0 0 0 1px var(--color-line-strong)'],
                    ['--shadow-raised-hover', '0 0 0 1px var(--color-line-mark)'],
                    ['--shadow-lifted', '0 0 0 1px var(--color-line-contour)'],
                    ['--shadow-ink', none],
                    ['--shadow-ink-hover', none],
                    ['--shadow-ink-pressed', none],
                    ['--shadow-ink-well', none],
                    ['--shadow-thumb-on-ink', none],
                ],
            },
        ],
    },
    {
        id: 'technical',
        name: 'Technical',
        summary: 'Monospace, square corners, 1px lines',
        alt: 'A survey drawing of the lake loop in cyan ridgelines on navy, its three stops marked in amber',
        groups: [
            {
                label: 'Type: load the font before selecting it',
                tokens: [
                    ['--font-sans', "'IBM Plex Mono', ui-monospace, monospace"],
                    ['--font-weight-control', '500'],
                ],
            },
            {
                label: 'Shape: square, and nothing travels',
                tokens: [
                    ['--radius-chip', '0'],
                    ['--radius-control-sm', '0'],
                    ['--radius-control', '0'],
                    ['--radius-control-lg', '0'],
                    ['--radius-surface', '0'],
                    ['--lift', '0px'],
                ],
            },
            {
                label: 'Surfaces: drafting film, and a navy console',
                tokens: [
                    ['--color-surface-base', 'light-dark(oklch(96.8% .005 240), oklch(17.5% .014 250))'],
                    ['--color-surface-raised', 'light-dark(oklch(99.5% .002 240), oklch(21% .016 250))'],
                    ['--color-surface-raised-low', 'var(--color-surface-raised)'],
                    ['--color-surface-inset', 'light-dark(oklch(95% .006 240), oklch(15% .014 250))'],
                    ['--color-surface-inset-hover', 'light-dark(oklch(93.5% .007 240), oklch(13.8% .014 250))'],
                    ['--color-surface-chip', 'light-dark(oklch(94% .008 240), oklch(100% 0 none / .07))'],
                    ['--color-surface-inverse', 'light-dark(oklch(52% .2 258), oklch(76% .13 236))'],
                ],
            },
            {
                label: 'Lines: crisp, and a step cooler',
                tokens: [
                    ['--color-line-hair', 'light-dark(oklch(30% .03 250 / .12), oklch(85% .05 240 / .12))'],
                    ['--color-line-contour', 'light-dark(oklch(30% .03 250 / .26), oklch(85% .05 240 / .24))'],
                    ['--color-line-divider', 'light-dark(oklch(30% .03 250 / .18), oklch(85% .05 240 / .17))'],
                    ['--color-line-strong', 'light-dark(oklch(30% .03 250 / .42), oklch(85% .05 240 / .38))'],
                    ['--color-line-mark', 'light-dark(oklch(30% .03 250 / .62), oklch(85% .05 240 / .6))'],
                ],
            },
            {
                label: 'Ink: cobalt for what is on',
                tokens: [
                    ['--color-text-strong', 'light-dark(oklch(20% .02 255), oklch(95% .01 240))'],
                    ['--color-text-body', 'light-dark(oklch(35% .02 255), oklch(82% .015 240))'],
                    ['--color-text-muted', 'light-dark(oklch(49% .02 250), oklch(69% .02 240))'],
                    ['--color-text-inverse', 'light-dark(oklch(99% 0 none), oklch(16% .02 250))'],
                    ['--color-focus', 'var(--color-surface-inverse)'],
                    ['--color-ink-high', 'var(--color-surface-inverse)'],
                    ['--color-ink-low', 'var(--color-surface-inverse)'],
                    ['--color-ink-high-hover', 'light-dark(oklch(57% .2 258), oklch(81% .11 236))'],
                    ['--color-ink-low-hover', 'var(--color-ink-high-hover)'],
                    ['--color-ink-pressed', 'light-dark(oklch(46% .19 258), oklch(70% .13 236))'],
                    ['--color-ink-highlight', 'transparent'],
                    ['--color-ink-edge', 'transparent'],
                    ['--color-thumb-on-high', 'light-dark(oklch(100% 0 none), oklch(16% .02 250))'],
                    ['--color-thumb-on-low', 'var(--color-thumb-on-high)'],
                ],
            },
            {
                label: 'Depth: one 1px line',
                tokens: [
                    ...flatLight,
                    ['--shadow-pressed', 'inset 0 0 0 1px var(--color-line-contour)'],
                    ['--shadow-flat', '0 0 0 1px var(--color-line-contour)'],
                    ['--shadow-raised', '0 0 0 1px var(--color-line-strong)'],
                    ['--shadow-raised-hover', '0 0 0 1px var(--color-line-mark)'],
                    ['--shadow-lifted', '0 0 0 1px var(--color-line-strong)'],
                    ['--shadow-ink', none],
                    ['--shadow-ink-hover', none],
                    ['--shadow-ink-pressed', none],
                    ['--shadow-ink-well', none],
                    ['--shadow-thumb-on-ink', none],
                ],
            },
        ],
    },
    {
        id: 'soft',
        name: 'Soft',
        summary: 'Round corners, tinted light, diffuse depth',
        alt: 'A pastel morning on the lake, the boathouse and the summit fading into a lilac sky',
        groups: [
            {
                label: 'Type: the font you have, a step heavier',
                tokens: [
                    ['--font-weight-control', '520'],
                ],
            },
            {
                label: 'Shape: controls round off to pills',
                tokens: [
                    ['--radius-chip', '.75rem'],
                    ['--radius-control-sm', '1rem'],
                    ['--radius-control', '1.1875rem'],
                    ['--radius-control-lg', '1.375rem'],
                    ['--radius-surface', '1.75rem'],
                    ['--lift', '1px'],
                ],
            },
            {
                label: 'Surfaces: lavender, and plum at night',
                tokens: [
                    ['--color-surface-base', 'light-dark(oklch(96.6% .016 300), oklch(20.5% .03 295))'],
                    ['--color-surface-raised', 'light-dark(oklch(99.6% .004 300), oklch(27% .035 295))'],
                    ['--color-surface-raised-low', 'light-dark(oklch(98.2% .009 300), oklch(25% .034 295))'],
                    ['--color-surface-inset', 'light-dark(oklch(94.6% .02 300), oklch(18.5% .03 295))'],
                    ['--color-surface-inset-hover', 'light-dark(oklch(93.2% .024 300), oklch(17.2% .03 295))'],
                    ['--color-surface-chip', 'light-dark(oklch(94.4% .02 300), oklch(100% 0 none / .08))'],
                    ['--color-surface-inverse', 'light-dark(oklch(55% .19 292), oklch(80% .11 292))'],
                ],
            },
            {
                label: 'Lines: faint, and tinted',
                tokens: [
                    ['--color-line-hair', 'light-dark(oklch(35% .1 295 / .08), oklch(92% .05 295 / .09))'],
                    ['--color-line-contour', 'light-dark(oklch(35% .1 295 / .12), oklch(92% .05 295 / .14))'],
                    ['--color-line-divider', 'light-dark(oklch(35% .1 295 / .1), oklch(92% .05 295 / .12))'],
                    ['--color-line-strong', 'light-dark(oklch(35% .1 295 / .2), oklch(92% .05 295 / .22))'],
                    ['--color-line-mark', 'light-dark(oklch(35% .1 295 / .34), oklch(92% .05 295 / .36))'],
                ],
            },
            {
                label: 'Ink: violet for what is on',
                tokens: [
                    ['--color-text-strong', 'light-dark(oklch(25% .05 295), oklch(95% .02 300))'],
                    ['--color-text-body', 'light-dark(oklch(40% .05 295), oklch(84% .03 300))'],
                    ['--color-text-muted', 'light-dark(oklch(51% .05 295), oklch(73% .04 300))'],
                    ['--color-text-inverse', 'light-dark(oklch(99% .005 300), oklch(20% .04 295))'],
                    ['--color-focus', 'var(--color-surface-inverse)'],
                    ['--color-ink-high', 'light-dark(oklch(62% .18 292), oklch(86% .09 292))'],
                    ['--color-ink-low', 'light-dark(oklch(53% .2 290), oklch(77% .12 290))'],
                    ['--color-ink-high-hover', 'light-dark(oklch(66% .17 292), oklch(89% .08 292))'],
                    ['--color-ink-low-hover', 'light-dark(oklch(57% .19 290), oklch(81% .11 290))'],
                    ['--color-ink-pressed', 'light-dark(oklch(48% .19 290), oklch(72% .13 290))'],
                    ['--color-ink-edge', 'light-dark(oklch(46% .18 290), oklch(0% 0 none / .4))'],
                    ['--color-thumb-on-high', 'light-dark(oklch(100% 0 none), oklch(22% .04 295))'],
                    ['--color-thumb-on-low', 'light-dark(oklch(97% .01 300), oklch(20% .04 295))'],
                ],
            },
            {
                label: 'Depth: wide, tinted shade',
                tokens: [
                    ['--color-shade-1', 'light-dark(oklch(40% .12 295 / .07), oklch(5% .02 295 / .45))'],
                    ['--color-shade-2', 'light-dark(oklch(40% .12 295 / .07), oklch(5% .02 295 / .36))'],
                    ['--color-shade-3', 'light-dark(oklch(40% .12 295 / .08), oklch(5% .02 295 / .32))'],
                    ['--color-shade-4', 'light-dark(oklch(40% .12 295 / .1), oklch(5% .02 295 / .32))'],
                    ['--color-shade-5', 'light-dark(oklch(40% .12 295 / .14), oklch(5% .02 295 / .4))'],
                    ['--shadow-raised', 'inset 0 1px 0 var(--color-highlight), 0 0 0 .5px var(--color-line-contour), 0 2px 6px -2px var(--color-shade-1), 0 8px 18px -8px var(--color-shade-3)'],
                    ['--shadow-raised-hover', 'inset 0 1px 0 var(--color-highlight), 0 0 0 .5px var(--color-line-strong), 0 4px 10px -3px var(--color-shade-2), 0 14px 28px -10px var(--color-shade-4)'],
                    ['--shadow-lifted', 'inset 0 1px 0 var(--color-highlight), 0 0 0 .5px var(--color-line-contour), 0 6px 16px -6px var(--color-shade-2), 0 28px 60px -24px var(--color-shade-5)'],
                    ['--shadow-ink', 'inset 0 1px 0 oklch(100% 0 none / .3), 0 0 0 .5px var(--color-ink-edge), 0 6px 16px -6px light-dark(oklch(50% .2 290 / .55), oklch(0% 0 none / .5))'],
                    ['--shadow-ink-hover', 'inset 0 1px 0 oklch(100% 0 none / .34), 0 0 0 .5px var(--color-ink-edge), 0 10px 22px -8px light-dark(oklch(50% .2 290 / .6), oklch(0% 0 none / .55))'],
                ],
            },
        ],
    },
    {
        id: 'bold',
        name: 'Bold',
        summary: 'Heavy labels, thick outlines, offset shadows',
        alt: 'A screen print of the lake: a black summit, a striped yellow sun on red, a yellow boathouse on blue water',
        circular: true,
        groups: [
            {
                label: 'Type: the font you have, at its boldest',
                tokens: [
                    ['--font-weight-control', '700'],
                ],
            },
            {
                label: 'Shape: plain circular corners, and a long press',
                tokens: [
                    ['--radius-chip', '.25rem'],
                    ['--radius-control-sm', '.375rem'],
                    ['--radius-control', '.5rem'],
                    ['--radius-control-lg', '.625rem'],
                    ['--radius-surface', '.75rem'],
                    ['--lift', '2px'],
                ],
            },
            {
                label: 'Surfaces: butter and white, or black',
                tokens: [
                    ['--color-surface-base', 'light-dark(oklch(95.5% .04 92), oklch(16% .005 280))'],
                    ['--color-surface-raised', 'light-dark(oklch(100% 0 none), oklch(22% .006 280))'],
                    ['--color-surface-raised-low', 'var(--color-surface-raised)'],
                    ['--color-surface-inset', 'light-dark(oklch(93% .045 92), oklch(14% .005 280))'],
                    ['--color-surface-inset-hover', 'light-dark(oklch(90.5% .055 92), oklch(12% .005 280))'],
                    ['--color-surface-chip', 'light-dark(oklch(92% .05 92), oklch(100% 0 none / .1))'],
                    ['--color-surface-inverse', 'oklch(87% .175 95)'],
                ],
            },
            {
                label: 'Lines: solid ink, 2px wide',
                tokens: [
                    ['--color-line-hair', 'light-dark(oklch(15% 0 none / .2), oklch(96% .02 95 / .2))'],
                    ['--color-line-contour', 'light-dark(oklch(15% 0 none), oklch(96% .02 95))'],
                    ['--color-line-divider', 'light-dark(oklch(15% 0 none / .35), oklch(96% .02 95 / .3))'],
                    ['--color-line-strong', 'var(--color-line-contour)'],
                    ['--color-line-mark', 'var(--color-line-contour)'],
                ],
            },
            {
                label: 'Ink: yellow for what is on, in both schemes',
                tokens: [
                    ['--color-text-strong', 'light-dark(oklch(15% 0 none), oklch(97% .02 95))'],
                    ['--color-text-body', 'light-dark(oklch(22% 0 none), oklch(90% .02 95))'],
                    ['--color-text-muted', 'light-dark(oklch(38% .01 90), oklch(77% .02 95))'],
                    ['--color-text-inverse', 'oklch(15% 0 none)'],
                    ['--color-focus', 'light-dark(oklch(15% 0 none), oklch(87% .175 95))'],
                    ['--color-ink-high', 'var(--color-surface-inverse)'],
                    ['--color-ink-low', 'var(--color-surface-inverse)'],
                    ['--color-ink-high-hover', 'oklch(90% .16 95)'],
                    ['--color-ink-low-hover', 'var(--color-ink-high-hover)'],
                    ['--color-ink-pressed', 'oklch(81% .17 90)'],
                    ['--color-ink-highlight', 'transparent'],
                    ['--color-ink-edge', 'var(--color-line-contour)'],
                    ['--color-thumb-on-high', 'oklch(15% 0 none)'],
                    ['--color-thumb-on-low', 'oklch(15% 0 none)'],
                ],
            },
            {
                label: 'Depth: a hard shadow, offset',
                tokens: [
                    ...flatLight,
                    ['--shadow-pressed', 'inset 0 0 0 2px var(--color-line-contour)'],
                    ['--shadow-flat', '0 0 0 2px var(--color-line-contour)'],
                    ['--shadow-raised', '0 0 0 2px var(--color-line-contour), 3px 3px 0 2px var(--color-line-contour)'],
                    ['--shadow-raised-hover', '0 0 0 2px var(--color-line-contour), 5px 5px 0 2px var(--color-line-contour)'],
                    ['--shadow-lifted', '0 0 0 2px var(--color-line-contour), 6px 6px 0 2px var(--color-line-contour)'],
                    ['--shadow-ink', 'var(--shadow-raised)'],
                    ['--shadow-ink-hover', 'var(--shadow-raised-hover)'],
                    ['--shadow-ink-pressed', 'var(--shadow-pressed)'],
                    ['--shadow-ink-well', 'inset 0 0 0 2px var(--color-line-contour)'],
                    ['--shadow-thumb-on-ink', none],
                ],
            },
        ],
    },
]

/* -------------------------------------------------------------------------------------------------- */

/** The custom properties declared directly in the default theme's @theme blocks. */
function themeTokens(source: string): [string, string][] {
    const css = source.replace(/\/\*[\s\S]*?\*\//g, '')
    const found: [string, string][] = []
    for (const match of css.matchAll(/@theme\s*\{([^}]*)\}/g)) {
        for (const declaration of match[1].split(';')) {
            const text = declaration.trim()
            if (!text.startsWith('--')) continue
            const colon = text.indexOf(':')
            found.push([text.slice(0, colon).trim(), text.slice(colon + 1).replace(/\s+/g, ' ').trim()])
        }
    }
    return found
}

/*
 * A custom property that reads another is resolved where it is declared, at the root. Scoped to one element, the
 * default theme's derived tokens (a shadow that reads a line, a line that reads another) are declared again there,
 * so they read the style's values; so is the preset's font family, which reads --font-sans.
 */
const derived: [string, string][] = [
    ...themeTokens(defaultSource).filter(([, value]) => value.includes('var(')),
    ['--font-family-sans', "var(--font-sans, ui-sans-serif), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'"],
]

const corners: [string, string][] = [['--corner-shape', 'round'], ['--corner-scale', '1']]

/** Every style's tokens, each scoped to the elements of its class. */
export function scopedStyles(className: (id: StyleId) => string) {
    return styles.map(style => {
        const tokens = [...derived, ...style.groups.flatMap(group => group.tokens), ...(style.circular ? corners : [])]
        return `.${className(style.id)}{${tokens.map(([name, value]) => `${name}:${value}`).join(';')}}`
    }).join('\n')
}

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** The style as the theme file a reader would write, as HTML lines with a span per role. */
export function code(style: Style) {
    const comment = (text: string, indent = '') => `${indent}<span class="c">/* ${escape(text)} */</span>`
    const declaration = ([name, value]: [string, string]) => `  <span class="p">${name}</span>: <span class="v">${escape(value)}</span>;`
    const lines = [
        comment(`themes/${style.id}.css, imported after '@master/ui'`),
        '<span class="k">@theme</span> {',
        ...style.groups.flatMap((group, index) => [
            ...(index ? [''] : []),
            comment(group.label, '  '),
            ...group.tokens.map(declaration),
        ]),
        '}',
        ...(style.circular ? ['', comment('Circles in place of squircles'), '<span class="t">:root</span> {', ...corners.map(declaration), '}'] : []),
    ]
    return lines
}

/** How many tokens a style sets, for the file's caption. */
export const tokenCount = (style: Style) => style.groups.reduce((sum, group) => sum + group.tokens.length, 0) + (style.circular ? 2 : 0)
