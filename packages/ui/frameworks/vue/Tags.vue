<script setup lang="ts">
import { ref, useAttrs, useTemplateRef } from 'vue'
import { tags } from '@master/ui/behaviors/tags.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const { name, max, delimiters, validate, removeLabel = (text: string) => `Remove ${text}` } = defineProps<{
  /** The name each value is submitted with, in a hidden input of its chip. */
  name?: string
  /** How many values the field holds at most. */
  max?: number
  /** Keys that add a value as Enter does. `[',']` by default. */
  delimiters?: string[]
  /** Says whether a value may be added. */
  validate?: (value: string) => boolean
  /** The accessible name of a chip's remove button. `Remove <value>` by default. */
  removeLabel?: (value: string) => string
}>()
/** The values, in order: `v-model`. */
const model = defineModel<string[]>()

/*
 * A tags field. Name the field with `aria-label`, or give it an `id` a label points at; every attribute but
 * the class goes to the field.
 */
const attrs = useAttrs()
const field = () => {
  const { class: _, ...rest } = attrs
  return rest
}
// The behavior asks for the chips it wants; Vue writes them from this list.
const shown = ref<string[]>(model.value ?? [])
const root = useTemplateRef<HTMLDivElement>('root')
useBehavior(root, tags, () => ({ name, max, delimiters, validate, removeLabel, draw: (values: string[]) => { shown.value = values } }), model)
</script>

<template>
  <div class="tags input-group input-group-wrap" :class="$attrs.class" ref="root">
    <span v-for="each in shown" :key="each" class="chip" :data-value="each">
      {{ each }}
      <input v-if="name" type="hidden" :name="name" :form="$attrs.form as string | undefined" :value="each">
      <button type="button" class="chip-remove" tabindex="-1" :aria-label="removeLabel(each)"><svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4L12 12" /><path d="M4 12L12 4" /></svg></button>
    </span>
    <input class="input-group-field" autocomplete="off" v-bind="field()">
  </div>
</template>
