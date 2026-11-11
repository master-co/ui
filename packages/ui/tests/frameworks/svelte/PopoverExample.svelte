<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import Popover from '../../../frameworks/svelte/Popover.svelte'

  let props: ComponentProps<typeof Popover> = $props()
</script>

<Popover {...props}>
  {#snippet trigger(attributes)}
    <button type="button" class="btn" {...attributes}>Share</button>
  {/snippet}
  <p>Anyone with the link can view the latest deployment.</p>
</Popover>
