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
  'avatar': { src: '/people/ada.jpg', alt: 'Ada Lovelace', initials: 'AL' },
  'carousel': {},
  'chart': { type: 'line', label: 'Requests per day', labels: ['Mon', 'Tue'], series: [{ name: 'Production', values: [42, 58] }, { name: 'Preview', values: [12, 31] }] },
  'gradient': {},
  'color-picker-popover': { value: '#3b82f6', label: 'Accent color' },
  'command': { items: [{ label: 'New project', group: 'Suggestions' }], searchLabel: 'Search commands', listLabel: 'Commands', 'aria-label': 'Command palette' },
  'compare': { label: 'Show more of the second picture' },
  'dialog': {},
  'dialog-sheet': {},
  'field': { label: 'Work email', hint: 'We only send receipts.' },
  'listbox': { options: [{ value: 'hnd', label: 'Tokyo' }], value: 'hnd', 'aria-label': 'Region' },
  'log': { rows: ['Cloning master-co/ui'], latestLabel: 'Jump to latest', 'aria-label': 'Build log' },
  'menu': { items: [{ label: 'Rename' }, { separator: true }, { label: 'Settings', href: '#settings' }], 'aria-label': 'Project' },
  'player': { src: '/demo/recording.m4a', label: 'A short recording', time: 65 },
  'popover': {},
  'schedule': { events: [{ id: 'standup', title: 'Standup', start: '2026-11-13T09:00', end: '2026-11-13T09:15' }], today: '2026-11-13', locale: 'en-US', weekStart: 1 },
  'stepper': { value: 4, decrementLabel: 'Fewer seats', incrementLabel: 'More seats', 'aria-label': 'Seats' },
  'toast': {},
  'toolbar': {},
  'tooltip': {},
  'tour': { spotlight: true },
  'transcript': { cues: [{ start: 0.3, text: 'This is a short recording.' }] },
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
