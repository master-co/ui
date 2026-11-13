<script setup lang="ts">
import Log from '../../../frameworks/vue/Log.vue'

defineOptions({ inheritAttrs: false })
const { rows = [] } = defineProps<{ latestLabel: string, rows?: string[] }>()
</script>

<template>
  <Log :latest-label="latestLabel" v-bind="$attrs">
    <ol>
      <li v-for="row in rows" :key="row">{{ row }}</li>
    </ol>
  </Log>
</template>
