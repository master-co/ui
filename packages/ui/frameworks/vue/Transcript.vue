<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { clock, transcript } from '@master/ui/behaviors/transcript.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

export interface TranscriptCue {
  /** The second the cue begins. */
  start: number
  /** What is said. */
  text: string
  /** Who says it, when the recording has several voices. */
  speaker?: string
}

const { returnLabel = 'Back to current' } = defineProps<{
  /** The id of the player, or of the audio or video element, the transcript follows. */
  media: string
  /** The cues, in the order they are spoken. */
  cues: TranscriptCue[]
  /** The words of the button that brings the current cue back into view. */
  returnLabel?: string
}>()

/* What a recording says, as cues that follow it as it plays. The rows are written from `cues`; the behavior marks and follows them. */
const root = useTemplateRef<HTMLElement>('root')
useBehavior(root, transcript, () => ({ draw: false }))
</script>

<template>
  <section class="transcript" :aria-controls="media" ref="root" v-bind="$attrs">
    <ol class="transcript-list scroll-area">
      <li v-for="(cue, index) in cues" :key="`${cue.start}-${index}`" class="transcript-cue" :data-start="cue.start">
        <button type="button" class="transcript-time">{{ clock(cue.start) }}</button>
        <p class="transcript-text">
          <span v-if="cue.speaker !== undefined" class="transcript-speaker">{{ cue.speaker }}</span>
          {{ cue.text }}
        </p>
      </li>
    </ol>
    <button type="button" class="btn btn-sm btn-pill transcript-return" hidden>{{ returnLabel }}</button>
  </section>
</template>
