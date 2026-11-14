<script lang="ts">
import type { Crop } from '@master/ui/behaviors/cropper.js'

export type { Crop }

/** What the page's range input takes to zoom a panned cropper: bind it on the input. */
export interface CropperZoomAttributes {
  type: 'range'
  min: number
  max: number
  step: 'any'
  value: number
  disabled?: boolean
  'aria-controls': string
}
</script>

<script setup lang="ts">
import { useAttrs, useId, useTemplateRef, type Ref } from 'vue'
import { cropper, cropperFit } from '@master/ui/behaviors/cropper.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const { width, height, ratio, pan, min, step, maxZoom = 4, describe } = defineProps<{
  /** The picture. */
  src: string
  alt: string
  /** The picture's own size, in pixels: the crop is counted in them. */
  width: number
  height: number
  /** Width over height the box keeps. Free when left out; 1 on a panned cropper. */
  ratio?: number
  /** The box stays and the picture pans and zooms under it. */
  pan?: boolean
  /** A round box, for an avatar. */
  round?: boolean
  /** The least width and height, in the picture's pixels. */
  min?: number
  /** How far an arrow key moves the crop, in the picture's pixels. */
  step?: number
  /** The greatest zoom of a panned cropper. */
  maxZoom?: number
  /** The name of the box: what is cropped. */
  label: string
  /** What the box is called in place of "application", such as "crop box". */
  roleDescription?: string
  /** What the status says of a crop after each change, in the page's language. */
  describe?: (crop: Crop) => string
  disabled?: boolean
}>()
/** The crop, in the picture's pixels, with `zoom` on a panned cropper: `v-model`. It changes as the crop moves. */
const model = defineModel<Crop>()
const emit = defineEmits<{
  /** The crop, once a drag, a key, a pinch or a turn of the wheel has ended. */
  valueCommit: [value: Crop]
}>()
defineSlots<{
  /** A range input of the page's that zooms a panned cropper, given the attributes that join it to the frame. */
  zoom?: (attributes: CropperZoomAttributes) => unknown
}>()

/* A picture with a box over it that says what to keep. */
const generated = useId()
const attrs = useAttrs()
const name = () => (attrs.id as string | undefined) ?? generated
const first = cropperFit({ width, height }, model.value, { ratio, pan, min, zoom: [1, maxZoom] })
const root = useTemplateRef<HTMLDivElement>('root')
const current = useBehavior(root, cropper, () => ({ ratio: ratio ?? 0, step, min, maxZoom, describe }), model as Ref<Crop | null | undefined>, {
  // The box says change once a gesture or a key has ended.
  change: (event) => { if ((event.target as Element).classList.contains('cropper-box')) emit('valueCommit', crop()) },
})
// Vue writes a style again each time it renders, so it writes the crop the behavior holds, not the first one.
const crop = () => current() ?? first
/** A share of the picture as the behavior writes it. */
const share = (part: number) => String(Math.round(part * 1e5) / 1e5)
const shares = () => {
  const { x, y, width: across, height: down } = crop()
  return { '--cropper-x': share(x / width), '--cropper-y': share(y / height), '--cropper-width': share(across / width), '--cropper-height': share(down / height), '--cropper-ratio': ratio || undefined }
}
</script>

<template>
  <div class="cropper" :class="{ 'cropper-pan': pan, 'cropper-round': round }" :style="shares()" ref="root" v-bind="$attrs" :id="name()">
    <img class="cropper-image" :src="src" :alt="alt" :width="width" :height="height">
    <div class="cropper-box" role="application" :tabindex="disabled ? -1 : 0" :aria-label="label" :aria-roledescription="roleDescription" :aria-disabled="disabled || undefined">
      <template v-if="!pan">
        <span class="cropper-handle cropper-handle-top cropper-handle-left" />
        <span class="cropper-handle cropper-handle-top" />
        <span class="cropper-handle cropper-handle-top cropper-handle-right" />
        <span class="cropper-handle cropper-handle-right" />
        <span class="cropper-handle cropper-handle-bottom cropper-handle-right" />
        <span class="cropper-handle cropper-handle-bottom" />
        <span class="cropper-handle cropper-handle-bottom cropper-handle-left" />
        <span class="cropper-handle cropper-handle-left" />
      </template>
    </div>
    <p class="cropper-status" role="status" />
  </div>
  <!-- Vue writes a field's value with every render, so the zoom it is given is the one the behavior holds. -->
  <slot v-if="pan" name="zoom" v-bind="{ type: 'range', min: 1, max: maxZoom, step: 'any', value: crop().zoom ?? 1, disabled, 'aria-controls': name() } as CropperZoomAttributes" />
</template>
