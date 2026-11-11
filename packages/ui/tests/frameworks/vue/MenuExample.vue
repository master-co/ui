<script setup lang="ts">
import Menu, { type MenuItem } from '../../../frameworks/vue/Menu.vue'

defineOptions({ inheritAttrs: false })
defineProps<{ items: MenuItem[] }>()
</script>

<template>
  <Menu :items="items" v-bind="$attrs">
    <template #trigger="attributes"><button type="button" class="btn" v-bind="attributes">Project</button></template>
  </Menu>
</template>
