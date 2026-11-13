<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { avatar } from '@master/ui/behaviors/avatar.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const { src, alt, initials } = defineProps<{
  /** The photo. Without one, or when it fails to load, the fallback shows. */
  src?: string
  /** Who it is: the avatar's accessible name. */
  alt: string
  /** One or two letters shown when there is no photo. */
  initials?: string
}>()
defineSlots<{
  /** What shows instead of the initials when there is no photo, such as an icon. */
  fallback?: () => unknown
  /** A mark on the corner: an `avatar-status` or an `avatar-badge`. */
  default?: () => unknown
}>()

/*
 * An avatar whose photo may fail. Vue writes the photo over its fallback; the avatar behavior follows the
 * photo and hides whichever of the two should not show, so a broken photo never appears. The avatar is named
 * once, on its root.
 */
const root = useTemplateRef<HTMLSpanElement>('root')
useBehavior(root, avatar)
</script>

<template>
  <span class="avatar" role="img" :aria-label="alt" ref="root" v-bind="$attrs">
    <img class="avatar-image" :src="src || undefined" alt="" />
    <span class="avatar-fallback" aria-hidden="true"><slot name="fallback">{{ initials }}</slot></span>
    <slot />
  </span>
</template>
