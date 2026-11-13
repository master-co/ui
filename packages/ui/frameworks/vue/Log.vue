<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { follow } from '@master/ui/behaviors/follow.js'
import { useBehavior } from './use-behavior'

defineProps<{
  /** The words of the button that leads back to the end, such as "Jump to latest". */
  latestLabel: string
}>()
/**
 * Whether the region keeps its end in view: `v-model:following`. It stops when the reader scrolls away and
 * starts again at the end.
 */
const following = defineModel<boolean>('following', { default: true })
defineSlots<{
  /** What the region holds. */
  default?: () => unknown
}>()

/*
 * A scroll area that follows what arrives at its end: a chat, a build log, a streamed answer. Name it with
 * `aria-label` and give it a height. Set `following` to true to bring the reader back to the end, as when
 * they send a message.
 */
// The button's hidden is the first state's attribute: after that it is the behavior's to move.
const first = following.value
const root = useTemplateRef<HTMLDivElement>('root')
useBehavior(root, follow, undefined, following)
</script>

<template>
  <div class="scroll-area" role="log" tabindex="0" ref="root">
    <slot />
    <button type="button" class="btn btn-sm btn-pill scroll-area-latest" :hidden="first">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
      {{ latestLabel }}
    </button>
  </div>
</template>
