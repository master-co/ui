<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import Compare from '../../../frameworks/svelte/Compare.svelte'

  let props: ComponentProps<typeof Compare> = $props()
</script>

<Compare {...props}>
  <img class="compare-before" src="/demo/moonstone.svg" alt="The valley before grading" width="800" height="500" />
  <img class="compare-after" src="/demo/portrait-1.svg" alt="The valley after grading" />
</Compare>
