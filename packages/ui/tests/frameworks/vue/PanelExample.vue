<script setup lang="ts">
import Panel from '../../../frameworks/vue/Panel.vue'

defineOptions({ inheritAttrs: false })
</script>

<template>
  <Panel id="layers" title="Layers" handle-label="Move the Layers panel with the arrow keys" v-bind="$attrs">
    <template #trigger="attributes"><button type="button" class="btn" v-bind="attributes">Layers</button></template>
    <p>Header, Hero image, Pricing table</p>
  </Panel>
</template>
