<script lang="ts" module>
  import type { HTMLInputAttributes } from 'svelte/elements'

  export interface ComboboxOption {
    /** What choosing the option gives `onValueChange`. */
    value: string
    /** What the option says, and what the field holds once it is chosen. */
    label: string
    description?: string
    /** The caption of the group the option belongs to. Options of one group are written together, under it. */
    group?: string
    disabled?: boolean
  }

  export interface ComboboxProps extends Omit<HTMLInputAttributes, 'value' | 'role' | 'children' | 'multiple' | 'name'> {
    options: ComboboxOption[]
    /**
     * The value of the chosen option; null while the field holds text no option was chosen for. With
     * `multiple`, the chosen values in the order they were chosen. Bind it, or leave it out.
     */
    value?: string | string[] | null
    onValueChange?: (value: string | string[] | null) => void
    /**
     * The text in the field, what the reader is looking for. Bind it, or leave it out. It is not the value;
     * with one value it holds the chosen option's label once one is chosen.
     */
    query?: string
    /** Called with the text in the field each time the reader changes it, by typing or by choosing. */
    onQueryChange?: (query: string) => void
    /** Several values, each a chip in the field. */
    multiple?: boolean
    /** With `multiple`: the name each value is submitted with, in a hidden input of its chip. */
    name?: string
    /** With `multiple`: the accessible name of a chip's remove button. `Remove <label>` by default. */
    removeLabel?: (label: string) => string
    /** False when `options` are already the matches: search for `query` and give the matches as `options`. */
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

  let { options, value = $bindable(), onValueChange, query = $bindable(), onQueryChange, multiple, name, removeLabel = (label: string) => `Remove ${label}`, filter = true, listLabel, toggleLabel, empty, class: className, ...field }: ComboboxProps = $props()
  const id = $props.id()
  const first = untrack(() => value)
  const several = untrack(() => multiple)
  const firsts = [first ?? []].flat() as string[]
  // An option written later, from new options, is drawn with the value as it is then, which is not read as state.
  const chosen = { values: firsts }
  const text = (several ? undefined : untrack(() => options.find(option => option.value === first)?.label)) ?? untrack(() => query)
  // With several values the behavior asks for the chips it wants; Svelte writes them from this list.
  let chips = $state(several ? firsts : [])
  const labelOf = (each: string) => options.find(option => option.value === each)?.label ?? each
  const groups = $derived([...new Set(options.map(option => option.group))])
  let handle = $state.raw<ReturnType<typeof combobox> | null>(null)
  /** The last query the owner gave or was told. The first render drew the field, so the first query is known. */
  let known: string | undefined = untrack(() => (!several && options.some(option => option.value === first) ? query : undefined))
  const attach = behavior(combobox, () => (multiple ? { filter, removeLabel, draw: (values: string[]) => { chips = values } } : { filter }), {
    value: () => value,
    change: (next) => { chosen.values = [next ?? []].flat(); value = next; onValueChange?.(next) },
    settled: (held) => { chosen.values = [held ?? []].flat() },
    attached: (attached) => { handle = attached as ReturnType<typeof combobox> | null },
    on: {
      input: () => {
        const next = handle?.query
        if (next === undefined || next === known) return
        query = known = next
        onQueryChange?.(next)
      },
    },
  })

  $effect(() => {
    const next = query
    if (next === undefined || !handle || next === known) return
    handle.query = known = next
  })
</script>

{#snippet row(option: ComboboxOption)}
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
  A combobox. Name the field with `aria-label`, or give it an `id` a label points at; every other prop of
  an input goes to the field, so `oninput` hears what is typed. With `multiple`, the chosen values are chips
  in the field.
-->
<div class={['combobox', className]} {@attach attach}>
  <div class={several ? 'input-group input-group-wrap' : 'input-group'}>
    {#each chips as each (each)}
      <span class="chip" data-value={each}>
        {labelOf(each)}
        {#if name}<input type="hidden" {name} value={each} />{/if}
        <button type="button" class="chip-remove" tabindex={-1} aria-label={removeLabel(labelOf(each))}><svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4L12 12" /><path d="M4 12L12 4" /></svg></button>
      </span>
    {/each}
    <input class="input-group-field" role="combobox" aria-expanded="false" aria-controls="{id}list" aria-autocomplete="list" autocomplete="off" value={text} {...field} />
    <button type="button" class="combobox-toggle" tabindex={-1} aria-label={toggleLabel}><svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5L10.3586 7.8586A0.2 0.2 0 0 1 10.3586 8.1414L6 12.5" transform="rotate(90 8 8)" /></svg></button>
  </div>
  <div id="{id}list" popover="manual" class="listbox" role="listbox" aria-label={listLabel} aria-multiselectable={several || undefined}>
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
    {#if empty !== undefined}<div class="listbox-empty">{empty}</div>{/if}
  </div>
</div>
