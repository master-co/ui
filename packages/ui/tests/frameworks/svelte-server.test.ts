import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from './svelte/compile.ts'
import { first } from './svelte/first.ts'

/**
 * The Svelte components as a server renders them. Run without `--conditions=browser`, so Svelte is its
 * server runtime, and with no document: a component that reached for one while it rendered would throw.
 */
process.env.NODE_ENV ??= 'development'
const { render } = await import('svelte/server')
const compiled = await build('server')
const { fixtures, toast } = await compiled.load('tests/frameworks/svelte/fixtures.ts')

test('svelte: the first HTML, rendered on a server, holds the state', () => {
  for (const [name, props, expected] of first) assert.match(render(fixtures[name], { props }).body, expected, `${name}: the server's HTML`)
})

/** The least each of the other fixtures needs. */
const others: Record<string, Record<string, unknown>> = {
  'command': { items: [{ label: 'New project', group: 'Suggestions' }], searchLabel: 'Search commands', listLabel: 'Commands', 'aria-label': 'Command palette' },
  'compare': { label: 'Show more of the second picture' },
  'dialog': {},
  'field': { label: 'Work email', hint: 'We only send receipts.' },
  'listbox': { options: [{ value: 'hnd', label: 'Tokyo' }], value: 'hnd', 'aria-label': 'Region' },
  'menu': { items: [{ label: 'Rename' }, { separator: true }, { label: 'Settings', href: '#settings' }], 'aria-label': 'Project' },
  'popover': {},
  'stepper': { value: 4, decrementLabel: 'Fewer seats', incrementLabel: 'More seats', 'aria-label': 'Seats' },
  'toast': {},
  'tooltip': {},
  'tree': { nodes: [{ label: 'themes', children: [{ label: 'paper.css', value: 'themes/paper.css' }] }], 'aria-label': 'Files' },
}

test('svelte: every fixture renders on a server', () => {
  for (const [name, component] of Object.entries(fixtures)) {
    const props = first.find(([example]) => example === name)?.[1] ?? others[name]
    assert.ok(props, `${name} has no props to render with`)
    assert.match(render(component as never, { props }).body, /<\w/, `${name} renders`)
  }
})

test('svelte: a toast shown on a server is not queued, where every reader would get it', () => {
  toast({ title: 'Deployed to production' })
  assert.doesNotMatch(render(fixtures.toast, { props: {} }).body, /<dialog/)
})
