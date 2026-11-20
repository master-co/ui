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
      <svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.6362 7.5189A0.4947 0.4947 0 0 0 13.5 7.5L2.4755 7.5006A0.5 0.5 0 0 0 2.4266 8.4946L2.5 8.5H13.5A0.4947 0.4947 0 0 0 13.6362 8.4811A0.7009 0.7009 0 0 0 13.6362 7.5189Z" fill="currentColor" stroke="none" fill-rule="evenodd" transform="rotate(90 8 8)" /><path d="M8 4.5L13.2348 7.8313A0.2 0.2 0 0 1 13.2348 8.1687L8 11.5" transform="rotate(90 8 8)" /></svg>
      {{ latestLabel }}
    </button>
  </div>
</template>
