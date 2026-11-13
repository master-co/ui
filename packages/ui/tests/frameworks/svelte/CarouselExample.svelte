<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import Carousel from '../../../frameworks/svelte/Carousel.svelte'

  type Project = { value: string, name: string, line: string }
  let props: Omit<ComponentProps<typeof Carousel<Project>>, 'children' | 'items' | 'label'> = $props()
  const items: Project[] = [
    { value: 'atlas', name: 'Atlas', line: 'A map of every deployment, live.' },
    { value: 'borealis', name: 'Borealis', line: 'Edge functions close to the reader.' },
    { value: 'cirrus', name: 'Cirrus', line: 'Storage that follows the project.' },
  ]
</script>

<Carousel label="Featured projects" slideClass="card" {items} {...props}>
  {#snippet children(project)}
    <h3 class="card-title">{project.name}</h3>
    <p class="card-description">{project.line}</p>
  {/snippet}
</Carousel>
