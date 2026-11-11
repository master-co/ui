<script setup lang="ts">
import Compare from '../../../frameworks/vue/Compare.vue'

defineOptions({ inheritAttrs: false })
</script>

<template>
  <Compare label="Show more of the graded picture" v-bind="$attrs">
    <img class="compare-before" src="/demo/moonstone.svg" alt="The valley before grading" width="800" height="500">
    <img class="compare-after" src="/demo/portrait-1.svg" alt="The valley after grading">
  </Compare>
</template>
