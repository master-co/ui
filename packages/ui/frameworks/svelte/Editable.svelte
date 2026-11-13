<script lang="ts" module>
  import type { HTMLInputAttributes } from 'svelte/elements'

  export interface EditableProps extends Omit<HTMLInputAttributes, 'value' | 'hidden' | 'children'> {
    /** The saved value. Bind it, or leave it out. */
    value?: string
    onValueChange?: (value: string) => void
    /** What the value is, read with it by assistive technology: the field's name. */
    label: string
    /** A textarea, for a value of several lines. */
    multiline?: boolean
    /** The value is on its way: the preview waits. */
    busy?: boolean
    /** What leaving the field does. `'save'` by default. */
    blur?: 'save' | 'cancel'
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { editable } from '@master/ui/behaviors/editable.js'
  import { behavior } from './behavior.svelte.js'

  let { value = $bindable(), onValueChange, label, multiline, busy, blur, disabled, class: className, ...field }: EditableProps = $props()
  const id = $props.id()
  // The first value is drawn into the first render; after that the behavior writes the preview and the field.
  const first = untrack(() => value) ?? ''
  const attach = behavior(editable, () => ({ blur }), {
    value: () => value,
    change: (next) => { value = next; onValueChange?.(next) },
  })
</script>

<!--
  @component
  An editable value. Every other prop of a field goes to the field, so `required`, `maxlength` and
  `placeholder` are its constraints and what the preview says while the value is empty.
-->
<div class={['editable', className]} aria-busy={busy || undefined} {@attach attach}>
  <button type="button" class="editable-preview" id="{id}preview" aria-labelledby="{id}name {id}preview" {disabled}>
    {#if first}{first}{:else if field.placeholder}<span class="editable-placeholder">{field.placeholder}</span>{/if}
  </button>
  <span id="{id}name" hidden>{label}</span>
  {#if multiline}
    <textarea class="editable-field" aria-label={label} {disabled} hidden {...field as Record<string, unknown>} value={first}></textarea>
  {:else}
    <input class="editable-field" aria-label={label} {disabled} hidden {...field} value={first} />
  {/if}
</div>
