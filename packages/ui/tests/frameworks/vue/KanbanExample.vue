<script setup lang="ts">
import Kanban from '../../../frameworks/vue/Kanban.vue'

defineOptions({ inheritAttrs: false })

const columns = [
  { value: 'todo', label: 'To do' },
  { value: 'doing', label: 'In progress' },
  { value: 'review', label: 'In review' },
  { value: 'done', label: 'Done' },
]
const items = [
  { value: 'brief', label: 'Brief', column: 'todo' },
  { value: 'copy', label: 'Copy', column: 'todo' },
  { value: 'site', label: 'Site', column: 'doing' },
  { value: 'name', label: 'Name', column: 'done' },
]
</script>

<template>
  <Kanban aria-label="Launch" :columns="columns" :items="items" v-bind="$attrs">
    <template #header="{ items: held }">
      <span class="badge">{{ held.length }}</span>
    </template>
    <template #default="{ item, handle, move }">
      <div class="card">
        <div class="card-header">
          <p class="card-title">{{ item.label }}</p>
          <span class="card-action kanban-controls">
            <button v-bind="move" />
            <button v-bind="handle" />
          </span>
        </div>
        <input class="input input-sm" :aria-label="`Note on ${item.label}`">
      </div>
    </template>
    <template #empty>Nothing here</template>
  </Kanban>
</template>
