<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import Toolbar from '../../../frameworks/svelte/Toolbar.svelte'

  let props: Omit<ComponentProps<typeof Toolbar>, 'children' | 'label'> = $props()
</script>

<Toolbar label="Formatting" {...props}>
  <button type="button" class="btn btn-quiet btn-sm" aria-pressed="false">Bold</button>
  <button type="button" class="btn btn-quiet btn-sm" aria-pressed="false">Italic</button>
  <span class="toolbar-separator" role="separator" aria-orientation="vertical"></span>
  <button type="button" class="btn btn-quiet btn-sm">Link</button>
</Toolbar>
