<script lang="ts">
  import Dialog from '../../../frameworks/svelte/Dialog.svelte'
  import Listbox from '../../../frameworks/svelte/Listbox.svelte'

  /** An owner that binds: what the reader chooses is written to its state, and what it sets is drawn. */
  let { options }: { options: { value: string, label: string }[] } = $props()
  let region = $state<string | string[] | null>('hnd')
  let open = $state(false)

  export function choose(next: string) {
    region = next
  }
</script>

<Listbox {options} bind:value={region} aria-label="Region" />
<Dialog bind:open aria-label="Region">
  {#snippet trigger(attributes)}
    <button type="button" class="btn" {...attributes}>Region</button>
  {/snippet}
  <div class="dialog-body">The region is {region}.</div>
</Dialog>
<output>{region} {open}</output>
