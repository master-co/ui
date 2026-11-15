<script setup lang="ts">
import { computed, onMounted, useId, useTemplateRef, watch } from 'vue'
import { clock, player } from '@master/ui/behaviors/player.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

export interface PlayerTrack {
  src: string
  /** Captions carry the sounds as well as the words; subtitles only the words. */
  kind?: 'captions' | 'subtitles'
  srclang: string
  label: string
  default?: boolean
}

const { video, tracks = [], rates = [0.5, 0.75, 1, 1.25, 1.5, 2], labels, valueText, rateText } = defineProps<{
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
  /** The speeds of the speed menu. */
  rates?: number[]
  /** The names of the controls, in the page's language. */
  labels?: Partial<Record<'play' | 'seek' | 'mute' | 'volume' | 'speed' | 'captions' | 'pip' | 'fullscreen', string>>
  /** What the seek track says for a time, in the page's language: its `aria-valuetext`. */
  valueText?: (time: number, duration: number) => string
  /** What the speed button says for a rate. */
  rateText?: (rate: number) => string
}>()
/** The current time in seconds: `v-model:time`. It moves as the media plays; setting it seeks. */
const time = defineModel<number>('time')
/** Whether it plays: `v-model:playing`. */
const playing = defineModel<boolean>('playing')

/* A recording with the page's own controls over the native element, which keeps its controls until the behavior attaches. */
const name = computed(() => ({ play: 'Play', seek: 'Seek', mute: 'Mute', volume: 'Volume', speed: 'Playback speed', captions: 'Captions', pip: 'Picture in picture', fullscreen: 'Full screen', ...labels }))
const speeds = `${useId()}-speeds`
const first = time.value ?? 0
const rate = computed(() => (rates.includes(1) ? 1 : rates[0]))
const root = useTemplateRef<HTMLDivElement>('root')
const media = useTemplateRef<HTMLMediaElement>('media')
// The behavior finds its media as it attaches. Audio and video are two elements, so it attaches again when `video` changes.
const seen = (element: HTMLElement, options?: { video?: boolean, valueText?: (time: number, duration: number) => string, rateText?: (rate: number) => string }) => player(element, { ...(options?.valueText && { valueText: options.valueText }), ...(options?.rateText && { rateText: options.rateText }) })
useBehavior(root, seen, () => ({ video, valueText, rateText }))

// What the owner sets goes in: a time a quarter second or more from the media's seeks, and playing plays.
/** What the owner and this component last agreed on: what was said, either way, is not said again. */
const said: { time?: number, playing?: boolean } = { time: time.value, playing: playing.value }
const seek = () => {
  if (time.value === undefined) return
  said.time = time.value
  if (media.value && Math.abs(media.value.currentTime - time.value) >= 0.25) media.value.currentTime = time.value
}
const play = () => {
  const element = media.value
  if (playing.value === undefined) return
  said.playing = playing.value
  if (!element || playing.value === !element.paused) return
  if (playing.value) element.play()?.catch?.(() => {})
  else element.pause()
}
onMounted(() => { seek(); play() })
watch(time, seek, { flush: 'post' })
watch(playing, play, { flush: 'post' })

// What the media does comes out: its time and whether it plays. What the owner set is not said back.
const tell = () => {
  if (!media.value || media.value.currentTime === said.time) return
  said.time = media.value.currentTime
  time.value = said.time
}
const told = () => {
  if (!media.value || !media.value.paused === said.playing) return
  said.playing = !media.value.paused
  playing.value = said.playing
}
</script>

<template>
  <div class="player" :class="{ 'player-video': video }" role="group" :aria-label="label" ref="root" v-bind="$attrs">
    <video v-if="video" class="player-media" ref="media" :src="src" :poster="poster" controls preload="metadata" playsinline @timeupdate="tell" @seeked="tell" @play="told" @pause="told" @ended="told">
      <track v-for="track in tracks" :key="track.src" :src="track.src" :kind="track.kind ?? 'captions'" :srclang="track.srclang" :label="track.label" :default="track.default">
    </video>
    <audio v-else class="player-media" ref="media" :src="src" controls preload="metadata" @timeupdate="tell" @seeked="tell" @play="told" @pause="told" @ended="told" />
    <div class="player-controls">
      <button type="button" class="player-button player-play" :aria-label="name.play" aria-pressed="false">
        <svg class="icon player-off" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.8v14.4a1 1 0 0 0 1.5.86l11.5-7.2a1 1 0 0 0 0-1.72L8.5 3.94A1 1 0 0 0 7 4.8" /></svg>
        <svg class="icon player-on" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
      </button>
      <span class="player-elapsed">{{ clock(first) }}</span>
      <input type="range" class="slider player-seek" min="0" max="0" step="any" :value.attr="first" :aria-label="name.seek">
      <span class="player-duration">{{ clock(0) }}</span>
      <button type="button" class="player-button player-mute" :aria-label="name.mute" aria-pressed="false">
        <svg class="icon player-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>
        <svg class="icon player-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" /><path d="m16 9 6 6M22 9l-6 6" /></svg>
      </button>
      <input type="range" class="slider player-volume" min="0" max="1" step="0.05" value="1" :aria-label="name.volume">
      <button type="button" class="player-button player-speed" :popovertarget="speeds" :aria-label="name.speed">{{ rate }}×</button>
      <div :id="speeds" popover="auto" class="menu menu-top menu-end">
        <label v-for="each in rates" :key="each" class="menu-item">
          <input class="menu-input" type="radio" :name="speeds" :value="each" :checked="each === rate">
          {{ each }}×
        </label>
      </div>
      <button v-if="video && tracks.length" type="button" class="player-button player-captions" :aria-label="name.captions" aria-pressed="false">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 15h4M15 15h2M7 11h2M13 11h4" /></svg>
      </button>
      <template v-if="video">
        <button type="button" class="player-button player-pip" :aria-label="name.pip" aria-pressed="false">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" /><rect x="13" y="14" width="9" height="6" rx="1.5" /></svg>
        </button>
        <button type="button" class="player-button player-fullscreen" :aria-label="name.fullscreen" aria-pressed="false">
          <svg class="icon player-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
          <svg class="icon player-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
        </button>
      </template>
    </div>
  </div>
</template>
