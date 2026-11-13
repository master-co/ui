<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import Sortable from '../../../frameworks/svelte/Sortable.svelte'

  type Task = { value: string, label: string, due: string }
  let props: Omit<ComponentProps<typeof Sortable<Task>>, 'children' | 'items'> = $props()
  const items: Task[] = [
    { value: 'onboarding', label: 'Onboarding', due: 'Mon' },
    { value: 'billing', label: 'Billing', due: 'Tue' },
    { value: 'search', label: 'Search', due: 'Thu' },
  ]
</script>

<Sortable class="list" itemClass="list-row" aria-label="Priorities" {items} {...props}>
  {#snippet children(task)}
    <span class="list-body"><span class="list-title">{task.label}</span></span>
    <span class="list-end">{task.due}</span>
  {/snippet}
</Sortable>
