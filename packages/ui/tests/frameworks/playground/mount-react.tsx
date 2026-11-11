import { createElement, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { fixtures, toast } from '../react/fixtures.tsx'

/** The owner of an example: it keeps the value the component gives out and hands it back, as an application does. */
function Owner({ name, props }: { name: string, props: Record<string, unknown> }) {
  const [value, setValue] = useState(props.value)
  const { style, onValueChange, ...rest } = props as Record<string, unknown> & { onValueChange?: (value: unknown) => void }
  // React takes a style as an object; the examples give it as a declaration.
  const declared = typeof style === 'string' ? Object.fromEntries(style.split(';').filter(Boolean).map(pair => pair.split(':').map(part => part.trim()))) : undefined
  const owned = 'value' in props ? { value, onValueChange: (next: unknown) => { setValue(next); onValueChange?.(next) } } : {}
  return createElement(fixtures[name], { ...rest, ...owned, style: declared })
}

export function mount(name: string, target: HTMLElement, props: Record<string, unknown>) {
  createRoot(target).render(createElement(Owner, { name, props }))
}

export { toast }
