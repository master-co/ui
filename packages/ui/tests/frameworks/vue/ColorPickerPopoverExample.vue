<script setup lang="ts">
import ColorPicker from '../../../frameworks/vue/ColorPicker.vue'

defineOptions({ inheritAttrs: false })
</script>

<template>
  <ColorPicker label="Accent color" v-bind="$attrs">
    <template #trigger="attributes"><button type="button" class="btn" v-bind="attributes"><span class="swatch swatch-sm color-picker-swatch" />Accent</button></template>
  </ColorPicker>
</template>
