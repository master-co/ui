<script lang="ts" module>
  import type { HTMLAttributes } from 'svelte/elements'

  export interface WheelColumn {
    /** The name of the column, for assistive technology. */
    label: string
    options: (string | { value: string, label: string, disabled?: boolean })[]
    /** Fixed text after the column that rests on the mark: the colon of a time, a unit. */
    separator?: string
  }

  export interface WheelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'children'> {
    columns: WheelColumn[]
    /** The value of each column, in the order of the columns. Bind it, or leave it out. */
    value?: string[]
    onValueChange?: (value: string[]) => void
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { wheel } from '@master/ui/behaviors/wheel.js'
  import { behavior } from './behavior.svelte.js'

  let { columns, value = $bindable(), onValueChange, class: className, ...root }: WheelProps = $props()
  const first = untrack(() => value ?? [])
  const attach = behavior(wheel, undefined, {
    value: () => value,
    change: (next) => { value = next; onValueChange?.(next) },
  })
  const plain = (option: WheelColumn['options'][number]) => typeof option === 'string' ? { value: option, label: option, disabled: false } : option
</script>

<!--
  @component
  Columns that turn. Name the group with `aria-label` or `aria-labelledby`.
-->
<div class={['wheel', className]} role="group" {@attach attach} {...root}>
  {#each columns as column, at (column.label)}
    <div class="wheel-column" role="listbox" aria-label={column.label} tabindex={0}>
      {#each column.options.map(plain) as option (option.value)}
        <div class="wheel-option" role="option" data-value={option.value} aria-selected={option.value === first[at]} aria-disabled={option.disabled || undefined}>{option.label}</div>
      {/each}
    </div>
    {#if column.separator !== undefined}<span class="wheel-separator" aria-hidden="true">{column.separator}</span>{/if}
  {/each}
</div>
