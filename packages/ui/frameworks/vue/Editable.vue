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
    </button>
    <span :id="`${id}-name`" hidden>{{ label }}</span>
    <textarea v-if="multiline" class="editable-field" :aria-label="label" :disabled="disabled" hidden v-bind="field()" :value.attr="first" />
    <input v-else class="editable-field" :aria-label="label" :disabled="disabled" hidden v-bind="field()" :value.attr="first">
  </div>
</template>
