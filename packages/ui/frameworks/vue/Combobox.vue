<script lang="ts">
export interface ComboboxOption {
  /** What choosing the option gives the model. */
  value: string
  /** What the option says, and what the field holds once it is chosen. */
  label: string
  description?: string
  /** The caption of the group the option belongs to. Options of one group are written together, under it. */
  group?: string
  disabled?: boolean
}
</script>

<script setup lang="ts">
import { computed, h, onMounted, ref, useAttrs, useId, useTemplateRef, watch, type FunctionalComponent } from 'vue'
import { combobox } from '@master/ui/behaviors/combobox.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const { options, filter = true, multiple, removeLabel = (label: string) => `Remove ${label}` } = defineProps<{
  options: ComboboxOption[]
  /** False when `options` are already the matches: search for the query and give the matches as `options`. */
  filter?: boolean
  /** Several values, each a chip in the field; the model is then the list of them. */
  multiple?: boolean
  /** With `multiple`: the name each value is submitted with, in a hidden input of its chip. */
  name?: string
  /** With `multiple`: the accessible name of a chip's remove button. `Remove <label>` by default. */
  removeLabel?: (label: string) => string
  /** The name of the list, for assistive technology. */
  listLabel: string
  /** The name of the button that opens the list. */
  toggleLabel: string
  /** What the list says when no option matches. */
  empty?: string
}>()
/**
 * The value of the chosen option; null while the field holds text no option was chosen for. With
 * `multiple`, the chosen values in the order they were chosen: `v-model`.
 */
const model = defineModel<string | string[] | null>()
/**
 * The text in the field, what the reader is looking for: `v-model:query`. It is not the value; with one value
 * it holds the chosen option's label once one is chosen.
 */
const query = defineModel<string>('query')

/*
 * A combobox. Name the field with `aria-label`, or give it an `id` a label points at; every attribute but
 * the class goes to the field, so `@input` hears what is typed. With `multiple`, the chosen values are chips in
 * the field, which Vue writes from the list the behavior asks for.
 */
const id = useId()
const attrs = useAttrs()
const field = () => {
  const { class: _, ...rest } = attrs
  return rest
}
const first = model.value
const firsts = [first ?? []].flat() as string[]
const several = multiple
// The first label is the field's default value, an attribute: what is typed after is not Vue's to write.
const firstLabel = (several ? undefined : options.find(option => option.value === first)?.label) ?? query.value
// With several values the behavior asks for the chips it wants; Vue writes them from this list.
const chips = ref<string[]>(several ? firsts : [])
const labelOf = (each: string) => options.find(option => option.value === each)?.label ?? each
const checked = (option: ComboboxOption) => (several ? firsts.includes(option.value) : option.value === first)
const root = useTemplateRef<HTMLDivElement>('root')
/** The last query the owner gave or was told. */
let known: string | undefined
const behavior = useBehavior(root, combobox, () => (multiple ? { filter, removeLabel, draw: (values: string[]) => { chips.value = values } } : { filter }), model, {
  input: () => {
    const next = handle()?.query
    if (next === undefined || next === known) return
    query.value = known = next
  },
})
const handle = () => behavior.handle() as ReturnType<typeof combobox> | undefined
/** Query in: a query the owner gives is written into the field, and filters the options as typing does. */
const write = () => {
  const given = query.value
  const current = handle()
  if (given === undefined || !current || given === known) return
  current.query = known = given
}
onMounted(write)
watch(query, write, { flush: 'post' })

const groups = computed(() => [...new Set(options.map(option => option.group))])
const Row: FunctionalComponent<{ option: ComboboxOption }> = ({ option }) => h('div', {
  'class': 'listbox-option',
  'role': 'option',
  'data-value': option.value,
  'aria-checked': checked(option),
  'aria-disabled': option.disabled || undefined,
}, option.description
  ? h('span', { class: 'listbox-body' }, [h('span', option.label), h('span', { class: 'listbox-description' }, option.description)])
  : option.label)
Row.props = ['option']
</script>

<template>
  <div class="combobox" :class="$attrs.class" ref="root">
    <div :class="several ? 'input-group input-group-wrap' : 'input-group'">
      <span v-for="each in chips" :key="each" class="chip" :data-value="each">
        {{ labelOf(each) }}
        <input v-if="name" type="hidden" :name="name" :value="each">
        <button type="button" class="chip-remove" tabindex="-1" :aria-label="removeLabel(labelOf(each))" />
      </span>
      <input class="input-group-field" role="combobox" aria-expanded="false" :aria-controls="`${id}-list`" aria-autocomplete="list" autocomplete="off" :value.attr="firstLabel" v-bind="field()">
      <button type="button" class="combobox-toggle" tabindex="-1" :aria-label="toggleLabel" />
    </div>
    <div :id="`${id}-list`" popover="manual" class="listbox" role="listbox" :aria-label="listLabel" :aria-multiselectable="several || undefined">
      <template v-for="(group, index) in groups" :key="group ?? ''">
        <template v-if="group === undefined">
          <template v-for="option in options" :key="option.value"><Row v-if="option.group === undefined" :option="option" /></template>
        </template>
        <div v-else class="listbox-group" role="group" :aria-labelledby="`${id}-group-${index}`">
          <div class="listbox-label" :id="`${id}-group-${index}`">{{ group }}</div>
          <template v-for="option in options" :key="option.value"><Row v-if="option.group === group" :option="option" /></template>
        </div>
      </template>
      <div v-if="empty !== undefined" class="listbox-empty">{{ empty }}</div>
    </div>
  </div>
</template>
