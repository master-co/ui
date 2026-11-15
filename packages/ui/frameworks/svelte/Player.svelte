<script lang="ts" module>
  import type { HTMLAttributes } from 'svelte/elements'

  export interface PlayerTrack {
    src: string
    /** Captions carry the sounds as well as the words; subtitles only the words. */
    kind?: 'captions' | 'subtitles'
    srclang: string
    label: string
    default?: boolean
  }

  export interface PlayerLabels {
    play: string
    seek: string
    mute: string
    volume: string
    speed: string
    captions: string
    pip: string
    fullscreen: string
  }

  export interface PlayerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
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
    /** The current time in seconds. Bind it, or leave it out: it starts at 0. Setting it seeks. */
    time?: number
    onTimeChange?: (time: number) => void
    /** Whether it plays. Bind it to play and pause from outside. */
    playing?: boolean
    onPlayingChange?: (playing: boolean) => void
    /** The speeds of the speed menu. */
    rates?: number[]
    /** The names of the controls, in the page's language. */
    labels?: Partial<PlayerLabels>
    /** What the seek track says for a time, in the page's language: its `aria-valuetext`. */
    valueText?: (time: number, duration: number) => string
    /** What the speed button says for a rate. */
    rateText?: (rate: number) => string
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { clock, player } from '@master/ui/behaviors/player.js'
  import { behavior } from './behavior.svelte.js'

  let { src, video, poster, tracks = [], label, time = $bindable(), onTimeChange, playing = $bindable(), onPlayingChange, rates = [0.5, 0.75, 1, 1.25, 1.5, 2], labels, valueText, rateText, class: className, ...root }: PlayerProps = $props()
  const name = $derived({ play: 'Play', seek: 'Seek', mute: 'Mute', volume: 'Volume', speed: 'Playback speed', captions: 'Captions', pip: 'Picture in picture', fullscreen: 'Full screen', ...labels })
  const id = $props.id()
  const speeds = `${id}-speeds`
  const first = untrack(() => time) ?? 0
  const rate = $derived(rates.includes(1) ? 1 : rates[0])
  let media = $state<HTMLMediaElement>()
  // The behavior finds its media as it attaches. Audio and video are two elements, so it attaches again when `video` changes.
  const seen = (element: HTMLElement, options?: { video?: boolean, valueText?: (time: number, duration: number) => string, rateText?: (rate: number) => string }) => player(element, { ...(options?.valueText && { valueText: options.valueText }), ...(options?.rateText && { rateText: options.rateText }) })
  const attach = behavior(seen, () => ({ video, valueText, rateText }))

  // What the owner sets goes in: a time a quarter second or more from the media's seeks, and playing plays.
  $effect(() => {
    const at = time
    if (media && at !== undefined && Math.abs(media.currentTime - at) >= 0.25) media.currentTime = at
  })
  $effect(() => {
    const play = playing
    if (!media || play === undefined || play === !media.paused) return
    if (play) media.play()?.catch?.(() => {})
    else media.pause()
  })

  // What the media does comes out: its time and whether it plays. What the owner set is not said back.
  const tell = () => {
    const now = media!.currentTime
    if (now === time) return
    time = now
    onTimeChange?.(now)
  }
  const told = () => {
    const now = !media!.paused
    if (now === playing) return
    playing = now
    onPlayingChange?.(now)
  }
</script>

{#snippet controls()}
  <div class="player-controls">
    <button type="button" class="player-button player-play" aria-label={name.play} aria-pressed="false">
      <svg class="icon player-off" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.8v14.4a1 1 0 0 0 1.5.86l11.5-7.2a1 1 0 0 0 0-1.72L8.5 3.94A1 1 0 0 0 7 4.8" /></svg>
      <svg class="icon player-on" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
    </button>
    <span class="player-elapsed">{clock(first)}</span>
    <input type="range" class="slider player-seek" min="0" max="0" step="any" value={first} aria-label={name.seek} />
    <span class="player-duration">{clock(0)}</span>
    <button type="button" class="player-button player-mute" aria-label={name.mute} aria-pressed="false">
      <svg class="icon player-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>
      <svg class="icon player-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" /><path d="m16 9 6 6M22 9l-6 6" /></svg>
    </button>
    <input type="range" class="slider player-volume" min="0" max="1" step="0.05" value="1" aria-label={name.volume} />
    <button type="button" class="player-button player-speed" popovertarget={speeds} aria-label={name.speed}>{rate}×</button>
    <div id={speeds} popover="auto" class="menu menu-top menu-end">
      {#each rates as each (each)}
        <label class="menu-item">
          <input class="menu-input" type="radio" name={speeds} value={each} checked={each === rate} />
          {each}×
        </label>
      {/each}
    </div>
    {#if video && tracks.length}
      <button type="button" class="player-button player-captions" aria-label={name.captions} aria-pressed="false">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 15h4M15 15h2M7 11h2M13 11h4" /></svg>
      </button>
    {/if}
    {#if video}
      <button type="button" class="player-button player-pip" aria-label={name.pip} aria-pressed="false">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" /><rect x="13" y="14" width="9" height="6" rx="1.5" /></svg>
      </button>
      <button type="button" class="player-button player-fullscreen" aria-label={name.fullscreen} aria-pressed="false">
        <svg class="icon player-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
        <svg class="icon player-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
      </button>
    {/if}
  </div>
{/snippet}

<!--
  @component
  A recording with the page's own controls over the native element, which keeps its controls until the behavior attaches.
-->
<div class={['player', video && 'player-video', className]} role="group" aria-label={label} {@attach attach} {...root}>
  {#if video}
    <!-- The captions are the page's to give, in `tracks`; a video without speech needs none. -->
    <!-- svelte-ignore a11y_media_has_caption -->
    <video class="player-media" {src} {poster} controls preload="metadata" playsinline bind:this={media} ontimeupdate={tell} onseeked={tell} onplay={told} onpause={told} onended={told}>
      {#each tracks as track (track.src)}
        <track src={track.src} kind={track.kind ?? 'captions'} srclang={track.srclang} label={track.label} default={track.default} />
      {/each}
    </video>
  {:else}
    <audio class="player-media" {src} controls preload="metadata" bind:this={media} ontimeupdate={tell} onseeked={tell} onplay={told} onpause={told} onended={told}></audio>
  {/if}
  {@render controls()}
</div>
