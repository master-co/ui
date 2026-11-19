<script lang="ts" module>
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  export interface Tab {
    /** What selecting the tab gives `onValueChange`. */
    value: string
    label: string
    /** The panel the tab shows, as text. Leave it out when `panel` writes it. */
    content?: string
    disabled?: boolean
  }

  export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'children'> {
    tabs: Tab[]
    /** The value of the selected tab. Bind it, or leave it out: the first tab is selected. */
    value?: string
    onValueChange?: (value: string) => void
    /** Let Find in Page and fragment links reveal inactive panels where supported. */
    searchable?: boolean
    /** Writes the panel of a tab, when it is more than text. */
    panel?: Snippet<[Tab]>
    /** Classes for each panel, such as its padding. */
    panelClass?: string
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { tabs } from '@master/ui/behaviors/tabs.js'
  import { behavior } from './behavior.svelte.js'

  let { tabs: list, value = $bindable(), onValueChange, searchable, panel, panelClass, class: className, ...root }: TabsProps = $props()
  const id = $props.id()
  // The first value is drawn into the first render; after that the behavior marks the selected tab. A tab
  // written later, from new tabs, is drawn with the value as it is then, which is not read as state.
  const selected = { value: untrack(() => value ?? list.find(tab => !tab.disabled)?.value) }
  const attach = behavior(tabs, () => ({ searchable }), {
    value: () => value,
    change: (next) => {
      if (next === null) return
      selected.value = next
      value = next
      onValueChange?.(next)
    },
    settled: (held) => { if (held !== null) selected.value = held },
  })
</script>

<!--
  @component
  Tabs that switch panels in place. Name the tablist with `aria-label` or `aria-labelledby`.
-->
<div class={['tabs', className]} role="tablist" {@attach attach} {...root}>
  {#each list as tab, index (tab.value)}
    <button type="button" class="tabs-item" role="tab" id="{id}tab{index}" data-value={tab.value} aria-selected={tab.value === selected.value} aria-controls="{id}panel{index}" tabindex={tab.value === selected.value ? 0 : -1} disabled={tab.disabled}>{tab.label}</button>
  {/each}
</div>
{#each list as tab, index (tab.value)}
  <div class={panelClass} role="tabpanel" id="{id}panel{index}" aria-labelledby="{id}tab{index}" hidden={tab.value !== selected.value}>
    {#if panel}{@render panel(tab)}{:else}{tab.content}{/if}
  </div>
{/each}
