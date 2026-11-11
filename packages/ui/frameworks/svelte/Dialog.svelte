<script lang="ts" module>
  import type { Snippet } from 'svelte'
  import type { HTMLDialogAttributes } from 'svelte/elements'

  export interface DialogProps extends Omit<HTMLDialogAttributes, 'open'> {
    /** Whether the dialog is open. Bind it, or leave it out and the trigger opens it. */
    open?: boolean
    onOpenChange?: (open: boolean) => void
    /** The button that opens the dialog: spread what it is given on a button of your own. */
    trigger?: Snippet<[{ commandfor: string, command: 'show-modal' }]>
  }
</script>

<script lang="ts">
  import type { Attachment } from 'svelte/attachments'

  let { open = $bindable(), onOpenChange, trigger, class: className, id, children, ...dialog }: DialogProps = $props()
  const generated = $props.id()
  const name = $derived(id ?? generated)
  /** What the owner knows: the last state it set or was told. */
  let known = false

  const presence: Attachment<HTMLDialogElement> = (root) => {
    const controller = new AbortController()
    const report = () => {
      if (root.open === known) return
      open = known = root.open
      onOpenChange?.(known)
    }
    for (const type of ['toggle', 'close']) root.addEventListener(type, report, { signal: controller.signal })
    $effect(() => {
      if (open === undefined) return
      known = open
      if (open && !root.open) root.showModal()
      else if (!open && root.open) root.close()
    })
    return () => controller.abort()
  }
</script>

<!--
  @component
  A modal dialog. The browser opens it from the trigger, traps focus and closes it on Esc; this component
  only opens and closes it from `open`, and says when the browser did. Its children are the contract's
  parts: `dialog-header`, `dialog-body`, `dialog-footer`. A button inside closes it with
  `commandfor={id}` and `command="close"`, or from a form with `method="dialog"`.
-->
{@render trigger?.({ commandfor: name, command: 'show-modal' })}
<dialog id={name} class={['dialog', className]} closedby="any" {@attach presence} {...dialog}>{@render children?.()}</dialog>
