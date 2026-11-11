<script lang="ts" module>
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  export type MenuItem =
    | { label: string, shortcut?: string, href?: string, onSelect?: () => void, danger?: boolean, disabled?: boolean }
    | { separator: true }

  export interface MenuProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    items: MenuItem[]
    /** The button that opens the menu: spread what it is given on a button of your own. */
    trigger?: Snippet<[{ popovertarget: string, 'aria-haspopup': 'menu' }]>
    /**
     * Instead of a button: the element the menu belongs to, as `bind:this` gives it. The menu opens at the
     * pointer on a right click or a long press. Null stands for an element that is not there yet.
     */
    context?: HTMLElement | null
  }
</script>

<script lang="ts">
  import type { Attachment } from 'svelte/attachments'
  import { contextMenu, menu } from '@master/ui/behaviors/menu.js'

  let { items, trigger, context, class: className, id, ...root }: MenuProps = $props()
  const generated = $props.id()
  const name = $derived(id ?? generated)

  // Attached again once the element the menu belongs to is there, and when it is another.
  const attach: Attachment<HTMLDivElement> = (element) => {
    const detach = menu(element)
    const forget = context ? contextMenu(context, element) : undefined
    return () => {
      detach()
      forget?.()
    }
  }
</script>

<!--
  @component
  A menu of actions with the keys of a menu. Name it with `aria-label`.
-->
{@render trigger?.({ popovertarget: name, 'aria-haspopup': 'menu' })}
<div id={name} popover="auto" class={['menu', context !== undefined && 'menu-context', className]} role="menu" {@attach attach} {...root}>
  {#each items as item}
    {#if 'separator' in item}
      <hr class="menu-separator" />
    {:else if item.href}
      <a class={item.danger ? 'menu-item menu-item-danger' : 'menu-item'} role="menuitem" href={item.href} aria-disabled={item.disabled || undefined}>{item.label}{#if item.shortcut !== undefined}<span class="menu-shortcut">{item.shortcut}</span>{/if}</a>
    {:else}
      <button type="button" class={item.danger ? 'menu-item menu-item-danger' : 'menu-item'} role="menuitem" popovertarget={name} popovertargetaction="hide" onclick={item.onSelect} disabled={item.disabled}>{item.label}{#if item.shortcut !== undefined}<span class="menu-shortcut">{item.shortcut}</span>{/if}</button>
    {/if}
  {/each}
</div>
