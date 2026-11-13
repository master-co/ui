<script lang="ts">
  import ColorPicker, { type ColorPickerProps } from '../../../frameworks/svelte/ColorPicker.svelte'

  let props: ColorPickerProps = $props()
</script>

<ColorPicker {...props}>
  {#snippet trigger(attributes)}
    <button type="button" class="btn" {...attributes}><span class="swatch swatch-sm color-picker-swatch"></span>Accent</button>
  {/snippet}
</ColorPicker>
