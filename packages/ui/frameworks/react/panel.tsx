'use client'
import { useCallback, useEffect, useId, useReducer, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from 'react'
import { panel, type PanelValue } from '@master/ui/behaviors/panel.js'
import { useBehavior } from './use-behavior'

export type { PanelValue }

export interface PanelProps extends Omit<ComponentProps<'div'>, 'title' | 'defaultValue' | 'popover' | 'role'> {
  /** The title in the header, which names the panel. */
  title: ReactNode
  /** The name of the handle: what it moves and how, such as "Move the Layers panel with the arrow keys". */
  handleLabel: string
  /** Whether the panel is open, when this component is told. Leave it out and the trigger opens it. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Where the panel is, how large and whether it is folded. Keep it to put the panel back where it was. */
  value?: PanelValue
  defaultValue?: PanelValue
  /** Called as the panel moves, resizes or folds. */
  onValueChange?: (value: PanelValue) => void
  /** Called once a drag ends, a key moved it or it was folded: the moment to keep the value. */
  onValueCommit?: (value: PanelValue) => void
  /** The button that opens the panel: spread what it is given on a button of your own. */
  trigger?: (attributes: { commandfor: string, command: 'toggle-popover' }) => ReactNode
  /** More controls in the header, before the minimize and close buttons. */
  actions?: ReactNode
  minimizeLabel?: string
  closeLabel?: string
  /** Leave out the corner that resizes it. */
  resizable?: boolean
  /** How far an arrow key moves or resizes the panel, in pixels. */
  step?: number
}

const measures = ['x', 'y', 'width', 'height'] as const

/**
 * A floating panel. The browser opens it from the trigger and puts it in the top layer; the behavior moves,
 * resizes, folds and stacks it. This component opens and closes it from `open`, and passes its place in and out.
 */
export function Panel({ title, handleLabel, open, onOpenChange, value, defaultValue, onValueChange, onValueCommit, trigger, actions, minimizeLabel = 'Minimize', closeLabel = 'Close', resizable = true, step = 16, className, id, style, children, ...root }: PanelProps) {
  const generated = useId()
  const name = id ?? generated
  const [first] = useState(value ?? defaultValue)
  const latest = useRef(first)
  const ref = useBehavior(panel, { step }, {
    value,
    defaultValue,
    onValueChange: (next: PanelValue) => { latest.current = next; onValueChange?.(next) },
    // The panel says change once a move ends. A field in its body says change too.
    on: { change: (event) => { if (event.target === event.currentTarget) onValueCommit?.(latest.current!) } },
  })

  const element = useRef<HTMLDivElement | null>(null)
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
      // An `open` this component is told wins: if its owner did not take the change, the panel goes back.
      again()
    }
    popover.addEventListener('toggle', report)
    return () => popover.removeEventListener('toggle', report)
  }, [])

  // The first place and size are drawn into the first render; after that the behavior writes them.
  const place = Object.fromEntries(measures.filter(measure => typeof first?.[measure] === 'number').map(measure => [`--panel-${measure}`, `${first![measure]}px`]))
  const attach = useCallback((node: HTMLDivElement | null) => {
    element.current = node
    return ref(node)
  }, [ref])

  return (
    <>
      {trigger?.({ commandfor: name, command: 'toggle-popover' })}
      <div id={name} popover="manual" role="dialog" aria-labelledby={`${name}-title`} className={className ? `panel ${className}` : 'panel'} style={{ ...place, ...style } as CSSProperties} ref={attach} {...root}>
        <div className="panel-header">
          <button type="button" className="panel-handle" aria-label={handleLabel} />
          <h2 className="panel-title" id={`${name}-title`}>{title}</h2>
          <div className="panel-actions">
            {actions}
            <button type="button" className="btn btn-quiet btn-sm btn-square panel-minimize" aria-pressed={first?.minimized ?? false} aria-label={minimizeLabel}>
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true"><path d="M6 12h12" /></svg>
            </button>
            <button type="button" className="btn btn-quiet btn-sm btn-square" {...{ commandfor: name, command: 'hide-popover' }} aria-label={closeLabel}>
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
        </div>
        <div className="panel-body">{children}</div>
        {resizable && <span className="panel-resize" aria-hidden="true" />}
      </div>
    </>
  )
}
