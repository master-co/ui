<script setup lang="ts">
import Cropper from '../../../frameworks/vue/Cropper.vue'

defineOptions({ inheritAttrs: false })
</script>

<template>
  <Cropper src="/demo/harbor.svg" alt="The harbor at dusk" :width="640" :height="480" label="Crop the photo" v-bind="$attrs">
    <template #zoom="attributes"><input class="slider" aria-label="Zoom" v-bind="attributes"></template>
  </Cropper>
</template>
