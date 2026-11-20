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
        <svg class="icon player-off" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.1664 3.8652L11.8319 7.1338A1 1 0 0 1 11.8319 8.8662L6.1664 12.1348A1 1 0 0 1 4.6667 11.2686L4.6667 4.7314A1 1 0 0 1 6.1664 3.8652Z" /></svg>
        <svg class="icon player-on" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="2.6667" height="10" rx="0.8" /><rect x="9.3333" y="3" width="2.6667" height="10" rx="0.8" /></svg>
      </button>
      <span class="player-elapsed">{{ clock(first) }}</span>
      <input type="range" class="slider player-seek" min="0" max="0" step="any" :value.attr="first" :aria-label="name.seek">
      <span class="player-duration">{{ clock(0) }}</span>
      <button type="button" class="player-button player-mute" :aria-label="name.mute" aria-pressed="false">
        <svg class="icon player-off" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.6 6L4.4365 6A0.6 0.6 0 0 0 4.8378 5.846L6.9986 3.9013A0.6 0.6 0 0 1 8 4.3472L8 11.6528A0.6 0.6 0 0 1 6.9986 12.0987L4.8378 10.154A0.6 0.6 0 0 0 4.4365 10L2.6 10A0.6 0.6 0 0 1 2 9.4L2 6.6A0.6 0.6 0 0 1 2.6 6Z" /><path d="M10.3333 6C11.3333 7 11.3333 9 10.3333 10" /><path d="M12.3333 3.6667C14.6667 6 14.6667 10 12.3333 12.3333" /></svg>
        <svg class="icon player-on" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.6 6L4.4365 6A0.6 0.6 0 0 0 4.8378 5.846L6.9986 3.9013A0.6 0.6 0 0 1 8 4.3472L8 11.6528A0.6 0.6 0 0 1 6.9986 12.0987L4.8378 10.154A0.6 0.6 0 0 0 4.4365 10L2.6 10A0.6 0.6 0 0 1 2 9.4L2 6.6A0.6 0.6 0 0 1 2.6 6Z" /><path d="M11 6.3333L14.3333 9.6667" /><path d="M14.3333 6.3333L11 9.6667" /></svg>
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
        <svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="12" height="10" rx="1" /><path d="M4.6667 6.6667L6 6.6667" /><path d="M8.6667 6.6667L11.3333 6.6667" /><path d="M4.6667 9.6667L7.3333 9.6667" /><path d="M10 9.6667L11.3333 9.6667" /></svg>
      </button>
      <template v-if="video">
        <button type="button" class="player-button player-pip" :aria-label="name.pip" aria-pressed="false">
          <svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 12L2.3333 12A1 1 0 0 1 1.3333 11L1.3333 3.6667A1 1 0 0 1 2.3333 2.6667L13 2.6667A1 1 0 0 1 14 3.6667L14 6.1667" /><rect x="8" y="8.6667" width="6.6667" height="4.6667" rx="1" /></svg>
        </button>
        <button type="button" class="player-button player-fullscreen" :aria-label="name.fullscreen" aria-pressed="false">
          <svg class="icon player-off" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.6667 6L2.6667 3.6667A1 1 0 0 1 3.6667 2.6667L6 2.6667" /><path d="M10 2.6667L12.3333 2.6667A1 1 0 0 1 13.3333 3.6667L13.3333 6" /><path d="M13.3333 10L13.3333 12.3333A1 1 0 0 1 12.3333 13.3333L10 13.3333" /><path d="M6 13.3333L3.6667 13.3333A1 1 0 0 1 2.6667 12.3333L2.6667 10" /></svg>
          <svg class="icon player-on" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.6667 6L5 6A1 1 0 0 0 6 5L6 2.6667" /><path d="M10 2.6667L10 5A1 1 0 0 0 11 6L13.3333 6" /><path d="M13.3333 10L11 10A1 1 0 0 0 10 11L10 13.3333" /><path d="M6 13.3333L6 11A1 1 0 0 0 5 10L2.6667 10" /></svg>
        </button>
      </template>
    </div>
  </div>
</template>
