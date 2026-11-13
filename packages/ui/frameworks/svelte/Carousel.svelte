<script lang="ts" module>
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  export interface CarouselItem {
    /** What the slide stands for: the carousel's value while it is current. Keep it the same when items move. */
    value: string
  }

  export interface CarouselProps<T extends CarouselItem> extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    items: T[]
    /** The current slide, as its item's value. Bind it, or leave it out and the first slide is current. */
    value?: string
    onValueChange?: (value: string) => void
    /** What a slide shows. */
    children: Snippet<[T]>
    /** The accessible name of the track. */
    label: string
    /** A column that scrolls up and down. */
    vertical?: boolean
    /** Classes of the track, such as `carousel-2` or `carousel-center`. */
    trackClass?: string
    /** Classes of each slide. */
    slideClass?: string
    previousLabel?: string
    nextLabel?: string
    /** The accessible name of a dot. `Slide 2 of 5` by default. */
    dotLabel?: (index: number, count: number) => string
  }
</script>

<script lang="ts" generics="T extends CarouselItem">
  import { untrack } from 'svelte'
  import { carousel } from '@master/ui/behaviors/carousel.js'
  import { behavior } from './behavior.svelte.js'

  let { items, value = $bindable(), onValueChange, children, label, vertical, trackClass, slideClass, previousLabel = 'Previous slide', nextLabel = 'Next slide', dotLabel = (index, count) => `Slide ${index + 1} of ${count}`, class: className, ...root }: CarouselProps<T> = $props()
  const id = $props.id()
  // The first value is drawn into the first render; after that the behavior marks what is current.
  const first = untrack(() => value ?? items[0]?.value)
  const at = untrack(() => items.findIndex(item => item.value === first))
  const attach = behavior(carousel, () => ({ value: first }), {
    value: () => value,
    // The behavior's value is null only for a carousel with no slides, which never reports a change.
    change: (next) => { if (next === null) return; value = next; onValueChange?.(next) },
  })
</script>

<!--
  @component
  A carousel whose slide in view the application can read and set. Svelte writes the slides from the items
  and the controls beside them; the carousel behavior follows the scroll, marks the current dot and moves the
  track through the platform when a control is pressed.
-->
<div class={['carousel-view', className]} {@attach attach} {...root}>
  <!-- The track is a scroll container: in the tab order, so the arrow keys scroll it. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class={['carousel', vertical && 'carousel-vertical', trackClass]} role="region" aria-label={label} tabindex="0">
    {#each items as item (item.value)}
      <div class={['carousel-slide', slideClass]} id="{id}{item.value}" data-value={item.value}>{@render children(item)}</div>
    {/each}
  </div>
  <button type="button" class="btn btn-square btn-sm btn-pill carousel-previous" aria-label={previousLabel} disabled={at <= 0}>
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={vertical ? 'm6 15 6-6 6 6' : 'm15 6-6 6 6 6'} /></svg>
  </button>
  <button type="button" class="btn btn-square btn-sm btn-pill carousel-next" aria-label={nextLabel} disabled={at >= items.length - 1}>
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={vertical ? 'm6 9 6 6 6-6' : 'm9 6 6 6-6 6'} /></svg>
  </button>
  <div class="carousel-dots">
    {#each items as item, index (item.value)}
      <button type="button" class="carousel-dot" aria-controls="{id}{item.value}" aria-label={dotLabel(index, items.length)} aria-current={item.value === first ? 'true' : undefined}></button>
    {/each}
  </div>
</div>
