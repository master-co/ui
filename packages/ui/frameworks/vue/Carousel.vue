<script lang="ts">
export interface CarouselItem {
  /** What the slide stands for: the carousel's value while it is current. Keep it the same when items move. */
  value: string
}
</script>

<script setup lang="ts" generic="T extends CarouselItem">
import { useId, useTemplateRef } from 'vue'
import { carousel } from '@master/ui/behaviors/carousel.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const { items, label, vertical, trackClass, slideClass, previousLabel = 'Previous slide', nextLabel = 'Next slide', dotLabel = (index: number, count: number) => `Slide ${index + 1} of ${count}` } = defineProps<{
  /** The slides. An item's `value` is what the slide stands for; keep it the same when items move. */
  items: T[]
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
}>()
/** The current slide, as its item's value: `v-model`. */
const model = defineModel<string>()
defineSlots<{
  /** What a slide shows. */
  default: (props: { item: T }) => unknown
}>()

/*
 * A carousel whose slide in view the application can read and set. Vue writes the slides from the items and
 * the controls beside them; the carousel behavior follows the scroll, marks the current dot and moves the
 * track through the platform when a control is pressed.
 */
const id = useId()
// The first value is drawn into the first render; after that the behavior marks what is current.
const first = model.value ?? items[0]?.value
const at = items.findIndex(item => item.value === first)
const root = useTemplateRef<HTMLDivElement>('root')
useBehavior(root, carousel, () => ({ value: first }), model)
</script>

<template>
  <div class="carousel-view" ref="root" v-bind="$attrs">
    <div class="carousel" :class="[{ 'carousel-vertical': vertical }, trackClass]" role="region" :aria-label="label" tabindex="0">
      <div v-for="item in items" :key="item.value" class="carousel-slide" :class="slideClass" :id="`${id}-${item.value}`" :data-value="item.value"><slot :item="item" /></div>
    </div>
    <button type="button" class="btn btn-square btn-sm btn-pill carousel-previous" :aria-label="previousLabel" :disabled="at <= 0">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="vertical ? 'm6 15 6-6 6 6' : 'm15 6-6 6 6 6'" /></svg>
    </button>
    <button type="button" class="btn btn-square btn-sm btn-pill carousel-next" :aria-label="nextLabel" :disabled="at >= items.length - 1">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="vertical ? 'm6 9 6 6 6-6' : 'm9 6 6 6-6 6'" /></svg>
    </button>
    <div class="carousel-dots">
      <button v-for="(item, index) in items" :key="item.value" type="button" class="carousel-dot" :aria-controls="`${id}-${item.value}`" :aria-label="dotLabel(index, items.length)" :aria-current="item.value === first ? 'true' : undefined"></button>
    </div>
  </div>
</template>
