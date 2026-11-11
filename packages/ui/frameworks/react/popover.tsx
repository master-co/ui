'use client'
import { useEffect, useId, useReducer, useRef, type ComponentProps, type ReactNode } from 'react'

export interface PopoverProps extends Omit<ComponentProps<'div'>, 'popover'> {
  /** Whether the popover is open, when this component is told. Leave it out and the trigger opens it. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** The button that opens the popover: spread what it is given on a button of your own. */
  trigger?: (attributes: { popoverTarget: string }) => ReactNode
  /** `auto` closes on a press outside and on Esc; `manual` stays until it is closed. */
  mode?: 'auto' | 'manual'
}

/**
 * A popover. The browser opens it from the trigger, places it against the trigger and dismisses it; this
 * component only opens and closes it from `open`, and says when the browser did.
 */
export function Popover({ open, onOpenChange, trigger, mode = 'auto', className, id, children, ...root }: PopoverProps) {
  const generated = useId()
  const name = id ?? generated
  const element = useRef<HTMLDivElement>(null)
  const heard = useRef(onOpenChange)
  /** What the owner knows: the last state it set or was told. */
  const known = useRef(false)
  const [tick, again] = useReducer((count: number) => count + 1, 0)
  useEffect(() => { heard.current = onOpenChange })

  useEffect(() => {
    const popover = element.current
    if (!popover || open === undefined) return
    const shown = popover.matches(':popover-open')
    known.current = open
    if (open && !shown) popover.showPopover()
    else if (!open && shown) popover.hidePopover()
  }, [open, tick])

  useEffect(() => {
    const popover = element.current
    if (!popover) return
    const report = () => {
      const shown = popover.matches(':popover-open')
      if (shown !== known.current) heard.current?.(known.current = shown)
      // An `open` this component is told wins: if its owner did not take the change, the popover goes back.
      again()
    }
    popover.addEventListener('toggle', report)
    return () => popover.removeEventListener('toggle', report)
  }, [])

  return (
    <>
      {trigger?.({ popoverTarget: name })}
      <div id={name} popover={mode} className={className ? `popover ${className}` : 'popover'} ref={element} {...root}>{children}</div>
    </>
  )
}
