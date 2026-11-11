import { useId, type ComponentProps, type ReactNode } from 'react'

export interface TooltipProps extends Omit<ComponentProps<'div'>, 'popover'> {
  /** The control the tooltip names: spread what it is given on a button or a link of your own. */
  trigger: (attributes: { interestfor: string }) => ReactNode
}

/**
 * A tooltip. The browser shows it on hover and on focus and places it; this component only joins the
 * control to its label. The children are the label. The control keeps its own accessible name.
 */
export function Tooltip({ trigger, className, id, children, ...root }: TooltipProps) {
  const generated = useId()
  const name = id ?? generated
  return (
    <>
      {trigger({ interestfor: name })}
      <div id={name} popover="hint" className={className ? `tooltip ${className}` : 'tooltip'} {...root}>{children}</div>
    </>
  )
}
