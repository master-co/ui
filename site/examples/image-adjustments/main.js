import { cropper } from '@master/ui/behaviors/cropper.js'

/**
 * Adjust a picture without changing it: crop it with the cropper, turn it a quarter at a time, and set its
 * brightness, contrast and saturation. What the page hands on is the original file and the adjustments as data;
 * cutting and encoding the picture is the application's image pipeline. The preview shows the adjustments with
 * the CSS filters that are exactly them; nothing here pretends to be a colour grade.
 *
 * Returns the function that stops it, which releases the object URL of a chosen picture.
 */
export function mount(root) {
  const controller = new AbortController()
  const { signal } = controller
  const $ = (selector) => root.querySelector(selector)
  const image = $('.cropper-image')
  const stage = $('[data-stage]')
  const input = $('input[type="file"]')
  const clear = $('[data-clear]')
  const error = $('[data-error]')
  const output = $('[data-output]')
  // The picture's own size, in the pixels the crop is measured in; its rendered size is something else.
  const size = () => ({ width: Number(image.getAttribute('width')), height: Number(image.getAttribute('height')) })
  const initial = { src: image.getAttribute('src'), alt: image.getAttribute('alt') }

  /** The original file, or null for the sample picture, and the object URL it is shown by. */
  let file = null
  let url = null
  const adjustments = { crop: null, rotate: 0, brightness: 100, contrast: 100, saturation: 100, mode: 'fit' }
  let crop = cropper($('.cropper'))
  adjustments.crop = crop.value

  /** The adjusted picture: the crop, turned and filtered, shown fit, fill or tiled in the stage. */
  function paint() {
    const { crop: box, rotate, brightness, contrast, saturation, mode } = adjustments
    const turned = Math.abs(rotate) % 180 === 90
    const width = turned ? box.height : box.width
    const height = turned ? box.width : box.height
    // The stage is a size container, so the result can be sized against it: contained to fit, covering to fill.
    stage.style.containerType = 'size'
    const ratio = width / height
    const tile = document.createElement('div')
    tile.style.cssText = [
      `aspect-ratio: ${width} / ${height}`,
      `filter: brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
      mode === 'fit' ? `width: min(100cqw, 100cqh * ${ratio})` : mode === 'fill' ? `width: max(100cqw, 100cqh * ${ratio})` : 'width: 100cqw; height: 100cqh; aspect-ratio: auto',
      'flex: none; position: relative; overflow: hidden',
    ].join(';')
    // The crop's picture, turned about its middle: a background sized so the crop fills the box before it turns.
    const picture = document.createElement('div')
    const { width: pictureWidth, height: pictureHeight } = size()
    const scaleX = pictureWidth / box.width * 100
    const scaleY = pictureHeight / box.height * 100
    picture.style.cssText = [
      'position: absolute; left: 50%; top: 50%',
      `width: ${turned ? (height / width) * 100 : 100}%`,
      `height: ${turned ? (width / height) * 100 : 100}%`,
      `translate: -50% -50%; rotate: ${rotate}deg`,
      `background-image: url("${image.currentSrc || image.src}")`,
      mode === 'tile' ? `background-size: ${scaleX / 4}% ${scaleY / 4}%; background-repeat: repeat` : `background-size: ${scaleX}% ${scaleY}%; background-repeat: no-repeat`,
      `background-position: ${box.width >= pictureWidth ? 0 : box.x / (pictureWidth - box.width) * 100}% ${box.height >= pictureHeight ? 0 : box.y / (pictureHeight - box.height) * 100}%`,
    ].join(';')
    tile.replaceChildren(picture)
    stage.replaceChildren(tile)
    stage.setAttribute('aria-label', `${image.alt}, adjusted`)
    for (const name of ['brightness', 'contrast', 'saturation']) $(`output[data-for="${name}"]`).textContent = `${adjustments[name]}%`
    output.textContent = JSON.stringify({
      file: file ? { name: file.name, type: file.type, size: file.size } : { sample: initial.src },
      ...adjustments,
    }, null, 2)
  }

  /** Counts the pictures asked for, so one that finishes loading late does not replace a later choice. */
  let latest = 0

  /** Show another picture: the cropper starts over on it, and the old object URL is released. */
  async function show(src, alt, chosen) {
    const turn = ++latest
    const probe = new Image()
    probe.src = src
    // An alert that is already shown says nothing when it is shown again: it leaves first, so each failure is heard.
    error.hidden = true
    try {
      await probe.decode()
    } catch {
      if (chosen) URL.revokeObjectURL(src)
      if (turn !== latest) return
      error.hidden = false
      input.value = ''
      return
    }
    // A picture chosen since this one began to load is the one to show: this one is let go.
    if (turn !== latest) {
      if (chosen) URL.revokeObjectURL(src)
      return
    }
    if (url && url !== src) URL.revokeObjectURL(url)
    url = chosen ? src : null
    file = chosen
    image.src = src
    image.alt = alt
    image.setAttribute('width', String(probe.naturalWidth))
    image.setAttribute('height', String(probe.naturalHeight))
    crop()
    crop = cropper($('.cropper'))
    adjustments.crop = crop.value
    adjustments.rotate = 0
    clear.disabled = !chosen
    paint()
  }

  input.addEventListener('change', () => {
    const chosen = input.files?.[0]
    if (chosen) show(URL.createObjectURL(chosen), chosen.name, chosen)
  }, { signal })
  clear.addEventListener('click', () => {
    input.value = ''
    show(initial.src, initial.alt, null)
    input.focus()
  }, { signal })

  $('.cropper').addEventListener('change', () => {
    adjustments.crop = crop.value
    paint()
  }, { signal })
  $('.cropper').addEventListener('input', () => {
    adjustments.crop = crop.value
    paint()
  }, { signal })

  root.addEventListener('click', (event) => {
    const turn = event.target.closest('[data-rotate]')
    if (turn) {
      adjustments.rotate = (adjustments.rotate + Number(turn.dataset.rotate) + 360) % 360
      paint()
    } else if (event.target.closest('[data-reset]')) {
      Object.assign(adjustments, { rotate: 0, brightness: 100, contrast: 100, saturation: 100 })
      for (const name of ['brightness', 'contrast', 'saturation']) $(`input[name="${name}"]`).value = '100'
      crop.value = { x: 0, y: 0, ...size() }
      adjustments.crop = crop.value
      paint()
    }
  }, { signal })

  root.addEventListener('input', (event) => {
    const range = event.target.closest('input[type="range"][name]')
    if (range) {
      adjustments[range.name] = Number(range.value)
      paint()
    }
    const mode = event.target.closest('input[name="adjust-mode"]')
    if (mode?.checked) {
      adjustments.mode = mode.value
      paint()
    }
  }, { signal })

  paint()
  return () => {
    controller.abort()
    // A picture still loading is not shown on an example that has been taken away.
    latest += 1
    crop()
    if (url) URL.revokeObjectURL(url)
  }
}
