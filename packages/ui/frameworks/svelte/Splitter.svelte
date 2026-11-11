<script lang="ts" module>
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  export interface SplitterProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    /** The first and the second pane. */
    start: Snippet
    end: Snippet
    /** The first pane's size, in percent of the container. Bind it, or leave it out: it starts at 50. */
    value?: number
    /** Called as the handle moves. */
    onValueChange?: (value: number) => void
    /** Called once a drag ends or a key moved the handle. */
    onValueCommit?: (value: number) => void
    /** The least and the greatest size, in percent. */
    min?: number
    max?: number
    /** How far an arrow key moves the handle, in percent. */
    step?: number
    /** Stack the panes, with a handle that moves up and down. */
    stacked?: boolean
    /** The name of the handle: what it resizes. */
    label: string
    disabled?: boolean
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { splitter } from '@master/ui/behaviors/splitter.js'
  import { behavior } from './behavior.svelte.js'

  let { start, end, value = $bindable(), onValueChange, onValueCommit, min = 0, max = 100, step = 5, stacked, label, disabled, class: className, ...root }: SplitterProps = $props()
  const first = untrack(() => value) ?? 50
  // Svelte writes a style again whenever its owner changes it, so it writes the size the behavior holds.
  let size = $state(first)
  const attach = behavior(splitter, () => ({ step }), {
    value: () => value,
    change: (next) => { value = size = next; onValueChange?.(next) },
    settled: (held) => { size = held },
    // The handle says change once a drag ends or a key moved it. A field in a pane says change too.
    on: { change: (event) => { if ((event.target as Element).parentElement === event.currentTarget && (event.target as Element).classList.contains('splitter-handle')) onValueCommit?.(size) } },
  })
</script>

<!--
  @component
  Two panes and the handle between them.
-->
<div class={['splitter', className]} style:--splitter-size="{size}%" {@attach attach} {...root}>
  <div class="splitter-pane">{@render start()}</div>
  <!-- A separator that takes focus is a control: the keys move it. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="splitter-handle" role="separator" tabindex={disabled ? -1 : 0} aria-label={label} aria-valuenow={Math.round(first)} aria-valuemin={min} aria-valuemax={max} aria-orientation={stacked ? 'horizontal' : undefined} aria-disabled={disabled || undefined}></div>
  <div class="splitter-pane">{@render end()}</div>
</div>
