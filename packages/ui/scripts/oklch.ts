/*
 * OKLCH arithmetic for the scripts and tests that reason about the theme's colors: conversion to sRGB, whether a
 * color is in the sRGB gamut, WCAG 2 contrast and compositing a translucent color over an opaque one.
 */
export type Oklch = { l: number, c: number, h: number, alpha?: number }
export type Rgb = [number, number, number]

const radians = Math.PI / 180

/** Linear-light sRGB, which may fall outside 0–1 when the color is outside the gamut. */
export function linear({ l, c, h }: Oklch): Rgb {
  const a = c * Math.cos(h * radians)
  const b = c * Math.sin(h * radians)
  const lp = (l + .3963377774 * a + .2158037573 * b) ** 3
  const mp = (l - .1055613458 * a - .0638541728 * b) ** 3
  const sp = (l - .0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * lp - 3.3077115913 * mp + .2309699292 * sp,
    -1.2684380046 * lp + 2.6097574011 * mp - .3413193965 * sp,
    -.0041960863 * lp - .7034186147 * mp + 1.707614701 * sp,
  ]
}

export function inGamut(color: Oklch) {
  return linear(color).every(channel => channel >= -.0001 && channel <= 1.0001)
}

/** The largest chroma at this lightness and hue that sRGB can show. */
export function maxChroma(l: number, h: number) {
  let low = 0
  let high = .4
  for (let step = 0; step < 24; step++) {
    const mid = (low + high) / 2
    if (inGamut({ l, c: mid, h })) low = mid
    else high = mid
  }
  return low
}

const clamp = (value: number) => Math.min(1, Math.max(0, value))
const encode = (value: number) => value <= .0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - .055
const decode = (value: number) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4

/** Gamma-encoded sRGB, clipped to the gamut. */
export function srgb(color: Oklch): Rgb {
  return linear(color).map(channel => encode(clamp(channel))) as Rgb
}

/** Paints a translucent color over an opaque one, in gamma-encoded sRGB as browsers composite. */
export function over(top: Oklch, bottom: Rgb): Rgb {
  const alpha = top.alpha ?? 1
  const color = srgb(top)
  return color.map((channel, index) => channel * alpha + bottom[index] * (1 - alpha)) as Rgb
}

export function luminance([r, g, b]: Rgb) {
  return .2126 * decode(r) + .7152 * decode(g) + .0722 * decode(b)
}

export function contrast(first: Rgb, second: Rgb) {
  const [high, low] = [luminance(first), luminance(second)].sort((x, y) => y - x)
  return (high + .05) / (low + .05)
}

/** Reads `oklch(L% C H / A)` as written in the theme. A hue of `none` is 0. */
export function parse(text: string): Oklch {
  const match = text.trim().match(/^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+|none)\s*(?:\/\s*([\d.]+))?\s*\)$/)
  if (!match) throw new Error(`Not an oklch() color: ${text}`)
  const [, l, c, h, alpha] = match
  return { l: Number(l) / 100, c: Number(c), h: h === 'none' ? 0 : Number(h), alpha: alpha === undefined ? 1 : Number(alpha) }
}

export function format({ l, c, h, alpha = 1 }: Oklch) {
  const round = (value: number, digits: number) => Number(value.toFixed(digits)).toString().replace(/^0\./, '.')
  const body = c < .0005 ? `${round(l * 100, 1)}% 0 none` : `${round(l * 100, 1)}% ${round(c, 4)} ${round(h, 1)}`
  return alpha < 1 ? `oklch(${body} / ${round(alpha, 2)})` : `oklch(${body})`
}

/** Splits `light-dark(a, b)` into its two colors; a single color is both. */
export function schemes(value: string): [string, string] {
  const match = value.trim().match(/^light-dark\((oklch\([^)]*\)),\s*(oklch\([^)]*\))\)$/)
  return match ? [match[1], match[2]] : [value.trim(), value.trim()]
}
