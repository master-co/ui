<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, useId, useTemplateRef, watch } from 'vue'
import { drawer } from '@master/ui/behaviors/drawer.js'

defineOptions({ inheritAttrs: false })

const { id } = defineProps<{
  id?: string
}>()
/** Whether the dialog is open: `v-model:open`. Leave it out and the trigger opens it. */
const open = defineModel<boolean>('open')
defineSlots<{
  /** The button that opens the dialog: bind what it is given on a button of your own. */
  trigger?: (attributes: { commandfor: string, command: 'show-modal' }) => unknown
  default?: () => unknown
}>()

/*
 * A modal dialog. The browser opens it from the trigger, traps focus and closes it on Esc; this component
 * only opens and closes it from `open`, and says when the browser did. Its default slot is the contract's
 * parts: `dialog-header`, `dialog-body`, `dialog-footer`. A button inside closes it with
 * `commandfor` and `command="close"`, or from a form with `method="dialog"`.
 *
 * A drawer or a sheet with `dialog-swipe` in its `class` holds a `dialog-panel` and is let go of to close;
 * the drawer behavior, attached to every dialog, closes it and says so here like any other close.
 */
const generated = useId()
const name = computed(() => id ?? generated)
const root = useTemplateRef<HTMLDialogElement>('root')
/** What the owner knows: the last state it set or was told. */
let known = false

const sync = () => {
  const dialog = root.value
  if (!dialog || open.value === undefined) return
  known = open.value
  if (open.value && !dialog.open) dialog.showModal()
  else if (!open.value && dialog.open) dialog.close()
}
const report = () => {
  const dialog = root.value
  if (!dialog) return
  if (dialog.open !== known) open.value = known = dialog.open
  // An `open` this component is told wins: if its owner did not take the change, the dialog goes back.
  void nextTick(sync)
}
let detach: (() => void) | undefined
onMounted(() => {
  if (root.value) detach = drawer(root.value)
  sync()
})
onBeforeUnmount(() => detach?.())
watch(open, sync, { flush: 'post' })
</script>

<template>
  <slot name="trigger" v-bind="{ commandfor: name, command: 'show-modal' as const }" />
  <dialog :id="name" class="dialog" closedby="any" ref="root" v-bind="$attrs" @toggle="report" @close="report"><slot /></dialog>
</template>
