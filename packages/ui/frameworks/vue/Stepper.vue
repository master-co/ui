<script setup lang="ts">
import { useAttrs, useTemplateRef } from 'vue'
import { stepper } from '@master/ui/behaviors/stepper.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

defineProps<{
  /** The names of the two buttons, which show only an icon. */
  decrementLabel: string
  incrementLabel: string
}>()
/** The number; null while the field is empty: `v-model`. */
const model = defineModel<number | null>()

/*
 * A number between two buttons. Name the field with `aria-label`, or give it an `id` a label points at;
 * `min`, `max`, `step` and every other attribute but the class go to the field.
 */
const attrs = useAttrs()
const field = () => {
  const { class: _, ...rest } = attrs
  return rest
}
// The first number is the field's default value, an attribute: what is typed after is not Vue's to write.
const first = model.value
const root = useTemplateRef<HTMLDivElement>('root')
useBehavior(root, stepper, undefined, model)
</script>

<template>
  <div class="input-group stepper" :class="$attrs.class" ref="root">
    <button type="button" class="btn btn-square" value="-1" tabindex="-1" :aria-label="decrementLabel">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14" /></svg>
    </button>
    <input class="input-group-field stepper-field" type="number" :value.attr="first ?? undefined" v-bind="field()">
    <button type="button" class="btn btn-square" value="1" tabindex="-1" :aria-label="incrementLabel">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
    </button>
  </div>
</template>
