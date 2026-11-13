'use client'
import { useId, type ComponentProps, type ReactNode, type RefObject } from 'react'
import { tour } from '@master/ui/behaviors/tour.js'
import { useBehavior } from './use-behavior'

export interface TourStep {
  /**
   * What the step points at: a selector, an element, a ref, or a function that finds it. Until it is in the
   * page the step waits for it, and passes on when it does not come.
   */
  target: string | Element | RefObject<Element | null> | (() => Element | null | undefined)
  title: string
  text?: string
  /**
   * An event on the target that moves the tour on, such as `click`: the step asks the reader to do it, and
   * has no Next.
   */
  advance?: string
}

export interface TourProps extends Omit<ComponentProps<'div'>, 'children' | 'defaultValue'> {
  steps: TourStep[]
  /** The index of the open step, or null while the tour is not running. */
  value?: number | null
  defaultValue?: number | null
  onValueChange?: (value: number | null) => void
  /** Called when the reader ends the tour: completed, or left before the last step. */
  onEnd?: (completed: boolean) => void
  /** The button that starts the tour: spread what it is given on a button of your own. */
  trigger?: (attributes: { commandfor: string, command: '--start' }) => ReactNode
  /** Dim the page around each step's target. */
  spotlight?: boolean
  /** How long a step waits for its target, in milliseconds. */
  wait?: number
  nextLabel?: string
  backLabel?: string
  skipLabel?: string
  doneLabel?: string
  /** Where a step stands: `2 of 4` by default. */
  countLabel?: (step: number, steps: number) => string
}

/** The element a step points at, found as the page is now. */
function find(target: TourStep['target'] | undefined): Element | null {
  if (!target) return null
  if (typeof target === 'string') return document.querySelector(target)
  if (typeof target === 'function') return target() ?? null
  if ('current' in target) return target.current
  return target
}

/**
 * A tour: one coachmark for each step, written from data, opened in turn against its target. The behavior
 * opens and closes the steps, waits for a target, moves focus and hears the keys; this component writes the
 * steps, finds their targets and passes the index of the open step in and out.
 */
export function Tour({ steps, value, defaultValue, onValueChange, onEnd, trigger, spotlight = false, wait, nextLabel = 'Next', backLabel = 'Back', skipLabel = 'Skip', doneLabel = 'Done', countLabel = (step, count) => `${step} of ${count}`, className, id, ...root }: TourProps) {
  const generated = useId()
  const name = id ?? generated
  const ref = useBehavior(tour, { wait, target: (_step: HTMLElement, index: number) => find(steps[index]?.target) }, {
    value,
    defaultValue,
    onValueChange,
    on: { end: event => onEnd?.((event as CustomEvent<{ completed: boolean }>).detail.completed) },
  })

  return (
    <>
      {trigger?.({ commandfor: name, command: '--start' })}
      <div id={name} className={className ? `coachmark-tour ${className}` : 'coachmark-tour'} ref={ref} {...root}>
        <div className={spotlight ? 'coachmark-spotlight coachmark-spotlight-dim' : 'coachmark-spotlight'} popover="manual" />
        {steps.map((step, index) => {
          const last = index === steps.length - 1
          return (
            <div className="coachmark" popover="manual" role="dialog" aria-labelledby={`${name}-${index}-title`} data-advance={step.advance} key={index}>
              <p className="coachmark-count">{countLabel(index + 1, steps.length)}</p>
              <h2 className="coachmark-title" id={`${name}-${index}-title`}>{step.title}</h2>
              {step.text ? <p className="coachmark-text">{step.text}</p> : null}
              <div className="coachmark-actions">
                {last ? null : <button type="button" className="btn btn-sm btn-quiet" value="skip">{skipLabel}</button>}
                {index > 0 ? <button type="button" className="btn btn-sm btn-quiet" value="back">{backLabel}</button> : null}
                {step.advance ? null : <button type="button" className="btn btn-sm" value={last ? 'done' : 'next'}>{last ? doneLabel : nextLabel}</button>}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
