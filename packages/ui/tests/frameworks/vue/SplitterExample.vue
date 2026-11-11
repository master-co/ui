<script setup lang="ts">
import Splitter from '../../../frameworks/vue/Splitter.vue'

defineOptions({ inheritAttrs: false })
</script>

<template>
  <Splitter label="Resize the file list" v-bind="$attrs">
    <template #start><p>Files</p></template>
    <template #end><p>Editor</p></template>
  </Splitter>
</template>
