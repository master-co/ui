<script lang="ts" module>
  import type { Snippet } from 'svelte'
  import type { Attachment } from 'svelte/attachments'
  import type { HTMLAttributes } from 'svelte/elements'

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
     * Colors the icon; give the icon itself in `icon`, with the classes `icon toast-icon`. `pending` says the
     * work is under way: the toast shows a spinner instead and stays until it is updated or dismissed.
     */
    status?: 'pending' | 'info' | 'success' | 'warning' | 'danger'
    icon?: Snippet
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

  export interface ToasterProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    /** The name of the region, for assistive technology. */
    label?: string
    /** The name of the button that dismisses a toast. */
    dismissLabel?: string
  }

  interface Shown extends ToastMessage { id: number, version: number, leaving?: boolean }

  let shown = $state.raw<Shown[]>([])
  let count = 0
  const read = (message: ToastMessage | string): ToastMessage => typeof message === 'string' ? { description: message } : message
  const edit = (id: number, change: (toast: Shown) => Shown) => { shown = shown.map(toast => toast.id === id ? change(toast) : toast) }
  const remove = (id: number) => { shown = shown.filter(toast => toast.id !== id) }
  // A dismissed toast leaves through its transition before it is removed.
  function leave(id: number) {
    if (!shown.some(toast => toast.id === id && !toast.leaving)) return
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
    shown = [...shown, { ...read(message), id, version: 0 }]
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

  /** Starts a toast's clock again, and the hairline that shows it, so new words get their whole time. */
  const restart = (version: number): Attachment<HTMLDialogElement> => (dialog) => {
    if (!version) return
    for (const animation of dialog.getAnimations?.({ subtree: true }) ?? []) {
      if ((animation as CSSAnimation).animationName?.startsWith('toast-')) animation.currentTime = 0
    }
  }
</script>

<script lang="ts">
  let { label = 'Notifications', dismissLabel = 'Dismiss', class: className, ...root }: ToasterProps = $props()
  // A server renders no toast, and neither does the first render over its HTML: one shown before the page
  // hydrated waits for it.
  let mounted = $state(false)
  $effect(() => { mounted = true })
</script>

<!--
  @component
  The stack that shows the toasts. Render it once, anywhere in the page.
-->
<div class={['toast-region', className]} role="region" aria-label={label} aria-live="polite" {...root}>
  {#each mounted ? shown : [] as { id, version, leaving, title, description, status, icon, duration = 6000, action } (id)}
    {@const pending = status === 'pending'}
    {@const timed = !pending && duration !== false}
    <!-- An expired toast has left already. -->
    <dialog
      open={!leaving}
      class={['toast', timed && 'toast-timed', status && !pending && `toast-${status}`]}
      aria-labelledby="toast-{id}"
      aria-busy={pending || undefined}
      aria-atomic="true"
      style:--toast-duration={timed ? `${duration}ms` : undefined}
      onclose={() => leave(id)}
      onanimationend={(event) => { if (event.animationName === 'toast-expire' && event.target === event.currentTarget) remove(id) }}
      {@attach restart(version)}
    >
      {#if pending}<span class="spinner spinner-inline toast-icon" aria-hidden="true"></span>{:else}{@render icon?.()}{/if}
      <div class="toast-body">
        {#if title !== undefined}<p class="toast-title" id="toast-{id}">{title}</p>{/if}
        {#if description !== undefined}<p class="toast-description" id={title === undefined ? `toast-${id}` : undefined}>{description}</p>{/if}
      </div>
      {#if action}
        <form method="dialog" class="toast-action">
          <button class="btn btn-sm" onclick={action.onClick}>{action.label}</button>
        </form>
      {/if}
      <form method="dialog" class="toast-close">
        <button class="btn btn-quiet btn-square btn-sm" aria-label={dismissLabel}>
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </form>
    </dialog>
  {/each}
</div>
