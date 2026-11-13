<script lang="ts">
import { shallowRef } from 'vue'

export interface ToastAction {
  /** The words on the button: Undo, View. */
  label: string
  /** Runs when the button is pressed, and the toast is dismissed after it unless this calls `event.preventDefault()`. */
  onClick: (event: MouseEvent) => void
}

export interface ToastMessage {
  title?: string
  description?: string
  /**
   * Colors the icon; give the icon itself in the `icon` slot of the `Toaster`, with the classes `icon toast-icon`.
   * `pending` says the work is under way: the toast shows a spinner instead and stays until it is updated or dismissed.
   */
  status?: 'pending' | 'info' | 'success' | 'warning' | 'danger'
  /** How long the toast stays, in milliseconds. 6000 by default; `false` keeps it until it is dismissed. */
  duration?: number | false
  /** The one button the toast offers. It runs, then dismisses the toast. Keep the same action somewhere that stays. */
  action?: ToastAction
}

export interface ToastHandle {
  /** Says something else in the same toast, in its place, without a new entrance; its clock starts again. */
  update(message: ToastMessage | string): void
  /** Dismisses the toast: it leaves as one dismissed with its button does. */
  dismiss(): void
}

export interface ToastPromiseMessages<T> {
  /** What the toast says while the work is under way. */
  loading: ToastMessage | string
  /** What it says when the promise is fulfilled, or a function of the value; `success` unless it names a status. */
  success: ToastMessage | string | ((value: T) => ToastMessage | string)
  /** What it says when the promise is rejected, or a function of the reason; `danger` unless it names a status. */
  error: ToastMessage | string | ((error: unknown) => ToastMessage | string)
}

export interface ShownToast extends ToastMessage { id: number, version: number, leaving?: boolean }

const shown = shallowRef<ShownToast[]>([])
let count = 0
const read = (message: ToastMessage | string): ToastMessage => typeof message === 'string' ? { description: message } : message
const edit = (id: number, change: (toast: ShownToast) => ShownToast) => { shown.value = shown.value.map(toast => toast.id === id ? change(toast) : toast) }
const remove = (id: number) => { shown.value = shown.value.filter(toast => toast.id !== id) }
// A dismissed toast leaves through its transition before it is removed.
function leave(id: number) {
  if (!shown.value.some(toast => toast.id === id && !toast.leaving)) return
  edit(id, toast => ({ ...toast, leaving: true }))
  setTimeout(() => remove(id), 300)
}

/**
 * Show a toast in the `Toaster` of the page. Returns a handle that updates it in place or dismisses it.
 * @example const archived = toast({ title: 'Project archived', action: { label: 'Undo', onClick: restore } })
 */
export function toast(message: ToastMessage | string): ToastHandle {
  // A server has no page to show a toast in, and what it queued would reach every reader.
  if (typeof document === 'undefined') return { update() {}, dismiss() {} }
  const id = ++count
  shown.value = [...shown.value, { ...read(message), id, version: 0 }]
  return {
    update: next => edit(id, toast => ({ ...read(next), id, version: toast.version + 1, leaving: toast.leaving })),
    dismiss: () => leave(id),
  }
}

/**
 * Show a pending toast while a promise runs, then say in the same toast how it ended. Returns the promise.
 * @example toast.promise(save(), { loading: 'Saving…', success: 'Saved.', error: (error) => `Not saved: ${error}` })
 */
toast.promise = function <T>(work: Promise<T>, messages: ToastPromiseMessages<T>): Promise<T> {
  const handle = toast({ ...read(messages.loading), status: 'pending' })
  const settle = <R>(message: ToastMessage | string | ((result: R) => ToastMessage | string), result: R, status: 'success' | 'danger') => {
    const said = read(typeof message === 'function' ? message(result) : message)
    handle.update({ ...said, status: said.status ?? status })
  }
  work.then(value => settle(messages.success, value, 'success'), (error: unknown) => settle(messages.error, error, 'danger'))
  return work
}
</script>

<script setup lang="ts">
import { onMounted, type Directive } from 'vue'

defineOptions({ inheritAttrs: false })

const { label = 'Notifications', dismissLabel = 'Dismiss' } = defineProps<{
  /** The name of the region, for assistive technology. */
  label?: string
  /** The name of the button that dismisses a toast. */
  dismissLabel?: string
}>()
defineSlots<{
  /** The icon of a toast, with the classes `icon toast-icon`. A pending toast shows a spinner instead. */
  icon?: (scope: { toast: ShownToast }) => unknown
}>()

/* The stack that shows the toasts. Render it once, anywhere in the page. */
// A server renders no toast, and neither does the first render over its HTML.
const mounted = shallowRef(false)
onMounted(() => { mounted.value = true })

// An expired toast has left already.
const expired = (event: AnimationEvent, id: number) => {
  if (event.animationName === 'toast-expire' && event.target === event.currentTarget) remove(id)
}
/** Starts a toast's clock again, and the hairline that shows it, so new words get their whole time. */
const vRestart: Directive<HTMLDialogElement, number> = {
  updated(dialog, { value, oldValue }) {
    if (value === oldValue) return
    for (const animation of dialog.getAnimations?.({ subtree: true }) ?? []) {
      if ((animation as CSSAnimation).animationName?.startsWith('toast-')) animation.currentTime = 0
    }
  },
}
const timed = (each: ShownToast) => each.status !== 'pending' && each.duration !== false
</script>

<template>
  <div class="toast-region" role="region" :aria-label="label" aria-live="polite" v-bind="$attrs">
    <dialog
      v-for="each in mounted ? shown : []"
      :key="each.id"
      v-restart="each.version"
      :open="!each.leaving"
      class="toast"
      :class="{
        'toast-timed': timed(each),
        'toast-info': each.status === 'info',
        'toast-success': each.status === 'success',
        'toast-warning': each.status === 'warning',
        'toast-danger': each.status === 'danger',
      }"
      :aria-labelledby="`toast-${each.id}`"
      :aria-busy="each.status === 'pending' || undefined"
      aria-atomic="true"
      :style="timed(each) ? { '--toast-duration': `${each.duration ?? 6000}ms` } : undefined"
      @close="leave(each.id)"
      @animationend="expired($event, each.id)"
    >
      <span v-if="each.status === 'pending'" class="spinner spinner-inline toast-icon" aria-hidden="true" />
      <slot v-else name="icon" :toast="each" />
      <div class="toast-body">
        <p v-if="each.title !== undefined" class="toast-title" :id="`toast-${each.id}`">{{ each.title }}</p>
        <p v-if="each.description !== undefined" class="toast-description" :id="each.title === undefined ? `toast-${each.id}` : undefined">{{ each.description }}</p>
      </div>
      <form v-if="each.action" method="dialog" class="toast-action">
        <button class="btn btn-sm" @click="each.action.onClick">{{ each.action.label }}</button>
      </form>
      <form method="dialog" class="toast-close">
        <button class="btn btn-quiet btn-square btn-sm" :aria-label="dismissLabel">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </form>
    </dialog>
  </div>
</template>
