<script lang="ts">
/** A word or figure in the rim, at a value. Without a label it shows the value. */
export interface DialMark {
  value: number
  label?: string
}
</script>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { dial } from '@master/ui/behaviors/dial.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const { min = 0, max, step = 1, page, full, text, wheel = false } = defineProps<{
  /** The least and the greatest value: 0 and 100, or 0 and 360 round a full circle. */
  min?: number
  max?: number
  /** How far an arrow key turns the value, and what a drag rounds it to. */
  step?: number
  /** How far PageUp and PageDown turn it; a tenth of the range by default. */
  page?: number
  /** The whole circle, for an angle that comes round again. */
  full?: boolean
  /** The name of the dial: what it sets. */
  label: string
  /** The words for a value, shown in the middle and given to assistive technology. */
  text?: (value: number) => string
  /** The name a form submits the value under. Without it there is no field. */
  name?: string
  /** How many equal steps to mark with ticks. */
  ticks?: number
  /** Words or figures in the rim, at their values. */
  marks?: DialMark[]
  /** Let a wheel turn the dial while Alt (Option) is held. */
  wheel?: boolean
  disabled?: boolean
}>()
/** The number: `v-model`. It changes as the dial turns. */
const model = defineModel<number>()
const emit = defineEmits<{
  /** The number, once a drag ends, or a key or the wheel turned it. */
  valueCommit: [value: number]
}>()

/* A value set by turning a thumb around a circle. */
const greatest = computed(() => max ?? (full ? 360 : 100))
const first = model.value ?? min
const root = useTemplateRef<HTMLDivElement>('root')
const current = useBehavior(root, dial, () => ({ step, page, text, wheel }), model, {
  // The dial says change once a drag ends or a key or the wheel turned it, after the model has heard it.
  change: (event) => { if (event.target === root.value) emit('valueCommit', held()) },
})
// Vue writes a style again each time it renders, so it writes the value the behavior holds, not the first one.
const held = () => current() ?? first
</script>

<template>
  <div class="dial" :class="{ 'dial-full': full }" role="slider" ref="root" :tabindex="disabled ? -1 : 0" :aria-label="label" :aria-valuenow="first" :aria-valuemin="min" :aria-valuemax="greatest" :aria-valuetext="text?.(first)" :aria-disabled="disabled || undefined" :style="{ '--dial-value': held(), '--dial-min': min, '--dial-max': greatest }" v-bind="$attrs">
    <span v-if="ticks !== undefined" class="dial-ticks" :style="{ '--dial-ticks': ticks }" />
    <span v-for="mark in marks" :key="mark.value" class="dial-mark" :style="{ '--dial-at': mark.value }">{{ mark.label ?? String(mark.value) }}</span>
    <span class="dial-value">{{ text ? text(first) : String(first) }}</span>
    <span class="dial-thumb" />
    <!-- Vue writes a field's value with every render, so it too is the value the behavior holds. -->
    <input v-if="name !== undefined" type="hidden" :name="name" :value="held()" :disabled="disabled">
  </div>
</template>
