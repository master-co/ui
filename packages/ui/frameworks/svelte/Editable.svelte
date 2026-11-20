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
  // The behavior finds its field as it attaches. One line and several are two elements, so it attaches again when `multiline` changes.
  const fielded = (root: HTMLElement, options?: { blur?: 'save' | 'cancel', multiline?: boolean }) => editable(root, { blur: options?.blur })
  const attach = behavior(fielded, () => ({ blur, multiline }), {
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
    {#if first}{first}{:else if field.placeholder}<span class="editable-placeholder">{field.placeholder}</span>{/if}<svg class="icon editable-pencil" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.6556 12.4849L3.2844 10.1793A0.7 0.7 0 0 1 3.4647 9.8686L10.505 2.8283A0.7 0.7 0 0 1 11.495 2.8283L13.1717 4.505A0.7 0.7 0 0 1 13.1717 5.495L6.1314 12.5353A0.7 0.7 0 0 1 5.8207 12.7156L3.5151 13.3444A0.7 0.7 0 0 1 2.6556 12.4849Z" /><path d="M9.6667 3.6667L12.3333 6.3333" /></svg>
  </button>
  <span id="{id}name" hidden>{label}</span>
  {#if multiline}
    <textarea class="editable-field" aria-label={label} {disabled} hidden {...field as Record<string, unknown>} value={first}></textarea>
  {:else}
    <input class="editable-field" aria-label={label} {disabled} hidden {...field} value={first} />
  {/if}
</div>
