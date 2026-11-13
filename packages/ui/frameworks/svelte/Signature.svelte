<script lang="ts" module>
  import type { HTMLFieldsetAttributes } from 'svelte/elements'

  /** One stroke: the points it passed through, in the units of the viewBox, each with the pressure there. */
  export type SignatureStroke = [x: number, y: number, pressure: number][]

  export interface SignatureProps extends Omit<HTMLFieldsetAttributes, 'children' | 'name'> {
    /** What is being signed: the legend of the group. */
    label: string
    /** The strokes drawn. Bind it, or leave it out. */
    value?: SignatureStroke[]
    /** Called as a stroke is drawn, and when Undo or Clear takes strokes back. */
    onValueChange?: (value: SignatureStroke[]) => void
    /** The name a form submits the drawing under, as an SVG document. */
    name?: string
    /** The drawing's viewBox: the pad's proportions and the units of a stroke. */
    viewBox?: string
    /** The drawing's name, as an image. */
    padLabel?: string
    /** Where to sign, until the first stroke. */
    placeholder?: string
    undoLabel?: string
    clearLabel?: string
    /** The label of the typed name, the keyboard's way to sign. */
    typedLabel?: string
    /** The typed name. Bind it, or leave it out. */
    typed?: string
    onTypedChange?: (typed: string) => void
    /** The name a form submits the typed name under. */
    typedName?: string
    /** A signature is required: the typed name is, until something is drawn. */
    required?: boolean
    readonly?: boolean
    invalid?: boolean
    /** What the status says when the pad is signed, when it is emptied and when Undo takes a stroke back. */
    messages?: { drawn?: string, cleared?: string, undone?: string }
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { signature, signaturePath, signatureSvg } from '@master/ui/behaviors/signature.js'
  import { behavior } from './behavior.svelte.js'

  let { label, value = $bindable(), onValueChange, name, viewBox = '0 0 400 160', padLabel = 'Your drawn signature', placeholder = 'Sign here', undoLabel = 'Undo', clearLabel = 'Clear', typedLabel = 'Or type your full name', typed = $bindable(), onTypedChange, typedName, required, readonly, invalid, messages, class: className, ...root }: SignatureProps = $props()
  const first = untrack(() => value) ?? []
  const empty = first.length === 0
  const svg = signatureSvg(first, { viewBox: untrack(() => viewBox) })
  // The behavior lifts required from the typed name while there is a drawing. Svelte writes a boolean property
  // again each time the element's other attributes change; through a spread it compares and leaves it.
  const needed = { required: untrack(() => required) }
  const attach = behavior(signature, () => ({ drawn: messages?.drawn, cleared: messages?.cleared, undone: messages?.undone }), {
    value: () => value,
    change: (next) => { value = next; onValueChange?.(next) },
  })
</script>

<!--
  @component
  A pad to sign in and a name to type instead. `disabled` disables the whole group.
-->
<fieldset class={['signature', readonly && 'signature-readonly', className]} {@attach attach} {...root}>
  <legend class="signature-label">{label}</legend>
  <div class="signature-pad">
    <svg class="signature-ink" {viewBox} role="img" aria-label={padLabel}>
      {#each first as stroke, index (index)}
        <path class="signature-stroke" d={signaturePath(stroke)} />
      {/each}
    </svg>
    <span class="signature-line" aria-hidden="true"></span>
    <span class="signature-placeholder" aria-hidden="true">{placeholder}</span>
    <div class="signature-actions">
      <button type="button" class="btn btn-sm btn-quiet signature-undo" aria-disabled={empty || undefined}>{undoLabel}</button>
      <button type="button" class="btn btn-sm btn-quiet signature-clear" aria-disabled={empty || undefined}>{clearLabel}</button>
    </div>
  </div>
  <label class="field">
    {typedLabel}
    <input class="input signature-name" name={typedName} autocomplete="name" {...needed} {readonly} aria-invalid={invalid || undefined} bind:value={typed} oninput={() => onTypedChange?.(typed ?? '')} />
  </label>
  <input type="hidden" class="signature-value" {name} value={svg} />
  <span class="signature-status" role="status"></span>
</fieldset>
