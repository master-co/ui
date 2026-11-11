import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from '../behaviors/dom.ts'
import { scenarios, type Driver } from './scenarios.ts'
import { build } from './svelte/compile.ts'
import { first } from './svelte/first.ts'

/**
 * The scenarios, with Svelte rendering. Run with `--conditions=browser`, which selects Svelte's client
 * runtime. The runtime keeps the document it first meets, and a compiled component the template it first
 * wrote there, so one document stands before Svelte loads and every scenario is mounted in it.
 */
process.env.NODE_ENV ??= 'development'
const page = dom('')
;(page.window.HTMLElement.prototype as any).scrollTo = function () {}
// Svelte reaches for globals the behaviors do not.
for (const name of ['Text', 'Comment', 'HTMLMediaElement'] as const) Object.defineProperty(globalThis, name, { value: page.window[name], configurable: true, writable: true })
const { flushSync, mount, unmount } = await import('svelte')
const compiled = await build('client')
const { fixtures, toast } = await compiled.load('tests/frameworks/svelte/fixtures.ts')
const Harness = (await compiled.load('tests/frameworks/svelte/Harness.svelte')).default

const settle = () => new Promise(resolve => setTimeout(resolve, 0))
/** Run something that changes state, then let Svelte and the observers settle. */
async function act(run?: () => unknown) {
  await run?.()
  flushSync()
  // A MutationObserver answers after the task; Svelte then renders what it asked for.
  await settle()
  flushSync()
}

/** Run something in the one document, emptied before and after, and say what Svelte or a listener complained of. */
async function watched(run: () => Promise<void>) {
  page.document.body.innerHTML = ''
  page.errors.length = 0
  // Svelte says what it does not like on the console: a binding it cannot write, a mismatch in hydration.
  const complaints: unknown[][] = []
  const { warn, error } = console
  console.warn = console.error = (...parameters: unknown[]) => { complaints.push(parameters) }
  try {
    await run()
  } finally {
    console.warn = warn
    console.error = error
    page.document.body.innerHTML = ''
  }
  assert.deepEqual(page.errors, [], 'a listener threw')
  assert.deepEqual(complaints, [], 'Svelte complained')
}

test('svelte: the components compile without a warning', () => {
  assert.deepEqual(compiled.warnings, [])
})

for (const [name, scenario] of Object.entries(scenarios)) {
  test(`svelte: ${name}`, () => watched(async () => {
    /** What is mounted now, so a scenario that fails leaves nothing behind for the next. */
    const live = new Set<() => void>()
    const driver: Driver = {
      framework: 'svelte',
      async mount(component, props = {}) {
        const container = page.document.createElement('div')
        page.document.body.append(container)
        const app = mount(Harness, { target: container as unknown as Element, props: { component: fixtures[component], initial: props } })
        const remove = () => {
          if (!live.delete(remove)) return
          unmount(app)
          container.remove()
        }
        live.add(remove)
        await act()
        return { set: next => app.set(next), unmount: remove }
      },
      act,
      toast,
    }
    try {
      await scenario(driver, page)
    } finally { live.forEach(remove => remove()) }
  }))
}

/** What only Svelte can get wrong. */
const regions = [{ value: 'hnd', label: 'Tokyo' }, { value: 'sin', label: 'Singapore' }]
const checked = () => page.all('[aria-checked="true"]').map(option => option.getAttribute('data-value'))

/** Mount a component in the one document, run something, and take it away. */
async function mounted(component: any, props: Record<string, unknown>, run: (app: any) => Promise<void>) {
  await watched(async () => {
    const app = mount(component, { target: page.document.body as unknown as Element, props })
    flushSync()
    try {
      await run(app)
    } finally { unmount(app) }
  })
}

test('svelte: a value and an open state that are bound reach the owner, and what it sets is drawn', async () => {
  const Bound = (await compiled.load('tests/frameworks/svelte/BoundExample.svelte')).default
  await mounted(Bound, { options: regions }, async (app) => {
    const output = page.one<HTMLElement>('output')
    const dialog = page.one<HTMLDialogElement>('dialog.dialog')
    assert.equal(output.textContent, 'hnd false')
    await act(() => page.click(page.all('[role="option"]')[1]))
    assert.equal(output.textContent, 'sin false', 'the binding wrote the choice')
    await act(() => app.choose('hnd'))
    assert.deepEqual(checked(), ['hnd'], 'and reads what the owner sets')
    // A browser says `toggle` when its trigger opens a dialog; happy-dom opens it without a word.
    await act(() => { dialog.showModal(); dialog.dispatchEvent(new page.window.Event('toggle')) })
    assert.equal(output.textContent, 'hnd true', 'a dialog the browser opened says so')
    await act(() => dialog.close())
    assert.equal(output.textContent, 'hnd false', 'and so does one it closed')
  })
})

test('svelte: without a value from its owner a component keeps its own, from the first value', async () => {
  const heard: unknown[] = []
  await mounted(fixtures.listbox, { options: regions, value: 'hnd', 'aria-label': 'Region', onValueChange: (value: unknown) => heard.push(value) }, async () => {
    assert.deepEqual(checked(), ['hnd'])
    await act(() => page.click(page.all('[role="option"]')[1]))
    assert.deepEqual(checked(), ['sin'])
    assert.deepEqual(heard, ['sin'])
  })
})

test('svelte: a value or another function among the options does not attach a behavior again; an option does', async () => {
  const heard: unknown[] = []
  const props = { value: '2026-11-13', locale: 'en-GB', weekStart: 1, disabled: () => false, onValueChange: (value: unknown) => heard.push(value) }
  await mounted(Harness, { component: fixtures.calendar, initial: props }, async (app) => {
    const title = () => page.one('.calendar-title').textContent
    const day = (date: string) => page.one<HTMLButtonElement>(`button[value="${date}"]`)
    await act(() => page.click(page.all('.calendar-header button')[1]))
    assert.equal(title(), 'December 2026')
    // Attached again, the calendar would start over from its options and show November.
    await act(() => app.set({ value: '2026-11-13', disabled: (date: Date) => date.getDate() === 15, onValueChange: (value: unknown) => heard.push(value) }))
    assert.equal(title(), 'December 2026', 'the behavior was not attached again')
    await act(() => page.click(day('2026-12-15')))
    assert.deepEqual(heard, [], 'and it asks the function it was given last')
    await act(() => page.click(day('2026-12-16')))
    assert.deepEqual(heard, ['2026-12-16'])
    await act(() => app.set({ value: '2026-12-16', min: '2026-12-10' }))
    assert.equal(day('2026-12-09').disabled, true, 'an option attaches it again')
    assert.deepEqual(page.all<HTMLButtonElement>('[aria-selected="true"]').map(cell => cell.value), ['2026-12-16'], 'with the value it had')
    assert.deepEqual(heard, ['2026-12-16'])
  })
})

test('svelte: the first HTML, rendered on a server, holds the state, and hydrates without a mismatch', async () => {
  const { hydrate } = await import('svelte')
  const { render } = await import('svelte/server')
  const server = await build('server', 'hydration')
  const rendered = (await server.load('tests/frameworks/svelte/fixtures.ts')).fixtures
  const values = (selector: string) => page.all<HTMLInputElement>(selector).map(element => element.value)
  /** What the page holds once the behavior is attached to the server's HTML: the same state. */
  const held: Record<string, [() => unknown, unknown]> = {
    'combobox': [() => [...values('[role="combobox"]'), ...checked()], ['Singapore', 'sin']],
    'calendar': [() => values('[aria-selected="true"]'), ['2026-11-13']],
    'tabs': [() => page.all<HTMLElement>('[role="tabpanel"]').filter(panel => !panel.hidden).map(panel => panel.textContent?.trim()), ['Panel B']],
    'splitter': [() => page.one<HTMLElement>('.splitter').style.getPropertyValue('--splitter-size'), '36%'],
    'wheel': [() => page.all('[aria-selected="true"]').map(option => option.getAttribute('data-value')), ['10']],
    'otp': [() => values('.otp-slot'), ['4', '8', '', '']],
    'context-menu': [() => page.all('.menu.menu-context').length, 1],
  }
  for (const [name, props, expected] of first) {
    const [state, after] = held[name]
    const html = render(rendered[name], { props }).body
    assert.match(html, expected, `${name}: the server's HTML`)
    await watched(async () => {
      page.document.body.innerHTML = html
      const elements = page.all('*')
      const text = page.document.body.textContent
      const app = hydrate(fixtures[name], { target: page.document.body as unknown as Element, props })
      flushSync()
      await settle()
      // Svelte mends a page that differs from what it renders, often without a word: none was mended.
      assert.ok(page.all('*').length === elements.length && page.all('*').every((element, at) => element === elements[at]), `${name}: hydration kept the server's elements`)
      assert.equal(page.document.body.textContent, text, `${name}: hydration kept the server's text`)
      assert.deepEqual(state(), after, `${name}: the state after hydration`)
      unmount(app)
    })
  }
})
