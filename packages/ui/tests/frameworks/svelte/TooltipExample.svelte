<script lang="ts">
  import Tooltip from '../../../frameworks/svelte/Tooltip.svelte'
</script>

<Tooltip>
  {#snippet trigger(attributes)}
    <button type="button" class="btn" {...attributes}>Deploy</button>
  {/snippet}
  Ships the main branch to production
</Tooltip>
