/**
 * Signature: draws what a finger, a pen or a mouse writes on the pad.
 *
 * A stroke is a list of points in the units of the drawing's viewBox, each `[x, y, pressure]`. A pen gives its
 * own pressure; a finger and a mouse give none, so a stroke is drawn heavier where it moved slowly, as ink
 * pools where a pen lingers. Each stroke is written into the `signature-ink` svg as a `signature-stroke` path:
 * a filled outline as wide as `--signature-weight` at an even pressure, smoothed by curves through the
 * midpoints. The stylesheet colors it.
 *
 * The `signature-value` field holds the drawing as an SVG document, so a form submits it. The field dispatches
 * `input` as a stroke is drawn and `change` when it ends, when Undo takes a stroke back and when Clear takes them
 * all. `signature-undo` and `signature-clear` are marked `aria-disabled` while there is nothing to take, and
 * `signature-status` says when the pad was signed and when it was emptied.
 *
 * A drawing has no keyboard. The typed name, `signature-name`, is the keyboard's way to sign: when it is
 * `required`, the drawing satisfies it, so the attribute is lifted while there is a stroke and given back when
 * there is none. Nothing draws while the `<fieldset>` is disabled or the root is `signature-readonly`.
 *
 * The function the behavior returns has a `value`: the strokes. Set it to draw a signature from outside; that
 * dispatches nothing. Its `svg` is the drawing as an SVG document, or an empty string when nothing is drawn.
 */

/**
 * A stroke: the points it passed through, in the units of the viewBox, with the pressure at each, from 0 to 1.
 * @typedef {[x: number, y: number, pressure: number][]} SignatureStroke
 */

import { write } from './internal.js'

const NS = 'http://www.w3.org/2000/svg'

/** The weight of a stroke when the stylesheet gives none: --signature-weight. */
export const signatureWeight = 2.5

/** @param {number} value */
const round = (value) => Math.round(value * 10) / 10
/** @param {number[]} point */
const at = (point) => `${round(point[0])} ${round(point[1])}`

/**
 * The outline of one stroke, as the `d` of a path to fill. A point is a dot; a line of points is a band as wide
 * as the pressure at each point, through curves that pass the midpoints between them, with round ends.
 * @param {SignatureStroke} stroke
 * @param {number} [weight] Its width at an even pressure, in the units of the viewBox.
 * @returns {string}
 */
export function signaturePath(stroke, weight = signatureWeight) {
  /** Half the width at a pressure: the weight at one half, a little over a third of it at none, half again at full. */
  const radius = (/** @type {number} */ pressure) => weight / 2 * (.35 + 1.3 * Math.min(1, Math.max(0, pressure)))
  /** @type {SignatureStroke} */
  const points = []
  for (const point of stroke) {
    const last = points.at(-1)
    if (!last || Math.hypot(point[0] - last[0], point[1] - last[1]) >= .5) points.push(point)
  }
  if (!points.length) return ''
  if (points.length === 1) {
    const [x, y, pressure] = points[0]
    const r = round(radius(pressure))
    return `M${round(x - r)} ${round(y)}a${r} ${r} 0 1 0 ${round(r * 2)} 0a${r} ${r} 0 1 0 ${round(-r * 2)} 0Z`
  }
  // Each point is drawn toward its neighbours, so a jittery hand reads as a steady one. The ends stay where they were.
  const smooth = points.map((point, index) => {
    const before = points[index - 1]
    const after = points[index + 1]
    if (!before || !after) return point
    return [(before[0] + point[0] * 2 + after[0]) / 4, (before[1] + point[1] * 2 + after[1]) / 4, point[2]]
  })
  /** @type {number[][]} */
  const left = []
  /** @type {number[][]} */
  const right = []
  smooth.forEach((point, index) => {
    const before = smooth[Math.max(0, index - 1)]
    const after = smooth[Math.min(smooth.length - 1, index + 1)]
    const length = Math.hypot(after[0] - before[0], after[1] - before[1]) || 1
    const r = radius(point[2])
    const nx = -(after[1] - before[1]) / length * r
    const ny = (after[0] - before[0]) / length * r
    left.push([point[0] + nx, point[1] + ny])
    right.push([point[0] - nx, point[1] - ny])
  })
  /** A side of the band: a curve to the midpoint of each pair of points, and a line to the last. @param {number[][]} side */
  const curve = (side) => {
    let d = ''
    for (let index = 1; index < side.length - 1; index++) {
      const next = side[index + 1]
      d += `Q${at(side[index])} ${at([(side[index][0] + next[0]) / 2, (side[index][1] + next[1]) / 2])}`
    }
    return `${d}L${at(/** @type {number[]} */ (side.at(-1)))}`
  }
  const end = round(radius(smooth[smooth.length - 1][2]))
  const start = round(radius(smooth[0][2]))
  right.reverse()
  return `M${at(left[0])}${curve(left)}A${end} ${end} 0 0 0 ${at(right[0])}${curve(right)}A${start} ${start} 0 0 0 ${at(left[0])}Z`
}

/**
 * The drawing as an SVG document an image, a PDF or a server can take: one path a stroke, filled in the color
 * of the text around it, or black where there is none. An empty string when there is no stroke.
 * @param {SignatureStroke[]} strokes
 * @param {{ viewBox?: string, weight?: number }} [options] The drawing's viewBox, and the weight of a stroke.
 * @returns {string}
 */
export function signatureSvg(strokes, { viewBox = '0 0 400 160', weight = signatureWeight } = {}) {
  const paths = strokes.map((stroke) => signaturePath(stroke, weight)).filter(Boolean)
  if (!paths.length) return ''
  const [, , width, height] = viewBox.split(/[\s,]+/)
  return `<svg xmlns="${NS}" viewBox="${viewBox}" width="${width}" height="${height}" fill="currentColor">${paths.map((d) => `<path d="${d}"/>`).join('')}</svg>`
}

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * @param {HTMLElement} root The element with the `signature` class, a `<fieldset>`.
 * @param {{ drawn?: string, cleared?: string, undone?: string }} [options] What `signature-status` says: when the
 *   first stroke is drawn, when the pad is emptied, and when Undo takes a stroke back.
 * @returns {(() => void) & { value: SignatureStroke[], readonly svg: string }} Removes everything the behavior
 *   added. Its `value` is the strokes, and its `svg` the drawing as an SVG document.
 */
export function signature(root, { drawn = 'Signature drawn', cleared = 'Signature cleared', undone = 'Last stroke removed' } = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)

  /** @type {SignatureStroke[]} */
  let strokes = []

  const ink = () => /** @type {SVGSVGElement | null} */ (root.querySelector('.signature-ink'))
  const pad = () => /** @type {HTMLElement | null} */ (root.querySelector('.signature-pad'))
  const field = () => /** @type {HTMLInputElement | null} */ (root.querySelector('.signature-value'))
  const named = () => /** @type {HTMLInputElement | null} */ (root.querySelector('.signature-name'))
  const viewBox = () => ink()?.getAttribute('viewBox') ?? '0 0 400 160'
  const weight = () => {
    const own = parseFloat(getComputedStyle(root).getPropertyValue('--signature-weight'))
    return own > 0 ? own : signatureWeight
  }
  const locked = () => root.matches(':disabled') || root.classList.contains('signature-readonly')

  /**
   * The typed name a stroke lifted `required` from. A required typed name asks for a signature, which the
   * drawing gives as well: the attribute is lifted while there is a stroke and given back when there is none.
   * @type {HTMLInputElement | null}
   */
  let lifted = null

  /**
   * Write the strokes into the drawing, reusing the paths already there, so a path a server rendered stays.
   * With `last`, only the stroke being drawn changed.
   */
  const draw = (last = false) => {
    const svg = ink()
    if (svg) {
      const paths = [...svg.querySelectorAll('.signature-stroke')]
      const size = weight()
      strokes.forEach((stroke, index) => {
        if (last && index < strokes.length - 1 && paths[index]) return
        let path = paths[index]
        if (!path) {
          path = svg.ownerDocument.createElementNS(NS, 'path')
          path.setAttribute('class', 'signature-stroke')
          svg.append(path)
        }
        const d = signaturePath(stroke, size)
        if (path.getAttribute('d') !== d) path.setAttribute('d', d)
      })
      for (const extra of paths.slice(strokes.length)) extra.remove()
    }
    const empty = !strokes.length
    for (const button of root.querySelectorAll('.signature-undo, .signature-clear')) {
      if (empty) button.setAttribute('aria-disabled', 'true')
      else button.removeAttribute('aria-disabled')
    }
    const carrier = field()
    if (carrier) {
      const value = signatureSvg(strokes, { viewBox: viewBox(), weight: weight() })
      if (carrier.value !== value) write(carrier, value)
    }
    const typed = named()
    if (!empty && typed?.required) {
      typed.required = false
      lifted = typed
    } else if (empty) give()
  }

  const give = () => {
    if (lifted) lifted.required = true
    lifted = null
  }

  /** @param {'input' | 'change'} type */
  const dispatch = (type) => (field() ?? root).dispatchEvent(new Event(type, { bubbles: true }))

  /** @param {string} message */
  const say = (message) => {
    const status = root.querySelector('.signature-status')
    // The same words twice are not news to a screen reader; a space after them makes them so.
    if (status) status.textContent = status.textContent === message ? `${message} ` : message
  }

  /** The pointer drawing a stroke, the time of its last point, and the stroke. */
  let held = /** @type {number | null} */ (null)
  let time = 0
  /** @type {SignatureStroke} */
  let stroke = []

  /**
   * Where an event is in the drawing, in the units of the viewBox.
   * @param {PointerEvent} event
   * @returns {[number, number]}
   */
  const place = (event) => {
    const svg = /** @type {SVGSVGElement} */ (ink())
    const matrix = svg.getScreenCTM?.()
    if (matrix && typeof DOMPoint === 'function') {
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
      return [point.x, point.y]
    }
    // Without a matrix, the drawing keeps its viewBox's proportions, so a scale maps one to the other.
    const [x = 0, y = 0, width = 400, height = 160] = viewBox().split(/[\s,]+/).map(Number)
    const box = svg.getBoundingClientRect()
    return [x + (event.clientX - box.left) / (box.width || width) * width, y + (event.clientY - box.top) / (box.height || height) * height]
  }

  /**
   * The point an event adds. A pen says how hard it pressed; anything else is heavier the slower it moved, and
   * each point leans on the one before, so the width swells and thins instead of jumping.
   * @param {PointerEvent} event
   * @returns {[number, number, number]}
   */
  const point = (event) => {
    const [x, y] = place(event)
    const last = stroke.at(-1)
    let pressure = .5
    if (event.pointerType === 'pen' && event.pressure > 0) pressure = event.pressure
    else if (last) {
      const elapsed = Math.max(1, event.timeStamp - time)
      const speed = Math.hypot(x - last[0], y - last[1]) / elapsed
      pressure = .8 - Math.min(speed, 2.5) / 2.5 * .55
    }
    if (last) pressure = last[2] * .6 + pressure * .4
    time = event.timeStamp
    return [round(x), round(y), Math.round(pressure * 100) / 100]
  }

  const surface = pad()
  if (surface && ink()) {
    surface.addEventListener('pointerdown', (event) => {
      if (held !== null || !event.isPrimary || event.button !== 0 || locked()) return
      // A button in the pad keeps its click.
      if (/** @type {Element} */ (event.target).closest('button, input, a, .signature-actions')) return
      held = event.pointerId
      time = event.timeStamp
      stroke = []
      stroke.push(point(event))
      strokes.push(stroke)
      // Capture keeps the stroke when the pointer leaves the pad. A scripted event has no pointer to capture.
      try { surface.setPointerCapture(event.pointerId) } catch {}
      draw(true)
      dispatch('input')
    }, { signal })

    surface.addEventListener('pointermove', (event) => {
      if (event.pointerId !== held) return
      // A fast hand moves further than one event a frame says: the events the browser merged are points too.
      const events = event.getCoalescedEvents?.() ?? []
      for (const each of events.length ? events : [event]) {
        const next = point(each)
        const last = /** @type {number[]} */ (stroke.at(-1))
        if (Math.hypot(next[0] - last[0], next[1] - last[1]) >= .75) stroke.push(next)
      }
      draw(true)
      dispatch('input')
    }, { signal })

    /** @param {PointerEvent} event */
    const release = (event) => {
      if (event.pointerId !== held) return
      held = null
      dispatch('change')
      if (strokes.length === 1) say(drawn)
    }
    surface.addEventListener('pointerup', release, { signal })
    surface.addEventListener('pointercancel', release, { signal })
    surface.addEventListener('lostpointercapture', release, { signal })
  }

  root.addEventListener('click', (event) => {
    const button = /** @type {Element} */ (event.target).closest('.signature-undo, .signature-clear')
    if (!button || !root.contains(button) || !strokes.length || held !== null || locked()) return
    if (button.getAttribute('aria-disabled') === 'true' || /** @type {HTMLButtonElement} */ (button).disabled) return
    if (button.classList.contains('signature-clear')) strokes = []
    else strokes = strokes.slice(0, -1)
    draw()
    dispatch('input')
    dispatch('change')
    say(strokes.length ? undone : cleared)
  }, { signal })

  // Strokes a server drew from the first value stay as they are, for the value that follows to find.
  if (!root.querySelector('.signature-stroke')) draw()
  signal.addEventListener('abort', give)

  /** @type {(() => void) & { value: SignatureStroke[], readonly svg: string }} */
  const detach = /** @type {any} */ (() => controller.abort())
  Object.defineProperty(detach, 'value', {
    enumerable: true,
    get: () => strokes.map((each) => each.map((point) => /** @type {[number, number, number]} */ ([...point]))),
    set: (/** @type {SignatureStroke[]} */ next) => {
      const given = Array.isArray(next) ? next.filter((each) => Array.isArray(each) && each.length).map((each) => each.map((point) => /** @type {[number, number, number]} */ ([Number(point[0]), Number(point[1]), Number(point[2] ?? .5)]))) : []
      if (JSON.stringify(given) === JSON.stringify(strokes)) return
      strokes = given
      draw()
    },
  })
  Object.defineProperty(detach, 'svg', {
    enumerable: true,
    get: () => signatureSvg(strokes, { viewBox: viewBox(), weight: weight() }),
  })
  return detach
}
