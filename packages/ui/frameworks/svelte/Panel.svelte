<script lang="ts" module>
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import type { PanelValue } from '@master/ui/behaviors/panel.js'

  export type { PanelValue }

  export interface PanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'popover' | 'role'> {
    /** The title in the header, which names the panel. */
    title: string
    /** The name of the handle: what it moves and how, such as "Move the Layers panel with the arrow keys". */
    handleLabel: string
    /** Whether the panel is open. Bind it, or leave it out and the trigger opens it. */
    open?: boolean
    onOpenChange?: (open: boolean) => void
    /** Where the panel is, how large and whether it is folded. Bind it to put the panel back where it was. */
    value?: PanelValue
    /** Called as the panel moves, resizes or folds. */
    onValueChange?: (value: PanelValue) => void
    /** Called once a drag ends, a key moved it or it was folded: the moment to keep the value. */
    onValueCommit?: (value: PanelValue) => void
    /** The button that opens the panel: spread what it is given on a button of your own. */
    trigger?: Snippet<[{ commandfor: string, command: 'toggle-popover' }]>
    /** More controls in the header, before the minimize and close buttons. */
    actions?: Snippet
    minimizeLabel?: string
    closeLabel?: string
    /** Leave out the corner that resizes it. */
    resizable?: boolean
    /** How far an arrow key moves or resizes the panel, in pixels. */
    step?: number
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import type { Attachment } from 'svelte/attachments'
  import { panel } from '@master/ui/behaviors/panel.js'
  import { behavior } from './behavior.svelte.js'

  let { title, handleLabel, open = $bindable(), onOpenChange, value = $bindable(), onValueChange, onValueCommit, trigger, actions, minimizeLabel = 'Minimize', closeLabel = 'Close', resizable = true, step = 16, class: className, id, children, ...root }: PanelProps = $props()
  const generated = $props.id()
  const name = $derived(id ?? generated)
  const first = untrack(() => value)
  // Svelte writes a style again whenever its owner changes it, so it writes the place the behavior holds.
  let held = $state(first)
  const px = (measure: number | null | undefined) => typeof measure === 'number' ? `${measure}px` : undefined
  const attach = behavior(panel, () => ({ step }), {
    value: () => value,
    change: (next) => { value = held = next; onValueChange?.(next) },
    settled: (kept) => { held = kept },
    // The panel says change once a move ends. A field in its body says change too.
    on: { change: (event) => { if (event.target === event.currentTarget && held) onValueCommit?.(held) } },
  })

  /** What the owner knows: the last state it set or was told. */
  let known = false
  const presence: Attachment<HTMLDivElement> = (popover) => {
    const report = () => {
      const shown = popover.matches(':popover-open')
      if (shown === known) return
      open = known = shown
      onOpenChange?.(known)
    }
    popover.addEventListener('toggle', report)
    $effect(() => {
      if (open === undefined) return
      const shown = popover.matches(':popover-open')
      known = open
      if (open && !shown) popover.showPopover()
      else if (!open && shown) popover.hidePopover()
    })
    return () => popover.removeEventListener('toggle', report)
  }
</script>

<!--
  @component
  A floating panel. The browser opens it from the trigger and puts it in the top layer; the behavior moves,
  resizes, folds and stacks it. This component opens and closes it from `open`, and passes its place in and out.
-->
{@render trigger?.({ commandfor: name, command: 'toggle-popover' })}
<div id={name} popover="manual" role="dialog" aria-labelledby="{name}-title" class={['panel', className]} style:--panel-x={px(held?.x)} style:--panel-y={px(held?.y)} style:--panel-width={px(held?.width)} style:--panel-height={px(held?.height)} {@attach attach} {@attach presence} {...root}>
  <div class="panel-header">
    <button type="button" class="panel-handle" aria-label={handleLabel}></button>
    <h2 class="panel-title" id="{name}-title">{title}</h2>
    <div class="panel-actions">
      {@render actions?.()}
      <button type="button" class="btn btn-quiet btn-sm btn-square panel-minimize" aria-pressed={first?.minimized ?? false} aria-label={minimizeLabel}>
        <svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8L13 8" /></svg>
      </button>
      <button type="button" class="btn btn-quiet btn-sm btn-square" commandfor={name} command="hide-popover" aria-label={closeLabel}>
        <svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4L12 12" /><path d="M4 12L12 4" /></svg>
      </button>
    </div>
  </div>
  <div class="panel-body">{@render children?.()}</div>
  {#if resizable}
    <span class="panel-resize" aria-hidden="true"></span>
  {/if}
</div>
