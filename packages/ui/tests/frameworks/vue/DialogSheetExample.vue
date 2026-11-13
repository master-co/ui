<script setup lang="ts">
import Dialog from '../../../frameworks/vue/Dialog.vue'

defineOptions({ inheritAttrs: false })
</script>

<!-- A sheet the reader swipes: the track holds the panel, and the handle moves it between half and full height. -->
<template>
  <Dialog id="comments" class="dialog-sheet dialog-swipe dialog-detents" aria-labelledby="comments-title" v-bind="$attrs">
    <template #trigger="attributes"><button type="button" class="btn" v-bind="attributes">Comments</button></template>
    <div class="dialog-panel">
      <button type="button" class="dialog-handle" aria-label="Sheet height"></button>
      <header class="dialog-header">
        <h2 class="dialog-title" id="comments-title">Comments</h2>
        <p class="dialog-description">Three people reviewed this deployment.</p>
      </header>
      <div class="dialog-body">
        <p>Ada: the build on main is green again.</p>
      </div>
    </div>
  </Dialog>
</template>
