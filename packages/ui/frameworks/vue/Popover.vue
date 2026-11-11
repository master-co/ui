<script setup lang="ts">
import { computed, nextTick, onMounted, useId, useTemplateRef, watch } from 'vue'

defineOptions({ inheritAttrs: false })

const { id, mode = 'auto' } = defineProps<{
  id?: string
  /** `auto` closes on a press outside and on Esc; `manual` stays until it is closed. */
  mode?: 'auto' | 'manual'
}>()
/** Whether the popover is open: `v-model:open`. Leave it out and the trigger opens it. */
const open = defineModel<boolean>('open')
defineSlots<{
  /** The button that opens the popover: bind what it is given on a button of your own. */
  trigger?: (attributes: { popovertarget: string }) => unknown
  default?: () => unknown
}>()

/*
 * A popover. The browser opens it from the trigger, places it against the trigger and dismisses it; this
 * component only opens and closes it from `open`, and says when the browser did.
 */
const generated = useId()
const name = computed(() => id ?? generated)
const root = useTemplateRef<HTMLDivElement>('root')
/** What the owner knows: the last state it set or was told. */
let known = false

const sync = () => {
  const popover = root.value
  if (!popover || open.value === undefined) return
  const shown = popover.matches(':popover-open')
  known = open.value
  if (open.value && !shown) popover.showPopover()
  else if (!open.value && shown) popover.hidePopover()
}
const report = () => {
  const popover = root.value
  if (!popover) return
  const shown = popover.matches(':popover-open')
  if (shown !== known) open.value = known = shown
  // An `open` this component is told wins: if its owner did not take the change, the popover goes back.
  void nextTick(sync)
}
onMounted(sync)
watch(open, sync, { flush: 'post' })
</script>

<template>
  <slot name="trigger" v-bind="{ popovertarget: name }" />
  <div :id="name" :popover="mode" class="popover" ref="root" v-bind="$attrs" @toggle="report"><slot /></div>
</template>
