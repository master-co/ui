<script lang="ts" module>
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  export interface FieldControl {
    id: string
    'aria-describedby'?: string
    'aria-invalid'?: true
  }

  export interface FieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    label: string
    /** Guidance under the control. */
    hint?: string
    /** What is wrong with the value. The stylesheet shows it while the control is invalid. */
    error?: string | null
    /** The control: spread what it is given on an input, a select, a textarea or a component that takes them. */
    children: Snippet<[FieldControl]>
  }
</script>

<script lang="ts">
  let { label, hint, error, class: className, children, ...root }: FieldProps = $props()
  const id = $props.id()
  const described = $derived([hint !== undefined && `${id}hint`, error !== undefined && `${id}error`].filter(Boolean).join(' '))
</script>

<!--
  @component
  A label, its control, a hint and an error, joined by their ids.
-->
<div class={['field', className]} {...root}>
  <label for={id}>{label}</label>
  {@render children({ id, 'aria-describedby': described || undefined, 'aria-invalid': error !== undefined && error !== null ? true : undefined })}
  {#if hint !== undefined}<span class="field-hint" id="{id}hint">{hint}</span>{/if}
  {#if error !== undefined}<span class="field-error" id="{id}error">{error}</span>{/if}
</div>
