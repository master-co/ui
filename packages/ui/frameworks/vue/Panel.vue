<script setup lang="ts">
import { computed, nextTick, onMounted, useId, useTemplateRef, watch } from 'vue'
import { panel, type PanelValue } from '@master/ui/behaviors/panel.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const { id, title, handleLabel, minimizeLabel = 'Minimize', closeLabel = 'Close', resizable = true, step = 16 } = defineProps<{
  id?: string
  /** The title in the header, which names the panel. */
  title: string
  /** The name of the handle: what it moves and how, such as "Move the Layers panel with the arrow keys". */
  handleLabel: string
  minimizeLabel?: string
  closeLabel?: string
  /** Leave out the corner that resizes it. */
  resizable?: boolean
  /** How far an arrow key moves or resizes the panel, in pixels. */
  step?: number
}>()
/** Where the panel is, how large and whether it is folded: `v-model`. Keep it to put the panel back where it was. */
const model = defineModel<PanelValue>()
/** Whether the panel is open: `v-model:open`. Leave it out and the trigger opens it. */
const open = defineModel<boolean>('open')
const emit = defineEmits<{
  /** The value, once a drag ends, a key moved it or it was folded: the moment to keep it. */
  valueCommit: [value: PanelValue]
}>()
defineSlots<{
  /** The button that opens the panel: bind what it is given on a button of your own. */
  trigger?: (attributes: { commandfor: string, command: 'toggle-popover' }) => unknown
  /** More controls in the header, before the minimize and close buttons. */
  actions?: () => unknown
  default?: () => unknown
}>()

/*
 * A floating panel. The browser opens it from the trigger and puts it in the top layer; the behavior moves,
 * resizes, folds and stacks it. This component opens and closes it from `open`, and passes its place in and out.
 */
const generated = useId()
const name = computed(() => id ?? generated)
const first = model.value
const root = useTemplateRef<HTMLDivElement>('root')
const current = useBehavior(root, panel, () => ({ step }), model, {
  // The panel says change once a move ends. A field in its body says change too.
  change: (event) => {
    const held = current()
    if (event.target === root.value && held) emit('valueCommit', held)
  },
})
// Vue writes a style again each time it renders, so it writes the place the behavior holds, not the first one.
const place = () => {
  const held = current() ?? first
  const px = (measure: number | null | undefined) => typeof measure === 'number' ? `${measure}px` : undefined
  return { '--panel-x': px(held?.x), '--panel-y': px(held?.y), '--panel-width': px(held?.width), '--panel-height': px(held?.height) }
}

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
  // An `open` this component is told wins: if its owner did not take the change, the panel goes back.
  void nextTick(sync)
}
onMounted(sync)
watch(open, sync, { flush: 'post' })
</script>

<template>
  <slot name="trigger" v-bind="{ commandfor: name, command: 'toggle-popover' as const }" />
  <div :id="name" popover="manual" role="dialog" :aria-labelledby="`${name}-title`" class="panel" :style="place()" ref="root" v-bind="$attrs" @toggle="report">
    <div class="panel-header">
      <button type="button" class="panel-handle" :aria-label="handleLabel" />
      <h2 class="panel-title" :id="`${name}-title`">{{ title }}</h2>
      <div class="panel-actions">
        <slot name="actions" />
        <button type="button" class="btn btn-quiet btn-sm btn-square panel-minimize" :aria-pressed="first?.minimized ?? false" :aria-label="minimizeLabel">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12" /></svg>
        </button>
        <button type="button" class="btn btn-quiet btn-sm btn-square" :commandfor="name" command="hide-popover" :aria-label="closeLabel">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
    </div>
    <div class="panel-body"><slot /></div>
    <span v-if="resizable" class="panel-resize" aria-hidden="true" />
  </div>
</template>
