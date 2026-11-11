<script lang="ts">
  import { untrack, type Component } from 'svelte'

  /** The owner of an example: it keeps the value the component gives out and hands it back, as an application does. */
  let { component: Example, props }: { component: Component<Record<string, unknown>>, props: Record<string, unknown> } = $props()
  const { onValueChange, ...rest } = untrack(() => props) as Record<string, unknown> & { onValueChange?: (value: unknown) => void }
  let value = $state.raw(untrack(() => props.value))
  const owned = $derived('value' in props ? { value, onValueChange: (next: unknown) => { value = next; onValueChange?.(next) } } : {})
</script>

<Example {...rest} {...owned} />
