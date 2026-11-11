<script lang="ts" module>
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  export interface PopoverProps extends Omit<HTMLAttributes<HTMLDivElement>, 'popover'> {
    /** Whether the popover is open. Bind it, or leave it out and the trigger opens it. */
    open?: boolean
    onOpenChange?: (open: boolean) => void
    /** The button that opens the popover: spread what it is given on a button of your own. */
    trigger?: Snippet<[{ popovertarget: string }]>
    /** `auto` closes on a press outside and on Esc; `manual` stays until it is closed. */
    mode?: 'auto' | 'manual'
  }
</script>

<script lang="ts">
  import type { Attachment } from 'svelte/attachments'

  let { open = $bindable(), onOpenChange, trigger, mode = 'auto', class: className, id, children, ...root }: PopoverProps = $props()
  const generated = $props.id()
  const name = $derived(id ?? generated)
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
  A popover. The browser opens it from the trigger, places it against the trigger and dismisses it; this
  component only opens and closes it from `open`, and says when the browser did.
-->
{@render trigger?.({ popovertarget: name })}
<div id={name} popover={mode} class={['popover', className]} {@attach presence} {...root}>{@render children?.()}</div>
