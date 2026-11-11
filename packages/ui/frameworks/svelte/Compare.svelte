<script lang="ts" module>
  import type { HTMLAttributes } from 'svelte/elements'

  export interface CompareProps extends HTMLAttributes<HTMLElement> {
    /** How much of the second picture shows, from 0 to 100. Bind it, or leave it out: it starts at 50. */
    value?: number
    onValueChange?: (value: number) => void
    /** The name of the handle: what moving it shows. */
    label: string
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { compare } from '@master/ui/behaviors/compare.js'
  import { behavior } from './behavior.svelte.js'

  let { value = $bindable(), onValueChange, label, class: className, children, ...root }: CompareProps = $props()
  const first = untrack(() => value) ?? 50
  const attach = behavior(compare, undefined, {
    value: () => value,
    change: (next) => { value = next; onValueChange?.(next) },
  })
</script>

<!--
  @component
  Two pictures and the line between them. The children are the two images, `compare-before` and `compare-after`.
-->
<figure class={['compare', className]} {@attach attach} {...root}>
  {@render children?.()}
  <input type="range" class="compare-range" min="0" max="100" value={first} aria-label={label} />
</figure>
