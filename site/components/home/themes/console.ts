/*
 * The customization console's state, its presets and the code it prints. Shared by the server render (the
 * first picture, without script) and the client script, so both print the same code.
 */

export type Theme = 'default' | 'paper'
export type Shape = 'squircle' | 'round'
export type Size = 'sm' | 'md' | 'lg'

export interface Setting {
    theme: Theme
    shape: Shape
    scale: number
    size: Size
}

/** The corners each theme sets itself: theme.css draws squircles where the browser can, paper.css circles. */
export const themeCorners = (theme: Theme, squircle: boolean): Pick<Setting, 'shape' | 'scale'> =>
    theme === 'default' && squircle ? { shape: 'squircle', scale: 1.6 } : { shape: 'round', scale: 1 }

export interface Preset {
    id: string
    label: string
    setting: (squircle: boolean) => Setting
}

export const presets: Preset[] = [
    { id: 'soft', label: 'Soft', setting: squircle => ({ theme: 'default', ...themeCorners('default', squircle), size: 'md' }) },
    { id: 'hard', label: 'Hard edge', setting: () => ({ theme: 'default', shape: 'round', scale: 0, size: 'sm' }) },
    { id: 'round', label: 'Round', setting: () => ({ theme: 'default', shape: 'round', scale: 2, size: 'lg' }) },
    { id: 'paper', label: 'Paper', setting: () => ({ theme: 'paper', ...themeCorners('paper', false), size: 'md' }) },
]

export const sizes: { id: Size, label: string, modifier: string }[] = [
    { id: 'sm', label: '32', modifier: '-sm' },
    { id: 'md', label: '38', modifier: '' },
    { id: 'lg', label: '44', modifier: '-lg' },
]

/** The size modifiers the console swaps, per component root. */
export const sized = ['btn', 'input', 'segmented', 'switch'] as const

export const same = (a: Setting, b: Setting) =>
    a.theme === b.theme && a.shape === b.shape && Math.abs(a.scale - b.scale) < 0.001 && a.size === b.size

export const formatScale = (scale: number) => String(Math.round(scale * 10) / 10)

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * The setting as code a reader can copy: the imports, the two corner properties on :root when they differ from
 * the theme's own (an unlayered rule, so it wins over the theme's layer, as /guide/theming shows), and one
 * control with its size modifier.
 * Returned as HTML with a span per role, for the quiet highlighting the figure uses.
 */
export function code(setting: Setting, squircle: boolean) {
    const comment = (text: string) => `<span class="c">${escape(text)}</span>`
    const property = (name: string, value: string) => `  <span class="p">${name}</span>: <span class="v">${value}</span>;`
    const at = (path: string) => `<span class="k">@import</span> <span class="s">'${path}'</span>;`
    const size = sizes.find(entry => entry.id === setting.size)!
    const lines = [
        comment('/* app.css */'),
        at('@master/css'),
        at('@master/ui'),
        ...(setting.theme === 'paper' ? [at('@master/ui/themes/paper.css')] : []),
        '',
        ...(same(setting, { ...setting, ...themeCorners(setting.theme, squircle) })
            ? [comment('/* corners: as the theme sets them */')]
            : ['<span class="t">:root</span> {', property('--corner-shape', setting.shape), property('--corner-scale', formatScale(setting.scale)), '}']),
        '',
        comment(`<!-- ${size.label}px controls -->`),
        `${escape('<button class="')}<span class="s">btn${size.modifier ? ` btn${size.modifier}` : ''}</span>${escape('">')}Deploy${escape('</button>')}`,
    ]
    return lines.join('\n')
}
