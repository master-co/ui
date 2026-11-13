<script lang="ts" module>
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import type { Crop } from '@master/ui/behaviors/cropper.js'

  export type { Crop }

  /** What the page's range input takes to zoom a panned cropper: spread it on the input. */
  export interface CropperZoomAttributes {
    type: 'range'
    min: number
    max: number
    step: 'any'
    value: number
    disabled?: boolean
    'aria-controls': string
  }

  export interface CropperProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    /** The picture. */
    src: string
    alt: string
    /** The picture's own size, in pixels: the crop is counted in them. */
    width: number
    height: number
    /** The crop, in the picture's pixels, with `zoom` on a panned cropper. Bind it, or leave it out. */
    value?: Crop
    /** Called as the crop moves. */
    onValueChange?: (crop: Crop) => void
    /** Called once a drag, a key, a pinch or a turn of the wheel has ended. */
    onValueCommit?: (crop: Crop) => void
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
    /** A range input of the page's that zooms a panned cropper, given the attributes that join it to the frame. */
    zoom?: Snippet<[CropperZoomAttributes]>
    disabled?: boolean
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { cropper, cropperFit } from '@master/ui/behaviors/cropper.js'
  import { behavior } from './behavior.svelte.js'

  let { src, alt, width, height, value = $bindable(), onValueChange, onValueCommit, ratio, pan, round, min, step, maxZoom = 4, label, roleDescription, describe, zoom, disabled, id, class: className, ...root }: CropperProps = $props()
  const generated = $props.id()
  const name = $derived(id ?? generated)
  const first = untrack(() => cropperFit({ width, height }, value, { ratio, pan, min, zoom: [1, maxZoom] }))
  // Svelte writes a style again whenever its owner changes it, so it writes the crop the behavior holds.
  let crop = $state(first)
  const attach = behavior(cropper, () => ({ ratio: ratio ?? 0, step, min, maxZoom, describe }), {
    value: () => value,
    change: (next) => { if (!next) return; value = crop = next; onValueChange?.(next) },
    settled: (held) => { if (held) crop = held },
    // The box says change once a gesture or a key has ended.
    on: { change: (event) => { if ((event.target as Element).classList.contains('cropper-box')) onValueCommit?.(crop) } },
  })
  /** A share of the picture as the behavior writes it. */
  const share = (part: number) => String(Math.round(part * 1e5) / 1e5)
</script>

<!--
  @component
  A picture with a box over it that says what to keep.
-->
<div id={name} class={['cropper', pan && 'cropper-pan', round && 'cropper-round', className]} style:--cropper-x={share(crop.x / width)} style:--cropper-y={share(crop.y / height)} style:--cropper-width={share(crop.width / width)} style:--cropper-height={share(crop.height / height)} style:--cropper-ratio={ratio || undefined} {@attach attach} {...root}>
  <img class="cropper-image" {src} {alt} {width} {height} />
  <!-- The box is one control that the keys move and size: an application of its own. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="cropper-box" role="application" tabindex={disabled ? -1 : 0} aria-label={label} aria-roledescription={roleDescription} aria-disabled={disabled || undefined}>
    {#if !pan}
      <span class="cropper-handle cropper-handle-top cropper-handle-left"></span>
      <span class="cropper-handle cropper-handle-top"></span>
      <span class="cropper-handle cropper-handle-top cropper-handle-right"></span>
      <span class="cropper-handle cropper-handle-right"></span>
      <span class="cropper-handle cropper-handle-bottom cropper-handle-right"></span>
      <span class="cropper-handle cropper-handle-bottom"></span>
      <span class="cropper-handle cropper-handle-bottom cropper-handle-left"></span>
      <span class="cropper-handle cropper-handle-left"></span>
    {/if}
  </div>
  <p class="cropper-status" role="status"></p>
</div>
{#if pan}
  {@render zoom?.({ type: 'range', min: 1, max: maxZoom, step: 'any', value: first.zoom ?? 1, disabled, 'aria-controls': name })}
{/if}
