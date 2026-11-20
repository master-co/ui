<script setup lang="ts">
import { useAttrs, useId, useTemplateRef } from 'vue'
import { editable } from '@master/ui/behaviors/editable.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const { blur, multiline } = defineProps<{
  /** What the value is, read with it by assistive technology: the field's name. */
  label: string
  /** A textarea, for a value of several lines. */
  multiline?: boolean
  /** The value is on its way: the preview waits. */
  busy?: boolean
  /** What leaving the field does. `'save'` by default. */
  blur?: 'save' | 'cancel'
  disabled?: boolean
}>()
/** The saved value: `v-model`. */
const model = defineModel<string>()

/*
 * An editable value. Every attribute but the class goes to the field, so `required`, `maxlength` and
 * `placeholder` are its constraints and what the preview says while the value is empty.
 */
const id = useId()
const attrs = useAttrs()
const field = () => {
  const { class: _, ...rest } = attrs
  return rest
}
// The first value is drawn into the first render; after that the behavior writes the preview and the field.
const first = model.value ?? ''
const placeholder = attrs.placeholder as string | undefined
const root = useTemplateRef<HTMLDivElement>('root')
// The behavior finds its field as it attaches. One line and several are two elements, so it attaches again when `multiline` changes.
const fielded = (element: HTMLElement, options?: { blur?: 'save' | 'cancel', multiline?: boolean }) => editable(element, { blur: options?.blur })
useBehavior(root, fielded, () => ({ blur, multiline }), model)
</script>

<template>
  <div class="editable" :class="$attrs.class" :aria-busy="busy || undefined" ref="root">
    <button type="button" class="editable-preview" :id="`${id}-preview`" :aria-labelledby="`${id}-name ${id}-preview`" :disabled="disabled">
      <template v-if="first">{{ first }}</template>
      <span v-else-if="placeholder" class="editable-placeholder">{{ placeholder }}</span>
      <svg class="icon editable-pencil" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.6556 12.4849L3.2844 10.1793A0.7 0.7 0 0 1 3.4647 9.8686L10.505 2.8283A0.7 0.7 0 0 1 11.495 2.8283L13.1717 4.505A0.7 0.7 0 0 1 13.1717 5.495L6.1314 12.5353A0.7 0.7 0 0 1 5.8207 12.7156L3.5151 13.3444A0.7 0.7 0 0 1 2.6556 12.4849Z" /><path d="M9.6667 3.6667L12.3333 6.3333" /></svg>
    </button>
    <span :id="`${id}-name`" hidden>{{ label }}</span>
    <textarea v-if="multiline" class="editable-field" :aria-label="label" :disabled="disabled" hidden v-bind="field()" :value.attr="first" />
    <input v-else class="editable-field" :aria-label="label" :disabled="disabled" hidden v-bind="field()" :value.attr="first">
  </div>
</template>
