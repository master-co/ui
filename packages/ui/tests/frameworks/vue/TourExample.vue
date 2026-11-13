<script setup lang="ts">
import { useTemplateRef } from 'vue'
import Tour, { type TourStep } from '../../../frameworks/vue/Tour.vue'

defineOptions({ inheritAttrs: false })

const share = useTemplateRef<HTMLButtonElement>('share')
const steps: TourStep[] = [
  { target: '#tour-search', title: 'Search every deployment', text: 'Find one by its branch, its commit or the person who shipped it.' },
  { target: () => document.getElementById('tour-filter'), title: 'Filter the list', text: 'Keep only the deployments of one branch, one author or one status.' },
  { target: () => share.value, title: 'Share a deployment', text: 'Copy a link to it, open for anyone on the team.' },
]
</script>

<template>
  <div class="toolbar" role="toolbar" aria-label="Deployments">
    <button type="button" class="btn btn-quiet btn-sm" id="tour-search">Search</button>
    <button type="button" class="btn btn-quiet btn-sm" id="tour-filter">Filter</button>
    <button ref="share" type="button" class="btn btn-quiet btn-sm">Share</button>
  </div>
  <Tour :steps="steps" v-bind="$attrs">
    <template #trigger="attributes">
      <button type="button" class="btn" v-bind="attributes">Take the tour</button>
    </template>
  </Tour>
</template>
