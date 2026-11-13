<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import Log from '../../../frameworks/svelte/Log.svelte'

  let { rows = [], ...props }: Omit<ComponentProps<typeof Log>, 'children'> & { rows?: string[] } = $props()
</script>

<Log {...props}>
  <ol>
    {#each rows as row (row)}<li>{row}</li>{/each}
  </ol>
</Log>
