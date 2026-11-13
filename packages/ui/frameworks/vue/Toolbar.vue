<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { toolbar } from '@master/ui/behaviors/toolbar.js'
import { useBehavior } from './use-behavior'

defineProps<{
  /** What the tools act on, for assistive technology. */
  label: string
  /** A column of tools, moved through with ArrowUp and ArrowDown. */
  vertical?: boolean
  /** On the floating surface, for tools over content. */
  floating?: boolean
}>()
defineSlots<{
  /** The controls: small quiet buttons, with `aria-pressed` for the ones that toggle, selects, segmented controls. */
  default?: () => unknown
}>()

/* A toolbar: one stop in the tab order, with the arrow keys between its controls. */
const root = useTemplateRef<HTMLDivElement>('root')
useBehavior(root, toolbar)
</script>

<template>
  <div class="toolbar" :class="{ 'toolbar-floating': floating }" role="toolbar" :aria-label="label" :aria-orientation="vertical ? 'vertical' : undefined" :focusgroup="vertical ? 'toolbar wrap block' : 'toolbar wrap'" ref="root">
    <slot />
  </div>
</template>
