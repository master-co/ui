'use client'
import { useState, type ComponentProps } from 'react'
import { follow } from '@master/ui/behaviors/follow.js'
import { useBehavior } from './use-behavior'

export interface LogProps extends Omit<ComponentProps<'div'>, 'ref'> {
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
        <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13.6362 7.5189A0.4947 0.4947 0 0 0 13.5 7.5L2.4755 7.5006A0.5 0.5 0 0 0 2.4266 8.4946L2.5 8.5H13.5A0.4947 0.4947 0 0 0 13.6362 8.4811A0.7009 0.7009 0 0 0 13.6362 7.5189Z" fill="currentColor" stroke="none" fillRule="evenodd" transform="rotate(90 8 8)" /><path d="M8 4.5L13.2348 7.8313A0.2 0.2 0 0 1 13.2348 8.1687L8 11.5" transform="rotate(90 8 8)" /></svg>
        {latestLabel}
      </button>
    </div>
  )
}
