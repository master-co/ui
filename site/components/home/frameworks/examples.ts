/**
 * The same two things in each framework's own idiom: a card with a switch, which is markup and stays markup,
 * and a stepper, a framework component copied by `master-ui add`. The markup passes `master-ui check` in all
 * three, and the stepper's props are the ones its source in `packages/ui/frameworks` declares.
 */
export type Language = 'tsx' | 'svelte' | 'vue'

export interface FrameworkExample {
  id: 'react' | 'svelte' | 'vue'
  title: string
  language: Language
  /** The helper `master-ui add` copies beside every component of the framework. */
  helper: string
  markup: { file: string, code: string, note: string }
  component: { file: string, code: string, note: string }
}

export const frameworkExamples: FrameworkExample[] = [
  {
    id: 'react',
    title: 'React',
    language: 'tsx',
    helper: 'use-behavior.ts',
    markup: {
      file: 'ProjectCard.tsx',
      note: 'A Server Component: no ‘use client’',
      code: `import type { Project } from './project'

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="card">
      <header className="card-header">
        <h3 className="card-title">{project.name}</h3>
        <p className="card-description">{project.domain}</p>
      </header>
      <label className="check">
        <input type="checkbox" role="switch" className="switch"
          name="alerts" defaultChecked={project.alerts} />
        Deploy alerts
      </label>
    </article>
  )
}`,
    },
    component: {
      file: 'Seats.tsx',
      note: 'A client component: it owns the value',
      code: `'use client'
import { useState } from 'react'
import { Stepper } from './ui/stepper'

export function Seats() {
  const [seats, setSeats] = useState<number | null>(5)
  return (
    <Stepper value={seats} onValueChange={setSeats}
      min={1} max={50} aria-label="Seats"
      decrementLabel="Remove a seat" incrementLabel="Add a seat" />
  )
}`,
    },
  },
  {
    id: 'svelte',
    title: 'Svelte',
    language: 'svelte',
    helper: 'behavior.svelte.ts',
    markup: {
      file: 'ProjectCard.svelte',
      note: 'Plain markup: the library adds no script',
      code: `<script lang="ts">
  import type { Project } from './project'

  let { project }: { project: Project } = $props()
</script>

<article class="card">
  <header class="card-header">
    <h3 class="card-title">{project.name}</h3>
    <p class="card-description">{project.domain}</p>
  </header>
  <label class="check">
    <input type="checkbox" role="switch" class="switch"
      name="alerts" checked={project.alerts} />
    Deploy alerts
  </label>
</article>`,
    },
    component: {
      file: 'Seats.svelte',
      note: 'The value binds both ways with bind:value',
      code: `<script lang="ts">
  import Stepper from './ui/Stepper.svelte'

  let seats = $state<number | null>(5)
</script>

<Stepper bind:value={seats}
  min={1} max={50} aria-label="Seats"
  decrementLabel="Remove a seat" incrementLabel="Add a seat" />`,
    },
  },
  {
    id: 'vue',
    title: 'Vue',
    language: 'vue',
    helper: 'use-behavior.ts',
    markup: {
      file: 'ProjectCard.vue',
      note: 'Plain markup: the library adds no script',
      code: `<script setup lang="ts">
import type { Project } from './project'

defineProps<{ project: Project }>()
</script>

<template>
  <article class="card">
    <header class="card-header">
      <h3 class="card-title">{{ project.name }}</h3>
      <p class="card-description">{{ project.domain }}</p>
    </header>
    <label class="check">
      <input type="checkbox" role="switch" class="switch"
        name="alerts" :checked="project.alerts">
      Deploy alerts
    </label>
  </article>
</template>`,
    },
    component: {
      file: 'Seats.vue',
      note: 'The value binds both ways with v-model',
      code: `<script setup lang="ts">
import { ref } from 'vue'
import Stepper from './ui/Stepper.vue'

const seats = ref<number | null>(5)
</script>

<template>
  <Stepper v-model="seats"
    :min="1" :max="50" aria-label="Seats"
    decrement-label="Remove a seat" increment-label="Add a seat" />
</template>`,
    },
  },
]
