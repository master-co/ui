<script setup lang="ts">
import { useTemplateRef } from 'vue'
import Menu, { type MenuItem } from '../../../frameworks/vue/Menu.vue'

defineOptions({ inheritAttrs: false })
defineProps<{ items: MenuItem[] }>()
const target = useTemplateRef<HTMLDivElement>('target')
</script>

<template>
  <div class="sheet" tabindex="0" ref="target">Right-click this sheet</div>
  <Menu :items="items" :context="target" v-bind="$attrs" />
</template>
