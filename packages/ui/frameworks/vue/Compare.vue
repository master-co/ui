<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { compare } from '@master/ui/behaviors/compare.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

defineProps<{
  /** The name of the handle: what moving it shows. */
  label: string
}>()
/** How much of the second picture shows, from 0 to 100: `v-model`. */
const model = defineModel<number>({ default: 50 })

/* Two pictures and the line between them. The default slot is the two images, `compare-before` and `compare-after`. */
const first = model.value
const root = useTemplateRef<HTMLElement>('root')
useBehavior(root, compare, undefined, model)
</script>

<template>
  <figure class="compare" ref="root" v-bind="$attrs">
    <slot />
    <input type="range" class="compare-range" min="0" max="100" :value.attr="first" :aria-label="label">
  </figure>
</template>
