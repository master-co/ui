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

export interface StillLifeOptions {
  /** The text the table keeps clear of glyphs. */
  reading?: HTMLElement | null
  /**
   * Controls lit by the same lamp. Each receives `--lit-x`, `--lit-y` (where the lamp is, relative to the control),
   * `--lit-angle` (toward the lamp, for a rim gradient), `--cast-x`, `--cast-y` (its shadow, falling the way the
   * figure's shadows fall on the table) and `--lit-near` (0–1, how close the pointer carries the lamp).
   */
  lit?: HTMLElement[]
  /** Called with each layer's edge on the stage (table, tray, sheet, floating sheet) whenever the figure moves. */
  onAnchors?: (anchors: NoteAnchor[], stage: { width: number, height: number, wide: boolean }) => void
}

/** Footprints of the layers in the stack's units: center x, center z, half width, half depth, top above its underside. */
const footprints = [
  [0, 0, 3.3, 2.2, 0.14],
  [0.18, -0.04, 2.72, 1.74, 0.14],
  [-1.02, 0.98, 1.22, 0.84, 0.12],
] as const

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
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'Cannot compile the figure')
    return shader
  }
  const program = gl.createProgram()!
  const vertex = compile(gl.VERTEX_SHADER, vertexSource)
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource)
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.bindAttribLocation(program, 0, 'position')
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'Cannot link the figure')
  gl.useProgram(program)

  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const names = ['uResolution', 'uTime', 'uBoot', 'uCamPos', 'uCamTarget', 'uFocal', 'uLamp', 'uLampColor', 'uGround', 'uInk', 'uDark', 'uReading', 'uReadingRadius', 'uAtlas', 'uStack', 'uLayers'] as const
  const uniform = Object.fromEntries(names.map(name => [name, gl.getUniformLocation(program, name)])) as Record<typeof names[number], WebGLUniformLocation | null>

  let disposed = false
  let visible = true
  let frame = 0
  let width = 1
  let height = 1
  let cssWidth = 1
  let cssHeight = 1
  let wide = true
  let quality = coarse.matches ? 0.65 : 0.85
  let slowFrames = 0
  let fastFrames = 0
  let lastFrame = -1
  let startedAt = -1
  let wasSettling = false
  /** How far the hero has scrolled out of view, 0 to 1; the layers settle back together as it leaves. */
  let leaving = 0
  const stackAt = { x: 0, z: 0, scale: 1 }
  const lamp = { x: 0, y: 8, z: 0, offsetX: 0, offsetZ: 0, targetX: 0, targetZ: 0 }
  const tilt = { value: 0, target: 0 }
  const reading = [0, 0, 0, 0]
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

  const layout = () => {
    const rect = canvas.getBoundingClientRect()
    cssWidth = Math.max(rect.width, 1)
    cssHeight = Math.max(rect.height, 1)
    const ratio = Math.min(devicePixelRatio || 1, 2) * quality
    const scale = Math.min(ratio, Math.sqrt(2_600_000 / (cssWidth * cssHeight)))
    width = Math.max(1, Math.round(cssWidth * scale))
    height = Math.max(1, Math.round(cssHeight * scale))
    canvas.width = width
    canvas.height = height

    // Beside the words on a wide stage, in the room right of them; under them on a narrow one.
    const area = options.reading?.getBoundingClientRect()
    const readingRight = area ? area.right - rect.left : cssWidth * 0.45
    const readingBottom = area ? area.bottom - rect.top : cssHeight * 0.55
    wide = cssWidth >= 1200 && cssWidth / cssHeight > 1.15
    let anchor: [number, number]
    let span: number
    if (wide) {
      const left = readingRight + 24
      const room = cssWidth - 16 - left
      // The notes take a column at the far right when the room is generous.
      const figure = room > 720 ? room - 190 : room
      span = Math.min(figure * 0.86, 760)
      anchor = [left + figure / 2, cssHeight * 0.58]
    } else {
      span = Math.min(cssWidth * 0.84, 600)
      anchor = [cssWidth / 2, readingBottom + (cssHeight - readingBottom) * 0.5]
    }
    const [x, z] = unproject(anchor[0], anchor[1], cssWidth, cssHeight)
    const [ex] = unproject(anchor[0] + 100, anchor[1], cssWidth, cssHeight)
    const unitsPerPixel = Math.abs(ex - x) / 100
    // The turned stack spans about seven of its units across the stage.
    stackAt.scale = (span * unitsPerPixel) / 7
    stackAt.x = x
    stackAt.z = z

    if (area) {
      const s = width / cssWidth
      reading[0] = (area.left - rect.left) * s
      reading[1] = (rect.bottom - area.bottom) * s
      reading[2] = (area.right - rect.left) * s
      reading[3] = (rect.bottom - area.top) * s
      readingRadius = 64 * s
    }
  }

  const pointer = { x: 0, y: 0, inside: false }
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
    tilt.target = nx * 0.08
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
    if (disposed) return
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

    gl.viewport(0, 0, width, height)
    gl.uniform2f(uniform.uResolution, width, height)
    gl.uniform1f(uniform.uTime, time)
    gl.uniform1f(uniform.uBoot, motion.matches ? 9 : (elapsed - 0.15) / 2.2)
    gl.uniform3fv(uniform.uCamPos, camPos)
    gl.uniform3fv(uniform.uCamTarget, camTarget)
    gl.uniform1f(uniform.uFocal, focal)
    gl.uniform3f(uniform.uLamp, lamp.x, lamp.y, lamp.z)
    gl.uniform3fv(uniform.uLampColor, colors.dark ? [1, 0.965, 0.92] : [1, 0.99, 0.975])
    gl.uniform3fv(uniform.uGround, colors.ground)
    gl.uniform3fv(uniform.uInk, colors.ink)
    gl.uniform1f(uniform.uDark, colors.dark)
    gl.uniform4fv(uniform.uReading, reading)
    gl.uniform1f(uniform.uReadingRadius, readingRadius)
    gl.uniform1i(uniform.uAtlas, 0)
    gl.uniform4f(uniform.uStack, stackAt.x, stackAt.z, s, angle)
    gl.uniform3fv(uniform.uLayers, layers)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    if (!host.hasAttribute('data-still-ready')) host.setAttribute('data-still-ready', '')

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
        element.style.setProperty('--lit-x', `${litX.toFixed(1)}%`)
        element.style.setProperty('--lit-y', `${(pointer.inside && near > 0 ? ((pointer.y - rect.top) / rect.height) * 100 - 120 : -160).toFixed(1)}%`)
        element.style.setProperty('--lit-angle', `${angle.toFixed(1)}deg`)
        element.style.setProperty('--cast-x', `${(sx * 3.5).toFixed(2)}px`)
        element.style.setProperty('--cast-y', `${(sy * 4.5).toFixed(2)}px`)
        element.style.setProperty('--lit-near', near.toFixed(3))
      }
    }

    if (options.onAnchors) {
      // Each layer's rightmost top corner on the stage; the table's note sits beyond the tray.
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
      const [tx, ty] = project(toWorld(2.4, 0, 3.3), cssWidth, cssHeight)
      options.onAnchors([{ x: tx, y: ty }, ...anchors], { width: cssWidth, height: cssHeight, wide })
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
    if (disposed || frame || !visible || document.hidden) return
    frame = requestAnimationFrame(draw)
  }

  const resize = new ResizeObserver(() => { layout(); schedule() })
  resize.observe(canvas)
  if (options.reading) resize.observe(options.reading)
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible) { lastFrame = -1; schedule() }
  })
  intersection.observe(host)
  const theme = new MutationObserver(() => { readColors(); schedule() })
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
  const onVisibility = () => { lastFrame = -1; schedule() }
  document.addEventListener('visibilitychange', onVisibility)
  motion.addEventListener('change', schedule)
  host.addEventListener('pointermove', onPointerMove)
  host.addEventListener('pointerleave', onPointerLeave)
  const onScroll = () => {
    const rect = host.getBoundingClientRect()
    leaving = clamp01(-rect.top / Math.max(rect.height, 1))
  }
  addEventListener('scroll', onScroll, { passive: true })
  onScroll()
  const onLost = (event: Event) => {
    event.preventDefault()
    cancelAnimationFrame(frame)
    frame = 0
    host.removeAttribute('data-still-ready')
  }
  canvas.addEventListener('webglcontextlost', onLost)

  readColors()
  uploadAtlas()
  document.fonts?.ready.then(() => { if (!disposed) { uploadAtlas(); schedule() } })
  layout()
  schedule()

  return () => {
    disposed = true
    cancelAnimationFrame(frame)
    resize.disconnect()
    intersection.disconnect()
    theme.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
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
