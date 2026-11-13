<script lang="ts">
export interface ComboboxOption {
  /** What choosing the option gives the model. */
  value: string
  /** What the option says, and what the field holds once it is chosen. */
  label: string
  description?: string
  disabled?: boolean
}
</script>

<script setup lang="ts">
import { ref, useAttrs, useId, useTemplateRef } from 'vue'
import { combobox } from '@master/ui/behaviors/combobox.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const { options, filter = true, multiple, removeLabel = (label: string) => `Remove ${label}` } = defineProps<{
  options: ComboboxOption[]
  /** False when `options` are already the matches, from a server or a search of your own. */
  filter?: boolean
  /** Several values, each a chip in the field; the model is then the list of them. */
  multiple?: boolean
  /** With `multiple`: the name each value is submitted with, in a hidden input of its chip. */
  name?: string
  /** With `multiple`: the accessible name of a chip's remove button. `Remove <label>` by default. */
  removeLabel?: (label: string) => string
  /** The name of the list, for assistive technology. */
  listLabel: string
  /** The name of the button that opens the list. */
  toggleLabel: string
  /** What the list says when no option matches. */
  empty?: string
}>()
/**
 * The value of the chosen option; null while the field holds text no option was chosen for. With
 * `multiple`, the chosen values in the order they were chosen: `v-model`.
 */
const model = defineModel<string | string[] | null>()

/*
 * A combobox. Name the field with `aria-label`, or give it an `id` a label points at; every attribute but
 * the class goes to the field, so `@change` hears what is typed.
 */
const id = useId()
const attrs = useAttrs()
const field = () => {
  const { class: _, ...rest } = attrs
  return rest
}
const first = model.value
const firsts = [first ?? []].flat() as string[]
const several = multiple
// The first label is the field's default value, an attribute: what is typed after is not Vue's to write.
const firstLabel = several ? undefined : options.find(option => option.value === first)?.label
// With several values the behavior asks for the chips it wants; Vue writes them from this list.
const chips = ref<string[]>(several ? firsts : [])
const labelOf = (each: string) => options.find(option => option.value === each)?.label ?? each
const checked = (option: ComboboxOption) => (several ? firsts.includes(option.value) : option.value === first)
const root = useTemplateRef<HTMLDivElement>('root')
useBehavior(root, combobox, () => (multiple ? { filter, removeLabel, draw: (values: string[]) => { chips.value = values } } : { filter }), model)
</script>

<template>
  <div class="combobox" :class="$attrs.class" ref="root">
    <div :class="several ? 'input-group input-group-wrap' : 'input-group'">
      <span v-for="each in chips" :key="each" class="chip" :data-value="each">
        {{ labelOf(each) }}
        <input v-if="name" type="hidden" :name="name" :value="each">
        <button type="button" class="chip-remove" tabindex="-1" :aria-label="removeLabel(labelOf(each))" />
      </span>
      <input class="input-group-field" role="combobox" aria-expanded="false" :aria-controls="`${id}-list`" aria-autocomplete="list" autocomplete="off" :value.attr="firstLabel" v-bind="field()">
      <button type="button" class="combobox-toggle" tabindex="-1" :aria-label="toggleLabel" />
    </div>
    <div :id="`${id}-list`" popover="manual" class="listbox" role="listbox" :aria-label="listLabel" :aria-multiselectable="several || undefined">
      <div v-for="option in options" :key="option.value" class="listbox-option" role="option" :data-value="option.value" :aria-checked="checked(option)" :aria-disabled="option.disabled || undefined">
        <span v-if="option.description" class="listbox-body"><span>{{ option.label }}</span><span class="listbox-description">{{ option.description }}</span></span>
        <template v-else>{{ option.label }}</template>
      </div>
      <div v-if="empty !== undefined" class="listbox-empty">{{ empty }}</div>
    </div>
  </div>
</template>
