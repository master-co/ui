<script lang="ts">
  import { untrack, type Component } from 'svelte'

  /**
   * What a driver mounts: a component and the props it has now. `set` renders it again with props over
   * the ones it has, as an owner that keeps a value does.
   */
  let { component: Example, initial }: { component: Component<Record<string, unknown>>, initial: Record<string, unknown> } = $props()
  let current = $state.raw(untrack(() => initial))

  export function set(next: Record<string, unknown>) {
    current = { ...current, ...next }
  }
</script>

<Example {...current} />
