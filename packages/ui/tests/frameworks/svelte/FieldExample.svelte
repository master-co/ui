<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import Field from '../../../frameworks/svelte/Field.svelte'

  let props: Omit<ComponentProps<typeof Field>, 'children'> = $props()
</script>

<Field {...props}>
  {#snippet children(control)}
    <input class="input" type="email" {...control} />
  {/snippet}
</Field>
