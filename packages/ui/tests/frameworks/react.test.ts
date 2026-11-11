import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from '../behaviors/dom.ts'
import { scenarios, type Driver } from './scenarios.ts'

/**
 * The scenarios, with React rendering. React reads the document when it loads, so one stands before it does.
 */
dom('')
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
const { act, createElement } = await import('react')
const { createRoot } = await import('react-dom/client')
const { fixtures, toast } = await import('./react/fixtures.tsx')

for (const [name, scenario] of Object.entries(scenarios)) {
  test(`react: ${name}`, async () => {
    const page = dom('')
    ;(page.window.HTMLElement.prototype as any).scrollTo = function () {}
    // React says what it does not like on the console: a missing key, an update it was not told of.
    const complaints: unknown[][] = []
    const error = console.error
    console.error = (...parameters: unknown[]) => { complaints.push(parameters) }
    const settle = () => new Promise(resolve => setTimeout(resolve, 0))
    const driver: Driver = {
      framework: 'react',
      async mount(component, props = {}) {
        const container = page.document.createElement('div')
        page.document.body.append(container)
        const root = createRoot(container as unknown as Element)
        let current = props
        const render = () => root.render(createElement(fixtures[component], current))
        await act(async () => render())
        await settle()
        return {
          set(next) { current = { ...current, ...next }; render() },
          unmount() { root.unmount(); container.remove() },
        }
      },
      async act(run) {
        await act(async () => { await run?.() })
        // A MutationObserver answers after the task; React then renders what it asked for.
        await settle()
        await act(async () => {})
      },
      toast,
    }
    try {
      await scenario(driver, page)
    } finally { console.error = error }
    assert.deepEqual(page.errors, [], 'a listener threw')
    assert.deepEqual(complaints, [], 'React complained')
  })
}

/** What only React can get wrong. */
const regions = [{ value: 'hnd', label: 'Tokyo' }, { value: 'sin', label: 'Singapore' }]

async function rendered(element: unknown, run: (page: ReturnType<typeof dom>, complaints: unknown[][]) => Promise<void>) {
  const page = dom('<div id="app"></div>')
  const complaints: unknown[][] = []
  const error = console.error
  console.error = (...parameters: unknown[]) => { complaints.push(parameters) }
  const root = createRoot(page.one('#app'))
  try {
    await act(async () => root.render(element as never))
    await run(page, complaints)
    await act(async () => root.unmount())
  } finally { console.error = error }
  assert.deepEqual(page.errors, [])
  assert.deepEqual(complaints, [])
}

test('react: a choice in the combobox reaches onChange of the field, which React would otherwise not hear', async () => {
  const typed: string[] = []
  await rendered(createElement(fixtures.combobox, { options: regions, listLabel: 'Regions', toggleLabel: 'Show regions', 'aria-label': 'Region', onChange: (event: any) => typed.push(event.target.value) }), async (page) => {
    const field = page.one<HTMLInputElement>('[role="combobox"]')
    // Typing as a browser does it: under React's own `value`, then the event.
    const write = Object.getOwnPropertyDescriptor(page.window.HTMLInputElement.prototype, 'value')!.set!
    await act(async () => { write.call(field, 'tok'); field.dispatchEvent(new page.window.Event('input', { bubbles: true })) })
    await act(async () => { page.key(field, 'Enter') })
    assert.deepEqual(typed, ['tok', 'Tokyo'])
  })
})

test('react: in StrictMode, which attaches twice, one behavior answers', async () => {
  const { StrictMode } = await import('react')
  const heard: unknown[] = []
  await rendered(createElement(StrictMode, null, createElement(fixtures.listbox, { options: regions, 'aria-label': 'Region', onValueChange: (value: unknown) => heard.push(value) })), async (page) => {
    await act(async () => { page.click(page.all('[role="option"]')[1]) })
    assert.deepEqual(heard, ['sin'])
  })
})

test('react: without a value from its owner a component keeps its own, from defaultValue', async () => {
  const heard: unknown[] = []
  await rendered(createElement(fixtures.listbox, { options: regions, defaultValue: 'hnd', 'aria-label': 'Region', onValueChange: (value: unknown) => heard.push(value) }), async (page) => {
    assert.deepEqual(page.all('[aria-checked="true"]').map(option => option.getAttribute('data-value')), ['hnd'])
    await act(async () => { page.click(page.all('[role="option"]')[1]) })
    assert.deepEqual(page.all('[aria-checked="true"]').map(option => option.getAttribute('data-value')), ['sin'])
    assert.deepEqual(heard, ['sin'])
  })
})

test('react: an owner that does not take a change gets its value put back', async () => {
  await rendered(createElement(fixtures.listbox, { options: regions, value: 'hnd', 'aria-label': 'Region' }), async (page) => {
    await act(async () => { page.click(page.all('[role="option"]')[1]) })
    assert.deepEqual(page.all('[aria-checked="true"]').map(option => option.getAttribute('data-value')), ['hnd'])
  })
})

test('react: a dialog whose owner keeps it open opens again when the browser closes it', async () => {
  await rendered(createElement(fixtures.dialog, { open: true }), async (page) => {
    const dialog = page.one<HTMLDialogElement>('dialog.dialog')
    assert.equal(dialog.open, true)
    await act(async () => { dialog.close() })
    assert.equal(dialog.open, true)
  })
})

test('react: the first HTML, rendered on a server, holds the state, and hydrates without a mismatch', async () => {
  const { renderToString } = await import('react-dom/server')
  const { hydrateRoot } = await import('react-dom/client')
  const examples: [string, Record<string, unknown>, RegExp][] = [
    ['combobox', { options: regions, value: 'sin', listLabel: 'Regions', toggleLabel: 'Show regions', 'aria-label': 'Region' }, /value="Singapore"[\s\S]*data-value="sin" aria-checked="true"/],
    ['calendar', { value: '2026-11-13', locale: 'en-GB', weekStart: 1 }, /November 2026[\s\S]*value="2026-11-13"/],
    ['tabs', { tabs: [{ value: 'a', label: 'A', content: 'Panel A' }, { value: 'b', label: 'B', content: 'Panel B' }], value: 'b', 'aria-label': 'Account' }, /data-value="b" aria-selected="true"[\s\S]*hidden=""[^>]*>Panel A/],
    ['splitter', { value: 36, label: 'Resize' }, /--splitter-size:36%[\s\S]*aria-valuenow="36"/],
    ['wheel', { columns: [{ label: 'Hour', options: ['09', '10'] }], value: ['10'], 'aria-label': 'Time' }, /data-value="10" aria-selected="true"/],
    ['otp', { length: 4, value: '48', 'aria-label': 'Verification code' }, /value="4"[\s\S]*value="8"/],
    ['tree', { nodes: [{ label: 'a.css', value: 'a' }, { label: 'b.css', value: 'b' }], value: 'b', 'aria-label': 'Files' }, /data-value="b" aria-selected="true"/],
  ]
  for (const [name, props, expected] of examples) {
    const html = renderToString(createElement(fixtures[name], props))
    assert.match(html, expected, `${name}: the server's HTML`)
    const page = dom(`<div id="app">${html}</div>`)
    ;(page.window.HTMLElement.prototype as any).scrollTo = function () {}
    const complaints: unknown[][] = []
    const error = console.error
    console.error = (...parameters: unknown[]) => { complaints.push(parameters) }
    try {
      let root: ReturnType<typeof hydrateRoot> | undefined
      await act(async () => { root = hydrateRoot(page.one('#app'), createElement(fixtures[name], props), { onRecoverableError: problem => complaints.push([problem]) }) })
      await new Promise(resolve => setTimeout(resolve, 0))
      await act(async () => root!.unmount())
    } finally { console.error = error }
    assert.deepEqual(complaints, [], `${name}: hydration`)
    assert.deepEqual(page.errors, [], `${name}: a listener threw`)
  }
})
