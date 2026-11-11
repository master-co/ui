<script setup lang="ts">
import Tooltip from '../../../frameworks/vue/Tooltip.vue'
</script>

<template>
  <Tooltip>
    <template #trigger="attributes"><button type="button" class="btn" v-bind="attributes">Deploy</button></template>
    Ships the main branch to production
  </Tooltip>
</template>
