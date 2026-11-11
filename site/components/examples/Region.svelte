<script lang="ts">
  import Combobox from '../../../packages/ui/frameworks/svelte/Combobox.svelte'

  const regions = [
    { value: 'hnd', label: 'Tokyo' },
    { value: 'sin', label: 'Singapore' },
    { value: 'fra', label: 'Frankfurt', description: 'Germany' },
    { value: 'lhr', label: 'London' },
  ]
  let region = $state<string | null>('sin')
</script>

<div class="grid gap-sm w-full max-w(320)">
  <Combobox options={regions} bind:value={region}
    aria-label="Region" listLabel="Regions" toggleLabel="Show regions" empty="No regions match." />
  <p class="m(0) text-sm fg-text-muted">The application holds <code class="code">{region ?? 'null'}</code></p>
</div>
