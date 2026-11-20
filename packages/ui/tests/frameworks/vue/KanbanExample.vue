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
            <button v-bind="move"><svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.2559 2.3817A0.4996 0.4996 0 0 0 4.1667 2.6667L4.1673 13.3578A0.5 0.5 0 0 0 5.1613 13.4067L5.1667 13.3333L5.1653 2.6288A0.5007 0.5007 0 0 0 5.0775 2.3817A0.7044 0.7044 0 0 0 4.2559 2.3817Z" fill="currentColor" stroke="none" fill-rule="evenodd" transform="rotate(90 8 8)" /><path d="M2.3333 5L4.5253 2.8081A0.2 0.2 0 0 1 4.8081 2.8081L7 5" transform="rotate(90 8 8)" /><path d="M11.8333 13.3333L11.8327 2.6422A0.5 0.5 0 0 0 10.8387 2.5933L10.8333 2.6667L10.8347 13.3712A0.5007 0.5007 0 0 0 10.9225 13.6183A0.7044 0.7044 0 0 0 11.7441 13.6183A0.4996 0.4996 0 0 0 11.8333 13.3333Z" fill="currentColor" stroke="none" fill-rule="evenodd" transform="rotate(90 8 8)" /><path d="M9 11L11.1919 13.1919A0.2 0.2 0 0 0 11.4747 13.1919L13.6667 11" transform="rotate(90 8 8)" /></svg></button>
            <button v-bind="handle"><svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="4" r="1" fill="currentColor" stroke="none" /><circle cx="10" cy="4" r="1" fill="currentColor" stroke="none" /><circle cx="6" cy="8" r="1" fill="currentColor" stroke="none" /><circle cx="10" cy="8" r="1" fill="currentColor" stroke="none" /><circle cx="6" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="10" cy="12" r="1" fill="currentColor" stroke="none" /></svg></button>
          </span>
        </div>
        <input class="input input-sm" :aria-label="`Note on ${item.label}`">
      </div>
    </template>
    <template #empty>Nothing here</template>
  </Kanban>
</template>
