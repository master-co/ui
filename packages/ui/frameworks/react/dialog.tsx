'use client'
import { useEffect, useId, useReducer, useRef, type ComponentProps, type ReactNode } from 'react'

export interface DialogProps extends Omit<ComponentProps<'dialog'>, 'open'> {
  /** Whether the dialog is open, when this component is told. Leave it out and the trigger opens it. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** The button that opens the dialog: spread what it is given on a button of your own. */
  trigger?: (attributes: { commandfor: string, command: 'show-modal' }) => ReactNode
}

/**
 * A modal dialog. The browser opens it from the trigger, traps focus and closes it on Esc; this component
 * only opens and closes it from `open`, and says when the browser did. Its children are the contract's
 * parts: `dialog-header`, `dialog-body`, `dialog-footer`. A button inside closes it with
 * `commandfor={id}` and `command="close"`, or from a form with `method="dialog"`.
 */
export function Dialog({ open, onOpenChange, trigger, className, id, children, ...dialog }: DialogProps) {
  const generated = useId()
  const name = id ?? generated
  const element = useRef<HTMLDialogElement>(null)
  const heard = useRef(onOpenChange)
  /** What the owner knows: the last state it set or was told. */
  const known = useRef(false)
  const [tick, again] = useReducer((count: number) => count + 1, 0)
  useEffect(() => { heard.current = onOpenChange })

  useEffect(() => {
    const root = element.current
    if (!root || open === undefined) return
    known.current = open
    if (open && !root.open) root.showModal()
    else if (!open && root.open) root.close()
  }, [open, tick])

  useEffect(() => {
    const root = element.current
    if (!root) return
    const controller = new AbortController()
    const report = () => {
      if (root.open !== known.current) heard.current?.(known.current = root.open)
      // An `open` this component is told wins: if its owner did not take the change, the dialog goes back.
      again()
    }
    for (const type of ['toggle', 'close']) root.addEventListener(type, report, { signal: controller.signal })
    return () => controller.abort()
  }, [])

  return (
    <>
      {trigger?.({ commandfor: name, command: 'show-modal' })}
      <dialog id={name} className={className ? `dialog ${className}` : 'dialog'} ref={element} {...{ closedby: 'any' }} {...dialog}>{children}</dialog>
    </>
  )
}
