<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import Menu from '../../../frameworks/svelte/Menu.svelte'

  let props: ComponentProps<typeof Menu> = $props()
</script>

<Menu {...props}>
  {#snippet trigger(attributes)}
    <button type="button" class="btn" {...attributes}>Project</button>
  {/snippet}
</Menu>
