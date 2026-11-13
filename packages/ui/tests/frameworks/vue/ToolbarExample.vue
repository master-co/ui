<script setup lang="ts">
import Toolbar from '../../../frameworks/vue/Toolbar.vue'

defineOptions({ inheritAttrs: false })
</script>

<template>
  <Toolbar label="Formatting" v-bind="$attrs">
    <button type="button" class="btn btn-quiet btn-sm" aria-pressed="false">Bold</button>
    <button type="button" class="btn btn-quiet btn-sm" aria-pressed="false">Italic</button>
    <span class="toolbar-separator" role="separator" aria-orientation="vertical" />
    <button type="button" class="btn btn-quiet btn-sm">Link</button>
  </Toolbar>
</template>
