<script lang="ts">
export type MenuItem =
  | { label: string, shortcut?: string, href?: string, onSelect?: () => void, danger?: boolean, disabled?: boolean }
  | { separator: true }
</script>

<script setup lang="ts">
import { computed, useId, useTemplateRef, watchEffect } from 'vue'
import { contextMenu, menu } from '@master/ui/behaviors/menu.js'

defineOptions({ inheritAttrs: false })

const { id, context } = defineProps<{
  items: MenuItem[]
  id?: string
  /**
   * Instead of a button: the element the menu belongs to, null until it is mounted. The menu opens at the
   * pointer on a right click or a long press.
   */
  context?: HTMLElement | null
}>()
defineSlots<{
  /** The button that opens the menu: bind what it is given on a button of your own. */
  trigger?: (attributes: { 'popovertarget': string, 'aria-haspopup': 'menu' }) => unknown
}>()

/* A menu of actions with the keys of a menu. Name it with `aria-label`. */
const generated = useId()
const name = computed(() => id ?? generated)
const root = useTemplateRef<HTMLDivElement>('root')

watchEffect((onCleanup) => {
  const element = root.value
  if (!element) return
  const detach = menu(element)
  const forget = context ? contextMenu(context, element) : undefined
  onCleanup(() => {
    detach()
    forget?.()
  })
}, { flush: 'post' })
</script>

<template>
  <slot name="trigger" v-bind="{ 'popovertarget': name, 'aria-haspopup': 'menu' as const }" />
  <div :id="name" popover="auto" class="menu" :class="{ 'menu-context': context !== undefined }" role="menu" ref="root" v-bind="$attrs">
    <template v-for="(item, index) in items" :key="index">
      <hr v-if="'separator' in item" class="menu-separator">
      <a v-else-if="item.href" class="menu-item" :class="{ 'menu-item-danger': item.danger }" role="menuitem" :href="item.href" :aria-disabled="item.disabled || undefined">{{ item.label }}<span v-if="item.shortcut !== undefined" class="menu-shortcut">{{ item.shortcut }}</span></a>
      <button v-else type="button" class="menu-item" :class="{ 'menu-item-danger': item.danger }" role="menuitem" :popovertarget="name" popovertargetaction="hide" :disabled="item.disabled" @click="item.onSelect?.()">{{ item.label }}<span v-if="item.shortcut !== undefined" class="menu-shortcut">{{ item.shortcut }}</span></button>
    </template>
  </div>
</template>
