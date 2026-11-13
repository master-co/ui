<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import Player from '../../../frameworks/svelte/Player.svelte'
  import Transcript from '../../../frameworks/svelte/Transcript.svelte'

  let props: Omit<ComponentProps<typeof Transcript>, 'media'> = $props()
</script>

<Player id="talk" src="/demo/recording.m4a" label="A short recording" />
<Transcript media="talk" aria-label="Transcript" {...props} />
