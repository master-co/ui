<script lang="ts" module>
  import type { HTMLInputAttributes } from 'svelte/elements'

  export interface ComboboxOption {
    /** What choosing the option gives `onValueChange`. */
    value: string
    /** What the option says, and what the field holds once it is chosen. */
    label: string
    description?: string
    disabled?: boolean
  }

  export interface ComboboxProps extends Omit<HTMLInputAttributes, 'value' | 'role' | 'children'> {
    options: ComboboxOption[]
    /** The value of the chosen option; null while the field holds text no option was chosen for. Bind it, or leave it out. */
    value?: string | null
    onValueChange?: (value: string | null) => void
    /** False when `options` are already the matches, from a server or a search of your own. */
    filter?: boolean
    /** The name of the list, for assistive technology. */
    listLabel: string
    /** The name of the button that opens the list. */
    toggleLabel: string
    /** What the list says when no option matches. */
    empty?: string
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { combobox } from '@master/ui/behaviors/combobox.js'
  import { behavior } from './behavior.svelte.js'

  let { options, value = $bindable(), onValueChange, filter = true, listLabel, toggleLabel, empty, class: className, ...field }: ComboboxProps = $props()
  const id = $props.id()
  const first = untrack(() => value)
  const text = untrack(() => options.find(option => option.value === first)?.label)
  const attach = behavior(combobox, () => ({ filter }), {
    value: () => value,
    change: (next) => { value = next; onValueChange?.(next) },
  })
</script>

<!--
  @component
  A combobox. Name the field with `aria-label`, or give it an `id` a label points at; every other prop of
  an input goes to the field, so `oninput` hears what is typed.
-->
<div class={['combobox', className]} {@attach attach}>
  <div class="input-group">
    <input class="input-group-field" role="combobox" aria-expanded="false" aria-controls="{id}list" aria-autocomplete="list" autocomplete="off" value={text} {...field} />
    <button type="button" class="combobox-toggle" tabindex={-1} aria-label={toggleLabel}></button>
  </div>
  <div id="{id}list" popover="manual" class="listbox" role="listbox" aria-label={listLabel}>
    {#each options as option (option.value)}
      <!-- The behavior writes `aria-selected` on the option the keys are on. -->
      <!-- svelte-ignore a11y_role_has_required_aria_props -->
      <div class="listbox-option" role="option" data-value={option.value} aria-checked={option.value === first} aria-disabled={option.disabled || undefined}>
        {#if option.description}
          <span class="listbox-body"><span>{option.label}</span><span class="listbox-description">{option.description}</span></span>
        {:else}
          {option.label}
        {/if}
      </div>
    {/each}
    {#if empty !== undefined}<div class="listbox-empty">{empty}</div>{/if}
  </div>
</div>
