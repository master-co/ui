/**
 * Transcript: cues that follow a recording as it plays, and play it from where they begin.
 *
 * `transcript(root)` finds its media through the root's `aria-controls`: the id of a player, whose
 * `player-media` it takes, or of an `<audio>` or `<video>`. It looks each time the media speaks, so a media
 * written after the transcript, or another one named later, is followed. As the media plays it marks the cue being spoken
 * with `aria-current="true"`: the last cue whose `data-start` has passed, so the place is kept through a pause
 * between two cues. The stylesheet draws every cue before it as played.
 *
 * The list follows the current cue: it scrolls itself, and only itself, to keep that cue in its middle, at
 * once for a reader who asks for reduced motion. When the reader scrolls the list and the current cue leaves
 * the view, it stops following and shows `transcript-return`; that button, a cue the reader chooses, or the
 * reader scrolling the current cue back into view, starts it again.
 *
 * A press on a cue, or Enter on its time, sets the media's time to its start. The times are one tab stop:
 * the arrow keys, Home and End move between them (a roving `tabindex`).
 *
 * The cues are the page's, written in the list, or a renderer's. When the list is empty the behavior writes
 * them from the media's first captions or subtitles track (`draw: false` leaves the list to a renderer). Such a
 * track loads its cues only once it is not disabled, so the behavior sets a disabled track to `hidden`, which
 * shows nothing over the picture, and removes the rows it wrote when it detaches.
 */
import { clock } from './internal.js'

/** How a time is written on the controls, for a renderer that writes the first HTML itself: 0:05, 12:40, 1:02:09. */
export { clock }

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * @typedef {object} TranscriptOptions
 * @property {HTMLMediaElement} [media] The media to follow, when `aria-controls` does not name it.
 * @property {TextTrack} [track] The track to write the cues from, when the list is empty: the media's first
 *   captions or subtitles track by default.
 * @property {boolean} [draw] Whether to write the cues from the track when the list is empty: true.
 */

/**
 * The words of a WebVTT cue, without its tags, and who says them when a voice tag names it.
 * @param {string} text
 * @param {Document} document
 */
function words(text, document) {
  const voice = /^<v(?:\.[^\s>]+)*\s+([^>]+)>/.exec(text)?.[1]?.trim()
  // A textarea decodes the entities and runs nothing.
  const decoder = document.createElement('textarea')
  decoder.innerHTML = text.replace(/<[^>]*>/g, '')
  return { speaker: voice, text: decoder.value.replace(/\s+/g, ' ').trim() }
}

/**
 * @param {HTMLElement} root The element with the `transcript` class.
 * @param {TranscriptOptions} [options]
 * @returns {() => void} Removes everything the behavior added.
 */
export function transcript(root, options = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)
  const detach = () => controller.abort()

  const document = root.ownerDocument
  /** The media the transcript follows, as the page names it now. */
  const find = () => {
    if (options.media) return options.media
    const id = root.getAttribute('aria-controls')
    const named = id ? document.getElementById(id) : null
    return /** @type {HTMLMediaElement | null} */ (named?.matches('audio, video') ? named : named?.querySelector('.player-media, audio, video') ?? null)
  }
  const list = /** @type {HTMLElement} */ (root.querySelector('.transcript-list') ?? root)
  const back = /** @type {HTMLElement | null} */ (root.querySelector('.transcript-return'))
  const media = find()

  const cues = () => /** @type {HTMLElement[]} */ ([...list.querySelectorAll('.transcript-cue')])
  /** The cues the keys may land on: not hidden, as by a search that filters the transcript. */
  const shown = () => cues().filter((cue) => !cue.closest('[hidden]'))
  /** @param {Element} cue */
  const start = (cue) => Number(cue.getAttribute('data-start'))
  /** @param {Element | null | undefined} cue */
  const time = (cue) => /** @type {HTMLElement | null} */ (cue?.querySelector('.transcript-time') ?? null)
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

  /** @type {HTMLElement | null} */
  let current = null
  let away = false
  /** When the reader last did something that scrolls: a wheel, a touch, a key, the scrollbar. */
  let intent = -Infinity

  // Rows from the track, when the page wrote none.
  /** @type {HTMLElement[]} */
  const written = []
  const tracks = () => [...(media?.textTracks ?? [])]
  const source = options.track ?? tracks().find((each) => each.kind === 'captions' || each.kind === 'subtitles') ?? tracks().find((each) => each.kind !== 'metadata' && each.kind !== 'chapters')
  function write() {
    if (options.draw === false || !source?.cues?.length || cues().length) return
    const all = [...source.cues]
    // Every time in one form, with the hours once any cue is an hour in, as the player writes its time.
    const hours = all.some((cue) => cue.startTime >= 3600)
    for (const cue of all) {
      const { speaker, text } = words(/** @type {VTTCue} */ (cue).text ?? '', document)
      const row = document.createElement('li')
      row.className = 'transcript-cue'
      row.setAttribute('data-start', String(Math.round(cue.startTime * 1000) / 1000))
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'transcript-time'
      button.textContent = clock(cue.startTime, hours)
      const paragraph = document.createElement('p')
      paragraph.className = 'transcript-text'
      if (speaker) {
        const who = document.createElement('span')
        who.className = 'transcript-speaker'
        who.textContent = speaker
        paragraph.append(who)
      }
      paragraph.append(text)
      row.append(button, paragraph)
      list.append(row)
      written.push(row)
    }
    mark(true)
  }
  if (media && source && options.draw !== false && !cues().length) {
    const disabled = source.mode === 'disabled'
    if (disabled) source.mode = 'hidden'
    const element = [...media.querySelectorAll('track')].find((each) => each.track === source)
    element?.addEventListener('load', write, { signal })
    signal.addEventListener('abort', () => {
      for (const row of written) row.remove()
      if (disabled && source.mode === 'hidden') source.mode = 'disabled'
    })
  }

  /** @param {HTMLElement | null} cue Whether the cue is at least partly inside the list's view. */
  const visible = (cue) => {
    if (!cue) return true
    const view = list.getBoundingClientRect()
    const row = cue.getBoundingClientRect()
    return row.bottom > view.top && row.top < view.bottom
  }

  /** @param {boolean} value */
  const setAway = (value) => {
    away = value
    if (back) back.hidden = !value
  }

  /** Scroll the list, and nothing around it, to put the current cue in its middle. */
  const follow = (smooth = true) => {
    if (!current || typeof list.scrollTo !== 'function') return
    const view = list.getBoundingClientRect()
    const row = current.getBoundingClientRect()
    const top = list.scrollTop + (row.top - view.top) - (list.clientHeight - row.height) / 2
    list.scrollTo({ top: Math.max(0, top), behavior: smooth && !reduced() ? 'smooth' : 'instant' })
  }

  /** @type {Map<HTMLElement, string | null>} Each time's `tabindex` before the script wrote one, given back on detach. */
  const original = new Map()
  /** The time a reader enters the list at: the current cue's, or the one focus is on, or the first. */
  const rove = () => {
    const inside = list.contains(document.activeElement) ? document.activeElement?.closest('.transcript-cue') : null
    // A hidden cue cannot take focus: the stop is then the nearest shown cue before it, or the first shown.
    const open = shown()
    const before = (/** @type {Element | null | undefined} */ cue) => {
      if (!cue) return undefined
      if (open.includes(/** @type {HTMLElement} */ (cue))) return cue
      return open.findLast((each) => each.compareDocumentPosition(cue) & Node.DOCUMENT_POSITION_FOLLOWING)
    }
    const stop = time(before(inside) ?? before(current) ?? open[0])
    // Asked at every timeupdate: a time is written only when its place in the tab order changes.
    for (const cue of cues()) {
      const button = time(cue)
      if (!button) continue
      if (!original.has(button)) original.set(button, button.getAttribute('tabindex'))
      const wanted = button === stop ? '0' : '-1'
      if (button.getAttribute('tabindex') !== wanted) button.setAttribute('tabindex', wanted)
    }
  }

  /** Mark the cue being spoken, and follow it unless the reader has scrolled away. */
  function mark(jump = false) {
    const now = find()?.currentTime ?? 0
    /** @type {HTMLElement | null} */
    let found = null
    for (const cue of cues()) {
      if (start(cue) <= now + 0.01) found = cue
      else break
    }
    for (const cue of list.querySelectorAll('.transcript-cue[aria-current]')) if (cue !== found) cue.removeAttribute('aria-current')
    if (found && found.getAttribute('aria-current') !== 'true') found.setAttribute('aria-current', 'true')
    const moved = found !== current
    current = found
    rove()
    if (!moved && !jump) return
    if (away && visible(current)) setAway(false)
    if (!away) follow(!jump)
  }

  // A media's events do not bubble; the document hears them on their way down.
  for (const type of ['timeupdate', 'seeked', 'loadedmetadata']) {
    document.addEventListener(type, (event) => { if (event.target === find()) mark() }, { signal, capture: true })
  }

  // The reader scrolls: a scroll that follows their own input and leaves the current cue out of view stops the following.
  const reader = () => { intent = Date.now() }
  for (const type of ['wheel', 'touchmove', 'keydown']) list.addEventListener(type, reader, { signal, passive: true })
  list.addEventListener('pointerdown', (event) => { if (event.target === list) reader() }, { signal })
  list.addEventListener('scroll', () => {
    if (Date.now() - intent > 1000) return
    setAway(!visible(current))
  }, { signal, passive: true })

  // A cue plays from its time: a press anywhere on it, or Enter and Space on its time button.
  list.addEventListener('click', (event) => {
    const cue = /** @type {Element} */ (event.target).closest?.('.transcript-cue')
    if (!cue || !list.contains(cue)) return
    // A reader selecting the words is reading, not seeking.
    const selection = document.getSelection?.()
    if (selection && !selection.isCollapsed && cue.contains(selection.anchorNode)) return
    if (!Number.isFinite(start(cue))) return
    const media = find()
    if (!media) return
    media.currentTime = start(cue)
    setAway(false)
    mark(true)
  }, { signal })

  list.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    const button = /** @type {Element} */ (event.target).closest?.('.transcript-time')
    if (!button) return
    // Hidden cues are passed over, as hidden rows of a tree and hidden tabs are.
    const all = shown()
    const at = all.findIndex((cue) => cue.contains(button))
    /** @type {number} */
    let next
    switch (event.key) {
      case 'ArrowDown': next = Math.min(all.length - 1, at + 1); break
      case 'ArrowUp': next = at < 0 ? 0 : Math.max(0, at - 1); break
      case 'Home': next = 0; break
      case 'End': next = all.length - 1; break
      default: return
    }
    event.preventDefault()
    time(all[next])?.focus()
    rove()
  }, { signal })

  back?.addEventListener('click', () => {
    setAway(false)
    follow()
    time(current)?.focus({ preventScroll: true })
    rove()
  }, { signal })

  signal.addEventListener('abort', () => {
    for (const cue of list.querySelectorAll('.transcript-cue[aria-current]')) cue.removeAttribute('aria-current')
    // Each time gets back the tabindex it had, as a tab and a row of a tree do: one the page wrote stays.
    for (const [button, index] of original) {
      if (index === null) button.removeAttribute('tabindex')
      else button.setAttribute('tabindex', index)
    }
    if (back) back.hidden = true
  })

  setAway(false)
  write()
  mark(true)
  return detach
}
