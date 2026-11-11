<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import Dialog from '../../../frameworks/svelte/Dialog.svelte'

  let props: ComponentProps<typeof Dialog> = $props()
</script>

<Dialog id="delete-project" aria-labelledby="delete-project-title" {...props}>
  {#snippet trigger(attributes)}
    <button type="button" class="btn" {...attributes}>Delete project</button>
  {/snippet}
  <header class="dialog-header">
    <h2 class="dialog-title" id="delete-project-title">Delete this project?</h2>
    <p class="dialog-description">Atlas and its 14 deployments are removed.</p>
  </header>
  <footer class="dialog-footer">
    <button type="button" class="btn" commandfor="delete-project" command="close">Cancel</button>
    <button type="button" class="btn btn-primary" commandfor="delete-project" command="close">Delete project</button>
  </footer>
</Dialog>
