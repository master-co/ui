/**
 * A page to try the framework components by hand, in a real browser: happy-dom, where the scenarios run, has
 * no layout, no top layer and no scrolling. Each framework mounts its fixtures with the same props, and each
 * example shows the last value it gave out.
 */
import '../../../dist/base.css'
import '../../../dist/standalone.css'
import { examples, outputs, toasts } from './examples.ts'

const query = new URLSearchParams(location.search)
const only = query.get('only')
if (query.get('scheme')) document.documentElement.style.colorScheme = query.get('scheme')!

type Mount = (name: string, target: HTMLElement, props: Record<string, unknown>) => void
const frameworks: Record<string, () => Promise<{ mount: Mount, toast: (message: Record<string, unknown>) => void }>> = {
  react: () => import('./mount-react.tsx'),
  svelte: () => import('./mount-svelte.ts'),
  vue: () => import('./mount-vue.ts'),
}

for (const [framework, load] of Object.entries(frameworks)) {
  if (only && only !== framework) continue
  const section = document.createElement('section')
  section.dataset.framework = framework
  section.innerHTML = `<h2>${framework}</h2>`
  document.querySelector('main')!.append(section)
  const { mount, toast } = await load()
  for (const [name, props] of Object.entries(examples)) {
    const example = document.createElement('div')
    example.dataset.example = name
    example.innerHTML = '<h3></h3><div></div><output></output>'
    example.querySelector('h3')!.textContent = name
    section.append(example)
    const output = example.querySelector('output')!
    const heard = Object.fromEntries((outputs[name] ?? []).map(output_ => [output_, (value: unknown) => { output.textContent = `${output_}: ${JSON.stringify(value)}` }]))
    mount(name, example.querySelector('div')!, { ...props, ...heard })
    if (name === 'toast') {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'btn'
      button.textContent = 'Show toasts'
      button.addEventListener('click', () => toasts.forEach(toast))
      example.querySelector('div')!.before(button)
    }
  }
}
