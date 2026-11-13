<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import Panel from '../../../frameworks/svelte/Panel.svelte'

  let props: Omit<ComponentProps<typeof Panel>, 'title' | 'handleLabel'> = $props()
</script>

<Panel id="layers" title="Layers" handleLabel="Move the Layers panel with the arrow keys" {...props}>
  {#snippet trigger(attributes)}
    <button type="button" class="btn" {...attributes}>Layers</button>
  {/snippet}
  <p>Header, Hero image, Pricing table</p>
</Panel>
