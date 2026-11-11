<script lang="ts" module>
  import type { HTMLAttributes } from 'svelte/elements'

  export interface ListboxOption {
    /** What choosing the option gives `onValueChange`. */
    value: string
    label: string
    description?: string
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
  const first = untrack(() => [value ?? []].flat())
  const attach = behavior(listbox, undefined, {
    value: () => value,
    change: (next) => { value = next; onValueChange?.(next) },
  })
</script>

<!--
  @component
  A listbox that stands in the page. Name it with `aria-label` or `aria-labelledby`.
-->
<div class={['listbox', className]} role="listbox" tabindex={0} aria-multiselectable={multiple || undefined} {@attach attach} {...root}>
  {#each options as option (option.value)}
    <!-- The behavior writes `aria-selected` on the option the keys are on. -->
    <!-- svelte-ignore a11y_role_has_required_aria_props -->
    <div class="listbox-option" role="option" data-value={option.value} aria-checked={first.includes(option.value)} aria-disabled={option.disabled || undefined}>
      {#if option.description}
        <span class="listbox-body"><span>{option.label}</span><span class="listbox-description">{option.description}</span></span>
      {:else}
        {option.label}
      {/if}
    </div>
  {/each}
</div>
