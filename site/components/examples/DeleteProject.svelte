<script lang="ts">
  import Dialog from '../../../packages/ui/frameworks/svelte/Dialog.svelte'

  let open = $state(false)
</script>

<div class="flex flex-wrap items-center gap-sm">
  <Dialog id="delete-project" aria-labelledby="delete-project-title" bind:open>
    {#snippet trigger(attributes)}
      <button type="button" class="btn" {...attributes}>Delete project</button>
    {/snippet}
    <header class="dialog-header">
      <h2 class="dialog-title" id="delete-project-title">Delete this project?</h2>
      <p class="dialog-description">Atlas and its 14 deployments are removed.</p>
    </header>
    <footer class="dialog-footer">
      <button type="button" class="btn" commandfor="delete-project" command="close">Cancel</button>
      <button type="button" class="btn btn-primary" onclick={() => { open = false }}>Delete project</button>
    </footer>
  </Dialog>
  <span class="text-sm fg-text-muted">The application knows it is {open ? 'open' : 'closed'}</span>
</div>
