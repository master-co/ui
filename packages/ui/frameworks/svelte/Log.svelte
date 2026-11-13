<script lang="ts" module>
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  export interface LogProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    /** What the region holds. */
    children?: Snippet
    /**
     * Whether the region keeps its end in view. It stops when the reader scrolls away and starts again at the
     * end. Bind it, or leave it out: it starts following.
     */
    following?: boolean
    onFollowingChange?: (following: boolean) => void
    /** The words of the button that leads back to the end, such as "Jump to latest". */
    latestLabel: string
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { follow } from '@master/ui/behaviors/follow.js'
  import { behavior } from './behavior.svelte.js'

  let { children, following = $bindable(), onFollowingChange, latestLabel, class: className, ...root }: LogProps = $props()
  const first = untrack(() => following) ?? true
  const attach = behavior(follow, undefined, {
    value: () => following,
    change: (next) => { following = next; onFollowingChange?.(next) },
  })
</script>

<!--
  @component
  A scroll area that follows what arrives at its end: a chat, a build log, a streamed answer. Its children
  are the content; name it with `aria-label` and give it a height. Set `following` to true to bring the
  reader back to the end, as when they send a message.
-->
<!-- A region that scrolls takes the focus, so the keys scroll it. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class={['scroll-area', className]} role="log" tabindex={0} {@attach attach} {...root}>
  {@render children?.()}
  <button type="button" class="btn btn-sm btn-pill scroll-area-latest" hidden={first}>
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
    {latestLabel}
  </button>
</div>
