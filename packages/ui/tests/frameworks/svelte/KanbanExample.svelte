<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import Kanban from '../../../frameworks/svelte/Kanban.svelte'

  type Stage = { value: string, label: string }
  type Task = { value: string, label: string, column: string }
  let props: Omit<ComponentProps<typeof Kanban<Stage, Task>>, 'children' | 'columns' | 'items'> = $props()
  const columns: Stage[] = [
    { value: 'todo', label: 'To do' },
    { value: 'doing', label: 'In progress' },
    { value: 'review', label: 'In review' },
    { value: 'done', label: 'Done' },
  ]
  const items: Task[] = [
    { value: 'brief', label: 'Brief', column: 'todo' },
    { value: 'copy', label: 'Copy', column: 'todo' },
    { value: 'site', label: 'Site', column: 'doing' },
    { value: 'name', label: 'Name', column: 'done' },
  ]
</script>

<Kanban aria-label="Launch" {columns} {items} {...props}>
  {#snippet header(_, held)}
    <span class="badge">{held.length}</span>
  {/snippet}
  {#snippet children(task, { handle, move })}
    <div class="card">
      <div class="card-header">
        <p class="card-title">{task.label}</p>
        <span class="card-action kanban-controls">
          <button {...move}></button>
          <button {...handle}></button>
        </span>
      </div>
      <input class="input input-sm" aria-label="Note on {task.label}">
    </div>
  {/snippet}
  {#snippet empty()}Nothing here{/snippet}
</Kanban>
