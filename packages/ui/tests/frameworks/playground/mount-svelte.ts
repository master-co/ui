import { mount as render, type Component } from 'svelte'
import { fixtures as shared, toast } from '../svelte/fixtures.ts'
import Owner from './Owner.svelte'

const fixtures = shared as unknown as Record<string, Component<Record<string, unknown>>>

export function mount(name: string, target: HTMLElement, props: Record<string, unknown>) {
  render(Owner, { target, props: { component: fixtures[name], props } })
}

export { toast }
