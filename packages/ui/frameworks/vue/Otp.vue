<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { otp } from '@master/ui/behaviors/otp.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const { length = 6, pattern = '[0-9]', inputMode = 'numeric', slotLabel = (index: number) => `Digit ${index + 1}` } = defineProps<{
  /** How many characters the code has. */
  length?: number
  /** What one character must match, as the `pattern` of each slot. A digit by default. */
  pattern?: string
  inputMode?: 'numeric' | 'text'
  /** The name of a slot, which has no visible label. */
  slotLabel?: (index: number) => string
  invalid?: boolean
}>()
/** The characters typed so far: `v-model`. */
const model = defineModel<string>()
const emit = defineEmits<{
  /** The code, once every slot holds a character. */
  complete: [code: string]
}>()

/* A one-time code. Name the group with `aria-label` or `aria-labelledby`; `disabled` disables every slot. */
const first = model.value ?? ''
const root = useTemplateRef<HTMLFieldSetElement>('root')
useBehavior(root, otp, undefined, model, {
  // The root's own change is the behavior's: every slot is filled. A slot's change bubbles through it too.
  change: (event) => { if (event.target === event.currentTarget) emit('complete', (event as CustomEvent<{ value: string }>).detail.value) },
})
</script>

<template>
  <fieldset class="otp" ref="root" v-bind="$attrs">
    <input v-for="index in length" :key="index" class="otp-slot" :inputmode="inputMode" :pattern="pattern" maxlength="1" :autocomplete="index === 1 ? 'one-time-code' : 'off'" :aria-label="slotLabel(index - 1)" :aria-invalid="invalid || undefined" :value.attr="first[index - 1]">
  </fieldset>
</template>
