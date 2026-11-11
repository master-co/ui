<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import Splitter from '../../../frameworks/svelte/Splitter.svelte'

  let props: Omit<ComponentProps<typeof Splitter>, 'start' | 'end'> = $props()
</script>

<Splitter {...props}>
  {#snippet start()}<p>Files</p>{/snippet}
  {#snippet end()}<p>Editor</p>{/snippet}
</Splitter>
