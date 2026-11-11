<script lang="ts" module>
  import type { HTMLDialogAttributes } from 'svelte/elements'

  export interface CommandItem {
    label: string
    /** A shortcut or a hint at the end of the row. */
    hint?: string
    /** The caption of the group the command belongs to. Commands of one group are written together. */
    group?: string
    /** Where the command goes. Without it, `onSelect` runs. */
    href?: string
    onSelect?: () => void
    disabled?: boolean
  }

  export interface CommandProps extends Omit<HTMLDialogAttributes, 'open' | 'children'> {
    items: CommandItem[]
    /** Whether the palette is open. Bind it, or leave it out and the shortcut opens it. */
    open?: boolean
    onOpenChange?: (open: boolean) => void
    /** The key that opens and closes the palette with Command or Control. `'k'` by default, `false` for none. */
    shortcut?: string | false
    /** False when `items` are already the matches; `onSearch` then says what was typed. */
    filter?: boolean
    onSearch?: (text: string) => void
    /** The name of the search field, and the placeholder it shows. */
    searchLabel: string
    placeholder?: string
    /** The name of the list of commands. */
    listLabel: string
    empty?: string
  }
</script>

<script lang="ts">
  import type { Attachment } from 'svelte/attachments'
  import { command } from '@master/ui/behaviors/command.js'
  import { behavior } from './behavior.svelte.js'

  let { items, open = $bindable(), onOpenChange, shortcut = 'k', filter = true, onSearch, searchLabel, placeholder, listLabel, empty, class: className, ...dialog }: CommandProps = $props()
  const id = $props.id()
  const attach = behavior(command, () => ({ shortcut, filter }))
  const groups = $derived([...new Set(items.map(item => item.group))])
  /** What the owner knows: the last state it set or was told. */
  let known = false

  const presence: Attachment<HTMLDialogElement> = (root) => {
    const controller = new AbortController()
    // The shortcut, Esc and a command that ran all open or close the dialog without asking: say so.
    const report = () => {
      if (root.open === known) return
      open = known = root.open
      onOpenChange?.(known)
    }
    for (const type of ['toggle', 'close']) root.addEventListener(type, report, { signal: controller.signal })
    $effect(() => {
      if (open === undefined) return
      known = open
      if (open && !root.open) root.showModal()
      else if (!open && root.open) root.close()
    })
    return () => controller.abort()
  }
</script>

{#snippet option(item: CommandItem)}
  <!-- The behavior writes `aria-selected` on the option the keys are on. -->
  <!-- svelte-ignore a11y_role_has_required_aria_props -->
  {#if item.href}
    <a class="listbox-option" role="option" href={item.href} aria-disabled={item.disabled || undefined}>{item.label}{#if item.hint !== undefined}<span class="listbox-end">{item.hint}</span>{/if}</a>
  {:else}
    <!-- Focus stays in the field, and Enter there clicks the option. -->
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_interactive_supports_focus -->
    <div class="listbox-option" role="option" onclick={item.onSelect} aria-disabled={item.disabled || undefined}>{item.label}{#if item.hint !== undefined}<span class="listbox-end">{item.hint}</span>{/if}</div>
  {/if}
{/snippet}

<!--
  @component
  A command palette: a native dialog over a search field and a list. Name the dialog with `aria-label`.
-->
<dialog class={['dialog', 'command', className]} closedby="any" {@attach attach} {@attach presence} {...dialog}>
  <label class="command-search">
    <!-- The dialog gives the field focus as it opens. -->
    <!-- svelte-ignore a11y_autofocus -->
    <input class="command-input" type="search" role="combobox" aria-expanded="true" aria-controls="{id}list" aria-autocomplete="list" aria-label={searchLabel} autocomplete="off" {placeholder} autofocus oninput={event => onSearch?.(event.currentTarget.value)} />
  </label>
  <div class="listbox command-list" id="{id}list" role="listbox" aria-label={listLabel}>
    {#each groups as group, index (group)}
      {#if group === undefined}
        {#each items.filter(item => item.group === undefined) as item}{@render option(item)}{/each}
      {:else}
        <div class="listbox-group" role="group" aria-labelledby="{id}group{index}">
          <div class="listbox-label" id="{id}group{index}">{group}</div>
          {#each items.filter(item => item.group === group) as item}{@render option(item)}{/each}
        </div>
      {/if}
    {/each}
    {#if empty !== undefined}<div class="listbox-empty">{empty}</div>{/if}
  </div>
</dialog>
