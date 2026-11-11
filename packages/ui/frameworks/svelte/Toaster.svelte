<script lang="ts" module>
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  export interface ToastMessage {
    title?: string
    description?: string
    /** Colors the icon; give the icon itself in `icon`, with the classes `icon toast-icon`. */
    status?: 'info' | 'success' | 'warning' | 'danger'
    icon?: Snippet
    /** How long the toast stays, in milliseconds. 6000 by default; `false` keeps it until it is dismissed. */
    duration?: number | false
  }

  export interface ToasterProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    /** The name of the region, for assistive technology. */
    label?: string
    /** The name of the button that dismisses a toast. */
    dismissLabel?: string
  }

  interface Shown extends ToastMessage { id: number }

  let shown = $state.raw<Shown[]>([])
  let count = 0
  const remove = (id: number) => { shown = shown.filter(toast => toast.id !== id) }

  /**
   * Show a toast in the `Toaster` of the page. Returns a function that removes it.
   * @example toast({ title: 'Deployed to production', status: 'success' })
   */
  export function toast(message: ToastMessage | string) {
    // A server has no page to show a toast in, and what it queued would reach every reader.
    if (typeof document === 'undefined') return () => {}
    const id = ++count
    shown = [...shown, { id, ...(typeof message === 'string' ? { description: message } : message) }]
    return () => remove(id)
  }
</script>

<script lang="ts">
  let { label = 'Notifications', dismissLabel = 'Dismiss', class: className, ...root }: ToasterProps = $props()
</script>

<!--
  @component
  The stack that shows the toasts. Render it once, anywhere in the page.
-->
<div class={['toast-region', className]} role="region" aria-label={label} aria-live="polite" {...root}>
  {#each shown as { id, title, description, status, icon, duration = 6000 } (id)}
    <!-- A dismissed toast leaves through its transition before it is removed; an expired one has left already. -->
    <dialog
      open
      class={['toast', duration !== false && 'toast-timed', status && `toast-${status}`]}
      aria-labelledby="toast-{id}"
      style:--toast-duration={duration === false ? undefined : `${duration}ms`}
      onclose={() => setTimeout(() => remove(id), 300)}
      onanimationend={(event) => { if (event.animationName === 'toast-expire' && event.target === event.currentTarget) remove(id) }}
    >
      {@render icon?.()}
      <div class="toast-body">
        {#if title !== undefined}<p class="toast-title" id="toast-{id}">{title}</p>{/if}
        {#if description !== undefined}<p class="toast-description" id={title === undefined ? `toast-${id}` : undefined}>{description}</p>{/if}
      </div>
      <form method="dialog" class="toast-close">
        <button class="btn btn-quiet btn-square btn-sm" aria-label={dismissLabel}>
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </form>
    </dialog>
  {/each}
</div>
