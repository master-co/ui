<script lang="ts" module>
  import type { HTMLAttributes } from 'svelte/elements'

  export interface ListboxOption {
    /** What choosing the option gives `onValueChange`. */
    value: string
    label: string
    description?: string
    /** The caption of the group the option belongs to. Options of one group are written together, under it. */
    group?: string
    disabled?: boolean
  }

  export interface ListboxProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'children'> {
    options: ListboxOption[]
    /** The value of the chosen option, null for none; a list of them when `multiple`. Bind it, or leave it out. */
    value?: string | string[] | null
    onValueChange?: (value: string | string[] | null) => void
    /** Any number of options may be chosen. */
    multiple?: boolean
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { listbox } from '@master/ui/behaviors/listbox.js'
  import { behavior } from './behavior.svelte.js'

  let { options, value = $bindable(), onValueChange, multiple, class: className, ...root }: ListboxProps = $props()
  const id = $props.id()
  // The first value is drawn into the first render; after that the behavior marks what is chosen. A row written
  // later, from new options, is drawn with the value as it is then, which is not read as state.
  const chosen = { values: untrack(() => [value ?? []].flat()) }
  const groups = $derived([...new Set(options.map(option => option.group))])
  const attach = behavior(listbox, undefined, {
    value: () => value,
    change: (next) => { chosen.values = [next ?? []].flat(); value = next; onValueChange?.(next) },
    settled: (held) => { chosen.values = [held ?? []].flat() },
  })
</script>

{#snippet row(option: ListboxOption)}
  <!-- The behavior writes `aria-selected` on the option the keys are on. -->
  <!-- svelte-ignore a11y_role_has_required_aria_props -->
  <div class="listbox-option" role="option" data-value={option.value} aria-checked={chosen.values.includes(option.value)} aria-disabled={option.disabled || undefined}>
    {#if option.description}
      <span class="listbox-body"><span>{option.label}</span><span class="listbox-description">{option.description}</span></span>
    {:else}
      {option.label}
    {/if}
  </div>
{/snippet}

<!--
  @component
  A listbox that stands in the page. Name it with `aria-label` or `aria-labelledby`.
-->
<div class={['listbox', className]} role="listbox" tabindex={0} aria-multiselectable={multiple || undefined} {@attach attach} {...root}>
  {#each groups as group, index (group)}
    {#if group === undefined}
      {#each options.filter(option => option.group === undefined) as option (option.value)}{@render row(option)}{/each}
    {:else}
      <div class="listbox-group" role="group" aria-labelledby="{id}group{index}">
        <div class="listbox-label" id="{id}group{index}">{group}</div>
        {#each options.filter(option => option.group === group) as option (option.value)}{@render row(option)}{/each}
      </div>
    {/if}
  {/each}
</div>
