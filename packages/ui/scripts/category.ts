/*
 * Writes the category colors in theme.css from the named palettes of the Master CSS preset.
 *
 *   node --import tsx scripts/category.ts           prints the block
 *   node --import tsx scripts/category.ts --write   replaces it in theme.css
 *
 * Each palette gives four roles: a surface, the text on it, a decorative line and a mark (a dot, a bar). A role
 * is not a palette step: every hue is placed at one lightness per role, so a blue and a yellow badge weigh the
 * same. All four keep the palette's own hue, the hue of its middle step, so red, orange and brown stay apart;
 * only the dark colors of a yellow (its text on moonstone, its surface on obsidian) lean toward amber, as the
 * preset's own darker steps do, instead of turning olive. Chroma is the palette's at that lightness, within the sRGB gamut. The lightness then moves only as far
 * as contrast requires: text 4.5:1 and a mark 3:1, against the role's surface and the theme's base and raised faces.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { contrast, format, maxChroma, srgb, type Oklch } from './oklch.ts'

export const categories = ['stone', 'gray', 'zinc', 'neutral', 'slate', 'brown', 'orange', 'amber', 'yellow', 'lime', 'green', 'beryl', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'crimson', 'red'] as const

type Step = { l: number, c: number, h: number }

function palettes() {
  const require = createRequire(import.meta.url)
  const preset = dirname(dirname(require.resolve('@master/css-preset/theme.css')))
  const source = readFileSync(join(preset, 'src/colors.css'), 'utf8')
  const found = new Map<string, Step[]>()
  for (const [, name, l, c, h] of source.matchAll(/--color-([a-z]+)-\d+:\s*oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+|none)/g)) {
    const steps = found.get(name) ?? []
    steps.push({ l: Number(l) / 100, c: Number(c), h: h === 'none' ? 0 : Number(h) })
    found.set(name, steps)
  }
  return found
}

/** The palette's hue and chroma at a lightness, between its two nearest steps. */
function at(steps: Step[], l: number) {
  const sorted = [...steps].sort((a, b) => b.l - a.l)
  if (l >= sorted[0].l) return sorted[0]
  for (let index = 1; index < sorted.length; index++) {
    const upper = sorted[index - 1]
    const lower = sorted[index]
    if (l >= lower.l) {
      const t = (upper.l - l) / (upper.l - lower.l)
      let delta = lower.h - upper.h
      if (delta > 180) delta -= 360
      if (delta < -180) delta += 360
      return { l, c: upper.c + (lower.c - upper.c) * t, h: (upper.h + delta * t + 360) % 360 }
    }
  }
  return sorted.at(-1)!
}

/** Moonstone and Obsidian: the faces a category stands on. */
const faces = {
  light: [{ l: .986, c: .0008, h: 265 }, { l: 1, c: 0, h: 0 }, { l: .96, c: .0012, h: 265 }],
  dark: [{ l: .194, c: .0019, h: 265 }, { l: .242, c: .0022, h: 265 }, { l: .174, c: .0018, h: 265 }],
}

const roles = {
  light: { surface: .962, text: .47, mark: .66, surfaceChroma: .036, textChroma: .15, markChroma: .2, lineAlpha: .3 },
  dark: { surface: .275, text: .865, mark: .75, surfaceChroma: .05, textChroma: .1, markChroma: .17, lineAlpha: .3 },
} as const

/** The palette's own hue: its middle step's. */
function identity(steps: Step[]) {
  return at(steps, [...steps].sort((a, b) => b.l - a.l)[Math.floor(steps.length / 2)].l).h
}

/** How far a dark color of a yellow leans toward the hue the palette itself darkens to. */
function lean(steps: Step[], l: number) {
  const hue = identity(steps)
  if (hue < 60 || hue > 130) return hue
  let delta = at(steps, l).h - hue
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  return hue + Math.max(-25, Math.min(25, delta)) * .6
}

function color(steps: Step[], l: number, cap: number, share: number, hue = identity(steps)): Oklch {
  const { c } = at(steps, l)
  return { l, h: hue, c: Math.min(c * share, cap, maxChroma(l, hue) * .96) }
}

function category(steps: Step[], scheme: 'light' | 'dark') {
  const role = roles[scheme]
  const peak = Math.max(...steps.map(step => step.c))
  const direction = scheme === 'light' ? -1 : 1
  const surfaceHue = scheme === 'dark' ? lean(steps, role.surface) : identity(steps)
  const surface: Oklch = { l: role.surface, h: surfaceHue, c: Math.min(role.surfaceChroma, peak * .18, maxChroma(role.surface, surfaceHue) * .9) }
  const grounds = [surface, ...faces[scheme]].map(face => srgb(face))
  const reach = (start: number, cap: number, share: number, ratio: number, leaning = false) => {
    let l = start
    const make = () => color(steps, l, cap, share, leaning ? lean(steps, l) : identity(steps))
    let found = make()
    while (grounds.some(ground => contrast(srgb(found), ground) < ratio) && l > .05 && l < .99) {
      l += direction * .0025
      found = make()
    }
    return found
  }
  const text = reach(role.text, role.textChroma, scheme === 'light' ? .8 : .9, 4.6, scheme === 'light')
  const mark = reach(role.mark, role.markChroma, 1, 3.1)
  const line = { ...color(steps, scheme === 'light' ? .55 : .8, role.markChroma, .9), alpha: role.lineAlpha }
  return { surface, text, line, mark }
}

export function block() {
  const found = palettes()
  const lines = [
    '  /* category:start (written by scripts/category.ts) */',
  ]
  for (const name of categories) {
    const steps = found.get(name)
    if (!steps) throw new Error(`The preset has no ${name} palette`)
    const light = category(steps, 'light')
    const dark = category(steps, 'dark')
    for (const role of ['surface', 'text', 'line', 'mark'] as const) {
      lines.push(`  --color-category-${name}-${role}: light-dark(${format(light[role])}, ${format(dark[role])});`)
    }
  }
  lines.push('  /* category:end */')
  return lines.join('\n')
}

if (import.meta.main ?? process.argv[1]?.endsWith('category.ts')) {
  const text = block()
  if (process.argv.includes('--write')) {
    const file = new URL('../theme.css', import.meta.url)
    const theme = readFileSync(file, 'utf8')
    const pattern = / {2}\/\* category:start[\s\S]*?category:end \*\//
    if (!pattern.test(theme)) throw new Error('theme.css has no category block to replace')
    writeFileSync(file, theme.replace(pattern, text))
  } else {
    console.log(text)
  }
}
