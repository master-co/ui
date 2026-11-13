<script lang="ts" module>
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  export interface ToolbarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
    /** What the tools act on, for assistive technology. */
    label: string
    /** A column of tools, moved through with ArrowUp and ArrowDown. */
    vertical?: boolean
    /** On the floating surface, for tools over content. */
    floating?: boolean
    /** The controls: small quiet buttons, with `aria-pressed` for the ones that toggle, selects, segmented controls. */
    children: Snippet
  }
</script>

<script lang="ts">
  import { toolbar } from '@master/ui/behaviors/toolbar.js'
  import { behavior } from './behavior.svelte.js'

  let { label, vertical, floating, children, class: className, ...root }: ToolbarProps = $props()
  const attach = behavior(toolbar)
</script>

<!--
  @component
  A toolbar: one stop in the tab order, with the arrow keys between its controls.
-->
<div class={['toolbar', floating && 'toolbar-floating', className]} role="toolbar" aria-label={label} aria-orientation={vertical ? 'vertical' : undefined} {...{ focusgroup: vertical ? 'toolbar wrap block' : 'toolbar wrap' }} {@attach attach} {...root}>
  {@render children()}
</div>
