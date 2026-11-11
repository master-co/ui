<script setup lang="ts">
import { computed, useId } from 'vue'

defineOptions({ inheritAttrs: false })

const { id } = defineProps<{
  id?: string
}>()
defineSlots<{
  /** The control the tooltip names: bind what it is given on a button or a link of your own. */
  trigger: (attributes: { interestfor: string }) => unknown
  default?: () => unknown
}>()

/*
 * A tooltip. The browser shows it on hover and on focus and places it; this component only joins the
 * control to its label. The default slot is the label. The control keeps its own accessible name.
 */
const generated = useId()
const name = computed(() => id ?? generated)
</script>

<template>
  <slot name="trigger" v-bind="{ interestfor: name }" />
  <div :id="name" popover="hint" class="tooltip" v-bind="$attrs"><slot /></div>
</template>
