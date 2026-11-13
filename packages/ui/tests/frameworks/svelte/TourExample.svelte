<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import Tour from '../../../frameworks/svelte/Tour.svelte'

  let props: Omit<ComponentProps<typeof Tour>, 'steps' | 'trigger'> = $props()
  let share = $state<HTMLButtonElement>()
</script>

<div class="toolbar" role="toolbar" aria-label="Deployments">
  <button type="button" class="btn btn-quiet btn-sm" id="tour-search">Search</button>
  <button type="button" class="btn btn-quiet btn-sm" id="tour-filter">Filter</button>
  <button type="button" class="btn btn-quiet btn-sm" bind:this={share}>Share</button>
</div>
<Tour
  steps={[
    { target: '#tour-search', title: 'Search every deployment', text: 'Find one by its branch, its commit or the person who shipped it.' },
    { target: () => document.getElementById('tour-filter'), title: 'Filter the list', text: 'Keep only the deployments of one branch, one author or one status.' },
    { target: () => share, title: 'Share a deployment', text: 'Copy a link to it, open for anyone on the team.' },
  ]}
  {...props}
>
  {#snippet trigger(attributes)}
    <button type="button" class="btn" {...attributes}>Take the tour</button>
  {/snippet}
</Tour>
