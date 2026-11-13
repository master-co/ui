<script lang="ts">
export interface ListboxOption {
  /** What choosing the option gives the model. */
  value: string
  label: string
  description?: string
  /** The caption of the group the option belongs to. Options of one group are written together, under it. */
  group?: string
  disabled?: boolean
}
</script>

<script setup lang="ts">
import { computed, h, useId, useTemplateRef, type FunctionalComponent } from 'vue'
import { listbox } from '@master/ui/behaviors/listbox.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const { options } = defineProps<{
  options: ListboxOption[]
  /** Any number of options may be chosen. */
  multiple?: boolean
}>()
/** The value of the chosen option, null for none; a list of them when `multiple`: `v-model`. */
const model = defineModel<string | string[] | null>()

/* A listbox that stands in the page. Name it with `aria-label` or `aria-labelledby`. */
const id = useId()
const first = [model.value ?? []].flat()
const groups = computed(() => [...new Set(options.map(option => option.group))])
const root = useTemplateRef<HTMLDivElement>('root')
useBehavior(root, listbox, undefined, model)

const Row: FunctionalComponent<{ option: ListboxOption }> = ({ option }) => h('div', {
  'class': 'listbox-option',
  'role': 'option',
  'data-value': option.value,
  'aria-checked': first.includes(option.value),
  'aria-disabled': option.disabled || undefined,
}, option.description
  ? h('span', { class: 'listbox-body' }, [h('span', option.label), h('span', { class: 'listbox-description' }, option.description)])
  : option.label)
Row.props = ['option']
</script>

<template>
  <div class="listbox" role="listbox" tabindex="0" :aria-multiselectable="multiple || undefined" ref="root" v-bind="$attrs">
    <template v-for="(group, index) in groups" :key="group ?? ''">
      <template v-if="group === undefined">
        <template v-for="option in options" :key="option.value"><Row v-if="option.group === undefined" :option="option" /></template>
      </template>
      <div v-else class="listbox-group" role="group" :aria-labelledby="`${id}-group-${index}`">
        <div class="listbox-label" :id="`${id}-group-${index}`">{{ group }}</div>
        <template v-for="option in options" :key="option.value"><Row v-if="option.group === group" :option="option" /></template>
      </div>
    </template>
  </div>
</template>
