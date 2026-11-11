<script lang="ts">
export interface WheelColumn {
  /** The name of the column, for assistive technology. */
  label: string
  options: (string | { value: string, label: string, disabled?: boolean })[]
  /** Fixed text after the column that rests on the mark: the colon of a time, a unit. */
  separator?: string
}
</script>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { wheel } from '@master/ui/behaviors/wheel.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

defineProps<{
  columns: WheelColumn[]
}>()
/** The value of each column, in the order of the columns: `v-model`. */
const model = defineModel<string[]>()

/* Columns that turn. Name the group with `aria-label` or `aria-labelledby`. */
const first = model.value ?? []
const root = useTemplateRef<HTMLDivElement>('root')
useBehavior(root, wheel, undefined, model)

const row = (option: WheelColumn['options'][number]) => typeof option === 'string' ? { value: option, label: option, disabled: false } : option
</script>

<template>
  <div class="wheel" role="group" ref="root" v-bind="$attrs">
    <template v-for="(column, at) in columns" :key="column.label">
      <div class="wheel-column" role="listbox" :aria-label="column.label" tabindex="0">
        <div v-for="option in column.options.map(row)" :key="option.value" class="wheel-option" role="option" :data-value="option.value" :aria-selected="option.value === first[at]" :aria-disabled="option.disabled || undefined">{{ option.label }}</div>
      </div>
      <span v-if="column.separator !== undefined" class="wheel-separator" aria-hidden="true">{{ column.separator }}</span>
    </template>
  </div>
</template>
