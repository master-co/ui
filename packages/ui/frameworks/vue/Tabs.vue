<script lang="ts">
export interface Tab {
  /** What selecting the tab gives the model. */
  value: string
  label: string
  /** The panel the tab shows, as text. The `panel` slot writes richer panels. */
  content?: string
  disabled?: boolean
}
</script>

<script setup lang="ts">
import { useId, useTemplateRef } from 'vue'
import { tabs as tablist } from '@master/ui/behaviors/tabs.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  tabs: Tab[]
  /** Classes for each panel, such as its padding. */
  panelClass?: string
}>()
/** The value of the selected tab: `v-model`. The first tab by default. */
const model = defineModel<string>()
defineSlots<{
  /** What a tab's panel holds, in place of its `content`. */
  panel?: (scope: { tab: Tab }) => unknown
}>()

/* Tabs that switch panels in place. Name the tablist with `aria-label` or `aria-labelledby`. */
const id = useId()
const first = model.value ?? props.tabs.find(tab => !tab.disabled)?.value
const root = useTemplateRef<HTMLDivElement>('root')
useBehavior(root, tablist, undefined, model)
</script>

<template>
  <div class="tabs" role="tablist" ref="root" v-bind="$attrs">
    <button v-for="(tab, index) in tabs" :key="tab.value" type="button" class="tabs-item" role="tab" :id="`${id}-tab-${index}`" :data-value="tab.value" :aria-selected="tab.value === first" :aria-controls="`${id}-panel-${index}`" :tabindex="tab.value === first ? 0 : -1" :disabled="tab.disabled">{{ tab.label }}</button>
  </div>
  <div v-for="(tab, index) in tabs" :key="tab.value" :class="panelClass" role="tabpanel" :id="`${id}-panel-${index}`" :aria-labelledby="`${id}-tab-${index}`" :hidden="tab.value !== first"><slot name="panel" :tab="tab">{{ tab.content }}</slot></div>
</template>
