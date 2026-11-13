<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import Cropper from '../../../frameworks/svelte/Cropper.svelte'

  let props: Omit<ComponentProps<typeof Cropper>, 'src' | 'alt' | 'width' | 'height'> = $props()
</script>

<Cropper src="/demo/harbor.svg" alt="The harbor at dusk" width={640} height={480} {...props}>
  {#snippet zoom(attributes)}<input class="slider" aria-label="Zoom" {...attributes} />{/snippet}
</Cropper>
