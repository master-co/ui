<script setup lang="ts">
import { useId, useTemplateRef } from 'vue'
import { colorPicker, colorPickerState } from '@master/ui/behaviors/color-picker.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const { alpha = true, labels = {}, valueText } = defineProps<{
  /** What the color is: the name of the text field. */
  label: string
  /** The name the text field submits with a form. */
  name?: string
  /** An opacity slider. Without it the color is opaque. True by default. */
  alpha?: boolean
  disabled?: boolean
  /** What the controls are called, in the page's words: `field` (the thumb), `hue`, `alpha` and `format`. */
  labels?: { field?: string, hue?: string, alpha?: string, format?: string }
  /** What the field's thumb says it holds, from the lightness in percent and the chroma. */
  valueText?: (lightness: number, chroma: number) => string
}>()
/** The color, in hex, rgb() or oklch(): `v-model`. The format it is written in is the one the picker writes. */
const model = defineModel<string>()
const slots = defineSlots<{
  /**
   * The button that opens the picker in a popover: bind what it is given on a button of your own, and put a
   * `swatch color-picker-swatch` in it to show the color. Leave it out and the picker stands inline.
   */
  trigger?: (attributes: { popovertarget: string }) => unknown
}>()

/*
 * A color picker. The behavior holds the color and moves every part; this component draws the first value
 * into the first render and passes the value in and out.
 */
const id = useId()
// The first value is drawn into the first render; after that the behavior writes every part.
const first = colorPickerState(model.value ?? '', { valueText, opaque: !alpha }) ?? colorPickerState('#000000')!
const root = useTemplateRef<HTMLDivElement>('root')
// Vue writes a style again each time it renders, so it writes the numbers the behavior holds, not the first ones.
const properties = () => Object.fromEntries(Object.entries(first.properties).map(([property, number]) => [property, root.value?.style.getPropertyValue(property) || number]))
useBehavior(root, colorPicker, () => ({ valueText }), model)
</script>

<template>
  <div class="color-picker" ref="root" v-bind="$attrs" :style="properties()">
    <template v-if="slots.trigger">
      <slot name="trigger" v-bind="{ popovertarget: `${id}-popover` }" />
      <div :id="`${id}-popover`" popover="auto" class="popover color-picker-popover">
        <div class="color-picker-area">
          <div class="color-picker-thumb" role="slider" tabindex="0" :aria-label="labels.field ?? 'Lightness and chroma'" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="first.valueNow" :aria-valuetext="first.valueText" :aria-disabled="disabled || undefined" />
        </div>
        <span class="swatch swatch-lg color-picker-swatch" />
        <input type="range" class="slider color-picker-hue" min="0" max="360" :value.attr="first.hue" :aria-label="labels.hue ?? 'Hue'" :disabled="disabled">
        <input v-if="alpha" type="range" class="slider color-picker-alpha" min="0" max="100" :value.attr="first.alpha * 100" :aria-label="labels.alpha ?? 'Opacity'" :disabled="disabled">
        <div class="color-picker-fields">
          <select class="select select-sm color-picker-format" :aria-label="labels.format ?? 'Format'" :disabled="disabled">
            <option value="hex" :selected="first.format === 'hex'">Hex</option>
            <option value="rgb" :selected="first.format === 'rgb'">RGB</option>
            <option value="oklch" :selected="first.format === 'oklch'">OKLCH</option>
          </select>
          <input class="input input-sm color-picker-text" :name="name" :value.attr="first.value" :aria-label="label" spellcheck="false" autocomplete="off" :disabled="disabled">
        </div>
      </div>
    </template>
    <!-- Inline, the same parts stand in the root's column. -->
    <template v-else>
      <div class="color-picker-area">
        <div class="color-picker-thumb" role="slider" tabindex="0" :aria-label="labels.field ?? 'Lightness and chroma'" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="first.valueNow" :aria-valuetext="first.valueText" :aria-disabled="disabled || undefined" />
      </div>
      <span class="swatch swatch-lg color-picker-swatch" />
      <input type="range" class="slider color-picker-hue" min="0" max="360" :value.attr="first.hue" :aria-label="labels.hue ?? 'Hue'" :disabled="disabled">
      <input v-if="alpha" type="range" class="slider color-picker-alpha" min="0" max="100" :value.attr="first.alpha * 100" :aria-label="labels.alpha ?? 'Opacity'" :disabled="disabled">
      <div class="color-picker-fields">
        <select class="select select-sm color-picker-format" :aria-label="labels.format ?? 'Format'" :disabled="disabled">
          <option value="hex" :selected="first.format === 'hex'">Hex</option>
          <option value="rgb" :selected="first.format === 'rgb'">RGB</option>
          <option value="oklch" :selected="first.format === 'oklch'">OKLCH</option>
        </select>
        <input class="input input-sm color-picker-text" :name="name" :value.attr="first.value" :aria-label="label" spellcheck="false" autocomplete="off" :disabled="disabled">
      </div>
    </template>
  </div>
</template>
