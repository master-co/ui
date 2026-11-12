import { fragmentSource, vertexSource } from './shaders'
import { drawGlyphAtlas } from './glyphs'

type Vec3 = [number, number, number]

/** A long lens from above, close to an axonometric drawing: edges stay nearly parallel. */
const pitch = (33 * Math.PI) / 180
const fov = (20 * Math.PI) / 180
const focal = 1 / Math.tan(fov / 2)
const distance = 34
const camTarget: Vec3 = [0, 0, 0]
const camPos: Vec3 = [0, distance * Math.sin(pitch), distance * Math.cos(pitch)]
/** The stack is turned so its long edge recedes to the right. */
const turn = -0.52

const normalize = (v: Vec3): Vec3 => {
  const length = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / length, v[1] / length, v[2] / length]
}
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const forward = normalize([camTarget[0] - camPos[0], camTarget[1] - camPos[1], camTarget[2] - camPos[2]])
const right = normalize(cross(forward, [0, 1, 0]))
const up = cross(right, forward)

/** The point of the table under a point of the stage, both measured from the stage's top left. */
function unproject(x: number, y: number, width: number, height: number): [number, number] {
  const u = (x - width / 2) / height
  const v = (height / 2 - y) / height
  const ray = normalize([
    forward[0] * focal + right[0] * u * 2 + up[0] * v * 2,
    forward[1] * focal + right[1] * u * 2 + up[1] * v * 2,
    forward[2] * focal + right[2] * u * 2 + up[2] * v * 2,
  ])
  const t = -camPos[1] / Math.min(ray[1], -0.05)
  return [camPos[0] + ray[0] * t, camPos[2] + ray[2] * t]
}

/** Where a point of the world lands on the stage, measured from its top left. */
function project(point: Vec3, width: number, height: number): [number, number] {
  const v: Vec3 = [point[0] - camPos[0], point[1] - camPos[1], point[2] - camPos[2]]
  const z = dot(v, forward)
  const u = (focal * dot(v, right)) / (2 * z)
  const w = (focal * dot(v, up)) / (2 * z)
  return [u * height + width / 2, height / 2 - w * height]
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1)

/** sRGB channels of any CSS color, resolved by the page, in linear light. */
function linearColor(probe: CanvasRenderingContext2D, color: string): Vec3 {
  probe.clearRect(0, 0, 1, 1)
  probe.fillStyle = '#000'
  probe.fillStyle = color
  probe.fillRect(0, 0, 1, 1)
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data
  const linear = (channel: number) => {
    const c = channel / 255
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return [linear(r), linear(g), linear(b)]
}

/** A layer's edge on the stage, for the drafting notes beside the figure. */
export interface NoteAnchor {
  x: number
  y: number
}

/** A box on the stage, measured from its top left. */
export interface NoteBox {
  left: number
  top: number
  right: number
  bottom: number
}

export interface StillLifeOptions {
  /**
   * The words. The table keeps them clear of glyphs, the figure stands beside or under their longest line, and
   * their parent's content box is the column the figure and its notes keep to.
   */
  reading?: HTMLElement | null
  /**
   * Controls lit by the same lamp. Each receives `--lit-x`, `--lit-y` (where the lamp is, relative to the control),
   * `--lit-angle` (toward the lamp, for a rim gradient), `--cast-x`, `--cast-y` (its shadow, falling the way the
   * figure's shadows fall on the table) and `--lit-near` (0–1, how close the pointer carries the lamp).
   */
  lit?: HTMLElement[]
  /**
   * Called with each layer's edge on the stage (table, tray, sheet, floating sheet) whenever the figure moves, and
   * with how far right the notes may run (`reach`). It may return the box the notes then take on the stage, which
   * the print keeps clear.
   */
  onAnchors?: (anchors: NoteAnchor[], stage: { width: number, height: number, reach: number, wide: boolean }) => NoteBox | void
}

/** Footprints of the layers in the stack's units: center x, center z, half width, half depth, top above its underside. */
const footprints = [
  [0, 0, 3.3, 2.2, 0.14],
  [0.18, -0.04, 2.72, 1.74, 0.14],
  [2.6, -0.25, 1.05, 0.8, 0.12],
] as const

/** The undersides of the tray, the sheet and the floating sheet once the figure has opened. */
const openLayers = [0.12, 1.22, 2.37]

/**
 * Mounts the figure on a canvas inside `host`. Returns a cleanup. Without WebGL 2 the canvas stays hidden and
 * the hero keeps its plain ground.
 */
export function mountStillLife(canvas: HTMLCanvasElement, host: HTMLElement, options: StillLifeOptions = {}) {
  const gl = canvas.getContext('webgl2', { antialias: false, depth: false, stencil: false, alpha: false, powerPreference: 'high-performance' })
  const probeCanvas = document.createElement('canvas')
  probeCanvas.width = probeCanvas.height = 1
  const probe = probeCanvas.getContext('2d', { willReadFrequently: true })
  if (!gl || !probe) return () => undefined

  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  const coarse = matchMedia('(pointer: coarse)')
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    return shader
  }
  // Where the browser compiles in the background, the page keeps running while it does; asking for the result
  // before it is ready would block the main thread for as long as the compile takes.
  const parallel = gl.getExtension('KHR_parallel_shader_compile')
  const program = gl.createProgram()!
  const vertex = compile(gl.VERTEX_SHADER, vertexSource)
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource)
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.bindAttribLocation(program, 0, 'position')
  gl.linkProgram(program)

  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const names = ['uResolution', 'uTime', 'uBoot', 'uCamPos', 'uCamTarget', 'uFocal', 'uLamp', 'uLampColor', 'uGround', 'uInk', 'uDark', 'uReading', 'uReadingRadius', 'uNotes', 'uAtlas', 'uStack', 'uLayers'] as const
  let uniform: Record<typeof names[number], WebGLUniformLocation | null> | null = null

  let disposed = false
  let visible = true
  let frame = 0
  let width = 1
  let height = 1
  let cssWidth = 1
  let cssHeight = 1
  let wide = true
  /** How far right the figure and its notes may reach on the stage. */
  let reach = 1
  // A 1x screen starts at its full resolution, where every lost pixel shows; a dense one starts a little under it.
  let quality = coarse.matches ? 0.65 : devicePixelRatio < 1.5 ? 1 : 0.85
  let slowFrames = 0
  let fastFrames = 0
  let lastFrame = -1
  let startedAt = -1
  let wasSettling = false
  /** How far the hero has scrolled out of view, 0 to 1; the layers settle back together as it leaves. */
  let leaving = 0
  /** The middle of the drawn figure, from the top of the stage. */
  let figureY = 0
  const stackAt = { x: 0, z: 0, scale: 1 }
  const lamp = { x: 0, y: 8, z: 0, offsetX: 0, offsetZ: 0, targetX: 0, targetZ: 0 }
  const tilt = { value: 0, target: 0 }
  const reading = [0, 0, 0, 0]
  /** The notes' column in canvas pixels, kept clear of print; empty while the notes are hidden. */
  const notesClear = [0, 0, 0, 0]
  let readingRadius = 80
  const colors = { ground: [1, 1, 1] as Vec3, ink: [0, 0, 0] as Vec3, dark: 0 }

  const atlas = gl.createTexture()
  const anisotropy = gl.getExtension('EXT_texture_filter_anisotropic')
  const uploadAtlas = () => {
    const font = getComputedStyle(document.documentElement).getPropertyValue('--font-family-mono').trim() || 'monospace'
    const image = drawGlyphAtlas(font)
    if (!image) return
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, atlas)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    if (anisotropy) gl.texParameterf(gl.TEXTURE_2D, anisotropy.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)))
  }

  const readColors = () => {
    const root = document.documentElement
    colors.dark = root.classList.contains('dark') || getComputedStyle(root).colorScheme === 'dark' ? 1 : 0
    const resolve = (property: string, fallback: string) => {
      const element = document.createElement('i')
      element.style.color = `var(${property}, ${fallback})`
      host.append(element)
      const value = getComputedStyle(element).color
      element.remove()
      return linearColor(probe, value)
    }
    colors.ground = resolve('--home-ground', getComputedStyle(host).backgroundColor)
    colors.ink = resolve('--home-text-quiet', '#777')
  }

  /** The box the opened figure covers on the stage, for its current place and scale. */
  const extent = () => {
    const c = Math.cos(turn)
    const sn = Math.sin(turn)
    const box = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
    footprints.forEach(([cx, cz, hx, hz, top], index) => {
      for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const lx = cx + dx * hx
        const lz = cz + dz * hz
        for (const ly of [openLayers[index], openLayers[index] + top]) {
          const [px, py] = project([stackAt.x + (c * lx - sn * lz) * stackAt.scale, ly * stackAt.scale, stackAt.z + (sn * lx + c * lz) * stackAt.scale], cssWidth, cssHeight)
          box.left = Math.min(box.left, px)
          box.right = Math.max(box.right, px)
          box.top = Math.min(box.top, py)
          box.bottom = Math.max(box.bottom, py)
        }
      }
    })
    return box
  }

  const layout = () => {
    const rect = canvas.getBoundingClientRect()
    cssWidth = Math.max(rect.width, 1)
    cssHeight = Math.max(rect.height, 1)
    const ratio = Math.min(devicePixelRatio || 1, 2) * quality
    // A pixel budget keeps a large screen affordable; a GPU that has earned full quality earns a larger budget too.
    const budget = 2_600_000 * Math.max(1, quality / 0.85) ** 2
    const scale = Math.min(ratio, Math.sqrt(budget / (cssWidth * cssHeight)))
    // The drawing buffer is resized by the next frame, just before it draws: resizing it here would clear it, and
    // a cleared opaque canvas shows black until something draws again.
    width = Math.max(1, Math.round(cssWidth * scale))
    height = Math.max(1, Math.round(cssHeight * scale))

    // Beside the words on a wide stage, in the room right of them; under them on a narrow one.
    const area = options.reading?.getBoundingClientRect()
    // The words end where their longest line ends, not where their column could reach.
    const inked = options.reading ? [...options.reading.children].map((child) => {
      const range = document.createRange()
      range.selectNodeContents(child)
      return range.getBoundingClientRect().right
    }) : []
    const readingRight = inked.length ? Math.max(...inked) - rect.left : cssWidth * 0.45
    const readingBottom = area ? area.bottom - rect.top : cssHeight * 0.55
    // The figure and its notes keep to the page's column, ending where the words of the sections below end.
    const wrapper = options.reading?.parentElement
    const column = wrapper ? wrapper.getBoundingClientRect().right - parseFloat(getComputedStyle(wrapper).paddingRight) : cssWidth
    reach = Math.min(cssWidth - 16, column - rect.left)
    // The same threshold as the stylesheet's: below 64rem, or on a tall screen, the figure stands under the words.
    wide = cssWidth >= 1024 && cssWidth / cssHeight > 1.15
    let anchor: [number, number]
    let span: number
    let tall: number
    if (wide) {
      // A clear gutter keeps the figure's near corner from crowding the words.
      const left = readingRight + 56
      const room = reach - left
      // The notes take a column at the far right whenever the figure keeps a useful size beside them.
      const figure = room > 540 ? room - 170 : room
      span = Math.min(figure * 0.94, 800)
      tall = cssHeight * 0.6
      anchor = [left + figure / 2, cssHeight * 0.55]
    } else {
      span = Math.min(cssWidth * 0.84, 580)
      tall = (cssHeight - readingBottom) * 0.8
      anchor = [cssWidth / 2, readingBottom + (cssHeight - readingBottom) * 0.45]
    }
    // Fit the opened figure's drawn extent, not its footprint: scale it to the span (or the height it may take)
    // and move it until the middle of what is drawn sits on the anchor. Two passes absorb the slight perspective.
    const [x, z] = unproject(anchor[0], anchor[1], cssWidth, cssHeight)
    const [ex] = unproject(anchor[0] + 100, anchor[1], cssWidth, cssHeight)
    stackAt.scale = (span * Math.abs(ex - x)) / 100 / 7
    stackAt.x = x
    stackAt.z = z
    for (let pass = 0; pass < 2; pass++) {
      const box = extent()
      stackAt.scale *= Math.min(span / (box.right - box.left), tall / (box.bottom - box.top))
      const fitted = extent()
      const [px, py] = project([stackAt.x, 0, stackAt.z], cssWidth, cssHeight)
      ;[stackAt.x, stackAt.z] = unproject(px + anchor[0] - (fitted.left + fitted.right) / 2, py + anchor[1] - (fitted.top + fitted.bottom) / 2, cssWidth, cssHeight)
    }
    figureY = anchor[1]
    onScroll()

    if (area) {
      const s = width / cssWidth
      reading[0] = (area.left - rect.left) * s
      reading[1] = (rect.bottom - area.bottom) * s
      reading[2] = readingRight * s
      reading[3] = (rect.bottom - area.top) * s
      readingRadius = 64 * s
    }
  }

  const pointer = { x: 0, y: 0, inside: false }
  const litProperties = ['--lit-x', '--lit-y', '--lit-angle', '--cast-x', '--cast-y', '--lit-near']
  const litValues = new WeakMap<HTMLElement, string[]>()
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return
    pointer.x = event.clientX
    pointer.y = event.clientY
    pointer.inside = true
    const rect = host.getBoundingClientRect()
    const nx = (event.clientX - rect.left) / rect.width - 0.5
    const ny = (event.clientY - rect.top) / rect.height - 0.5
    // The lamp moves a little with the pointer, and the figure turns a little toward it.
    lamp.targetX = nx * 4
    lamp.targetZ = ny * 3
    // Under reduced motion only the light follows; the figure holds still.
    tilt.target = motion.matches ? 0 : nx * 0.08
    schedule()
  }
  const onPointerLeave = () => {
    pointer.inside = false
    lamp.targetX = 0
    lamp.targetZ = 0
    tilt.target = 0
    schedule()
  }

  /** How far each layer has lifted off the one below it, from collapsed (0) to exploded (1). */
  const spread = (time: number) => {
    if (motion.matches) return [1, 1, 1]
    return [0, 1, 2].map(index => {
      const opened = easeInOut(clamp01((time - 0.55 - index * 0.22) / 1.6))
      const breath = 1 + Math.sin(time * 0.55 - index * 0.9) * 0.035
      const settle = 1 - easeInOut(clamp01(leaving * 1.6 - index * 0.08)) * 0.6
      return opened * breath * settle
    })
  }

  const draw = (now: number) => {
    frame = 0
    const u = uniform
    if (disposed || !u) return
    if (startedAt < 0) startedAt = now
    const elapsed = (now - startedAt) / 1000
    // Once the figure has opened and nothing is being followed, it only breathes and the print drifts:
    // half the frame rate is indistinguishable and spares the battery.
    if (!motion.matches && elapsed > 3.4 && !wasSettling && lastFrame >= 0 && now - lastFrame < 30) {
      schedule()
      return
    }
    const delta = lastFrame < 0 ? 16 : now - lastFrame
    lastFrame = now
    const time = motion.matches ? 24 : elapsed

    const follow = 1 - Math.exp((-Math.min(delta, 64) / 1000) * 3)
    lamp.offsetX += (lamp.targetX - lamp.offsetX) * follow
    lamp.offsetZ += (lamp.targetZ - lamp.offsetZ) * follow
    tilt.value += (tilt.target - tilt.value) * follow
    const settling = Math.abs(lamp.targetX - lamp.offsetX) + Math.abs(lamp.targetZ - lamp.offsetZ) + Math.abs(tilt.target - tilt.value) > 0.002
    wasSettling = settling

    const s = stackAt.scale
    // The theme's lamp: above the figure, a little left and behind it.
    lamp.x = stackAt.x + (-4.2 + lamp.offsetX) * s
    lamp.y = 9.5 * s
    lamp.z = stackAt.z + (-1.6 + lamp.offsetZ) * s

    const [e0, e1, e2] = spread(time)
    const layers: Vec3 = [0.12 * e0, 0.12 * e0 + 0.15 + 0.95 * e1, 0]
    layers[2] = layers[1] + 0.15 + 1.0 * e2
    const angle = turn + tilt.value

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    gl.viewport(0, 0, width, height)
    gl.uniform2f(u.uResolution, width, height)
    gl.uniform1f(u.uTime, time)
    gl.uniform1f(u.uBoot, motion.matches ? 9 : (elapsed - 0.15) / 2.2)
    gl.uniform3fv(u.uCamPos, camPos)
    gl.uniform3fv(u.uCamTarget, camTarget)
    gl.uniform1f(u.uFocal, focal)
    gl.uniform3f(u.uLamp, lamp.x, lamp.y, lamp.z)
    gl.uniform3fv(u.uLampColor, colors.dark ? [1, 0.965, 0.92] : [1, 0.99, 0.975])
    gl.uniform3fv(u.uGround, colors.ground)
    gl.uniform3fv(u.uInk, colors.ink)
    gl.uniform1f(u.uDark, colors.dark)
    gl.uniform4fv(u.uReading, reading)
    gl.uniform1f(u.uReadingRadius, readingRadius)
    gl.uniform4fv(u.uNotes, notesClear)
    gl.uniform1i(u.uAtlas, 0)
    gl.uniform4f(u.uStack, stackAt.x, stackAt.z, s, angle)
    gl.uniform3fv(u.uLayers, layers)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    if (!host.hasAttribute('data-still-ready')) host.setAttribute('data-still-ready', '')
    // Once the layers have opened, the notes answer at once instead of waiting out the entrance.
    if ((motion.matches || elapsed > 2.6) && !host.hasAttribute('data-still-open')) host.setAttribute('data-still-open', '')

    if (options.lit?.length) {
      // The lamp is far above the table, so on the page it acts as a direction: the one the figure's shadows take.
      const dx = stackAt.x - lamp.x
      const dz = stackAt.z - lamp.z
      const length = Math.hypot(dx, dz) || 1
      const sx = dx / length
      const sy = (dz / length) * Math.sin(pitch) + Math.cos(pitch) * 0.6
      const angle = (Math.atan2(-sx, sy) * 180) / Math.PI
      // Every box is read before any property is written, so the loop never forces a layout.
      const rects = options.lit.map(element => element.getBoundingClientRect())
      for (const [index, element] of options.lit.entries()) {
        const rect = rects[index]
        const near = pointer.inside ? clamp01(1 - Math.hypot(pointer.x - (rect.left + rect.width / 2), pointer.y - (rect.top + rect.height / 2)) / 260) : 0
        const litX = pointer.inside && near > 0 ? ((pointer.x - rect.left) / rect.width) * 100 : 50 - sx * 34
        const values = [
          `${litX.toFixed(1)}%`,
          `${(pointer.inside && near > 0 ? ((pointer.y - rect.top) / rect.height) * 100 - 120 : -160).toFixed(1)}%`,
          `${angle.toFixed(1)}deg`,
          `${(sx * 3.5).toFixed(2)}px`,
          `${(sy * 4.5).toFixed(2)}px`,
          near.toFixed(3),
        ]
        // Only a changed value is written, so a still lamp restyles and repaints nothing.
        const last = litValues.get(element) ?? []
        values.forEach((value, at) => { if (last[at] !== value) element.style.setProperty(litProperties[at], value) })
        litValues.set(element, values)
      }
    }

    if (options.onAnchors) {
      // Each layer's rightmost top corner on the stage.
      const c = Math.cos(angle)
      const sn = Math.sin(angle)
      const toWorld = (lx: number, ly: number, lz: number): Vec3 => [stackAt.x + (c * lx - sn * lz) * s, ly * s, stackAt.z + (sn * lx + c * lz) * s]
      const anchors = footprints.map(([cx, cz, hx, hz, top], index) => {
        let best: [number, number] = [-Infinity, 0]
        for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const point = project(toWorld(cx + dx * hx * 0.94, layers[index] + top, cz + dz * hz * 0.94), cssWidth, cssHeight)
          if (point[0] > best[0]) best = point
        }
        return { x: best[0], y: best[1] }
      })
      // The table's note starts on open, printed table in front of the tray, so its leader is a line, not a stub.
      const [tx, ty] = project(toWorld(1.0, 0, 2.9), cssWidth, cssHeight)
      const box = options.onAnchors([{ x: tx, y: ty }, ...anchors], { width: cssWidth, height: cssHeight, reach, wide })
      const k = width / cssWidth
      if (box) [notesClear[0], notesClear[1], notesClear[2], notesClear[3]] = [box.left * k, (cssHeight - box.bottom) * k, box.right * k, (cssHeight - box.top) * k]
      else notesClear.fill(0)
    }

    // A slow GPU gets fewer pixels; a fast one earns them back.
    if (!motion.matches && delta < 250) {
      const throttled = elapsed > 3.4 && !settling
      if (delta > (throttled ? 48 : 24)) { slowFrames++; fastFrames = 0 } else if (delta < (throttled ? 36 : 14)) { fastFrames++; slowFrames = 0 }
      if (slowFrames > 20 && quality > 0.4) { quality *= 0.84; slowFrames = 0; layout() }
      if (fastFrames > 240 && quality < (coarse.matches ? 0.75 : 1)) { quality = Math.min(quality * 1.08, 1); fastFrames = 0; layout() }
    }
    if (!motion.matches || settling) schedule()
  }

  function schedule() {
    if (disposed || frame || !uniform || !visible || document.hidden) return
    frame = requestAnimationFrame(draw)
  }

  const resize = new ResizeObserver(() => { layout(); schedule() })
  resize.observe(canvas)
  if (options.reading) resize.observe(options.reading)
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible) { lastFrame = -1; onScroll(); schedule() }
  })
  intersection.observe(host)
  const theme = new MutationObserver(() => { readColors(); schedule() })
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
  const onVisibility = () => { lastFrame = -1; schedule() }
  // Dragged to a screen of another density, the figure is drawn at that screen's pixels.
  let density = matchMedia(`(resolution: ${devicePixelRatio}dppx)`)
  const onDensity = () => {
    density.removeEventListener('change', onDensity)
    density = matchMedia(`(resolution: ${devicePixelRatio}dppx)`)
    density.addEventListener('change', onDensity)
    layout()
    schedule()
  }
  density.addEventListener('change', onDensity)
  document.addEventListener('visibilitychange', onVisibility)
  motion.addEventListener('change', schedule)
  host.addEventListener('pointermove', onPointerMove)
  host.addEventListener('pointerleave', onPointerLeave)
  const onScroll = () => {
    // Off screen the hero keeps its last value; the intersection observer reads it again on the way back.
    if (!visible) return
    // The layers settle once the figure's middle has passed the upper third of the window, so on a phone, where
    // the figure stands below the words, it is still open when it is scrolled into view.
    const view = innerHeight || cssHeight
    const middle = host.getBoundingClientRect().top + figureY
    leaving = clamp01((view * 0.35 - middle) / (view * 0.6))
    // While the layers close, the notes step aside rather than chase edges that slide toward each other.
    host.toggleAttribute('data-still-closing', leaving > 0 && !motion.matches)
  }
  addEventListener('scroll', onScroll, { passive: true })
  const onLost = (event: Event) => {
    event.preventDefault()
    cancelAnimationFrame(frame)
    frame = 0
    host.removeAttribute('data-still-ready')
    host.removeAttribute('data-still-open')
  }
  canvas.addEventListener('webglcontextlost', onLost)

  /**
   * Takes the linked program into use once it is ready, then starts drawing. A program that fails to link hides
   * the canvas, and the hero keeps its plain ground.
   */
  const link = () => {
    if (disposed) return
    if (parallel && !gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) {
      setTimeout(link, 16)
      return
    }
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      if (gl.isContextLost()) return
      canvas.hidden = true
      console.warn(gl.getShaderInfoLog(fragment) || gl.getShaderInfoLog(vertex) || gl.getProgramInfoLog(program) || 'Cannot build the figure')
      return
    }
    gl.useProgram(program)
    uniform = Object.fromEntries(names.map(name => [name, gl.getUniformLocation(program, name)])) as Record<typeof names[number], WebGLUniformLocation | null>
    schedule()
  }

  readColors()
  uploadAtlas()
  // The real faces change both the glyphs and how far the words reach.
  document.fonts?.ready.then(() => { if (!disposed) { uploadAtlas(); layout(); schedule() } })
  layout()
  link()

  return () => {
    disposed = true
    cancelAnimationFrame(frame)
    resize.disconnect()
    intersection.disconnect()
    theme.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
    density.removeEventListener('change', onDensity)
    motion.removeEventListener('change', schedule)
    host.removeEventListener('pointermove', onPointerMove)
    host.removeEventListener('pointerleave', onPointerLeave)
    removeEventListener('scroll', onScroll)
    canvas.removeEventListener('webglcontextlost', onLost)
    gl.deleteProgram(program)
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    gl.deleteBuffer(buffer)
    gl.deleteTexture(atlas)
  }
}
