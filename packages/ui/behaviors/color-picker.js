/**
 * Color picker: a color chosen on a field of lightness and chroma, a hue and an opacity, or typed.
 *
 * The picker holds one color in OKLCH and publishes it on the root as four numbers the stylesheet reads:
 * `--color-picker-lightness` (0 to 1), `--color-picker-chroma`, `--color-picker-hue` (degrees) and
 * `--color-picker-alpha` (0 to 1). The thumb of the field, `color-picker-thumb`, is a slider: its
 * `aria-valuenow` is the lightness in percent and its `aria-valuetext` names the lightness and the chroma.
 *
 * - A press on the field moves the thumb under the pointer and gives it focus; a drag keeps it there. Up and
 *   down make the color lighter and darker, left and right take chroma away and add it (mirrored right to
 *   left); Shift makes the step ten times larger, PageUp and PageDown move the lightness by 10%, Home and End
 *   take the chroma to none and to the end of the field, .37.
 * - The hue and the opacity are native range inputs, `color-picker-hue` (0 to 360) and `color-picker-alpha`
 *   (0 to 100). Without an opacity slider the color is opaque.
 * - The text field, `color-picker-text`, takes a color typed in hex, rgb() or oklch() as soon as it is one,
 *   and when it is committed writes it again in the format the select, `color-picker-format`, says: `hex`,
 *   `rgb` or `oklch`. Text that is not a color is put back.
 *
 * The thumb dispatches `input` while the color moves and `change` when a drag ends or a key moved it; the
 * native controls dispatch their own. The function it returns has a `value`: the color as text in the format
 * chosen. Set it, in any of the three, to choose a color and its format from outside; that dispatches nothing.
 *
 * A hex or rgb() value is fitted to sRGB the way CSS Color 4 fits a color to a screen: chroma is taken away
 * until the color is within a just noticeable difference of one the format can write. An oklch() value is
 * written as it is held.
 */
import { valued, write } from './internal.js'

/** @typedef {'hex' | 'rgb' | 'oklch'} ColorFormat */
/** @typedef {{ l: number, c: number, h: number, a: number }} Oklch */

/**
 * @typedef {object} ColorPickerOptions
 * @property {(lightness: number, chroma: number) => string} [valueText] What the thumb says it holds, from
 *   the lightness in percent and the chroma. `Lightness 62%, chroma 0.19` by default.
 */

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/** The chroma at the end of the field, as far as Display P3 reaches. The stylesheet's field ends there too. */
const reach = 0.37

/** @type {NonNullable<ColorPickerOptions['valueText']>} */
const describe = (lightness, chroma) => `Lightness ${lightness}%, chroma ${chroma}`

const clamp = (/** @type {number} */ value, low = 0, high = 1) => Math.min(high, Math.max(low, value))
/** A number with at most this many decimals, as it is written. */
const fixed = (/** @type {number} */ value, places = 0) => Number(value.toFixed(places))

/* Color. OKLab and its matrices are Björn Ottosson's; sRGB is the CSS one. */

const linear = (/** @type {number} */ value) => (Math.abs(value) <= 0.04045 ? value / 12.92 : Math.sign(value) * ((Math.abs(value) + 0.055) / 1.055) ** 2.4)
const gamma = (/** @type {number} */ value) => (Math.abs(value) <= 0.0031308 ? value * 12.92 : Math.sign(value) * (1.055 * Math.abs(value) ** (1 / 2.4) - 0.055))

/**
 * @param {number} l @param {number} c @param {number} h
 * @returns {[number, number, number]} OKLab.
 */
const lab = (l, c, h) => {
  const angle = (Number.isFinite(h) ? h : 0) * Math.PI / 180
  return [l, c * Math.cos(angle), c * Math.sin(angle)]
}

/**
 * sRGB from 0 to 1, before it is fitted: a channel may fall outside.
 * @param {[number, number, number]} oklab
 * @returns {[number, number, number]}
 */
const rgbOf = ([l, a, b]) => {
  const long = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const middle = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const short = (l - 0.0894841775 * a - 1.2914855480 * b) ** 3
  return [
    gamma(4.0767416621 * long - 3.3077115913 * middle + 0.2309699292 * short),
    gamma(-1.2684380046 * long + 2.6097574011 * middle - 0.3413193965 * short),
    gamma(-0.0041960863 * long - 0.7034186147 * middle + 1.7076147010 * short),
  ]
}

/**
 * @param {[number, number, number]} rgb sRGB from 0 to 1.
 * @returns {[number, number, number]} OKLab.
 */
const labOf = (rgb) => {
  const [r, g, b] = rgb.map(linear)
  const long = Math.cbrt(0.4122214708 * r + 0.5363031944 * g + 0.0514459929 * b)
  const middle = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const short = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * long + 0.7936177850 * middle - 0.0040720468 * short,
    1.9779984951 * long - 2.4285922050 * middle + 0.4505937099 * short,
    0.0259040371 * long + 0.7827717662 * middle - 0.8086757660 * short,
  ]
}

/** @param {[number, number, number]} one @param {[number, number, number]} other */
const distance = (one, other) => Math.hypot(one[0] - other[0], one[1] - other[1], one[2] - other[2])
/** @param {number[]} rgb */
const inside = (rgb) => rgb.every((channel) => channel >= -0.000001 && channel <= 1.000001)
/** @param {number[]} rgb @returns {[number, number, number]} */
const clip = (rgb) => /** @type {[number, number, number]} */ (rgb.map((channel) => clamp(channel)))

/**
 * A color in sRGB, from 0 to 1: fitted as CSS Color 4 fits a color to a screen, by taking chroma away until
 * clipping what is left changes it by less than a just noticeable difference.
 * @param {Oklch} color
 * @returns {[number, number, number]}
 */
function fit({ l, c, h }) {
  if (l >= 1) return [1, 1, 1]
  if (l <= 0) return [0, 0, 0]
  const exact = rgbOf(lab(l, c, h))
  if (inside(exact)) return clip(exact)
  const noticeable = 0.02
  const precision = 0.0001
  let clipped = clip(exact)
  if (distance(labOf(clipped), lab(l, c, h)) < noticeable) return clipped
  let low = 0
  let high = c
  let lowInside = true
  while (high - low > precision) {
    const chroma = (low + high) / 2
    const current = rgbOf(lab(l, chroma, h))
    if (lowInside && inside(current)) {
      low = chroma
      continue
    }
    clipped = clip(current)
    const off = distance(labOf(clipped), lab(l, chroma, h))
    if (off < noticeable) {
      if (noticeable - off < precision) return clipped
      lowInside = false
      low = chroma
    } else high = chroma
  }
  return clipped
}

/**
 * An OKLCH color from sRGB from 0 to 1. A grey has no hue: NaN.
 * @param {number[]} rgb
 * @param {number} a
 * @returns {Oklch}
 */
function fromRgb(rgb, a) {
  const [l, x, y] = labOf(/** @type {[number, number, number]} */ (rgb))
  const c = Math.hypot(x, y)
  return { l, c: c < 0.00005 ? 0 : c, h: c < 0.00005 ? NaN : (Math.atan2(y, x) * 180 / Math.PI + 360) % 360, a }
}

/** @param {string} text @param {number} whole What 100% stands for. */
const amount = (text, whole) => (text === 'none' ? 0 : text.endsWith('%') ? parseFloat(text) / 100 * whole : parseFloat(text))

/** @param {string} text */
const angle = (text) => {
  if (text === 'none') return NaN
  const value = parseFloat(text)
  const unit = text.replace(/^[-+\d.e]+/i, '').toLowerCase()
  const degrees = unit === 'turn' ? value * 360 : unit === 'rad' ? value * 180 / Math.PI : unit === 'grad' ? value * 0.9 : value
  return ((degrees % 360) + 360) % 360
}

/**
 * Read a color written in hex (with or without its #), rgb() or rgba(), or oklch(). A grey's hue is NaN.
 * @param {string} text
 * @returns {{ color: Oklch, format: ColorFormat } | undefined}
 */
function parse(text) {
  const written = String(text ?? '').trim().toLowerCase()
  const hex = /^#?([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/.exec(written)
  if (hex) {
    const digits = hex[1].length <= 4 ? [...hex[1]].map((digit) => digit + digit).join('') : hex[1]
    const bytes = digits.match(/../g)?.map((pair) => parseInt(pair, 16) / 255) ?? []
    return { color: fromRgb(bytes.slice(0, 3), bytes[3] ?? 1), format: 'hex' }
  }
  const call = /^(rgba?|oklch)\(\s*([^)]*)\)$/.exec(written)
  if (!call) return undefined
  const parts = call[2].split(/[\s,/]+/).filter(Boolean)
  if (parts.length < 3 || parts.length > 4) return undefined
  const valid = /^([-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?(%|deg|turn|rad|grad)?|none)$/
  if (!parts.every((part) => valid.test(part))) return undefined
  const alpha = parts[3] === undefined ? 1 : clamp(amount(parts[3], 1))
  if (call[1] === 'oklch') {
    return { color: { l: clamp(amount(parts[0], 1)), c: Math.max(0, amount(parts[1], 0.4)), h: angle(parts[2]), a: alpha }, format: 'oklch' }
  }
  const rgb = parts.slice(0, 3).map((part) => clamp(amount(part, 255) / 255))
  return { color: fromRgb(rgb, alpha), format: 'rgb' }
}

/**
 * Write a color in a format.
 * @param {Oklch} color
 * @param {ColorFormat} format
 */
function print(color, format) {
  const { l, c, h, a } = color
  const opacity = a < 1 ? ` / ${fixed(a * 100, 1)}%` : ''
  if (format === 'oklch') return `oklch(${fixed(l * 100, 1)}% ${fixed(c, 3)} ${fixed(Number.isFinite(h) ? h : 0, 1)}${opacity})`
  const bytes = fit(color).map((channel) => Math.round(channel * 255))
  if (format === 'rgb') return `rgb(${bytes.join(' ')}${opacity})`
  if (a < 1) bytes.push(Math.round(a * 255))
  return `#${bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

/**
 * What a picker holding a value shows, for a renderer that writes the first markup itself, such as a server:
 * the value as the picker writes it, its format, the four numbers, the custom properties the root carries,
 * and the thumb's value and words. Returns undefined for text that is not a color.
 * @param {string} value A color in hex, rgb() or oklch().
 * @param {ColorPickerOptions & { opaque?: boolean }} [options] `opaque`: the picker has no opacity slider.
 */
export function colorPickerState(value, { valueText = describe, opaque = false } = {}) {
  const read = parse(value)
  if (!read) return undefined
  const color = { ...read.color, h: Number.isFinite(read.color.h) ? read.color.h : 0, a: opaque ? 1 : read.color.a }
  return {
    value: print(color, read.format),
    format: read.format,
    lightness: color.l,
    chroma: color.c,
    hue: color.h,
    alpha: color.a,
    properties: properties(color),
    valueNow: fixed(color.l * 100, 1),
    valueText: valueText(fixed(color.l * 100, 1), fixed(color.c, 3)),
  }
}

/**
 * A color written again in a format, as the picker writes it: hex and rgb() fitted to sRGB, with the opacity.
 * Another pattern that holds colors, such as a gradient's stops, keeps them in this one form. Returns undefined
 * for text that is not a color.
 * @param {string} value A color in hex, rgb() or oklch().
 * @param {ColorFormat} format
 */
export function colorPickerFormat(value, format) {
  const read = parse(value)
  return read ? print(read.color, format) : undefined
}

/** @param {Oklch} color @returns {Record<string, string>} */
function properties(color) {
  return {
    '--color-picker-lightness': String(fixed(color.l, 4)),
    '--color-picker-chroma': String(fixed(color.c, 4)),
    '--color-picker-hue': String(fixed(color.h, 2)),
    '--color-picker-alpha': String(fixed(color.a, 3)),
  }
}

/**
 * @param {HTMLElement} root The element with the `color-picker` class.
 * @param {ColorPickerOptions} [options]
 * @returns {(() => void) & { value: string }} Removes everything the behavior added. Its `value` is the color
 *   as text, in the format chosen.
 */
export function colorPicker(root, { valueText = describe } = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)

  const part = (/** @type {string} */ name) => /** @type {HTMLElement | null} */ (root.querySelector(`.color-picker-${name}`))
  const thumb = () => part('thumb')
  const text = () => /** @type {HTMLInputElement | null} */ (part('text'))
  const select = () => /** @type {HTMLSelectElement | null} */ (part('format'))
  const range = (/** @type {string} */ name) => /** @type {HTMLInputElement | null} */ (part(name))
  const opaque = () => !range('alpha')
  const disabled = () => thumb()?.getAttribute('aria-disabled') === 'true'
  const rtl = () => getComputedStyle(root).direction === 'rtl'

  /** What the markup was written with: the text, or else the numbers on the root. */
  const written = parse(text()?.value ?? '')
  const style = (/** @type {string} */ name, /** @type {number} */ fallback) => {
    const value = parseFloat(root.style.getPropertyValue(`--color-picker-${name}`))
    return Number.isFinite(value) ? value : fallback
  }
  /** @type {Oklch} */
  let color = written
    ? { ...written.color, h: Number.isFinite(written.color.h) ? written.color.h : style('hue', 0) }
    : { l: style('lightness', 0), c: style('chroma', 0), h: style('hue', 0), a: style('alpha', 1) }
  if (opaque()) color.a = 1
  /** @type {ColorFormat} */
  let format = written?.format ?? /** @type {ColorFormat} */ (['hex', 'rgb', 'oklch'].includes(select()?.value ?? '') ? select()?.value : 'hex')

  /**
   * Take a color. A grey keeps the hue held, so the field does not turn when the color passes through grey.
   * @param {Oklch} next
   * @returns {boolean} Whether anything changed.
   */
  const take = (next) => {
    const adopted = { l: clamp(next.l), c: Math.max(0, next.c), h: Number.isFinite(next.h) ? next.h : color.h, a: opaque() ? 1 : clamp(next.a) }
    if (adopted.l === color.l && adopted.c === color.c && adopted.h === color.h && adopted.a === color.a) return false
    color = adopted
    return true
  }

  /**
   * Write the color everywhere it shows, except into the control that is giving it.
   * @param {Element | null} [from]
   */
  const paint = (from = null) => {
    for (const [name, value] of Object.entries(properties(color))) root.style.setProperty(name, value)
    const handle = thumb()
    if (handle) {
      handle.setAttribute('aria-valuemin', '0')
      handle.setAttribute('aria-valuemax', '100')
      handle.setAttribute('aria-valuenow', String(fixed(color.l * 100, 1)))
      handle.setAttribute('aria-valuetext', valueText(fixed(color.l * 100, 1), fixed(color.c, 3)))
    }
    const hue = range('hue')
    if (hue && hue !== from) write(hue, String(fixed(color.h, 2)))
    const alpha = range('alpha')
    if (alpha && alpha !== from) write(alpha, String(fixed(color.a * 100, 1)))
    const field = text()
    if (field && field !== from) write(field, print(color, format))
    const chooser = select()
    if (chooser && chooser.value !== format) chooser.value = format
  }

  const say = (/** @type {Element} */ target, /** @type {string} */ type) => target.dispatchEvent(new Event(type, { bubbles: true }))

  const detach = valued(
    () => controller.abort(),
    () => print(color, format),
    (next) => {
      const read = parse(String(next ?? ''))
      if (!read) return
      const moved = take(read.color)
      if (!moved && read.format === format) return
      format = read.format
      paint()
    },
  )

  paint()

  /* The field: a press puts the thumb under the pointer, a drag keeps it there. */

  /** The pointer that holds the field, and whether it has moved the color. */
  let held = /** @type {number | null} */ (null)
  let moved = false

  /** @param {PointerEvent} event @param {HTMLElement} area */
  const follow = (event, area) => {
    const box = area.getBoundingClientRect()
    const across = (rtl() ? box.right - event.clientX : event.clientX - box.left) / box.width
    const down = (event.clientY - box.top) / box.height
    if (!Number.isFinite(across) || !Number.isFinite(down)) return
    if (!take({ ...color, l: fixed(1 - clamp(down), 3), c: fixed(clamp(across) * reach, 3) })) return
    moved = true
    paint()
    const handle = thumb()
    if (handle) say(handle, 'input')
  }

  root.addEventListener('pointerdown', (event) => {
    const area = /** @type {HTMLElement | null} */ (/** @type {Element} */ (event.target).closest?.('.color-picker-area'))
    if (!area || !root.contains(area) || event.button !== 0 || disabled()) return
    event.preventDefault()
    held = event.pointerId
    moved = false
    // Capture keeps the moves coming when the pointer leaves the field. A scripted event has no pointer to capture.
    try { area.setPointerCapture(event.pointerId) } catch {}
    thumb()?.focus({ preventScroll: true })
    follow(event, area)
  }, { signal })

  root.addEventListener('pointermove', (event) => {
    if (event.pointerId !== held) return
    const area = part('area')
    if (area) follow(event, area)
  }, { signal })

  /** @param {PointerEvent} event */
  const release = (event) => {
    if (event.pointerId !== held) return
    held = null
    const handle = thumb()
    if (moved && handle) say(handle, 'change')
    moved = false
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) root.addEventListener(type, /** @type {EventListener} */ (release), { signal })

  root.addEventListener('keydown', (event) => {
    const handle = thumb()
    if (!handle || event.target !== handle || disabled() || event.ctrlKey || event.metaKey || event.altKey) return
    const lightness = event.shiftKey ? 0.1 : 0.01
    const chroma = (event.shiftKey ? 0.05 : 0.005) * (rtl() ? -1 : 1)
    const most = Math.max(reach, color.c)
    let { l, c } = color
    if (event.key === 'ArrowUp') l += lightness
    else if (event.key === 'ArrowDown') l -= lightness
    else if (event.key === 'ArrowRight') c += chroma
    else if (event.key === 'ArrowLeft') c -= chroma
    else if (event.key === 'PageUp') l += 0.1
    else if (event.key === 'PageDown') l -= 0.1
    else if (event.key === 'Home') c = 0
    else if (event.key === 'End') c = reach
    else return
    event.preventDefault()
    if (!take({ ...color, l: fixed(clamp(l), 3), c: fixed(clamp(c, 0, most), 3) })) return
    paint()
    say(handle, 'input')
    say(handle, 'change')
  }, { signal })

  /* The native controls. Heard first, as they reach the root, so whoever listens there reads the new value. */

  /** @param {HTMLSelectElement} chooser */
  const choose = (chooser) => {
    const chosen = chooser.value
    if (!['hex', 'rgb', 'oklch'].includes(chosen) || chosen === format) return
    format = /** @type {ColorFormat} */ (chosen)
    paint(chooser)
  }

  root.addEventListener('input', (event) => {
    const target = /** @type {Element} */ (event.target)
    if (target === range('hue')) {
      if (take({ ...color, h: Number(/** @type {HTMLInputElement} */ (target).value) })) paint(target)
    } else if (target === range('alpha')) {
      if (take({ ...color, a: Number(/** @type {HTMLInputElement} */ (target).value) / 100 })) paint(target)
    } else if (target === text()) {
      // A color as soon as it is one; the text stays as it is typed until it is committed.
      const read = parse(/** @type {HTMLInputElement} */ (target).value)
      if (read && take(read.color)) paint(target)
    } else if (target === select()) choose(/** @type {HTMLSelectElement} */ (target))
  }, { signal, capture: true })

  // A committed text is written again in the format chosen, or put back when it is not a color.
  root.addEventListener('change', (event) => {
    const chooser = select()
    if (chooser && event.target === chooser) return choose(chooser)
    const field = text()
    if (!field || event.target !== field) return
    const read = parse(field.value)
    if (read && take(read.color)) paint(field)
    write(field, print(color, format))
  }, { signal, capture: true })

  return detach
}
