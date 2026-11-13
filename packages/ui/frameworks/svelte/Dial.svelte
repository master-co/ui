<script lang="ts" module>
  import type { HTMLAttributes } from 'svelte/elements'

  /** A word or figure in the rim, at a value. Without a label it shows the value. */
  export interface DialMark {
    value: number
    label?: string
  }

  export interface DialProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'children'> {
    /** The number. Bind it, or leave it out: it starts at `min`. */
    value?: number
    /** Called as the dial turns. */
    onValueChange?: (value: number) => void
    /** Called once a drag ends, or a key or the wheel turned it. */
    onValueCommit?: (value: number) => void
    /** The least and the greatest value: 0 and 100, or 0 and 360 round a full circle. */
    min?: number
    max?: number
    /** How far an arrow key turns the value, and what a drag rounds it to. */
    step?: number
    /** How far PageUp and PageDown turn it; a tenth of the range by default. */
    page?: number
    /** The whole circle, for an angle that comes round again. */
    full?: boolean
    /** The name of the dial: what it sets. */
    label: string
    /** The words for a value, shown in the middle and given to assistive technology. */
    text?: (value: number) => string
    /** The name a form submits the value under. Without it there is no field. */
    name?: string
    /** How many equal steps to mark with ticks. */
    ticks?: number
    /** Words or figures in the rim, at their values. */
    marks?: DialMark[]
    /** Let a wheel turn the dial while Alt (Option) is held. */
    wheel?: boolean
    disabled?: boolean
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { dial } from '@master/ui/behaviors/dial.js'
  import { behavior } from './behavior.svelte.js'

  let { value = $bindable(), onValueChange, onValueCommit, min = 0, max, step = 1, page, full, label, text, name, ticks, marks, wheel = false, disabled, class: className, ...root }: DialProps = $props()
  const greatest = $derived(max ?? (full ? 360 : 100))
  const first = untrack(() => value ?? min)
  // Svelte writes a style again whenever its owner changes it, so it writes the value the behavior holds.
  let held = $state(first)
  const attach = behavior(dial, () => ({ step, page, text, wheel }), {
    value: () => value,
    change: (next) => { value = held = next; onValueChange?.(next) },
    settled: (next) => { held = next },
    // The dial says change once a drag ends or a key or the wheel turned it, after the value has come out.
    on: { change: (event) => { if (event.target === event.currentTarget) onValueCommit?.(held) } },
  })
</script>

<!--
  @component
  A value set by turning a thumb around a circle.
-->
<div class={['dial', full && 'dial-full', className]} role="slider" tabindex={disabled ? -1 : 0} aria-label={label} aria-valuenow={first} aria-valuemin={min} aria-valuemax={greatest} aria-valuetext={text?.(first)} aria-disabled={disabled || undefined} style:--dial-value={held} style:--dial-min={min} style:--dial-max={greatest} {@attach attach} {...root}>
  {#if ticks !== undefined}<span class="dial-ticks" style:--dial-ticks={ticks}></span>{/if}
  {#each marks ?? [] as mark (mark.value)}
    <span class="dial-mark" style:--dial-at={mark.value}>{mark.label ?? String(mark.value)}</span>
  {/each}
  <span class="dial-value">{text ? text(first) : String(first)}</span>
  <span class="dial-thumb"></span>
  {#if name !== undefined}<input type="hidden" {name} value={first} {disabled} />{/if}
</div>
