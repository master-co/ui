<script lang="ts" module>
  import type { HTMLAttributes } from 'svelte/elements'

  export interface TranscriptCue {
    /** The second the cue begins. */
    start: number
    /** What is said. */
    text: string
    /** Who says it, when the recording has several voices. */
    speaker?: string
  }

  export interface TranscriptProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
    /** The id of the player, or of the audio or video element, the transcript follows. */
    media: string
    /** The cues, in the order they are spoken. */
    cues: TranscriptCue[]
    /** The words of the button that brings the current cue back into view. */
    returnLabel?: string
  }
</script>

<script lang="ts">
  import { clock, transcript } from '@master/ui/behaviors/transcript.js'
  import { behavior } from './behavior.svelte.js'

  let { media, cues, returnLabel = 'Back to current', class: className, ...root }: TranscriptProps = $props()
  const attach = behavior(transcript, () => ({ draw: false }))
</script>

<!--
  @component
  What a recording says, as cues that follow it as it plays. The rows are written from `cues`; the behavior marks and follows them.
-->
<section class={['transcript', className]} aria-controls={media} {@attach attach} {...root}>
  <ol class="transcript-list scroll-area">
    {#each cues as cue, index (`${cue.start}-${index}`)}
      <li class="transcript-cue" data-start={cue.start}>
        <button type="button" class="transcript-time">{clock(cue.start)}</button>
        <p class="transcript-text">
          {#if cue.speaker !== undefined}<span class="transcript-speaker">{cue.speaker}</span>{/if}
          {cue.text}
        </p>
      </li>
    {/each}
  </ol>
  <button type="button" class="btn btn-sm btn-pill transcript-return" hidden>{returnLabel}</button>
</section>
