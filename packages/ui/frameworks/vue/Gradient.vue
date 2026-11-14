<script lang="ts">
import type { GradientValue } from '@master/ui/behaviors/gradient.js'

export type { GradientValue }

/** What the controls are called, in the page's words. */
export interface GradientLabels {
  add?: string
  remove?: string
  reverse?: string
  color?: string
  position?: string
  type?: string
  linear?: string
  radial?: string
  conic?: string
  angle?: string
  center?: string
  centerX?: string
  centerY?: string
  css?: string
}
</script>

<script setup lang="ts">
import { computed, shallowRef, useId, useTemplateRef } from 'vue'
import { colorPickerState } from '@master/ui/behaviors/color-picker.js'
import { gradient, gradientCss, gradientStops, gradientValue } from '@master/ui/behaviors/gradient.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const { readOnly, disabled, labels = {} } = defineProps<{
  /** The gradient is shown and cannot be changed. */
  readOnly?: boolean
  disabled?: boolean
  labels?: GradientLabels
}>()
/** The gradient: `v-model`. Two stops, black to white, by default. */
const model = defineModel<GradientValue>()

/*
 * A gradient editor. Vue writes the controls and a handle for each stop from the value, so the first HTML holds
 * the gradient; the behavior moves every state and asks for the stops again when they change.
 */
const id = useId()
const first = gradientValue(model.value)
const shown = shallowRef<GradientValue>(first)
const words = computed(() => ({ add: 'Add a stop', remove: 'Remove', reverse: 'Reverse', color: 'Color of the stop', position: 'Position', type: 'Type', linear: 'Linear', radial: 'Radial', conic: 'Conic', angle: 'Angle', center: 'Centre', centerX: 'Centre across, in percent', centerY: 'Centre down, in percent', css: 'The gradient as CSS', ...labels }))
const css = gradientCss(first)
// Vue writes a style again each time it renders, so it writes the gradient the behavior holds, not the first one.
const painted = computed(() => gradientCss(shown.value))
const color = colorPickerState(first.stops[0]!.color)!
const types = ['linear', 'radial', 'conic'] as const
const root = useTemplateRef<HTMLDivElement>('root')
useBehavior(root, gradient, () => ({ value: first, draw: (next: GradientValue) => { shown.value = next } }), model)
</script>

<template>
  <div class="gradient" ref="root" :aria-readonly="readOnly || undefined" :aria-disabled="disabled || undefined" :style="{ '--gradient': painted.css, '--gradient-fallback': painted.fallback }" v-bind="$attrs">
    <div class="gradient-preview" aria-hidden="true"></div>
    <div class="gradient-bar">
      <span v-for="(stop, index) in gradientStops(shown.stops)" :key="stop.id" class="gradient-stop" role="slider" :data-id="stop.id" :aria-label="`Stop ${index + 1} of ${shown.stops.length}`" :aria-valuemin="0" :aria-valuemax="100" :aria-valuenow="stop.offset" :style="{ '--gradient-offset': stop.offset, '--gradient-color': stop.color }"></span>
    </div>
    <div class="flex flex-wrap items-center gap-xs">
      <button type="button" class="btn btn-sm gradient-add"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>{{ words.add }}</button>
      <button type="button" class="btn btn-sm gradient-remove"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14" /></svg>{{ words.remove }}</button>
      <button type="button" class="btn btn-sm btn-quiet gradient-reverse"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16" /></svg>{{ words.reverse }}</button>
    </div>
    <div class="gradient-fields">
      <fieldset class="gradient-color">
        <legend class="mb(6) text-xs font-medium fg-text-muted">{{ words.color }}</legend>
        <div class="color-picker" :style="color.properties">
          <div class="color-picker-area">
            <div class="color-picker-thumb" role="slider" tabindex="0" aria-label="Lightness and chroma" :aria-valuemin="0" :aria-valuemax="100" :aria-valuenow="color.valueNow" :aria-valuetext="color.valueText"></div>
          </div>
          <span class="swatch swatch-lg color-picker-swatch"></span>
          <input type="range" class="slider color-picker-hue" min="0" max="360" :value.attr="color.hue" aria-label="Hue" />
          <input type="range" class="slider color-picker-alpha" min="0" max="100" :value.attr="color.alpha * 100" aria-label="Opacity" />
          <div class="color-picker-fields">
            <select class="select select-sm color-picker-format" aria-label="Format">
              <option value="hex" selected>Hex</option>
              <option value="rgb">RGB</option>
              <option value="oklch">OKLCH</option>
            </select>
            <input class="input input-sm color-picker-text" :value.attr="color.value" :aria-label="words.color" spellcheck="false" autocomplete="off" />
          </div>
        </div>
      </fieldset>
      <div class="flex flex-col gap-md min-w(0)">
        <fieldset class="gradient-offset">
          <legend class="mb(6) text-xs font-medium fg-text-muted">{{ words.position }}</legend>
          <input type="range" class="slider" min="0" max="100" step="1" :value.attr="first.stops[0]!.offset" :aria-label="words.position" />
          <input type="number" class="input input-sm w(72)" min="0" max="100" step="0.1" :value.attr="first.stops[0]!.offset" :aria-label="`${words.position}, %`" />
        </fieldset>
        <fieldset class="gradient-type">
          <legend class="mb(6) text-xs font-medium fg-text-muted">{{ words.type }}</legend>
          <div class="segmented segmented-sm" role="radiogroup" :aria-label="words.type">
            <label v-for="type in types" :key="type" class="segmented-item"><input type="radio" class="segmented-input" :name="`${id}-type`" :value="type" :checked="first.type === type" />{{ words[type] }}</label>
          </div>
        </fieldset>
        <div class="flex flex-wrap items-start gap-lg">
          <fieldset class="gradient-angle">
            <legend class="mb(6) text-xs font-medium fg-text-muted">{{ words.angle }}</legend>
            <div class="dial dial-sm dial-full" role="slider" tabindex="0" :aria-label="words.angle" :aria-valuenow="first.angle" :aria-valuemin="0" :aria-valuemax="360" :aria-valuetext="`${first.angle}°`" :style="{ '--dial-value': shown.angle }">
              <span class="dial-value">{{ first.angle }}°</span>
              <span class="dial-thumb"></span>
            </div>
          </fieldset>
          <fieldset class="gradient-center">
            <legend class="mb(6) text-xs font-medium fg-text-muted">{{ words.center }}</legend>
            <input type="number" class="input input-sm w(72)" min="0" max="100" :value.attr="first.center[0]" :aria-label="words.centerX" />
            <input type="number" class="input input-sm w(72)" min="0" max="100" :value.attr="first.center[1]" :aria-label="words.centerY" />
          </fieldset>
        </div>
      </div>
    </div>
    <pre class="code-block gradient-css" :aria-label="words.css">{{ css.text }}</pre>
  </div>
</template>
