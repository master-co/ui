<script setup lang="ts">
import Dialog from '../../../frameworks/vue/Dialog.vue'

defineOptions({ inheritAttrs: false })
</script>

<template>
  <Dialog id="delete-project" aria-labelledby="delete-project-title" v-bind="$attrs">
    <template #trigger="attributes"><button type="button" class="btn" v-bind="attributes">Delete project</button></template>
    <header class="dialog-header">
      <h2 class="dialog-title" id="delete-project-title">Delete this project?</h2>
      <p class="dialog-description">Atlas and its 14 deployments are removed.</p>
    </header>
    <footer class="dialog-footer">
      <button type="button" class="btn" commandfor="delete-project" command="close">Cancel</button>
      <button type="button" class="btn btn-primary" commandfor="delete-project" command="close">Delete project</button>
    </footer>
  </Dialog>
</template>
