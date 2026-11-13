/**
 * A media element that plays nothing. happy-dom has no media pipeline: its audio and video keep a time and a
 * paused flag but say little of it. `stub()` gives an element the state a browser's has and the events a
 * browser sends when that state changes, so a behavior that listens to the media can be tested.
 */
export interface Track {
  kind: string
  mode: string
  label?: string
  cues: { startTime: number, endTime: number, text: string }[] | null
}

export interface MediaState {
  paused: boolean
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  playbackRate: number
  buffered: [number, number][]
  tracks: Track[]
}

export function stub(media: any, init: Partial<MediaState> = {}) {
  const window = media.ownerDocument.defaultView
  const state: MediaState = { paused: true, currentTime: 0, duration: NaN, volume: 1, muted: false, playbackRate: 1, buffered: [], tracks: [], ...init }
  const fire = (type: string) => media.dispatchEvent(new window.Event(type))
  const played: string[] = []
  /** A track as a browser has it: its cues only once it is not disabled. */
  const track = (each: Track) => ({
    kind: each.kind,
    label: each.label ?? '',
    get mode() { return each.mode },
    set mode(value: string) { each.mode = value },
    get cues() { return each.mode === 'disabled' ? null : each.cues },
  })
  const tracks = Object.assign(new window.EventTarget(), {})
  Object.defineProperties(media, {
    paused: { configurable: true, get: () => state.paused },
    ended: { configurable: true, get: () => false },
    currentTime: {
      configurable: true,
      get: () => state.currentTime,
      set: (value: number) => {
        state.currentTime = Number(value)
        fire('seeking')
        fire('timeupdate')
        fire('seeked')
      },
    },
    duration: { configurable: true, get: () => state.duration },
    volume: {
      configurable: true,
      get: () => state.volume,
      set: (value: number) => {
        if (value < 0 || value > 1) throw new window.DOMException('The volume is outside the range [0, 1].', 'IndexSizeError')
        state.volume = Number(value)
        fire('volumechange')
      },
    },
    muted: { configurable: true, get: () => state.muted, set: (value: boolean) => { state.muted = Boolean(value); fire('volumechange') } },
    playbackRate: { configurable: true, get: () => state.playbackRate, set: (value: number) => { state.playbackRate = Number(value); fire('ratechange') } },
    buffered: {
      configurable: true,
      get: () => ({ length: state.buffered.length, start: (index: number) => state.buffered[index][0], end: (index: number) => state.buffered[index][1] }),
    },
    textTracks: {
      configurable: true,
      get: () => Object.assign(tracks, { length: state.tracks.length, [Symbol.iterator]: function* () { for (const each of state.tracks) yield track(each) } }),
    },
    play: { configurable: true, value: () => { played.push('play'); if (state.paused) { state.paused = false; fire('play'); fire('playing') } return Promise.resolve() } },
    pause: { configurable: true, value: () => { played.push('pause'); if (!state.paused) { state.paused = true; fire('pause') } } },
  })
  return {
    state,
    played,
    fire,
    /** The media learns how long it is. */
    load(duration: number) { state.duration = duration; fire('loadedmetadata'); fire('durationchange') },
    /** Time passes while it plays. */
    advance(to: number) { state.currentTime = to; fire('timeupdate') },
  }
}
