<script lang="ts" module>
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  export interface ColorPickerLabels {
    /** The field's thumb. `Lightness and chroma` by default. */
    field?: string
    /** `Hue` by default. */
    hue?: string
    /** `Opacity` by default. */
    alpha?: string
    /** The select of the format. `Format` by default. */
    format?: string
  }

  export interface ColorPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    /** The color, in hex, rgb() or oklch(); the format it is written in is the one the picker writes. Bind it, or leave it out. */
    value?: string
    onValueChange?: (value: string) => void
    /** What the color is: the name of the text field. */
    label: string
    /** The name the text field submits with a form. */
    name?: string
    /** An opacity slider. Without it the color is opaque. True by default. */
    alpha?: boolean
    disabled?: boolean
    /**
     * The button that opens the picker in a popover: spread what it is given on a button of your own, and put
     * a `swatch color-picker-swatch` in it to show the color. Leave it out and the picker stands inline.
     */
    trigger?: Snippet<[{ popovertarget: string }]>
    /** What the controls are called, in the page's words. */
    labels?: ColorPickerLabels
    /** What the field's thumb says it holds, from the lightness in percent and the chroma. */
    valueText?: (lightness: number, chroma: number) => string
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { colorPicker, colorPickerState } from '@master/ui/behaviors/color-picker.js'
  import { behavior } from './behavior.svelte.js'

  let { value = $bindable(), onValueChange, label, name, alpha = true, disabled, trigger, labels = {}, valueText, class: className, ...root }: ColorPickerProps = $props()
  const id = $props.id()
  // The first value is drawn into the first render; after that the behavior writes every part.
  const first = untrack(() => colorPickerState(value ?? '', { valueText, opaque: !alpha }) ?? colorPickerState('#000000')!)
  // Svelte writes a style again whenever its owner changes it, so it writes the numbers the behavior holds.
  let element = $state<HTMLDivElement>()
  let held = $state(first.properties)
  const read = () => {
    if (element) held = Object.fromEntries(Object.entries(held).map(([property, number]) => [property, element!.style.getPropertyValue(property) || number]))
  }
  const attach = behavior(colorPicker, () => ({ valueText }), {
    value: () => value,
    change: (next) => { value = next; onValueChange?.(next) },
    settled: read,
    on: { input: read },
  })
</script>

{#snippet panel()}
  <div class="color-picker-area">
    <div class="color-picker-thumb" role="slider" tabindex="0" aria-label={labels.field ?? 'Lightness and chroma'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={first.valueNow} aria-valuetext={first.valueText} aria-disabled={disabled || undefined}></div>
  </div>
  <span class="swatch swatch-lg color-picker-swatch"></span>
  <input type="range" class="slider color-picker-hue" min="0" max="360" value={first.hue} aria-label={labels.hue ?? 'Hue'} {disabled} />
  {#if alpha}
    <input type="range" class="slider color-picker-alpha" min="0" max="100" value={first.alpha * 100} aria-label={labels.alpha ?? 'Opacity'} {disabled} />
  {/if}
  <div class="color-picker-fields">
    <select class="select select-sm color-picker-format" aria-label={labels.format ?? 'Format'} {disabled}>
      <option value="hex" selected={first.format === 'hex'}>Hex</option>
      <option value="rgb" selected={first.format === 'rgb'}>RGB</option>
      <option value="oklch" selected={first.format === 'oklch'}>OKLCH</option>
    </select>
    <input class="input input-sm color-picker-text" {name} value={first.value} aria-label={label} spellcheck="false" autocomplete="off" {disabled} />
  </div>
{/snippet}

<!--
  @component
  A color picker. The behavior holds the color and moves every part; this component draws the first value
  into the first render and passes the value in and out.
-->
<div
  class={['color-picker', className]}
  style:--color-picker-lightness={held['--color-picker-lightness']}
  style:--color-picker-chroma={held['--color-picker-chroma']}
  style:--color-picker-hue={held['--color-picker-hue']}
  style:--color-picker-alpha={held['--color-picker-alpha']}
  bind:this={element}
  {@attach attach}
  {...root}
>
  {#if trigger}
    {@render trigger({ popovertarget: `${id}-popover` })}
    <div id="{id}-popover" popover="auto" class="popover color-picker-popover">{@render panel()}</div>
  {:else}
    {@render panel()}
  {/if}
</div>
