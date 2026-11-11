import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from '../behaviors/dom.ts'
import { scenarios, type Driver } from './scenarios.ts'
import { compile } from './vue/compile.ts'

/**
 * The scenarios, with Vue rendering. Vue keeps the document it finds when it loads, and every scenario has
 * a page of its own: the document Vue keeps is one that stands for the page of the moment.
 */
let current = dom('')
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  writable: true,
  value: new Proxy({}, {
    get(_, name) {
      const value = Reflect.get(current.document, name)
      return typeof value === 'function' ? value.bind(current.document) : value
    },
  }),
})
const { createApp, createSSRApp, h, nextTick, shallowReactive } = await import('vue')
const compiled = await compile()
const { fixtures, toast } = await import(compiled('tests/frameworks/vue/fixtures.ts'))

/** The scenarios' props, as Vue names them: the value is the model, and a change of it an update. */
const names: Record<string, string> = { value: 'modelValue', onValueChange: 'onUpdate:modelValue', onOpenChange: 'onUpdate:open' }
const translate = (props: Record<string, unknown>) => Object.fromEntries(Object.entries(props).map(([name, value]) => [names[name] ?? name, value]))
const settle = () => new Promise(resolve => setTimeout(resolve, 0))

/** A page, and what Vue said while it was used: a warning, or an error from a hook or a handler. */
function stage(html = '') {
  const page = current = dom(html)
  ;(page.window.HTMLElement.prototype as any).scrollTo = function () {}
  // Vue asks whether the element it mounts in is an SVG one.
  Object.defineProperty(globalThis, 'SVGElement', { value: page.window.SVGElement, configurable: true, writable: true })
  const complaints: unknown[] = []
  const { warn, error } = console
  console.warn = console.error = (...parameters: unknown[]) => { complaints.push(parameters) }
  /** Mount a fixture in an app of its own, with props that can be set again. */
  const mount = (component: string, props: Record<string, unknown> = {}, container?: Element) => {
    const state = shallowReactive(translate(props))
    const app = (container ? createSSRApp : createApp)({ render: () => h(fixtures[component], { ...state }) })
    app.config.warnHandler = (message: string) => { complaints.push(message) }
    app.config.errorHandler = (problem: unknown) => { complaints.push(problem) }
    const host = container ?? page.document.body.appendChild(page.document.createElement('div'))
    app.mount(host as unknown as Element)
    return {
      set(next: Record<string, unknown>) { Object.assign(state, translate(next)) },
      unmount() { app.unmount(); if (!container) host.remove() },
    }
  }
  const restore = () => Object.assign(console, { warn, error })
  const done = () => {
    restore()
    assert.deepEqual(page.errors, [], 'a listener threw')
    assert.deepEqual(complaints, [], 'Vue complained')
  }
  return { page, mount, done, restore }
}

/** Run something that changes state, then let Vue render and the observers answer. */
async function act(run?: () => unknown) {
  await run?.()
  await nextTick()
  // A MutationObserver answers after the task; Vue then renders what it asked for.
  await settle()
  await nextTick()
}

for (const [name, scenario] of Object.entries(scenarios)) {
  test(`vue: ${name}`, async () => {
    const { page, mount, done, restore } = stage()
    const driver: Driver = {
      framework: 'vue',
      async mount(component, props) {
        const mounted = mount(component, props)
        await act()
        return mounted
      },
      act,
      toast,
    }
    try {
      await scenario(driver, page)
    } finally { restore() }
    done()
  })
}

/** What only Vue can get wrong. */
const regions = [{ value: 'hnd', label: 'Tokyo' }, { value: 'sin', label: 'Singapore' }]
const checked = (page: ReturnType<typeof dom>) => page.all('[aria-checked="true"]').map(option => option.getAttribute('data-value'))

async function rendered(component: string, props: Record<string, unknown>, run: (page: ReturnType<typeof dom>, mounted: ReturnType<ReturnType<typeof stage>['mount']>) => Promise<void>) {
  const { page, mount, done, restore } = stage()
  try {
    const mounted = mount(component, props)
    await act()
    await run(page, mounted)
    await act(() => mounted.unmount())
  } finally { restore() }
  done()
}

test('vue: a choice in the combobox reaches a listener on the field, with the text it wrote', async () => {
  const typed: string[] = []
  await rendered('combobox', { options: regions, listLabel: 'Regions', toggleLabel: 'Show regions', 'aria-label': 'Region', onChange: (event: Event) => typed.push((event.target as HTMLInputElement).value) }, async (page) => {
    const field = page.one<HTMLInputElement>('[role="combobox"]')
    await act(() => page.type(field, 'tok'))
    await act(() => page.key(field, 'Enter'))
    assert.deepEqual(typed, ['Tokyo'])
  })
})

test('vue: without a v-model a component keeps its own value, and says each change once', async () => {
  const heard: unknown[] = []
  await rendered('listbox', { options: regions, 'aria-label': 'Region', 'onUpdate:modelValue': (value: unknown) => heard.push(value) }, async (page) => {
    assert.deepEqual(checked(page), [])
    await act(() => page.click(page.all('[role="option"]')[1]))
    assert.deepEqual(checked(page), ['sin'])
    assert.deepEqual(heard, ['sin'])
  })
})

test('vue: an owner that does not take a change gets its value put back', async () => {
  await rendered('listbox', { options: regions, value: 'hnd', 'aria-label': 'Region', onValueChange: () => {} }, async (page) => {
    await act(() => page.click(page.all('[role="option"]')[1]))
    assert.deepEqual(checked(page), ['hnd'])
  })
})

test('vue: rendering again leaves what the behavior holds', async () => {
  await rendered('combobox', { options: regions, value: null, listLabel: 'Regions', toggleLabel: 'Show regions', 'aria-label': 'Region', onValueChange: () => {} }, async (page, mounted) => {
    const field = page.one<HTMLInputElement>('[role="combobox"]')
    await act(() => page.type(field, 'sing'))
    await act(() => mounted.set({ listLabel: 'Every region' }))
    assert.equal(page.one('[role="listbox"]').getAttribute('aria-label'), 'Every region')
    assert.equal(field.value, 'sing', 'what was typed stays')
    assert.equal(field.getAttribute('aria-expanded'), 'true')
  })
  await rendered('splitter', { value: 40, label: 'Resize', onValueChange: () => {} }, async (page, mounted) => {
    const root = page.one<HTMLElement>('.splitter')
    const handle = page.one<HTMLElement>('.splitter-handle')
    await act(() => mounted.set({ value: 30 }))
    // Vue writes a style each time it renders: what it writes is the size the behavior holds.
    const written: string[] = []
    const write = root.style.setProperty
    root.style.setProperty = function (name: string, value: string) { written.push(value); return write.call(this, name, value) }
    await act(() => mounted.set({ label: 'Resize the list', class: 'h:20x' }))
    assert.equal(handle.getAttribute('aria-label'), 'Resize the list')
    assert.equal(root.className, 'splitter h:20x', 'a class of the parent comes after the contract\'s')
    assert.deepEqual([...new Set(written)].filter(value => value !== '30%'), [])
    assert.equal(root.style.getPropertyValue('--splitter-size'), '30%')
    assert.equal(handle.getAttribute('aria-valuenow'), '30')
  })
})

test('vue: rows written again from data are marked from the model, not from the first value', async () => {
  await rendered('listbox', { options: regions, value: 'hnd', 'aria-label': 'Region', onValueChange: () => {} }, async (page, mounted) => {
    await act(() => mounted.set({ value: 'sin' }))
    await act(() => mounted.set({ options: [{ value: 'zrh', label: 'Zurich' }] }))
    await act(() => mounted.set({ options: regions }))
    assert.deepEqual(checked(page), ['sin'])
  })
})

test('vue: a function among the options does not attach the behavior again', async () => {
  await rendered('calendar', { value: '2026-11-13', locale: 'en-GB', disabled: () => false }, async (page, mounted) => {
    await act(() => page.click(page.all<HTMLButtonElement>('.calendar-header button')[1]))
    assert.equal(page.one('.calendar-title').textContent, 'December 2026')
    // Attached again, the calendar would go back to the month of its value.
    await act(() => mounted.set({ disabled: (date: Date) => date.getDate() === 25 }))
    assert.equal(page.one('.calendar-title').textContent, 'December 2026')
    assert.equal(page.one<HTMLButtonElement>('button[value="2026-12-25"]').disabled, true, 'and the latest function is the one asked')
  })
})

test('vue: a dialog whose owner keeps it open opens again when the browser closes it', async () => {
  await rendered('dialog', { open: true, onOpenChange: () => {} }, async (page) => {
    const dialog = page.one<HTMLDialogElement>('dialog.dialog')
    assert.equal(dialog.open, true)
    await act(() => dialog.close())
    assert.equal(dialog.open, true)
  })
})

test('vue: the first HTML, rendered on a server, holds the state, and hydrates without a mismatch', async () => {
  const { renderToString } = await import('vue/server-renderer')
  const examples: [string, Record<string, unknown>, RegExp][] = [
    ['combobox', { options: regions, value: 'sin', listLabel: 'Regions', toggleLabel: 'Show regions', 'aria-label': 'Region' }, /value="Singapore"[\s\S]*data-value="sin" aria-checked="true"/],
    ['calendar', { value: '2026-11-13', locale: 'en-GB', weekStart: 1 }, /November 2026[\s\S]*value="2026-11-13"/],
    ['tabs', { tabs: [{ value: 'a', label: 'A', content: 'Panel A' }, { value: 'b', label: 'B', content: 'Panel B' }], value: 'b', 'aria-label': 'Account' }, /data-value="b" aria-selected="true"[\s\S]* hidden>(<!--\[-->)?Panel A/],
    ['splitter', { value: 36, label: 'Resize', style: 'height:20rem' }, /--splitter-size:36%;height:20rem[\s\S]*aria-valuenow="36"/],
    ['wheel', { columns: [{ label: 'Hour', options: ['09', '10'] }], value: ['10'], 'aria-label': 'Time' }, /data-value="10" aria-selected="true"/],
    ['otp', { length: 4, value: '48', 'aria-label': 'Verification code' }, /value="4"[\s\S]*value="8"/],
  ]
  for (const [name, props, expected] of examples) {
    const html = await renderToString(createSSRApp({ render: () => h(fixtures[name], translate(props)) }))
    assert.match(html, expected, `${name}: the server's HTML`)
    const { page, mount, done, restore } = stage(`<div id="app">${html}</div>`)
    try {
      const mounted = mount(name, props, page.one('#app'))
      await act()
      await act(() => mounted.unmount())
    } finally { restore() }
    done()
  }

  // A toast that waits is not the server's to write: it shows once the page has mounted.
  const dismiss = toast('Saved.')
  const html = await renderToString(createSSRApp({ render: () => h(fixtures.toast) }))
  assert.doesNotMatch(html, /<dialog/)
  const { page, mount, done, restore } = stage(`<div id="app">${html}</div>`)
  try {
    const mounted = mount('toast', {}, page.one('#app'))
    await act()
    assert.equal(page.all('dialog.toast').length, 1)
    await act(dismiss)
    assert.equal(page.all('dialog.toast').length, 0)
    await act(() => mounted.unmount())
  } finally { restore() }
  done()
})
