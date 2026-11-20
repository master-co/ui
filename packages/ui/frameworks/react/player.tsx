'use client'
import { useEffect, useId, useRef, useState, type ComponentProps } from 'react'
import { clock, player } from '@master/ui/behaviors/player.js'
import { useBehavior } from './use-behavior'

export interface PlayerTrack {
  src: string
  /** Captions carry the sounds as well as the words; subtitles only the words. */
  kind?: 'captions' | 'subtitles'
  srcLang: string
  label: string
  default?: boolean
}

export interface PlayerProps extends Omit<ComponentProps<'div'>, 'children' | 'ref'> {
  /** The recording. */
  src: string
  /** A video: the frame, with the controls over its lower edge. Without it, an audio player. */
  video?: boolean
  /** The picture a video shows before it plays. */
  poster?: string
  /** Text tracks of a video; the first captions or subtitles track is what the captions button turns on. */
  tracks?: PlayerTrack[]
  /** What the recording is: the name of the player. */
  label: string
  /** The current time in seconds, when this component is told it. Setting it seeks. */
  time?: number
  defaultTime?: number
  /** Called as the time moves, while it plays and when the reader seeks. */
  onTimeChange?: (time: number) => void
  /** Whether it plays, when this component is told it. */
  playing?: boolean
  /** Called when it starts or stops playing, by the reader or by the browser. */
  onPlayingChange?: (playing: boolean) => void
  /** The speeds of the speed menu. */
  rates?: number[]
  /** The names of the controls, in the page's language. */
  labels?: Partial<typeof names>
  /** What the seek track says for a time, in the page's language: its `aria-valuetext`. */
  valueText?: (time: number, duration: number) => string
  /** What the speed button says for a rate. */
  rateText?: (rate: number) => string
}

/** The behavior finds its media as it attaches. Audio and video are two elements, so it attaches again when `video` changes. */
const seen = (root: HTMLElement, options?: { video?: boolean, valueText?: (time: number, duration: number) => string, rateText?: (rate: number) => string }) => player(root, { ...(options?.valueText && { valueText: options.valueText }), ...(options?.rateText && { rateText: options.rateText }) })

const names = { play: 'Play', seek: 'Seek', mute: 'Mute', volume: 'Volume', speed: 'Playback speed', captions: 'Captions', pip: 'Picture in picture', fullscreen: 'Full screen' }

/** A recording with the page's own controls over the native element, which keeps its controls until the behavior attaches. */
export function Player({ src, video, poster, tracks = [], label, time, defaultTime = 0, onTimeChange, playing, onPlayingChange, rates = [0.5, 0.75, 1, 1.25, 1.5, 2], labels, valueText, rateText, className, ...root }: PlayerProps) {
  const name = { ...names, ...labels }
  const speeds = `${useId()}-speeds`
  const [first] = useState(time ?? defaultTime)
  const media = useRef<HTMLVideoElement & HTMLAudioElement>(null)
  const ref = useBehavior(seen, { video, valueText, rateText })
  const live = useRef({ onTimeChange, onPlayingChange })
  live.current = { onTimeChange, onPlayingChange }
  /** What the owner and this component last agreed on: what was said, either way, is not said again. */
  const said = useRef({ time: time ?? defaultTime, playing })

  // What the media does comes out: its time and whether it plays. What the owner set is not said back.
  useEffect(() => {
    const element = media.current
    if (!element) return
    const controller = new AbortController()
    const tell = () => {
      const now = element.currentTime
      if (now === said.current.time) return
      said.current.time = now
      live.current.onTimeChange?.(now)
    }
    const told = () => {
      const now = !element.paused
      if (now === said.current.playing) return
      said.current.playing = now
      live.current.onPlayingChange?.(now)
    }
    for (const type of ['timeupdate', 'seeked']) element.addEventListener(type, tell, { signal: controller.signal })
    for (const type of ['play', 'pause', 'ended']) element.addEventListener(type, told, { signal: controller.signal })
    if (first && element.currentTime !== first) element.currentTime = first
    return () => controller.abort()
  // The media is another element once `video` changes: its events are heard on the one that is there.
  }, [first, video])

  // What the owner sets goes in: a time a quarter second or more from the media's seeks, and playing plays.
  useEffect(() => {
    const element = media.current
    if (time === undefined) return
    said.current.time = time
    if (element && Math.abs(element.currentTime - time) >= 0.25) element.currentTime = time
  }, [time])
  useEffect(() => {
    const element = media.current
    if (playing === undefined) return
    said.current.playing = playing
    if (!element || playing === !element.paused) return
    if (playing) element.play()?.catch?.(() => {})
    else element.pause()
  }, [playing])

  const Media = video ? 'video' : 'audio'
  const rate = rates.includes(1) ? 1 : rates[0]
  return (
    <div className={[ 'player', video && 'player-video', className ].filter(Boolean).join(' ')} role="group" aria-label={label} ref={ref} {...root}>
      <Media className="player-media" src={src} poster={video ? poster : undefined} controls preload="metadata" playsInline={video || undefined} ref={media}>
        {video && tracks.map(track => <track key={track.src} src={track.src} kind={track.kind ?? 'captions'} srcLang={track.srcLang} label={track.label} default={track.default} />)}
      </Media>
      <div className="player-controls">
        <button type="button" className="player-button player-play" aria-label={name.play} aria-pressed="false">
          <svg className="icon player-off" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6.1664 3.8652L11.8319 7.1338A1 1 0 0 1 11.8319 8.8662L6.1664 12.1348A1 1 0 0 1 4.6667 11.2686L4.6667 4.7314A1 1 0 0 1 6.1664 3.8652Z" /></svg>
          <svg className="icon player-on" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="3" width="2.6667" height="10" rx="0.8" /><rect x="9.3333" y="3" width="2.6667" height="10" rx="0.8" /></svg>
        </button>
        <span className="player-elapsed">{clock(first)}</span>
        <input type="range" className="slider player-seek" min={0} max={0} step="any" defaultValue={first} aria-label={name.seek} />
        <span className="player-duration">{clock(0)}</span>
        <button type="button" className="player-button player-mute" aria-label={name.mute} aria-pressed="false">
          <svg className="icon player-off" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.6 6L4.4365 6A0.6 0.6 0 0 0 4.8378 5.846L6.9986 3.9013A0.6 0.6 0 0 1 8 4.3472L8 11.6528A0.6 0.6 0 0 1 6.9986 12.0987L4.8378 10.154A0.6 0.6 0 0 0 4.4365 10L2.6 10A0.6 0.6 0 0 1 2 9.4L2 6.6A0.6 0.6 0 0 1 2.6 6Z" /><path d="M10.3333 6C11.3333 7 11.3333 9 10.3333 10" /><path d="M12.3333 3.6667C14.6667 6 14.6667 10 12.3333 12.3333" /></svg>
          <svg className="icon player-on" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.6 6L4.4365 6A0.6 0.6 0 0 0 4.8378 5.846L6.9986 3.9013A0.6 0.6 0 0 1 8 4.3472L8 11.6528A0.6 0.6 0 0 1 6.9986 12.0987L4.8378 10.154A0.6 0.6 0 0 0 4.4365 10L2.6 10A0.6 0.6 0 0 1 2 9.4L2 6.6A0.6 0.6 0 0 1 2.6 6Z" /><path d="M11 6.3333L14.3333 9.6667" /><path d="M14.3333 6.3333L11 9.6667" /></svg>
        </button>
        <input type="range" className="slider player-volume" min={0} max={1} step={0.05} defaultValue={1} aria-label={name.volume} />
        <button type="button" className="player-button player-speed" popoverTarget={speeds} aria-label={name.speed}>{`${rate}×`}</button>
        <div id={speeds} popover="auto" className="menu menu-top menu-end">
          {rates.map(each => (
            <label className="menu-item" key={each}>
              <input className="menu-input" type="radio" name={speeds} value={each} defaultChecked={each === rate} />
              {`${each}×`}
            </label>
          ))}
        </div>
        {video && tracks.length > 0 && (
          <button type="button" className="player-button player-captions" aria-label={name.captions} aria-pressed="false">
            <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="3" width="12" height="10" rx="1" /><path d="M4.6667 6.6667L6 6.6667" /><path d="M8.6667 6.6667L11.3333 6.6667" /><path d="M4.6667 9.6667L7.3333 9.6667" /><path d="M10 9.6667L11.3333 9.6667" /></svg>
          </button>
        )}
        {video && (
          <button type="button" className="player-button player-pip" aria-label={name.pip} aria-pressed="false">
            <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5.5 12L2.3333 12A1 1 0 0 1 1.3333 11L1.3333 3.6667A1 1 0 0 1 2.3333 2.6667L13 2.6667A1 1 0 0 1 14 3.6667L14 6.1667" /><rect x="8" y="8.6667" width="6.6667" height="4.6667" rx="1" /></svg>
          </button>
        )}
        {video && (
          <button type="button" className="player-button player-fullscreen" aria-label={name.fullscreen} aria-pressed="false">
            <svg className="icon player-off" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.6667 6L2.6667 3.6667A1 1 0 0 1 3.6667 2.6667L6 2.6667" /><path d="M10 2.6667L12.3333 2.6667A1 1 0 0 1 13.3333 3.6667L13.3333 6" /><path d="M13.3333 10L13.3333 12.3333A1 1 0 0 1 12.3333 13.3333L10 13.3333" /><path d="M6 13.3333L3.6667 13.3333A1 1 0 0 1 2.6667 12.3333L2.6667 10" /></svg>
            <svg className="icon player-on" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.6667 6L5 6A1 1 0 0 0 6 5L6 2.6667" /><path d="M10 2.6667L10 5A1 1 0 0 0 11 6L13.3333 6" /><path d="M13.3333 10L11 10A1 1 0 0 0 10 11L10 13.3333" /><path d="M6 13.3333L6 11A1 1 0 0 0 5 10L2.6667 10" /></svg>
          </button>
        )}
      </div>
    </div>
  )
}
