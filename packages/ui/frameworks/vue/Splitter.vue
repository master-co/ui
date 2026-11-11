<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { splitter } from '@master/ui/behaviors/splitter.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const { min = 0, max = 100, step = 5 } = defineProps<{
  /** The least and the greatest size, in percent. */
  min?: number
  max?: number
  /** How far an arrow key moves the handle, in percent. */
  step?: number
  /** Stack the panes, with a handle that moves up and down. */
  stacked?: boolean
  /** The name of the handle: what it resizes. */
  label: string
  disabled?: boolean
}>()
/** The first pane's size, in percent of the container: `v-model`. It changes as the handle moves. */
const model = defineModel<number>({ default: 50 })
const emit = defineEmits<{
  /** The size, once a drag ends or a key moved the handle. */
  valueCommit: [value: number]
}>()
defineSlots<{
  /** The first and the second pane. */
  start?: () => unknown
  end?: () => unknown
}>()

/* Two panes and the handle between them. */
const first = model.value
const root = useTemplateRef<HTMLDivElement>('root')
const handle = useTemplateRef<HTMLDivElement>('handle')
const current = useBehavior(root, splitter, () => ({ step }), model)
// Vue writes a style again each time it renders, so it writes the size the behavior holds, not the first one.
const size = () => {
  const held = current()
  return held !== undefined && Number.isFinite(held) ? held : first
}
// The handle says change once a drag ends or a key moved it. A field in a pane says change too.
const committed = (event: Event) => {
  if (event.target === handle.value) emit('valueCommit', size())
}
</script>

<template>
  <div class="splitter" :style="{ '--splitter-size': `${size()}%` }" ref="root" v-bind="$attrs" @change="committed">
    <div class="splitter-pane"><slot name="start" /></div>
    <div class="splitter-handle" role="separator" ref="handle" :tabindex="disabled ? -1 : 0" :aria-label="label" :aria-valuenow="Math.round(first)" :aria-valuemin="min" :aria-valuemax="max" :aria-orientation="stacked ? 'horizontal' : undefined" :aria-disabled="disabled || undefined" />
    <div class="splitter-pane"><slot name="end" /></div>
  </div>
</template>
