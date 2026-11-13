'use client'
import { useState, type ComponentProps } from 'react'
import { follow } from '@master/ui/behaviors/follow.js'
import { useBehavior } from './use-behavior'

export interface LogProps extends ComponentProps<'div'> {
  /** Whether the region keeps its end in view. It stops when the reader scrolls away and starts again at the end. */
  following?: boolean
  defaultFollowing?: boolean
  onFollowingChange?: (following: boolean) => void
  /** The words of the button that leads back to the end, such as "Jump to latest". */
  latestLabel: string
}

/**
 * A scroll area that follows what arrives at its end: a chat, a build log, a streamed answer. Its children
 * are the content; name it with `aria-label` and give it a height. Set `following` to true to bring the
 * reader back to the end, as when they send a message.
 */
export function Log({ following, defaultFollowing = true, onFollowingChange, latestLabel, className, children, ...root }: LogProps) {
  const ref = useBehavior(follow, undefined, { value: following, defaultValue: defaultFollowing, onValueChange: onFollowingChange })
  const [first] = useState(following ?? defaultFollowing)
  return (
    <div className={className ? `scroll-area ${className}` : 'scroll-area'} role="log" tabIndex={0} ref={ref} {...root}>
      {children}
      <button type="button" className="btn btn-sm btn-pill scroll-area-latest" hidden={first}>
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
        {latestLabel}
      </button>
    </div>
  )
}
