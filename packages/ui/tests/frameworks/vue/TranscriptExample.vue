<script setup lang="ts">
import Player from '../../../frameworks/vue/Player.vue'
import Transcript from '../../../frameworks/vue/Transcript.vue'

defineOptions({ inheritAttrs: false })
defineProps<{ cues: { start: number, text: string, speaker?: string }[] }>()
</script>

<template>
  <Player id="talk" src="/demo/recording.m4a" label="A short recording" />
  <Transcript media="talk" aria-label="Transcript" :cues="cues" v-bind="$attrs" />
</template>
