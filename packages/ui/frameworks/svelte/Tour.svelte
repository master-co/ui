<script lang="ts" module>
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  export interface TourStep {
    /**
     * What the step points at: a selector, an element, or a function that finds it. Until it is in the page
     * the step waits for it, and passes on when it does not come.
     */
    target: string | Element | (() => Element | null | undefined)
    title: string
    text?: string
    /**
     * An event on the target that moves the tour on, such as `click`: the step asks the reader to do it, and
     * has no Next.
     */
    advance?: string
  }

  export interface TourProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    steps: TourStep[]
    /** The index of the open step, or null while the tour is not running. Bind it, or leave it out. */
    value?: number | null
    onValueChange?: (value: number | null) => void
    /** Called when the reader ends the tour: completed, or left before the last step. */
    onEnd?: (completed: boolean) => void
    /** The button that starts the tour: spread what it is given on a button of your own. */
    trigger?: Snippet<[{ commandfor: string, command: '--start' }]>
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
</script>

<script lang="ts">
  import { tour } from '@master/ui/behaviors/tour.js'
  import { behavior } from './behavior.svelte.js'

  let { steps, value = $bindable(), onValueChange, onEnd, trigger, spotlight = false, wait, nextLabel = 'Next', backLabel = 'Back', skipLabel = 'Skip', doneLabel = 'Done', countLabel = (step: number, count: number) => `${step} of ${count}`, class: className, id, ...root }: TourProps = $props()
  const generated = $props.id()
  const name = $derived(id ?? generated)

  /** The element a step points at, found as the page is now. */
  const find = (target: TourStep['target'] | undefined) => {
    if (!target) return null
    if (typeof target === 'string') return document.querySelector(target)
    if (typeof target === 'function') return target() ?? null
    return target
  }

  const attach = behavior(tour, () => ({ wait, target: (_step: HTMLElement, index: number) => find(steps[index]?.target) }), {
    value: () => value,
    change: (next) => {
      value = next
      onValueChange?.(next)
    },
    on: { end: event => onEnd?.((event as CustomEvent<{ completed: boolean }>).detail.completed) },
  })
</script>

<!--
  @component
  A tour: one coachmark for each step, written from data, opened in turn against its target. The behavior
  opens and closes the steps, waits for a target, moves focus and hears the keys; this component writes the
  steps, finds their targets and passes the index of the open step in and out.
-->
{@render trigger?.({ commandfor: name, command: '--start' })}
<div id={name} class={['coachmark-tour', className]} {@attach attach} {...root}>
  <div class={spotlight ? 'coachmark-spotlight coachmark-spotlight-dim' : 'coachmark-spotlight'} popover="manual"></div>
  {#each steps as step, index (index)}
    {@const last = index === steps.length - 1}
    <div class="coachmark" popover="manual" role="dialog" aria-labelledby="{name}-{index}-title" data-advance={step.advance}>
      <p class="coachmark-count">{countLabel(index + 1, steps.length)}</p>
      <h2 class="coachmark-title" id="{name}-{index}-title">{step.title}</h2>
      {#if step.text}<p class="coachmark-text">{step.text}</p>{/if}
      <div class="coachmark-actions">
        {#if !last}<button type="button" class="btn btn-sm btn-quiet" value="skip">{skipLabel}</button>{/if}
        {#if index > 0}<button type="button" class="btn btn-sm btn-quiet" value="back">{backLabel}</button>{/if}
        {#if !step.advance}<button type="button" class="btn btn-sm" value={last ? 'done' : 'next'}>{last ? doneLabel : nextLabel}</button>{/if}
      </div>
    </div>
  {/each}
</div>
