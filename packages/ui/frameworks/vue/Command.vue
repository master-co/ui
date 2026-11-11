<script lang="ts">
export interface CommandItem {
  label: string
  /** A shortcut or a hint at the end of the row. */
  hint?: string
  /** The caption of the group the command belongs to. Commands of one group are written together. */
  group?: string
  /** Where the command goes. Without it, `onSelect` runs. */
  href?: string
  onSelect?: () => void
  disabled?: boolean
}
</script>

<script setup lang="ts">
import { computed, h, nextTick, onMounted, useId, useTemplateRef, watch, type FunctionalComponent } from 'vue'
import { command } from '@master/ui/behaviors/command.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const { items, shortcut = 'k', filter = true } = defineProps<{
  items: CommandItem[]
  /** The key that opens and closes the palette with Command or Control. `'k'` by default, `false` for none. */
  shortcut?: string | false
  /** False when `items` are already the matches; `search` then says what was typed. */
  filter?: boolean
  /** The name of the search field, and the placeholder it shows. */
  searchLabel: string
  placeholder?: string
  /** The name of the list of commands. */
  listLabel: string
  empty?: string
}>()
/** Whether the palette is open: `v-model:open`. */
const open = defineModel<boolean>('open')
const emit = defineEmits<{
  /** What was typed in the search field. */
  search: [text: string]
}>()

/* A command palette: a native dialog over a search field and a list. Name the dialog with `aria-label`. */
const id = useId()
const root = useTemplateRef<HTMLDialogElement>('root')
useBehavior(root, command, () => ({ shortcut, filter }))

/** What the owner knows: the last state it set or was told. */
let known = false
const sync = () => {
  const dialog = root.value
  if (!dialog || open.value === undefined) return
  known = open.value
  if (open.value && !dialog.open) dialog.showModal()
  else if (!open.value && dialog.open) dialog.close()
}
// The shortcut, Esc and a command that ran all open or close the dialog without asking: say so.
const report = () => {
  const dialog = root.value
  if (!dialog) return
  if (dialog.open !== known) open.value = known = dialog.open
  void nextTick(sync)
}
onMounted(sync)
watch(open, sync, { flush: 'post' })

const groups = computed(() => [...new Set(items.map(item => item.group))])
const Row: FunctionalComponent<{ item: CommandItem }> = ({ item }) => {
  const content = [item.label, item.hint !== undefined ? h('span', { class: 'listbox-end' }, item.hint) : undefined]
  return item.href
    ? h('a', { 'class': 'listbox-option', 'role': 'option', 'href': item.href, 'aria-disabled': item.disabled || undefined }, content)
    : h('div', { 'class': 'listbox-option', 'role': 'option', 'onClick': () => item.onSelect?.(), 'aria-disabled': item.disabled || undefined }, content)
}
Row.props = ['item']
</script>

<template>
  <dialog class="dialog command" closedby="any" ref="root" v-bind="$attrs" @toggle="report" @close="report">
    <label class="command-search">
      <input class="command-input" type="search" role="combobox" aria-expanded="true" :aria-controls="`${id}-list`" aria-autocomplete="list" :aria-label="searchLabel" autocomplete="off" :placeholder="placeholder" autofocus @input="emit('search', ($event.target as HTMLInputElement).value)">
    </label>
    <div class="listbox command-list" :id="`${id}-list`" role="listbox" :aria-label="listLabel">
      <template v-for="(group, index) in groups" :key="group ?? ''">
        <template v-if="group === undefined">
          <template v-for="(item, at) in items" :key="at"><Row v-if="item.group === undefined" :item="item" /></template>
        </template>
        <div v-else class="listbox-group" role="group" :aria-labelledby="`${id}-group-${index}`">
          <div class="listbox-label" :id="`${id}-group-${index}`">{{ group }}</div>
          <template v-for="(item, at) in items" :key="at"><Row v-if="item.group === group" :item="item" /></template>
        </div>
      </template>
      <div v-if="empty !== undefined" class="listbox-empty">{{ empty }}</div>
    </div>
  </dialog>
</template>
