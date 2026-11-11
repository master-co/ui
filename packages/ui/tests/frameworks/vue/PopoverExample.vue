<script setup lang="ts">
import Popover from '../../../frameworks/vue/Popover.vue'

defineOptions({ inheritAttrs: false })
</script>

<template>
  <Popover v-bind="$attrs">
    <template #trigger="attributes"><button type="button" class="btn" v-bind="attributes">Share</button></template>
    <p>Anyone with the link can view the latest deployment.</p>
  </Popover>
</template>
