<script lang="ts">
import { shallowRef } from 'vue'

export interface ToastMessage {
  title?: string
  description?: string
  /** Colors the icon; give the icon itself in the `icon` slot of the `Toaster`, with the classes `icon toast-icon`. */
  status?: 'info' | 'success' | 'warning' | 'danger'
  /** How long the toast stays, in milliseconds. 6000 by default; `false` keeps it until it is dismissed. */
  duration?: number | false
}

export interface ShownToast extends ToastMessage { id: number }

const shown = shallowRef<ShownToast[]>([])
let count = 0
const remove = (id: number) => { shown.value = shown.value.filter(toast => toast.id !== id) }

/**
 * Show a toast in the `Toaster` of the page. Returns a function that removes it.
 * @example toast({ title: 'Deployed to production', status: 'success' })
 */
export function toast(message: ToastMessage | string) {
  // A server has no page to show a toast in, and what it queued would reach every reader.
  if (typeof document === 'undefined') return () => {}
  const id = ++count
  shown.value = [...shown.value, { id, ...(typeof message === 'string' ? { description: message } : message) }]
  return () => remove(id)
}
</script>

<script setup lang="ts">
import { onMounted } from 'vue'

defineOptions({ inheritAttrs: false })

const { label = 'Notifications', dismissLabel = 'Dismiss' } = defineProps<{
  /** The name of the region, for assistive technology. */
  label?: string
  /** The name of the button that dismisses a toast. */
  dismissLabel?: string
}>()
defineSlots<{
  /** The icon of a toast, with the classes `icon toast-icon`. */
  icon?: (scope: { toast: ShownToast }) => unknown
}>()

/* The stack that shows the toasts. Render it once, anywhere in the page. */
// A server renders no toast, and neither does the first render over its HTML.
const mounted = shallowRef(false)
onMounted(() => { mounted.value = true })

// A dismissed toast leaves through its transition before it is removed; an expired one has left already.
const dismissed = (id: number) => setTimeout(() => remove(id), 300)
const expired = (event: AnimationEvent, id: number) => {
  if (event.animationName === 'toast-expire' && event.target === event.currentTarget) remove(id)
}
</script>

<template>
  <div class="toast-region" role="region" :aria-label="label" aria-live="polite" v-bind="$attrs">
    <dialog
      v-for="each in mounted ? shown : []"
      :key="each.id"
      open
      class="toast"
      :class="{
        'toast-timed': each.duration !== false,
        'toast-info': each.status === 'info',
        'toast-success': each.status === 'success',
        'toast-warning': each.status === 'warning',
        'toast-danger': each.status === 'danger',
      }"
      :aria-labelledby="`toast-${each.id}`"
      :style="each.duration === false ? undefined : { '--toast-duration': `${each.duration ?? 6000}ms` }"
      @close="dismissed(each.id)"
      @animationend="expired($event, each.id)"
    >
      <slot name="icon" :toast="each" />
      <div class="toast-body">
        <p v-if="each.title !== undefined" class="toast-title" :id="`toast-${each.id}`">{{ each.title }}</p>
        <p v-if="each.description !== undefined" class="toast-description" :id="each.title === undefined ? `toast-${each.id}` : undefined">{{ each.description }}</p>
      </div>
      <form method="dialog" class="toast-close">
        <button class="btn btn-quiet btn-square btn-sm" :aria-label="dismissLabel">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </form>
    </dialog>
  </div>
</template>
