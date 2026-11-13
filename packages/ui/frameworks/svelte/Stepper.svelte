<script lang="ts" module>
  import type { HTMLInputAttributes } from 'svelte/elements'

  export interface StepperProps extends Omit<HTMLInputAttributes, 'value' | 'type' | 'children'> {
    /** The number; null while the field is empty. Bind it, or leave it out. */
    value?: number | null
    onValueChange?: (value: number | null) => void
    /** The names of the two buttons, which show only an icon. */
    decrementLabel: string
    incrementLabel: string
    /**
     * Write the figure with `Intl.NumberFormat` while the field is not focused: a unit, a currency, grouping.
     * The field keeps the plain number. Read when the stepper attaches, as `locale` is.
     */
    format?: Intl.NumberFormatOptions
    /** The locale the figure is written in. The page's by default. */
    locale?: string
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { stepper } from '@master/ui/behaviors/stepper.js'
  import { behavior } from './behavior.svelte.js'

  let { value = $bindable(), onValueChange, decrementLabel, incrementLabel, format, locale, class: className, ...field }: StepperProps = $props()
  const first = untrack(() => value)
  // The first figure is drawn into the first render, so the HTML a server sends shows it.
  const written = untrack(() => (format && typeof first === 'number' ? new Intl.NumberFormat(locale, format).format(first) : undefined))
  const attach = behavior(stepper, () => ({ format, locale }), {
    value: () => value,
    change: (next) => { value = next; onValueChange?.(next) },
  })
</script>

<!--
  @component
  A number between two buttons. Name the field with `aria-label`, or give it an `id` a label points at;
  `min`, `max`, `step` and every other prop of an input go to the field. A label with the `stepper-scrub`
  class steps the number as it is dragged sideways.
-->
<div class={['input-group', 'stepper', className]} {@attach attach}>
  <button type="button" class="btn btn-square" value="-1" tabindex={-1} aria-label={decrementLabel}>
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14" /></svg>
  </button>
  {#if format}
    <span class="stepper-value">
      <input class="input-group-field stepper-field" type="number" value={first ?? undefined} aria-valuetext={written} {...field} />
      <span class="stepper-display" aria-hidden="true">{written}</span>
    </span>
  {:else}
    <input class="input-group-field stepper-field" type="number" value={first ?? undefined} {...field} />
  {/if}
  <button type="button" class="btn btn-square" value="1" tabindex={-1} aria-label={incrementLabel}>
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
  </button>
</div>
