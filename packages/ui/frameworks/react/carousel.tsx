'use client'
import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { carousel, type CarouselOptions } from '@master/ui/behaviors/carousel.js'
import { useBehavior } from './use-behavior'

export interface CarouselItem {
  /** What the slide stands for: the carousel's value while it is current. Keep it the same when items move. */
  value: string
}

export interface CarouselProps<T extends CarouselItem> extends Omit<ComponentProps<'div'>, 'children' | 'defaultValue' | 'ref'> {
  items: T[]
  /** The current slide, as its item's value. The first slide by default. */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** What a slide shows. */
  children: (item: T) => ReactNode
  /** The accessible name of the track. */
  label: string
  /** A column that scrolls up and down. */
  vertical?: boolean
  /** Classes of the track, such as `carousel-2` or `carousel-center`. */
  trackClassName?: string
  /** Classes of each slide. */
  slideClassName?: string
  previousLabel?: string
  nextLabel?: string
  /** The accessible name of a dot. `Slide 2 of 5` by default. */
  dotLabel?: (index: number, count: number) => string
}

const chevron = (path: string) => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg>
)

/**
 * A carousel whose slide in view the application can read and set. React writes the slides from the items
 * and the controls beside them; the carousel behavior follows the scroll, marks the current dot and moves the
 * track through the platform when a control is pressed.
 */
export function Carousel<T extends CarouselItem>({ items, value, defaultValue, onValueChange, children, label, vertical, trackClassName, slideClassName, previousLabel = 'Previous slide', nextLabel = 'Next slide', dotLabel = (index, count) => `Slide ${index + 1} of ${count}`, className, ...root }: CarouselProps<T>) {
  const id = useId()
  // The first value is drawn into the first render; after that the behavior marks what is current.
  const [first] = useState(() => value ?? defaultValue ?? items[0]?.value)
  // Drawn into the first render only; after that the behavior marks the buttons, and a render with other items
  // does not draw the first state over the one it gave.
  const [at] = useState(() => items.findIndex(item => item.value === first))
  // The behavior's value is null only for a carousel with no slides, which never reports a change.
  const ref = useBehavior<HTMLDivElement, CarouselOptions, string | null>(carousel, { value: first }, { value, defaultValue, onValueChange: onValueChange as ((value: string | null) => void) | undefined })
  const track = ['carousel', vertical && 'carousel-vertical', trackClassName].filter(Boolean).join(' ')
  return (
    <div className={className ? `carousel-view ${className}` : 'carousel-view'} ref={ref} {...root}>
      <div className={track} role="region" aria-label={label} tabIndex={0}>
        {items.map(item => (
          <div className={slideClassName ? `carousel-slide ${slideClassName}` : 'carousel-slide'} id={`${id}${item.value}`} data-value={item.value} key={item.value}>{children(item)}</div>
        ))}
      </div>
      <button type="button" className="btn btn-square btn-sm btn-pill carousel-previous" aria-label={previousLabel} disabled={at <= 0}>{chevron(vertical ? 'm6 15 6-6 6 6' : 'm15 6-6 6 6 6')}</button>
      <button type="button" className="btn btn-square btn-sm btn-pill carousel-next" aria-label={nextLabel} disabled={at >= items.length - 1}>{chevron(vertical ? 'm6 9 6 6 6-6' : 'm9 6 6 6-6 6')}</button>
      <div className="carousel-dots">
        {items.map((item, index) => (
          <button type="button" className="carousel-dot" aria-controls={`${id}${item.value}`} aria-label={dotLabel(index, items.length)} aria-current={item.value === first ? 'true' : undefined} key={item.value} />
        ))}
      </div>
    </div>
  )
}
