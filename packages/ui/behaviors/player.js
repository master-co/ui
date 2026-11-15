/**
 * Player: the controls of the page's own over a native `<audio>` or `<video>`.
 *
 * The media keeps its `controls` attribute in the markup, so without this script the browser's own controls
 * play it. `player(root)` removes the attribute, which shows the player's row, and puts it back when it
 * detaches. From then on the media is the one source of truth: the script listens to it and mirrors what it
 * says into attributes the stylesheet reads, and every control asks the media to change rather than changing
 * itself.
 *
 * - The play button is `aria-pressed` while the media plays, the mute button while it is muted, the captions
 *   button while the first captions or subtitles track is showing, the full screen and picture-in-picture
 *   buttons while the player is in either. A button the browser cannot use is `hidden`.
 * - The seek track's `max` is the duration and its `value` the current time, with an `aria-valuetext` in words;
 *   the elapsed time and the duration are written into their parts. What has loaded around the current time
 *   is `--player-buffered` on the root, from 0 to 1.
 * - The volume slider holds the volume, the speed button says the playback rate, and the radios of its menu
 *   (`menu-input` in the popover its `popovertarget` names) set the rate.
 * - Over a video, `--player-idle` turns 1 when the pointer has been still for a while, or left, and 0 when it
 *   moves; the stylesheet fades the controls while the video plays, unless something in the player has
 *   keyboard focus. A tap on a video whose controls have faded only brings them back.
 * - The keys of a player work wherever focus is inside it: see the contract's `keyboard` list.
 *
 * The function the behavior returns has a `value`: the current time, in seconds. Set it to seek from outside;
 * that dispatches nothing of its own, though the media says `seeking`, `seeked` and `timeupdate` as it always does.
 */

import { clock } from './internal.js'

/** How a time is written on the controls, for a renderer that writes the first HTML itself: 0:05, 12:40, 1:02:09. */
export { clock }

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * A time in words, in English: 1 minute 5 seconds.
 * @param {number} seconds
 */
function spoken(seconds) {
  const whole = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0
  const units = /** @type {[number, string][]} */ ([[Math.floor(whole / 3600), 'hour'], [Math.floor(whole / 60) % 60, 'minute'], [whole % 60, 'second']])
  const words = units.filter(([count]) => count).map(([count, unit]) => `${count} ${unit}${count === 1 ? '' : 's'}`)
  return words.length ? words.join(' ') : '0 seconds'
}

/**
 * @typedef {object} PlayerOptions
 * @property {number} [step] Seconds the arrow keys seek by: 5.
 * @property {number} [jump] Seconds J and L seek by: 10.
 * @property {number} [volumeStep] How much ArrowUp and ArrowDown change the volume: 0.1.
 * @property {number} [idle] Milliseconds the pointer is still over a playing video before its controls fade: 2500.
 * @property {(time: number, duration: number) => string} [valueText] The seek track's `aria-valuetext`, in the
 *   page's language. In English by default: "1 minute 5 seconds of 3 minutes".
 * @property {(rate: number) => string} [rateText] What the speed button says for a rate: "1.5×" by default.
 */

/**
 * @param {HTMLElement} root The element with the `player` class.
 * @param {PlayerOptions} [options]
 * @returns {(() => void) & { value: number }} Removes everything the behavior added and gives the media its
 *   controls back. Its `value` is the current time in seconds.
 */
export function player(root, options = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)

  const step = options.step ?? 5
  const jump = options.jump ?? 10
  const volumeStep = options.volumeStep ?? 0.1
  const idleAfter = options.idle ?? 2500
  const valueText = options.valueText ?? ((time, duration) => Number.isFinite(duration) && duration > 0 ? `${spoken(time)} of ${spoken(duration)}` : spoken(time))
  const rateText = options.rateText ?? ((rate) => `${rate}×`)

  const found = /** @type {HTMLMediaElement | null} */ (root.querySelector('.player-media'))
  /** @param {string} name */
  const part = (name) => /** @type {HTMLElement | null} */ (root.querySelector(`.player-${name}`))
  const play = part('play')
  const mute = part('mute')
  const captions = part('captions')
  const pip = part('pip')
  const fullscreen = part('fullscreen')
  const speed = /** @type {HTMLButtonElement | null} */ (part('speed'))
  const elapsed = part('elapsed')
  const duration = part('duration')
  const seek = /** @type {HTMLInputElement | null} */ (part('seek'))
  const volume = /** @type {HTMLInputElement | null} */ (part('volume'))

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer
  const detach = /** @type {(() => void) & { value: number }} */ (Object.defineProperty(() => controller.abort(), 'value', {
    enumerable: true,
    get: () => found?.currentTime ?? 0,
    set: (/** @type {number} */ time) => {
      if (!found || !Number.isFinite(time)) return
      // The time it is at already changes nothing: a seek to it would still make the media seek, and load.
      const next = Math.max(0, time)
      if (next === found.currentTime) return
      found.currentTime = next
      drawTime()
    },
  }))
  if (!found) return detach
  const media = found

  const document = root.ownerDocument
  const video = media.localName === 'video'
  const native = media.hasAttribute('controls')
  const tabindex = media.getAttribute('tabindex')
  media.removeAttribute('controls')
  // A click on the picture gives the player focus, so its keys work after it.
  if (video && tabindex === null) media.setAttribute('tabindex', '-1')
  signal.addEventListener('abort', () => {
    clearTimeout(timer)
    if (native) media.setAttribute('controls', '')
    if (video && tabindex === null) media.removeAttribute('tabindex')
    root.style.removeProperty('--player-buffered')
    root.style.removeProperty('--player-idle')
  })

  /** @param {Element | null} button @param {boolean} on */
  const press = (button, on) => button?.setAttribute('aria-pressed', String(on))
  /**
   * Write what is asked four times a second, and on every move of the pointer, only when it changes: the same
   * words again are a change to the document all the same, and a custom property again restyles the player.
   * @param {Element | null} element @param {string} name @param {string} value
   */
  const attribute = (element, name, value) => { if (element && element.getAttribute(name) !== value) element.setAttribute(name, value) }
  /** @param {string} name @param {string} value */
  const property = (name, value) => { if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value) }
  const length = () => (Number.isFinite(media.duration) ? media.duration : NaN)
  /** The first track a reader would call captions. */
  const track = () => [...(media.textTracks ?? [])].find((each) => each.kind === 'captions' || each.kind === 'subtitles')
  const doc = /** @type {Document & { webkitFullscreenElement?: Element | null }} */ (document)
  const full = () => (doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null) === root
  const element = /** @type {HTMLElement & { webkitRequestFullscreen?: () => void }} */ (root)
  const screen = /** @type {HTMLVideoElement & { webkitEnterFullscreen?: () => void }} */ (media)
  const canFull = () => video && ((doc.fullscreenEnabled && typeof element.requestFullscreen === 'function') || typeof screen.webkitEnterFullscreen === 'function')
  const canPip = () => video && Boolean(doc.pictureInPictureEnabled) && typeof (/** @type {HTMLVideoElement} */ (media)).requestPictureInPicture === 'function' && !(/** @type {HTMLVideoElement} */ (media)).disablePictureInPicture
  /** The menu of speeds the speed button opens. */
  const rates = () => (speed?.getAttribute('popovertarget') ? document.getElementById(/** @type {string} */ (speed.getAttribute('popovertarget'))) : null)

  /** While the reader drags the seek track, the media's time does not move the thumb under the finger. */
  let dragging = false

  function drawPlaying() {
    press(play, !media.paused)
  }

  function drawVolume() {
    press(mute, media.muted)
    if (volume) {
      volume.value = String(media.volume)
      volume.setAttribute('aria-valuetext', media.muted ? `${Math.round(media.volume * 100)}%, muted` : `${Math.round(media.volume * 100)}%`)
    }
  }

  function drawTime() {
    const total = length()
    const now = media.currentTime || 0
    const hours = total >= 3600
    // Said four times a second: written only when the figure changes, so the row is not laid out again for nothing.
    const text = clock(now, hours)
    if (elapsed && elapsed.textContent !== text) elapsed.textContent = text
    if (seek && !dragging) {
      attribute(seek, 'max', String(Number.isFinite(total) ? total : 0))
      if (seek.value !== String(now)) seek.value = String(now)
    }
    attribute(seek, 'aria-valuetext', valueText(now, total))
    drawBuffered()
  }

  function drawDuration() {
    const total = length()
    if (duration) duration.textContent = Number.isFinite(total) ? clock(total) : duration.textContent
    if (seek) seek.max = String(Number.isFinite(total) ? total : 0)
    drawTime()
  }

  function drawBuffered() {
    const total = length()
    const ranges = media.buffered
    let end = 0
    if (ranges && Number.isFinite(total) && total > 0) {
      for (let index = 0; index < ranges.length; index++) {
        if (ranges.start(index) <= media.currentTime + 0.5 && ranges.end(index) >= media.currentTime) end = Math.max(end, ranges.end(index))
      }
      property('--player-buffered', String(Math.round(Math.min(1, end / total) * 1000) / 1000))
    } else property('--player-buffered', '0')
  }

  function drawRate() {
    if (speed) speed.textContent = rateText(media.playbackRate)
    for (const radio of /** @type {NodeListOf<HTMLInputElement>} */ (rates()?.querySelectorAll('.menu-input[type="radio"]') ?? [])) {
      radio.checked = Number(radio.value) === media.playbackRate
    }
  }

  function drawCaptions() {
    const found = track()
    if (captions) captions.hidden = !video || !found
    press(captions, found?.mode === 'showing')
  }

  function drawScreens() {
    if (fullscreen) fullscreen.hidden = !canFull()
    press(fullscreen, full())
    if (pip) pip.hidden = !canPip()
    press(pip, Boolean(doc.pictureInPictureElement) && doc.pictureInPictureElement === media)
  }

  function draw() {
    drawPlaying()
    drawVolume()
    drawDuration()
    drawRate()
    drawCaptions()
    drawScreens()
  }

  // A device whose volume only its own buttons set (an iPhone) leaves the property where it was.
  if (volume) {
    const probe = document.createElement('audio')
    probe.volume = 0.5
    volume.hidden = probe.volume !== 0.5
  }

  const toggle = () => {
    if (media.paused) media.play()?.catch?.(() => {})
    else media.pause()
  }
  /** @param {number} time */
  const seekTo = (time) => {
    const total = length()
    media.currentTime = Math.max(0, Number.isFinite(total) ? Math.min(total, time) : time)
    drawTime()
  }
  /** @param {number} level */
  const setVolume = (level) => {
    media.volume = Math.round(Math.max(0, Math.min(1, level)) * 100) / 100
    if (media.muted && level > 0) media.muted = false
    drawVolume()
  }
  const toggleMute = () => {
    media.muted = !media.muted
    if (!media.muted && media.volume === 0) media.volume = 0.5
    drawVolume()
  }
  const toggleCaptions = () => {
    const found = track()
    if (!found) return
    // Hidden, not disabled: a transcript reading the same track keeps its cues.
    found.mode = found.mode === 'showing' ? 'hidden' : 'showing'
    drawCaptions()
  }
  const toggleFullscreen = () => {
    if (!canFull()) return
    if (full()) doc.exitFullscreen?.()?.catch?.(() => {})
    else if (doc.fullscreenEnabled && element.requestFullscreen) element.requestFullscreen()?.catch?.(() => {})
    else screen.webkitEnterFullscreen?.()
  }
  const togglePip = () => {
    if (!canPip()) return
    if (doc.pictureInPictureElement === media) doc.exitPictureInPicture?.()?.catch?.(() => {})
    else (/** @type {HTMLVideoElement} */ (media)).requestPictureInPicture()?.catch?.(() => {})
  }

  // Idle: the pointer has not moved over the video for a while, or has left it.
  /** @param {boolean} still */
  const idle = (still) => property('--player-idle', still ? '1' : '0')
  const wake = () => {
    idle(false)
    clearTimeout(timer)
    if (video) timer = setTimeout(() => idle(true), idleAfter)
  }
  idle(false)

  // The media says what it is; the controls follow.
  const listen = { signal }
  for (const type of ['play', 'pause', 'playing', 'ended']) media.addEventListener(type, drawPlaying, listen)
  media.addEventListener('play', wake, listen)
  media.addEventListener('volumechange', drawVolume, listen)
  for (const type of ['timeupdate', 'seeking', 'seeked']) media.addEventListener(type, drawTime, listen)
  for (const type of ['durationchange', 'loadedmetadata', 'emptied']) media.addEventListener(type, drawDuration, listen)
  media.addEventListener('progress', drawBuffered, listen)
  media.addEventListener('ratechange', drawRate, listen)
  for (const type of ['enterpictureinpicture', 'leavepictureinpicture']) media.addEventListener(type, drawScreens, listen)
  media.textTracks?.addEventListener?.('addtrack', drawCaptions, listen)
  media.textTracks?.addEventListener?.('change', drawCaptions, listen)
  for (const type of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(type, drawScreens, listen)

  // The controls ask the media.
  play?.addEventListener('click', toggle, listen)
  mute?.addEventListener('click', toggleMute, listen)
  captions?.addEventListener('click', toggleCaptions, listen)
  fullscreen?.addEventListener('click', toggleFullscreen, listen)
  pip?.addEventListener('click', togglePip, listen)
  // Only the main button drags the thumb; the release of another may go to a menu and never be heard.
  seek?.addEventListener('pointerdown', (event) => { dragging = event.button === 0 }, listen)
  seek?.addEventListener('contextmenu', () => { dragging = false }, listen)
  seek?.addEventListener('input', () => {
    media.currentTime = Number(seek.value)
    const text = clock(Number(seek.value), length() >= 3600)
    if (elapsed && elapsed.textContent !== text) elapsed.textContent = text
    attribute(seek, 'aria-valuetext', valueText(Number(seek.value), length()))
  }, listen)
  seek?.addEventListener('change', () => { dragging = false; drawTime() }, listen)
  // A drag the browser takes back, for a scroll or a gesture, ends too: the thumb follows the media again.
  for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, () => { dragging = false }, listen)
  volume?.addEventListener('input', () => setVolume(Number(volume.value)), listen)
  rates()?.addEventListener('change', (event) => {
    const radio = /** @type {HTMLInputElement} */ (event.target)
    if (radio.matches?.('.menu-input[type="radio"]') && Number.isFinite(Number(radio.value))) media.playbackRate = Number(radio.value)
  }, listen)

  // The picture: a click plays or pauses, a double click fills the screen. A tap on faded controls only shows them.
  let revealing = false
  root.addEventListener('pointerdown', (event) => {
    revealing = event.target === media && event.pointerType === 'touch' && !media.paused && root.style.getPropertyValue('--player-idle') === '1'
    wake()
  }, listen)
  root.addEventListener('pointermove', (event) => { if (event.pointerType !== 'touch') wake() }, listen)
  root.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'touch' || !video) return
    clearTimeout(timer)
    idle(true)
  }, listen)
  if (video) {
    media.addEventListener('click', () => {
      if (revealing) revealing = false
      else toggle()
    }, listen)
    media.addEventListener('dblclick', toggleFullscreen, listen)
  }

  root.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
    const target = /** @type {HTMLElement} */ (event.target)
    // A menu has its own keys, and a field takes letters.
    if (target.closest('.menu') || target.matches('input:not([type="range"]), textarea, select, [contenteditable]:not([contenteditable="false"])')) return
    const onVolume = target === volume
    const onSeek = target === seek
    const onButton = Boolean(target.closest('button, a[href], summary'))
    const back = getComputedStyle(root).direction === 'rtl' ? 1 : -1
    // A key held down repeats. Seeking and the volume go on with it; a toggle would turn on and off again and
    // again, and full screen flicker in and out, so the repeat of a toggle is taken and does nothing.
    const once = !event.repeat
    switch (event.key) {
      case ' ':
        if (onButton) return
        if (once) toggle()
        break
      case 'k':
      case 'K':
        if (once) toggle()
        break
      case 'ArrowLeft':
      case 'ArrowRight':
        if (onVolume) return
        seekTo(media.currentTime + step * (event.key === 'ArrowLeft' ? back : -back))
        break
      case 'ArrowUp':
      case 'ArrowDown':
        if (onVolume) return
        if (onSeek) seekTo(media.currentTime + step * (event.key === 'ArrowUp' ? 1 : -1))
        else setVolume(media.volume + volumeStep * (event.key === 'ArrowUp' ? 1 : -1))
        break
      case 'j':
      case 'J':
        seekTo(media.currentTime - jump)
        break
      case 'l':
      case 'L':
        seekTo(media.currentTime + jump)
        break
      case 'm':
      case 'M':
        if (once) toggleMute()
        break
      case 'c':
      case 'C':
        if (!video || !track()) return
        if (once) toggleCaptions()
        break
      case 'f':
      case 'F':
        if (!canFull()) return
        if (once) toggleFullscreen()
        break
      case 'Home':
        if (onVolume) return
        seekTo(0)
        break
      case 'End':
        if (onVolume) return
        seekTo(Number.isFinite(length()) ? length() : media.currentTime)
        break
      default:
        return
    }
    event.preventDefault()
    wake()
  }, listen)

  draw()
  return detach
}
