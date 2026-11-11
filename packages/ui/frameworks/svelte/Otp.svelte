<script lang="ts" module>
  import type { HTMLFieldsetAttributes } from 'svelte/elements'

  export interface OtpProps extends Omit<HTMLFieldsetAttributes, 'children' | 'inputmode'> {
    /** How many characters the code has. */
    length?: number
    /** The characters typed so far. Bind it, or leave it out. */
    value?: string
    onValueChange?: (value: string) => void
    /** Called with the code once every slot holds a character. */
    onComplete?: (code: string) => void
    /** What one character must match, as the `pattern` of each slot. A digit by default. */
    pattern?: string
    inputmode?: 'numeric' | 'text'
    /** The name of a slot, which has no visible label. */
    slotLabel?: (index: number) => string
    invalid?: boolean
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { otp } from '@master/ui/behaviors/otp.js'
  import { behavior } from './behavior.svelte.js'

  let { length = 6, value = $bindable(), onValueChange, onComplete, pattern = '[0-9]', inputmode = 'numeric', slotLabel = index => `Digit ${index + 1}`, invalid, class: className, ...root }: OtpProps = $props()
  const first = untrack(() => value) ?? ''
  const attach = behavior(otp, undefined, {
    value: () => value,
    change: (next) => { value = next; onValueChange?.(next) },
    // The root's own change is the behavior's: every slot is filled. A slot's change bubbles through it too.
    on: { change: (event) => { if (event.target === event.currentTarget) onComplete?.((event as CustomEvent<{ value: string }>).detail.value) } },
  })
</script>

<!--
  @component
  A one-time code. Name the group with `aria-label` or `aria-labelledby`; `disabled` disables every slot.
-->
<fieldset class={['otp', className]} {@attach attach} {...root}>
  {#each { length }, index}
    <input class="otp-slot" {inputmode} {pattern} maxlength={1} autocomplete={index === 0 ? 'one-time-code' : 'off'} aria-label={slotLabel(index)} aria-invalid={invalid || undefined} value={first[index] ?? ''} />
  {/each}
</fieldset>
