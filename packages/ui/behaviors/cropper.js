/**
 * Cropper: moves and sizes the box over a picture, or the picture under a box that stays.
 *
 * The stylesheet places everything from four custom properties on the root, shares of the picture from 0
 * to 1: `--cropper-x`, `--cropper-y`, `--cropper-width` and `--cropper-height`. This script writes them,
 * from the pointer and the keys, and nothing else that is drawn.
 *
 * - **The box.** A drag of the box moves it, a drag of a handle moves the edges the handle names, and a
 *   drag across the picture outside the box draws a new one; a press there without a drag moves the box to
 *   it. The box stays inside the picture and keeps `min` pixels each way.
 * - **A ratio.** With `ratio`, a handle keeps the box at those proportions: a corner from the corner
 *   across from it, an edge about the middle of the box. When the behavior attaches with a ratio the box
 *   does not have (the page chose another one), it fits the box to it about its middle and says so.
 * - **Panned.** On a root with `cropper-pan` the box stays and the picture moves under it: a drag pans, two
 *   fingers pinch, the wheel zooms with Control or Command held (a trackpad's pinch is such a wheel), and so
 *   does a range input whose `aria-controls` names the root, from its `min` to its `max`.
 * - **The keys.** On the box, the arrows move the crop by `step` pixels of the picture, ten steps with
 *   Shift. With Alt (Option) they make it larger or smaller from its far edges: ArrowRight and ArrowDown
 *   larger, ArrowLeft and ArrowUp smaller. On a panned cropper that zooms, and so do + and -.
 * - **Events.** The box dispatches `input` each time the crop changes and `change` when a drag, a key, a
 *   pinch or a turn of the wheel has ended. After each `change` it writes what `describe` says of the crop
 *   into the root's `cropper-status`, a polite live region.
 *
 * The crop is in the picture's own pixels, read from the `width` and `height` of `cropper-image`. A picture
 * has no direction, so the arrows and the crop are left and right in every writing direction.
 *
 * The function the behavior returns has a `value`: `{ x, y, width, height }` in the picture's pixels, with
 * `zoom` on a panned cropper. Set it to move the crop from outside; that dispatches nothing.
 */
import { valued, write } from './internal.js'

/**
 * A crop: a rectangle in the picture's own pixels, from its top left corner. A panned crop also has its
 * zoom: 1 where the crop is as large as the picture allows at the box's proportions.
 * @typedef {{ x: number, y: number, width: number, height: number, zoom?: number }} Crop
 */

/**
 * How a crop is fitted to a picture.
 * @typedef {object} CropperFitOptions
 * @property {number | null} [ratio] Width over height the crop keeps. Free when left out; 1 on a panned cropper.
 * @property {boolean} [pan] The box stays and the picture moves under it.
 * @property {number} [min] The least width and height, in the picture's pixels. A tenth of its shorter side by default.
 * @property {[number, number]} [zoom] The least and the greatest zoom of a panned crop. 1 to 4 by default.
 * @property {boolean} [fit] Give the crop the ratio about its middle, keeping its area, when it does not have it.
 */

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/** @param {number} value @param {number} least @param {number} greatest */
const clamp = (value, least, greatest) => Math.min(Math.max(value, least), greatest)
/** @param {unknown} value @returns {value is number} */
const finite = (value) => typeof value === 'number' && Number.isFinite(value)

/**
 * Fit a crop to a picture: inside it, no smaller than the least size and, on a panned cropper, at the box's
 * proportions and within the zoom. Without a crop, the whole picture, or the largest crop of the ratio in
 * its middle. A renderer uses it to draw the first crop on a server, as the behavior will hold it.
 * @param {{ width: number, height: number }} picture The picture's own size, in pixels.
 * @param {Partial<Crop> | null} [crop] The crop asked for.
 * @param {CropperFitOptions} [options]
 * @returns {Crop}
 */
export function cropperFit(picture, crop, { ratio, pan = false, min, zoom = [1, 4], fit = false } = {}) {
  const width = picture.width > 0 ? picture.width : 1
  const height = picture.height > 0 ? picture.height : 1
  const least = Math.min(finite(min) && min > 0 ? min : Math.min(width, height) / 10, width, height)

  if (pan) {
    const shape = finite(ratio) && ratio > 0 ? ratio : 1
    // The widest crop of the box's proportions the picture holds: zoom 1.
    const cover = Math.min(width, height * shape)
    const [nearest, farthest] = [Math.max(zoom[0], 1e-3), Math.max(zoom[1], zoom[0], 1e-3)]
    const asked = finite(crop?.width) && crop.width > 0 ? crop.width : null
    // A zoom given beside a width that says another wins: `{ ...crop, zoom: 2 }` zooms.
    const wide = finite(crop?.zoom) && crop.zoom > 0 && (asked === null || Math.abs(cover / asked - crop.zoom) > .005)
      ? cover / crop.zoom
      : asked ?? cover / nearest
    const across = clamp(wide, Math.min(cover / farthest, cover), cover / nearest)
    const down = across / shape
    // The middle of the crop asked for stays, so a zoom happens about it.
    const middleX = finite(crop?.x) ? crop.x + (asked ?? across) / 2 : width / 2
    const middleY = finite(crop?.y) ? crop.y + (finite(crop?.height) ? crop.height : (asked ?? across) / shape) / 2 : height / 2
    return {
      x: clamp(middleX - across / 2, 0, width - across),
      y: clamp(middleY - down / 2, 0, height - down),
      width: across,
      height: down,
      zoom: cover / across,
    }
  }

  const shape = finite(ratio) && ratio > 0 ? ratio : null
  if (!finite(crop?.width) || !finite(crop?.height) || crop.width <= 0 || crop.height <= 0) {
    const across = shape ? Math.min(width, height * shape) : width
    const down = shape ? across / shape : height
    return { x: (width - across) / 2, y: (height - down) / 2, width: across, height: down }
  }

  let across = crop.width
  let down = crop.height
  let x = finite(crop.x) ? crop.x : (width - across) / 2
  let y = finite(crop.y) ? crop.y : (height - down) / 2
  if (shape && fit && Math.abs(across / down - shape) > shape * .005) {
    // The same area at the new proportions, about the same middle.
    const middleX = x + across / 2
    const middleY = y + down / 2
    across = Math.sqrt(across * down * shape)
    down = across / shape
    x = middleX - across / 2
    y = middleY - down / 2
  }
  if (shape && Math.abs(across / down - shape) <= shape * .005) {
    // A crop at the ratio keeps it while it is held to the least and the greatest size.
    const smallest = Math.max(least, least * shape)
    across = clamp(Math.max(across, smallest), 0, Math.min(width, height * shape))
    down = across / shape
  } else {
    across = clamp(across, least, width)
    down = clamp(down, least, height)
  }
  return { x: clamp(x, 0, width - across), y: clamp(y, 0, height - down), width: across, height: down }
}

/**
 * What the status says after a change, in English.
 * @param {Crop} crop The crop, in whole pixels.
 */
const sayCrop = (crop) => `${crop.width} by ${crop.height} pixels, ${crop.x} from the left and ${crop.y} from the top${crop.zoom ? `, zoomed to ${Math.round(crop.zoom * 100)}%` : ''}`

/**
 * @param {HTMLElement} root The element with the `cropper` class.
 * @param {{ ratio?: number | null, step?: number, min?: number, maxZoom?: number, describe?: (crop: Crop) => string }} [options]
 *   `ratio`: width over height the box keeps; the root's own `--cropper-ratio` when left out, free with 0 or
 *   null. `step`: how far an arrow moves the crop, in the picture's pixels; a hundredth of its longer side by
 *   default. `min`: the least width and height, in the picture's pixels. `maxZoom`: how far a panned
 *   cropper zooms without a range input, 4 by default. `describe`: what the status says of a crop.
 * @returns {(() => void) & { value: Crop | null }} Removes the listeners; the crop it wrote on the root stays.
 *   Its `value` is the crop in the picture's pixels, with `zoom` on a panned cropper.
 */
export function cropper(root, { ratio, step, min, maxZoom = 4, describe = sayCrop } = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)

  /** Set once the parts are found: read the crop, and write one given from outside. */
  let read = () => /** @type {Crop | null} */ (null)
  let take = (/** @type {Crop | null} */ value) => { void value }
  const detach = valued(() => controller.abort(), () => read(), (/** @type {Crop | null} */ value) => take(value))

  const image = /** @type {HTMLImageElement | null} */ (root.querySelector('.cropper-image'))
  const box = /** @type {HTMLElement | null} */ (root.querySelector('.cropper-box'))
  if (!image || !box) return detach

  // A ratio given here is the root's from now on, so a panned box takes its proportions from it.
  if (finite(ratio) && ratio > 0) root.style.setProperty('--cropper-ratio', String(ratio))
  else if (ratio === 0 || ratio === null) root.style.removeProperty('--cropper-ratio')

  const panned = () => root.classList.contains('cropper-pan')
  const disabled = () => box.getAttribute('aria-disabled') === 'true'
  /** The picture's own size: its width and height attributes, or the file's once it has loaded. */
  const picture = () => {
    const width = parseFloat(image.getAttribute('width') ?? '') || image.naturalWidth || 1
    const height = parseFloat(image.getAttribute('height') ?? '') || image.naturalHeight || 1
    return { width, height }
  }
  /** Width over height: the root's --cropper-ratio, written as a number or as `16 / 9`. */
  const shape = () => {
    const [across, down = 1] = root.style.getPropertyValue('--cropper-ratio').split('/').map(Number)
    const value = /** @type {number} */ (across) / down
    return Number.isFinite(value) && value > 0 ? value : panned() ? 1 : null
  }
  /** The range input that zooms a panned cropper: one whose aria-controls names the root. */
  const slider = () => {
    if (!root.id) return undefined
    return /** @type {HTMLInputElement[]} */ ([...root.ownerDocument.querySelectorAll('input[type="range"][aria-controls]')])
      .find((input) => (input.getAttribute('aria-controls') ?? '').split(/\s+/).includes(root.id))
  }
  /** @returns {[number, number]} */
  const zooms = () => {
    const input = slider()
    const nearest = parseFloat(input?.min ?? '')
    const farthest = parseFloat(input?.max ?? '')
    return [Number.isFinite(nearest) && nearest > 0 ? nearest : 1, Number.isFinite(farthest) && farthest > 0 ? farthest : maxZoom]
  }
  const fitting = () => ({ ratio: shape(), pan: panned(), min, zoom: zooms() })
  const fitted = (/** @type {Partial<Crop> | null} */ crop, fit = false) => cropperFit(picture(), crop, { ...fitting(), fit })

  /** The crop the root's properties hold, in pixels, before it is fitted; null when they hold none. */
  const held = () => {
    const [x, y, width, height] = ['--cropper-x', '--cropper-y', '--cropper-width', '--cropper-height'].map((name) => parseFloat(root.style.getPropertyValue(name)))
    if (![x, y, width, height].every(Number.isFinite)) return null
    const size = picture()
    return { x: /** @type {number} */ (x) * size.width, y: /** @type {number} */ (y) * size.height, width: /** @type {number} */ (width) * size.width, height: /** @type {number} */ (height) * size.height }
  }
  const current = () => fitted(held())
  /** The crop in whole pixels, as it is read from outside. */
  const rounded = (/** @type {Crop} */ crop) => {
    /** @type {Crop} */
    const whole = { x: Math.round(crop.x), y: Math.round(crop.y), width: Math.round(crop.width), height: Math.round(crop.height) }
    if (finite(crop.zoom)) whole.zoom = Math.round(crop.zoom * 100) / 100
    return whole
  }

  /**
   * Pass a crop on: the four properties the stylesheet places from, and the zoom on a range input.
   * @param {Crop} crop
   * @param {boolean} [silent] Say nothing: the crop was set from outside.
   * @returns {boolean} Whether the crop changed.
   */
  const place = (crop, silent = false) => {
    const size = picture()
    const shares = /** @type {[string, number][]} */ ([
      ['--cropper-x', crop.x / size.width],
      ['--cropper-y', crop.y / size.height],
      ['--cropper-width', crop.width / size.width],
      ['--cropper-height', crop.height / size.height],
    ])
    let changed = false
    for (const [name, share] of shares) {
      const written = String(Math.round(share * 1e5) / 1e5)
      if (root.style.getPropertyValue(name) === written) continue
      root.style.setProperty(name, written)
      changed = true
    }
    // Only a panned crop has a zoom: the document is searched for its range input then, not on every move of a box.
    const input = finite(crop.zoom) ? slider() : undefined
    if (input && finite(crop.zoom)) {
      const zoom = String(Math.round(crop.zoom * 1000) / 1000)
      if (input.value !== zoom) write(input, zoom)
    }
    if (changed && !silent) box.dispatchEvent(new Event('input', { bubbles: true }))
    return changed
  }
  /** The end of a change: say it, then tell whoever listens. */
  const settled = () => {
    const status = root.querySelector('.cropper-status')
    if (status) status.textContent = describe(rounded(current()))
    box.dispatchEvent(new Event('change', { bubbles: true }))
  }

  read = () => rounded(current())
  take = (value) => {
    if (!value || typeof value !== 'object') return
    if (JSON.stringify(rounded({ ...value })) === JSON.stringify(read())) return
    place(fitted(value), true)
  }

  // The properties hold the crop from the start, fitted to the picture.
  place(current(), true)
  // A ratio the box does not have, given as the behavior attaches, is the page's choice: the box takes it.
  queueMicrotask(() => {
    if (signal.aborted || panned()) return
    if (place(fitted(current(), true))) settled()
  })

  /**
   * Move the edges of a crop toward a point, in the picture's pixels. A corner keeps the corner across from
   * it; at a ratio an edge keeps the middle of the box, and the box keeps its proportions.
   * @param {Crop} start
   * @param {{ top?: boolean, bottom?: boolean, left?: boolean, right?: boolean }} edges
   * @param {{ x: number, y: number }} point
   * @returns {Crop}
   */
  const resize = (start, edges, point) => {
    const size = picture()
    const least = Math.min(finite(min) && min > 0 ? min : Math.min(size.width, size.height) / 10, size.width, size.height)
    const proportion = shape()
    const end = { x: start.x + start.width, y: start.y + start.height }
    const across = edges.left || edges.right
    const down = edges.top || edges.bottom
    if (!proportion) {
      let { x, y, width, height } = start
      if (edges.left) { x = clamp(point.x, 0, end.x - least); width = end.x - x }
      if (edges.right) width = clamp(point.x - x, least, size.width - x)
      if (edges.top) { y = clamp(point.y, 0, end.y - least); height = end.y - y }
      if (edges.bottom) height = clamp(point.y - y, least, size.height - y)
      return { x, y, width, height }
    }
    const smallest = Math.max(least, least * proportion)
    const anchorX = edges.left ? end.x : start.x
    const anchorY = edges.top ? end.y : start.y
    const middleX = start.x + start.width / 2
    const middleY = start.y + start.height / 2
    // How far the pointer has pulled each edge, and how much room the picture leaves that way.
    const pullX = edges.left ? anchorX - point.x : point.x - anchorX
    const pullY = edges.top ? anchorY - point.y : point.y - anchorY
    const roomX = across ? (edges.left ? anchorX : size.width - anchorX) : 2 * Math.min(middleX, size.width - middleX)
    const roomY = down ? (edges.top ? anchorY : size.height - anchorY) : 2 * Math.min(middleY, size.height - middleY)
    const wanted = across && down ? Math.max(pullX, pullY * proportion) : across ? pullX : pullY * proportion
    const width = Math.min(Math.max(wanted, smallest), roomX, roomY * proportion)
    const height = width / proportion
    return {
      x: across ? (edges.left ? anchorX - width : anchorX) : middleX - width / 2,
      y: down ? (edges.top ? anchorY - height : anchorY) : middleY - height / 2,
      width,
      height,
    }
  }

  /**
   * A panned crop at another zoom, within the cropper's zooms, about a point of the box given as shares of
   * it: the part of the picture under that point stays under it. It is fitted to the picture afterwards.
   * @param {Crop} start
   * @param {number} zoom
   * @param {{ x: number, y: number }} [focus]
   */
  const zoomed = (start, zoom, focus = { x: .5, y: .5 }) => {
    const [nearest, farthest] = zooms()
    const width = start.width * (start.zoom ?? 1) / clamp(zoom, nearest, farthest)
    const height = width * start.height / start.width
    return { x: start.x + focus.x * (start.width - width), y: start.y + focus.y * (start.height - height), width, height }
  }

  /** A key held down has changed the crop and has not been let go: its change is said when it is. */
  let repeating = false
  // The keys: the arrows move the crop, Shift by ten steps; with Alt they size it, and + and - zoom.
  box.addEventListener('keydown', (event) => {
    if (disabled() || event.ctrlKey || event.metaKey) return
    const size = picture()
    const unit = (finite(step) && step > 0 ? step : Math.max(1, Math.round(Math.max(size.width, size.height) / 100))) * (event.shiftKey ? 10 : 1)
    const start = current()
    /** @type {Crop | undefined} */
    let next
    const arrows = /** @type {Record<string, [number, number]>} */ ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] })
    const arrow = arrows[event.key]
    if (arrow && !event.altKey) {
      next = fitted({ x: start.x + arrow[0] * unit, y: start.y + arrow[1] * unit, width: start.width, height: start.height })
    } else if (arrow) {
      // Larger to the right and down, smaller to the left and up: the far edges move.
      const grow = arrow[0] + arrow[1]
      if (panned()) next = zoomed(start, (start.zoom ?? 1) * start.width / Math.max(start.width + grow * unit, 1))
      else if (arrow[0]) next = resize(start, { right: true }, { x: start.x + start.width + grow * unit, y: start.y + start.height / 2 })
      else next = resize(start, { bottom: true }, { x: start.x + start.width / 2, y: start.y + start.height + grow * unit })
    } else if (panned() && ['+', '=', '-', '_'].includes(event.key) && !event.altKey) {
      next = zoomed(start, (start.zoom ?? 1) * (['+', '='].includes(event.key) ? 1.25 : .8))
    } else return
    event.preventDefault()
    if (!place(fitted(next))) return
    // A key that repeats has not ended: its change, and what the status says of it, wait for the key to be let go.
    if (event.repeat) repeating = true
    else settled()
  }, { signal })
  // The key is let go, or focus leaves the box before it is, which takes its keyup elsewhere.
  for (const type of ['keyup', 'blur']) {
    box.addEventListener(type, () => {
      if (!repeating) return
      repeating = false
      settled()
    }, { signal })
  }

  /** The pointers on the cropper, where each is now. */
  const pointers = /** @type {Map<number, { x: number, y: number }>} */ (new Map())
  /**
   * The gesture under way: what it does, the crop it started from, where the pointers were and whether
   * it has changed the crop.
   * @type {{ kind: 'move' | 'resize' | 'draw' | 'pan' | 'pinch', start: Crop, from: { x: number, y: number }, edges: { top?: boolean, bottom?: boolean, left?: boolean, right?: boolean }, frame: DOMRect, spread: number, moved: boolean } | null}
   */
  let gesture = null

  /** The middle of the pointers, and how far apart the first two are. */
  const spread = () => {
    const [first, second] = [...pointers.values()]
    if (!first) return { middle: { x: 0, y: 0 }, distance: 0 }
    if (!second) return { middle: first, distance: 0 }
    return { middle: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }, distance: Math.hypot(first.x - second.x, first.y - second.y) }
  }
  /** A point on the screen as a point of the picture, in its pixels, held inside it. */
  const onPicture = (/** @type {DOMRect} */ frame, /** @type {{ x: number, y: number }} */ point) => {
    const size = picture()
    return {
      x: clamp((point.x - frame.left) / (frame.width || 1) * size.width, 0, size.width),
      y: clamp((point.y - frame.top) / (frame.height || 1) * size.height, 0, size.height),
    }
  }
  /** Start a gesture from the pointers that are down now, so a second finger, or one lifted, starts afresh. */
  const begin = (/** @type {EventTarget | null} */ target, moved = false) => {
    const { middle, distance } = spread()
    const start = current()
    const base = { start, from: middle, edges: {}, spread: distance, moved }
    if (panned()) {
      gesture = { ...base, kind: pointers.size > 1 ? 'pinch' : 'pan', frame: box.getBoundingClientRect() }
      return
    }
    const handle = target instanceof Element ? target.closest('.cropper-handle') : null
    const edges = handle ? Object.fromEntries(['top', 'bottom', 'left', 'right'].map((edge) => [edge, handle.classList.contains(`cropper-handle-${edge}`)])) : {}
    const kind = handle ? 'resize' : target instanceof Node && box.contains(target) ? 'move' : 'draw'
    gesture = { ...base, kind, edges, frame: image.getBoundingClientRect() }
  }

  root.addEventListener('pointerdown', (event) => {
    if (disabled() || event.button !== 0) return
    // A control the page placed in the frame keeps its own pointer.
    if (event.target instanceof Element && event.target !== root && event.target.closest('input, button, select, textarea, a')) return
    // A primary pointer starts afresh: whatever was held before has gone, even if its release was never heard.
    if (event.isPrimary) {
      pointers.clear()
      gesture = null
    }
    // A second finger pinches a panned picture; elsewhere one pointer drives the box.
    if (pointers.size && !panned()) return
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    // Capture keeps the moves coming when the pointer leaves the frame. A scripted event has no pointer to capture.
    try { root.setPointerCapture(event.pointerId) } catch {}
    // Focus given under a pointer asks for no ring: the first press on a page would otherwise draw the keys' one.
    if (root.ownerDocument.activeElement !== box) box.focus(/** @type {FocusOptions} */ ({ preventScroll: true, focusVisible: false }))
    event.preventDefault()
    begin(event.target, gesture?.moved)
  }, { signal })

  root.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId) || !gesture) return
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const { kind, start, from, frame, edges } = gesture
    const { middle, distance } = spread()
    /** @type {Crop | undefined} */
    let next
    if (kind === 'pinch' || kind === 'pan') {
      // The point of the picture under the fingers when they came down stays under them.
      const focus = { x: (from.x - frame.left) / (frame.width || 1), y: (from.y - frame.top) / (frame.height || 1) }
      const now = { x: (middle.x - frame.left) / (frame.width || 1), y: (middle.y - frame.top) / (frame.height || 1) }
      const zoom = kind === 'pinch' && gesture.spread > 0 ? (start.zoom ?? 1) * distance / gesture.spread : start.zoom ?? 1
      const scaled = zoomed(start, zoom, focus)
      next = fitted({ x: scaled.x - (now.x - focus.x) * scaled.width, y: scaled.y - (now.y - focus.y) * scaled.height, width: scaled.width, height: scaled.height })
    } else if (kind === 'move') {
      const size = picture()
      next = fitted({
        x: start.x + (middle.x - from.x) / (frame.width || 1) * size.width,
        y: start.y + (middle.y - from.y) / (frame.height || 1) * size.height,
        width: start.width,
        height: start.height,
      })
    } else if (kind === 'resize') {
      next = resize(start, edges, onPicture(frame, middle))
    } else {
      // A drag across the picture draws a new box once it has gone a few pixels; a press alone does not.
      if (!gesture.moved && Math.hypot(middle.x - from.x, middle.y - from.y) < 4) return
      const anchor = onPicture(frame, from)
      const point = onPicture(frame, middle)
      next = resize({ ...anchor, width: 0, height: 0 }, { left: point.x < anchor.x, right: point.x >= anchor.x, top: point.y < anchor.y, bottom: point.y >= anchor.y }, point)
    }
    if (place(fitted(next))) gesture.moved = true
  }, { signal })

  /** @param {PointerEvent} event */
  const release = (event) => {
    if (!pointers.delete(event.pointerId) || !gesture) return
    const { kind, frame, from, moved } = gesture
    if (pointers.size) {
      // One finger of two lifted: the other goes on panning from where it is.
      begin(null, moved)
      return
    }
    gesture = null
    if (moved) settled()
    else if (kind === 'draw' && event.type === 'pointerup') {
      // A press on the picture outside the box brings the box there.
      const point = onPicture(frame, from)
      const start = current()
      if (place(fitted({ x: point.x - start.width / 2, y: point.y - start.height / 2, width: start.width, height: start.height }))) settled()
    }
  }
  root.addEventListener('pointerup', release, { signal })
  root.addEventListener('pointercancel', release, { signal })
  root.addEventListener('lostpointercapture', release, { signal })

  // The wheel zooms a panned picture with Control or Command held, about the pointer, and says change once it rests.
  let resting = /** @type {ReturnType<typeof setTimeout> | undefined} */ (undefined)
  /**
   * A turn of the wheel under way: the box, read at its first event, and whether it has changed the crop. A
   * trackpad's pinch sends many events to a frame, each of which writes the crop, so the box is not read again.
   * @type {{ frame: DOMRect, moved: boolean } | null}
   */
  let turning = null
  signal.addEventListener('abort', () => clearTimeout(resting))
  root.addEventListener('wheel', (event) => {
    if (!panned() || disabled() || !(event.ctrlKey || event.metaKey)) return
    event.preventDefault()
    turning ??= { frame: box.getBoundingClientRect(), moved: false }
    const { frame } = turning
    const start = current()
    const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1)
    const focus = { x: (event.clientX - frame.left) / (frame.width || 1), y: (event.clientY - frame.top) / (frame.height || 1) }
    if (place(fitted(zoomed(start, (start.zoom ?? 1) * 2 ** (-pixels / 250), focus)))) turning.moved = true
    clearTimeout(resting)
    resting = setTimeout(() => {
      const moved = turning?.moved
      turning = null
      if (moved) settled()
    }, 250)
  }, { signal, passive: false })

  // The range input that zooms: its moves zoom about the middle, and its change is the cropper's.
  root.ownerDocument.addEventListener('input', (event) => {
    const input = slider()
    if (!panned() || !input || event.target !== input || disabled()) return
    const zoom = parseFloat(input.value)
    if (Number.isFinite(zoom)) place(fitted(zoomed(current(), zoom)))
  }, { signal })
  root.ownerDocument.addEventListener('change', (event) => {
    const input = slider()
    if (panned() && input && event.target === input && !disabled()) settled()
  }, { signal })

  return detach
}
