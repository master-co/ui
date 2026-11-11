<script lang="ts" module>
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  export interface TooltipProps extends Omit<HTMLAttributes<HTMLDivElement>, 'popover'> {
    /** The control the tooltip names: spread what it is given on a button or a link of your own. */
    trigger: Snippet<[{ interestfor: string }]>
  }
</script>

<script lang="ts">
  let { trigger, class: className, id, children, ...root }: TooltipProps = $props()
  const generated = $props.id()
  const name = $derived(id ?? generated)
</script>

<!--
  @component
  A tooltip. The browser shows it on hover and on focus and places it; this component only joins the
  control to its label. The children are the label. The control keeps its own accessible name.
-->
{@render trigger({ interestfor: name })}
<div id={name} popover="hint" class={['tooltip', className]} {...root}>{@render children?.()}</div>
