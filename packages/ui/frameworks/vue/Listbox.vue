<script lang="ts">
export interface ListboxOption {
  /** What choosing the option gives the model. */
  value: string
  label: string
  description?: string
  disabled?: boolean
}
</script>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { listbox } from '@master/ui/behaviors/listbox.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

defineProps<{
  options: ListboxOption[]
  /** Any number of options may be chosen. */
  multiple?: boolean
}>()
/** The value of the chosen option, null for none; a list of them when `multiple`: `v-model`. */
const model = defineModel<string | string[] | null>()

/* A listbox that stands in the page. Name it with `aria-label` or `aria-labelledby`. */
const first = [model.value ?? []].flat()
const root = useTemplateRef<HTMLDivElement>('root')
useBehavior(root, listbox, undefined, model)
</script>

<template>
  <div class="listbox" role="listbox" tabindex="0" :aria-multiselectable="multiple || undefined" ref="root" v-bind="$attrs">
    <div v-for="option in options" :key="option.value" class="listbox-option" role="option" :data-value="option.value" :aria-checked="first.includes(option.value)" :aria-disabled="option.disabled || undefined">
      <span v-if="option.description" class="listbox-body"><span>{{ option.label }}</span><span class="listbox-description">{{ option.description }}</span></span>
      <template v-else>{{ option.label }}</template>
    </div>
  </div>
</template>
