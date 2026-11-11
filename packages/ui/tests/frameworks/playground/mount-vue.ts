import { createApp, h, reactive } from 'vue'
import { fixtures, toast } from '../vue/fixtures.ts'

/** The owner of an example: it keeps the value the component gives out and hands it back, as `v-model` does. */
export function mount(name: string, target: HTMLElement, props: Record<string, unknown>) {
  const { value, onValueChange, onOpenChange, ...rest } = props as Record<string, unknown> & { onValueChange?: (value: unknown) => void, onOpenChange?: (open: boolean) => void }
  const state = reactive({ value })
  const app = createApp({
    render: () => h(fixtures[name], {
      ...rest,
      ...('value' in props ? { 'modelValue': state.value, 'onUpdate:modelValue': (next: unknown) => { state.value = next; onValueChange?.(next) } } : {}),
      ...(onOpenChange ? { 'onUpdate:open': onOpenChange } : {}),
    }),
  })
  // `useId()` is unique within an app. Each example is an app of its own, so each gets a prefix.
  app.config.idPrefix = name
  app.mount(target)
}

export { toast }
