'use client'
import { type ComponentProps } from 'react'
import { clock, transcript } from '@master/ui/behaviors/transcript.js'
import { useBehavior } from './use-behavior'

export interface TranscriptCue {
  /** The second the cue begins. */
  start: number
  /** What is said. */
  text: string
  /** Who says it, when the recording has several voices. */
  speaker?: string
}

export interface TranscriptProps extends Omit<ComponentProps<'section'>, 'children' | 'ref'> {
  /** The id of the player, or of the audio or video element, the transcript follows. */
  media: string
  /** The cues, in the order they are spoken. */
  cues: TranscriptCue[]
  /** The words of the button that brings the current cue back into view. */
  returnLabel?: string
}

/** What a recording says, as cues that follow it as it plays. The rows are written from `cues`; the behavior marks and follows them. */
export function Transcript({ media, cues, returnLabel = 'Back to current', className, ...root }: TranscriptProps) {
  const ref = useBehavior(transcript, { draw: false })
  return (
    <section className={className ? `transcript ${className}` : 'transcript'} aria-controls={media} ref={ref} {...root}>
      <ol className="transcript-list scroll-area">
        {cues.map((cue, index) => (
          <li className="transcript-cue" data-start={cue.start} key={`${cue.start}-${index}`}>
            <button type="button" className="transcript-time">{clock(cue.start)}</button>
            <p className="transcript-text">
              {cue.speaker !== undefined && <span className="transcript-speaker">{cue.speaker}</span>}
              {cue.text}
            </p>
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn-sm btn-pill transcript-return" hidden>{returnLabel}</button>
    </section>
  )
}
