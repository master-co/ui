<script setup lang="ts">
import Field from '../../../frameworks/vue/Field.vue'

defineOptions({ inheritAttrs: false })
defineProps<{ label: string }>()
</script>

<template>
  <Field :label="label" v-bind="$attrs" v-slot="control">
    <input class="input" type="email" v-bind="control">
  </Field>
</template>
