<script setup lang="ts">
import Carousel from '../../../frameworks/vue/Carousel.vue'

defineOptions({ inheritAttrs: false })

const items = [
  { value: 'atlas', name: 'Atlas', line: 'A map of every deployment, live.' },
  { value: 'borealis', name: 'Borealis', line: 'Edge functions close to the reader.' },
  { value: 'cirrus', name: 'Cirrus', line: 'Storage that follows the project.' },
]
</script>

<template>
  <Carousel label="Featured projects" slide-class="card" :items="items" v-bind="$attrs">
    <template #default="{ item }">
      <h3 class="card-title">{{ item.name }}</h3>
      <p class="card-description">{{ item.line }}</p>
    </template>
  </Carousel>
</template>
