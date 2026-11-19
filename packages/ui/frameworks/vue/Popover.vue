<script setup lang="ts">
import { computed, nextTick, onMounted, useId, useTemplateRef, watch } from 'vue'
import { showFromPopoverTrigger } from '@master/ui/behaviors/internal.js'

defineOptions({ inheritAttrs: false })

const { id, mode = 'auto' } = defineProps<{
  id?: string
  /**
   * `auto` closes on a press outside and on Esc; `manual` stays until it is closed; `hint` is a preview the
   * trigger shows while it is hovered or focused, and does not close another popover that is open.
   */
  mode?: 'auto' | 'manual' | 'hint'
}>()
/** Whether the popover is open: `v-model:open`. Leave it out and the trigger opens it. */
const open = defineModel<boolean>('open')
defineSlots<{
  /**
   * The button that opens the popover: bind what it is given on a button of your own. In `hint` mode it is
   * the link or the button that shows it on hover and on focus, and is given `interestfor`.
   */
  trigger?: (attributes: { popovertarget: string } | { interestfor: string }) => unknown
  default?: () => unknown
}>()

/*
 * A popover. The browser opens it from the trigger, places it against the trigger and dismisses it; this
 * component only opens and closes it from `open`, and says when the browser did.
 */
const generated = useId()
const name = computed(() => id ?? generated)
const triggerAttributes = computed(() => mode === 'hint' ? { interestfor: name.value } : { popovertarget: name.value })
const root = useTemplateRef<HTMLDivElement>('root')
/** What the owner knows: the last state it set or was told. */
let known = false

const sync = () => {
  const popover = root.value
  if (!popover || open.value === undefined) return
  const shown = popover.matches(':popover-open')
  known = open.value
  if (open.value && !shown) showFromPopoverTrigger(popover)
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
  <slot name="trigger" v-bind="triggerAttributes" />
  <div :id="name" :popover="mode" class="popover" ref="root" v-bind="$attrs" @toggle="report"><slot /></div>
</template>
