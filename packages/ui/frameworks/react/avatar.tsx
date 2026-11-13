'use client'
import type { ComponentProps, ReactNode } from 'react'
import { avatar } from '@master/ui/behaviors/avatar.js'
import { useBehavior } from './use-behavior'

export interface AvatarProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** The photo. Without one, or when it fails to load, the fallback shows. */
  src?: string
  /** Who it is: the avatar's accessible name. */
  alt: string
  /** One or two letters shown when there is no photo. */
  initials?: string
  /** What shows instead of the initials when there is no photo, such as an icon. */
  fallback?: ReactNode
  /** A mark on the corner: an `avatar-status` or an `avatar-badge`. */
  children?: ReactNode
}

/**
 * An avatar whose photo may fail. React writes the photo over its fallback; the avatar behavior follows the
 * photo and hides whichever of the two should not show, so a broken photo never appears. The avatar is named
 * once, on its root.
 */
export function Avatar({ src, alt, initials, fallback, children, className, ...root }: AvatarProps) {
  const ref = useBehavior(avatar)
  return (
    <span className={className ? `avatar ${className}` : 'avatar'} role="img" aria-label={alt} ref={ref} {...root}>
      <img className="avatar-image" src={src || undefined} alt="" />
      <span className="avatar-fallback" aria-hidden="true">{fallback ?? initials}</span>
      {children}
    </span>
  )
}
