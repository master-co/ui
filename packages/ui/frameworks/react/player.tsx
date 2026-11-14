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
}

const names = { play: 'Play', seek: 'Seek', mute: 'Mute', volume: 'Volume', speed: 'Playback speed', captions: 'Captions', pip: 'Picture in picture', fullscreen: 'Full screen' }
const stroke = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const
const solid = { viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true } as const

/** A recording with the page's own controls over the native element, which keeps its controls until the behavior attaches. */
export function Player({ src, video, poster, tracks = [], label, time, defaultTime = 0, onTimeChange, playing, onPlayingChange, rates = [0.5, 0.75, 1, 1.25, 1.5, 2], labels, className, ...root }: PlayerProps) {
  const name = { ...names, ...labels }
  const speeds = `${useId()}-speeds`
  const [first] = useState(time ?? defaultTime)
  const media = useRef<HTMLVideoElement & HTMLAudioElement>(null)
  const ref = useBehavior(player)
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
  }, [first])

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
          <svg className="icon player-off" {...solid}><path d="M7 4.8v14.4a1 1 0 0 0 1.5.86l11.5-7.2a1 1 0 0 0 0-1.72L8.5 3.94A1 1 0 0 0 7 4.8" /></svg>
          <svg className="icon player-on" {...solid}><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
        </button>
        <span className="player-elapsed">{clock(first)}</span>
        <input type="range" className="slider player-seek" min={0} max={0} step="any" defaultValue={first} aria-label={name.seek} />
        <span className="player-duration">{clock(0)}</span>
        <button type="button" className="player-button player-mute" aria-label={name.mute} aria-pressed="false">
          <svg className="icon player-off" {...stroke}><path d="M11 5 6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>
          <svg className="icon player-on" {...stroke}><path d="M11 5 6 9H3v6h3l5 4z" /><path d="m16 9 6 6M22 9l-6 6" /></svg>
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
            <svg className="icon" {...stroke}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 15h4M15 15h2M7 11h2M13 11h4" /></svg>
          </button>
        )}
        {video && (
          <button type="button" className="player-button player-pip" aria-label={name.pip} aria-pressed="false">
            <svg className="icon" {...stroke}><path d="M21 10V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" /><rect x="13" y="14" width="9" height="6" rx="1.5" /></svg>
          </button>
        )}
        {video && (
          <button type="button" className="player-button player-fullscreen" aria-label={name.fullscreen} aria-pressed="false">
            <svg className="icon player-off" {...stroke}><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
            <svg className="icon player-on" {...stroke}><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
          </button>
        )}
      </div>
    </div>
  )
}
