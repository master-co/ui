<script lang="ts" module>
  import type { HTMLInputAttributes } from 'svelte/elements'

  export interface TagsProps extends Omit<HTMLInputAttributes, 'value' | 'name' | 'max' | 'children'> {
    /** The values, in order. Bind it, or leave it out. */
    value?: string[]
    onValueChange?: (value: string[]) => void
    /** The name each value is submitted with, in a hidden input of its chip. */
    name?: string
    /** How many values the field holds at most. */
    max?: number
    /** Keys that add a value as Enter does. `[',']` by default. */
    delimiters?: string[]
    /** Says whether a value may be added. */
    validate?: (value: string) => boolean
    /** The accessible name of a chip's remove button. `Remove <value>` by default. */
    removeLabel?: (value: string) => string
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { tags } from '@master/ui/behaviors/tags.js'
  import { behavior } from './behavior.svelte.js'

  let { value = $bindable(), onValueChange, name, max, delimiters, validate, removeLabel = (text: string) => `Remove ${text}`, class: className, ...field }: TagsProps = $props()
  // The behavior asks for the chips it wants; Svelte writes them from this list.
  let shown = $state(untrack(() => value) ?? [])
  const attach = behavior(tags, () => ({ max, delimiters, validate, removeLabel, name, draw: (values: string[]) => { shown = values } }), {
    value: () => value,
    change: (next) => { value = next; onValueChange?.(next) },
  })
</script>

<!--
  @component
  A tags field. Name the field with `aria-label`, or give it an `id` a label points at; every other prop of
  an input goes to the field.
-->
<div class={['tags input-group input-group-wrap', className]} {@attach attach}>
  {#each shown as each (each)}
    <span class="chip" data-value={each}>
      {each}
      {#if name}<input type="hidden" {name} value={each} />{/if}
      <button type="button" class="chip-remove" tabindex={-1} aria-label={removeLabel(each)}><svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4L12 12" /><path d="M4 12L12 4" /></svg></button>
    </span>
  {/each}
  <input class="input-group-field" autocomplete="off" {...field} />
</div>
