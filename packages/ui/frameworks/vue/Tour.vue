<script lang="ts">
export interface TourStep {
  /**
   * What the step points at: a selector, an element, or a function that finds it. Until it is in the page the
   * step waits for it, and passes on when it does not come.
   */
  target: string | Element | (() => Element | null | undefined)
  title: string
  text?: string
  /**
   * An event on the target that moves the tour on, such as `click`: the step asks the reader to do it, and has
   * no Next.
   */
  advance?: string
}
</script>

<script setup lang="ts">
import { computed, useId, useTemplateRef } from 'vue'
import { tour } from '@master/ui/behaviors/tour.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const { steps, id, spotlight = false, wait, nextLabel = 'Next', backLabel = 'Back', skipLabel = 'Skip', doneLabel = 'Done', countLabel = (step: number, count: number) => `${step} of ${count}` } = defineProps<{
  steps: TourStep[]
  id?: string
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
}>()
/** The index of the open step, or null while the tour is not running: `v-model`. */
const model = defineModel<number | null>()
const emit = defineEmits<{
  /** The reader ended the tour: completed, or left before the last step. */
  end: [completed: boolean]
}>()
defineSlots<{
  /** The button that starts the tour: bind what it is given on a button of your own. */
  trigger?: (attributes: { commandfor: string, command: '--start' }) => unknown
}>()

/*
 * A tour: one coachmark for each step, written from data, opened in turn against its target. The behavior
 * opens and closes the steps, waits for a target, moves focus and hears the keys; this component writes the
 * steps, finds their targets and passes the index of the open step in and out.
 */
const generated = useId()
const name = computed(() => id ?? generated)
const root = useTemplateRef<HTMLDivElement>('root')

/** The element a step points at, found as the page is now. */
const find = (target: TourStep['target'] | undefined) => {
  if (!target) return null
  if (typeof target === 'string') return document.querySelector(target)
  if (typeof target === 'function') return target() ?? null
  return target
}

useBehavior(root, tour, () => ({ wait, target: (_step: HTMLElement, index: number) => find(steps[index]?.target) }), model, {
  end: event => emit('end', (event as CustomEvent<{ completed: boolean }>).detail.completed),
})
</script>

<template>
  <slot name="trigger" v-bind="{ commandfor: name, command: '--start' as const }" />
  <div :id="name" class="coachmark-tour" ref="root" v-bind="$attrs">
    <div :class="spotlight ? 'coachmark-spotlight coachmark-spotlight-dim' : 'coachmark-spotlight'" popover="manual" />
    <div v-for="(step, index) in steps" :key="index" class="coachmark" popover="manual" role="dialog" :aria-labelledby="`${name}-${index}-title`" :data-advance="step.advance">
      <p class="coachmark-count">{{ countLabel(index + 1, steps.length) }}</p>
      <h2 :id="`${name}-${index}-title`" class="coachmark-title">{{ step.title }}</h2>
      <p v-if="step.text" class="coachmark-text">{{ step.text }}</p>
      <div class="coachmark-actions">
        <button v-if="index < steps.length - 1" type="button" class="btn btn-sm btn-quiet" value="skip">{{ skipLabel }}</button>
        <button v-if="index > 0" type="button" class="btn btn-sm btn-quiet" value="back">{{ backLabel }}</button>
        <button v-if="!step.advance" type="button" class="btn btn-sm" :value="index === steps.length - 1 ? 'done' : 'next'">{{ index === steps.length - 1 ? doneLabel : nextLabel }}</button>
      </div>
    </div>
  </div>
</template>
