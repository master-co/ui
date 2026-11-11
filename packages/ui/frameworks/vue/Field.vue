<script setup lang="ts">
import { computed, useId } from 'vue'

defineOptions({ inheritAttrs: false })

const { hint, error } = defineProps<{
  label: string
  /** Guidance under the control. */
  hint?: string
  /** What is wrong with the value. The stylesheet shows it while the control is invalid. */
  error?: string | null
}>()
defineSlots<{
  /** The control: bind what it is given on an input, a select, a textarea or a component that takes them. */
  default: (control: { 'id': string, 'aria-describedby'?: string, 'aria-invalid'?: true }) => unknown
}>()

/* A label, its control, a hint and an error, joined by their ids. */
const id = useId()
const control = computed(() => ({
  'id': id,
  'aria-describedby': [hint !== undefined && `${id}-hint`, error !== undefined && `${id}-error`].filter(Boolean).join(' ') || undefined,
  'aria-invalid': error !== undefined && error !== null ? true as const : undefined,
}))
</script>

<template>
  <div class="field" v-bind="$attrs">
    <label :for="id">{{ label }}</label>
    <slot v-bind="control" />
    <span v-if="hint !== undefined" class="field-hint" :id="`${id}-hint`">{{ hint }}</span>
    <span v-if="error !== undefined" class="field-error" :id="`${id}-error`">{{ error }}</span>
  </div>
</template>
