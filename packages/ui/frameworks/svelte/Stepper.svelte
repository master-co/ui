<script lang="ts" module>
  import type { HTMLInputAttributes } from 'svelte/elements'

  export interface StepperProps extends Omit<HTMLInputAttributes, 'value' | 'type' | 'children'> {
    /** The number; null while the field is empty. Bind it, or leave it out. */
    value?: number | null
    onValueChange?: (value: number | null) => void
    /** The names of the two buttons, which show only an icon. */
    decrementLabel: string
    incrementLabel: string
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { stepper } from '@master/ui/behaviors/stepper.js'
  import { behavior } from './behavior.svelte.js'

  let { value = $bindable(), onValueChange, decrementLabel, incrementLabel, class: className, ...field }: StepperProps = $props()
  const first = untrack(() => value)
  const attach = behavior(stepper, undefined, {
    value: () => value,
    change: (next) => { value = next; onValueChange?.(next) },
  })
</script>

<!--
  @component
  A number between two buttons. Name the field with `aria-label`, or give it an `id` a label points at;
  `min`, `max`, `step` and every other prop of an input go to the field.
-->
<div class={['input-group', 'stepper', className]} {@attach attach}>
  <button type="button" class="btn btn-square" value="-1" tabindex={-1} aria-label={decrementLabel}>
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14" /></svg>
  </button>
  <input class="input-group-field stepper-field" type="number" value={first ?? undefined} {...field} />
  <button type="button" class="btn btn-square" value="1" tabindex={-1} aria-label={incrementLabel}>
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
  </button>
</div>
