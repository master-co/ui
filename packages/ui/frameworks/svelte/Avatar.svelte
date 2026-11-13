<script lang="ts" module>
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  export interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
    /** The photo. Without one, or when it fails to load, the fallback shows. */
    src?: string
    /** Who it is: the avatar's accessible name. */
    alt: string
    /** One or two letters shown when there is no photo. */
    initials?: string
    /** What shows instead of the initials when there is no photo, such as an icon. */
    fallback?: Snippet
    /** A mark on the corner: an `avatar-status` or an `avatar-badge`. */
    children?: Snippet
  }
</script>

<script lang="ts">
  import { avatar } from '@master/ui/behaviors/avatar.js'
  import { behavior } from './behavior.svelte.js'

  let { src, alt, initials, fallback, children, class: className, ...root }: AvatarProps = $props()
  const attach = behavior(avatar)
</script>

<!--
  @component
  An avatar whose photo may fail. Svelte writes the photo over its fallback; the avatar behavior follows the
  photo and hides whichever of the two should not show, so a broken photo never appears. The avatar is named
  once, on its root.
-->
<span class={['avatar', className]} role="img" aria-label={alt} {@attach attach} {...root}>
  <img class="avatar-image" src={src || undefined} alt="" />
  <span class="avatar-fallback" aria-hidden="true">{#if fallback}{@render fallback()}{:else}{initials}{/if}</span>
  {@render children?.()}
</span>
