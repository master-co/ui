<script setup lang="ts">
import Sortable from '../../../frameworks/vue/Sortable.vue'

defineOptions({ inheritAttrs: false })

const items = [
  { value: 'onboarding', label: 'Onboarding', due: 'Mon' },
  { value: 'billing', label: 'Billing', due: 'Tue' },
  { value: 'search', label: 'Search', due: 'Thu' },
]
</script>

<template>
  <Sortable class="list" item-class="list-row" aria-label="Priorities" :items="items" v-bind="$attrs">
    <template #default="{ item }">
      <span class="list-body"><span class="list-title">{{ item.label }}</span></span>
      <span class="list-end">{{ item.due }}</span>
    </template>
  </Sortable>
</template>
