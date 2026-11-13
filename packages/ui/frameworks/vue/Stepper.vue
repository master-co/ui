<script setup lang="ts">
import { useAttrs, useTemplateRef } from 'vue'
import { stepper } from '@master/ui/behaviors/stepper.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  /** The names of the two buttons, which show only an icon. */
  decrementLabel: string
  incrementLabel: string
  /**
   * Write the figure with `Intl.NumberFormat` while the field is not focused: a unit, a currency, grouping.
   * The field keeps the plain number. Read when the stepper attaches, as `locale` is.
   */
  format?: Intl.NumberFormatOptions
  /** The locale the figure is written in. The page's by default. */
  locale?: string
}>()
/** The number; null while the field is empty: `v-model`. */
const model = defineModel<number | null>()

/*
 * A number between two buttons. Name the field with `aria-label`, or give it an `id` a label points at;
 * `min`, `max`, `step` and every other attribute but the class go to the field. A label with the
 * `stepper-scrub` class steps the number as it is dragged sideways.
 */
const attrs = useAttrs()
const field = () => {
  const { class: _, ...rest } = attrs
  return rest
}
// The first number is the field's default value, an attribute: what is typed after is not Vue's to write.
const first = model.value
// The first figure is drawn into the first render, so the HTML a server sends shows it.
const written = props.format && typeof first === 'number' ? new Intl.NumberFormat(props.locale, props.format).format(first) : undefined
const root = useTemplateRef<HTMLDivElement>('root')
useBehavior(root, stepper, () => ({ format: props.format, locale: props.locale }), model)
</script>

<template>
  <div class="input-group stepper" :class="$attrs.class" ref="root">
    <button type="button" class="btn btn-square" value="-1" tabindex="-1" :aria-label="decrementLabel">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14" /></svg>
    </button>
    <span v-if="format" class="stepper-value">
      <input class="input-group-field stepper-field" type="number" :value.attr="first ?? undefined" :aria-valuetext="written" v-bind="field()">
      <span class="stepper-display" aria-hidden="true">{{ written }}</span>
    </span>
    <input v-else class="input-group-field stepper-field" type="number" :value.attr="first ?? undefined" v-bind="field()">
    <button type="button" class="btn btn-square" value="1" tabindex="-1" :aria-label="incrementLabel">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
    </button>
  </div>
</template>
