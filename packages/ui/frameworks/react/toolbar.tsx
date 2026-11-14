'use client'
import { type ComponentProps } from 'react'
import { toolbar } from '@master/ui/behaviors/toolbar.js'
import { useBehavior } from './use-behavior'

export interface ToolbarProps extends Omit<ComponentProps<'div'>, 'role' | 'ref'> {
  /** What the tools act on, for assistive technology. */
  label: string
  /** A column of tools, moved through with ArrowUp and ArrowDown. */
  vertical?: boolean
  /** On the floating surface, for tools over content. */
  floating?: boolean
}

/**
 * A toolbar: one stop in the tab order, with the arrow keys between its controls. Put the controls in it:
 * small quiet buttons, with `aria-pressed` for the ones that toggle, selects, segmented controls.
 */
export function Toolbar({ label, vertical, floating, className, children, ...root }: ToolbarProps) {
  const ref = useBehavior(toolbar)
  return (
    <div className={['toolbar', floating && 'toolbar-floating', className].filter(Boolean).join(' ')} role="toolbar" aria-label={label} aria-orientation={vertical ? 'vertical' : undefined} {...{ focusgroup: vertical ? 'toolbar wrap block' : 'toolbar wrap' }} ref={ref} {...root}>
      {children}
    </div>
  )
}
