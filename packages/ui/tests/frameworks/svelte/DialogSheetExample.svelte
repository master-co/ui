<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import Dialog from '../../../frameworks/svelte/Dialog.svelte'

  let props: ComponentProps<typeof Dialog> = $props()
</script>

<!-- A sheet the reader swipes: the track holds the panel, and the handle moves it between half and full height. -->
<Dialog id="comments" class="dialog-sheet dialog-swipe dialog-detents" aria-labelledby="comments-title" {...props}>
  {#snippet trigger(attributes)}
    <button type="button" class="btn" {...attributes}>Comments</button>
  {/snippet}
  <div class="dialog-panel">
    <button type="button" class="dialog-handle" aria-label="Sheet height"></button>
    <header class="dialog-header">
      <h2 class="dialog-title" id="comments-title">Comments</h2>
      <p class="dialog-description">Three people reviewed this deployment.</p>
    </header>
    <div class="dialog-body">
      <p>Ada: the build on main is green again.</p>
    </div>
  </div>
</Dialog>
