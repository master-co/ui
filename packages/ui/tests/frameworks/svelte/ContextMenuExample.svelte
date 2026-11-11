<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import Menu from '../../../frameworks/svelte/Menu.svelte'

  let props: ComponentProps<typeof Menu> = $props()
  // Null until the sheet is there: the menu is a context menu from the first HTML.
  let target = $state<HTMLElement | null>(null)
</script>

<!-- The sheet takes focus so that the keys that open a context menu reach it. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="sheet" tabindex="0" bind:this={target}>Right-click this sheet</div>
<Menu context={target} {...props} />
