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
    <svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.6362 7.5189A0.4947 0.4947 0 0 0 13.5 7.5L2.4755 7.5006A0.5 0.5 0 0 0 2.4266 8.4946L2.5 8.5H13.5A0.4947 0.4947 0 0 0 13.6362 8.4811A0.7009 0.7009 0 0 0 13.6362 7.5189Z" fill="currentColor" stroke="none" fill-rule="evenodd" transform="rotate(90 8 8)" /><path d="M8 4.5L13.2348 7.8313A0.2 0.2 0 0 1 13.2348 8.1687L8 11.5" transform="rotate(90 8 8)" /></svg>
    {latestLabel}
  </button>
</div>
