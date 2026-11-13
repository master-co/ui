import assert from 'node:assert/strict'
import { check, createIndex } from '../../check/index.js'
import { contracts, utilities } from '../support.ts'
import { dom } from '../behaviors/dom.ts'

/**
 * One set of scenarios for every framework. A framework component renders the contract's markup, gives the
 * behavior a root and passes a value in and out; nothing else. So the same scenario holds whichever
 * framework rendered it: the markup satisfies the contracts, the keys do what the behavior's own tests say,
 * a value comes out when the reader changes it and goes in when the owner sets it.
 *
 * A driver mounts a component by name with neutral props: `value`, `onValueChange`, `open`, `onOpenChange`
 * and the component's own. Where a component takes markup of the page's (a trigger, panes, a control), the
 * driver mounts a fixture that supplies it; the fixtures are the usage examples of the documentation.
 */
export interface Mounted {
  /** Render again with these props over the ones it has. */
  set(props: Record<string, unknown>): void
  unmount(): void
}

export interface Driver {
  framework: string
  mount(component: string, props?: Record<string, unknown>): Promise<Mounted>
  /** Run something that changes state, then let the framework and the observers settle. */
  act(run?: () => unknown): Promise<void>
  /** Show a toast with the framework's own `toast()`, and its `toast.promise()`. */
  toast: Toasts
}

interface ToastHandle {
  update(message: Record<string, unknown> | string): void
  dismiss(): void
}
type Toasts = ((message: Record<string, unknown> | string) => ToastHandle) & {
  promise<T>(promise: Promise<T>, messages: Record<string, unknown>): Promise<T>
}

type Page = ReturnType<typeof dom>
export type Scenario = (driver: Driver, page: Page) => Promise<void>

const index = createIndex(contracts())

/** The markup a component rendered satisfies the contracts, with no class that is in none of them. */
function conforms(page: Page) {
  const preset = utilities('library')
  try {
    const known = (name: string) => index.classes.has(name) || preset.has(name)
    assert.deepEqual(check(page.document.body.innerHTML, index, { knows: known, strict: true }), [])
  } finally { preset.dispose() }
}

/** Mount with a value its owner keeps: every change is recorded and given back, as an application does. */
async function owned(driver: Driver, component: string, props: Record<string, unknown>, name = 'value', handler = 'onValueChange') {
  const heard: unknown[] = []
  let mounted: Mounted | undefined
  mounted = await driver.mount(component, { ...props, [handler]: (next: unknown) => { heard.push(next); mounted?.set({ [name]: next }) } })
  return { mounted, heard }
}

const regions = [
  { value: 'hnd', label: 'Tokyo' },
  { value: 'sin', label: 'Singapore' },
  { value: 'fra', label: 'Frankfurt', description: 'Germany' },
]

const files = [
  { label: 'components', value: 'components', open: true, children: [{ label: 'button.css', value: 'button' }, { label: 'input.css', value: 'input' }] },
  { label: 'README.md', value: 'readme' },
]

/** A tree where any number of rows are selected: the value is the list of them. */
async function treeSeveral(driver: Driver, page: Page) {
  const { mounted, heard } = await owned(driver, 'tree', { nodes: files, multiple: true, value: ['input'], 'aria-label': 'Files' })
  conforms(page)
  const row = (value: string) => page.one<HTMLElement>(`.tree-item[data-value="${value}"]`)
  const selected = () => page.all('.tree-item[aria-selected="true"]').map(item => item.getAttribute('data-value'))
  assert.equal(page.one('.tree').getAttribute('aria-multiselectable'), 'true')
  assert.deepEqual(selected(), ['input'], 'the value is drawn from the first render')
  assert.equal(row('button').getAttribute('aria-selected'), 'false', 'a row that can be selected says when it is not')

  await driver.act(() => page.click(row('button'), { ctrlKey: true }))
  assert.deepEqual(heard, [['button', 'input']], 'Control with a click selects one more')
  await driver.act(() => { row('button').focus(); page.key(row('button'), 'a', { ctrlKey: true }) })
  assert.deepEqual(heard.at(-1), ['button', 'input', 'readme'], 'Control with A selects every row')
  await driver.act(() => page.click(row('readme')))
  assert.deepEqual(heard.at(-1), ['readme'], 'a click selects one row alone')

  await driver.act(() => mounted.set({ value: ['button'] }))
  assert.deepEqual(selected(), ['button'])
  assert.equal(heard.length, 3, 'a value set from outside is not said back')
  await driver.act(() => mounted.unmount())
}

/** A checkbox tree: a branch says what its rows say, and the value is the checked leaves. */
async function treeChecks(driver: Driver, page: Page) {
  const { mounted, heard } = await owned(driver, 'tree', { nodes: files, checkable: true, value: ['button'], 'aria-label': 'Files' })
  conforms(page)
  const row = (value: string) => page.one<HTMLElement>(`.tree-item[data-value="${value}"]`)
  const state = () => page.all('.tree-item').map(item => `${item.getAttribute('data-value')}:${item.getAttribute('aria-checked')}`)
  assert.equal(page.all('.tree-item .tree-check').length, 4, 'every row has a check')
  assert.deepEqual(state(), ['components:mixed', 'button:true', 'input:false', 'readme:false'], 'the branch is mixed from the first render')

  await driver.act(() => { row('components').focus(); page.key(row('components'), ' ') })
  assert.deepEqual(heard, [['button', 'input']], 'checking a branch checks its rows, and the value is the leaves')
  assert.deepEqual(state(), ['components:true', 'button:true', 'input:true', 'readme:false'])
  await driver.act(() => page.click(row('input')))
  assert.deepEqual(heard.at(-1), ['button'])
  assert.equal(row('components').getAttribute('aria-checked'), 'mixed')

  await driver.act(() => mounted.set({ value: ['input', 'readme'] }))
  assert.deepEqual(state(), ['components:mixed', 'button:false', 'input:true', 'readme:true'])
  assert.equal(heard.length, 2)
  await driver.act(() => mounted.unmount())
}

/** A branch whose rows come later, and a row renamed in place: the owner hears both and writes the rows. */
async function treeLater(driver: Driver, page: Page) {
  const expanded: string[] = []
  const renamed: [string, string][] = []
  const notes = { label: 'notes.md', value: 'notes' }
  const mounted = await driver.mount('tree', {
    nodes: [{ label: 'remote', value: 'remote', children: [] }, notes],
    'aria-label': 'Files',
    onExpand: (value: string) => expanded.push(value),
    onRename: (value: string, label: string) => renamed.push([value, label]),
  })
  conforms(page)
  const row = (value: string) => page.one<HTMLElement>(`.tree-item[data-value="${value}"]`)
  assert.ok(row('remote').querySelector('.spinner'), 'a branch whose rows come later holds a spinner')

  await driver.act(() => { row('remote').focus(); page.key(row('remote'), 'ArrowRight') })
  assert.deepEqual(expanded, ['remote'], 'the owner hears the branch open')
  assert.equal(row('remote').getAttribute('aria-busy'), 'true')
  await driver.act(() => mounted.set({ nodes: [{ label: 'remote', value: 'remote', children: [{ label: 'origin', value: 'origin' }] }, notes] }))
  assert.equal(row('remote').hasAttribute('aria-busy'), false, 'the rows arrived')
  assert.equal(row('origin').getAttribute('tabindex'), '-1')
  await driver.act(() => page.key(row('remote'), 'ArrowRight'))
  assert.equal(page.document.activeElement, row('origin'), 'the keys reach the rows at once')

  await driver.act(() => { row('notes').focus(); page.key(row('notes'), 'F2') })
  const field = page.one<HTMLInputElement>('.tree .editable-field')
  assert.equal(page.document.activeElement, field)
  await driver.act(() => page.type(field, 'todo.md'))
  await driver.act(() => page.key(field, 'Enter'))
  assert.deepEqual(renamed, [['notes', 'todo.md']], 'the owner hears the value and the new label')
  assert.equal(page.document.activeElement, row('notes'), 'focus returns to the row')
  await driver.act(() => mounted.set({ nodes: [{ label: 'remote', value: 'remote', children: [{ label: 'origin', value: 'origin' }] }, { label: 'todo.md', value: 'notes' }] }))
  assert.equal(row('notes').querySelector('.tree-label')?.textContent, 'todo.md', 'the owner keeps the label')
  conforms(page)
  await driver.act(() => mounted.unmount())
}

/** A sprint in days: a done phase, the current one, one that is read only and a milestone. */
const plan = [
  { id: 'research', label: 'Research', start: 0, end: 3, progress: 100 },
  { id: 'design', label: 'Design', start: 2, end: 6, current: true },
  { id: 'build', label: 'Build', start: 4, end: 8, readOnly: true },
  { id: 'launch', label: 'Launch', start: 8 },
]

/** The combobox with several values: chips in the field, which the framework writes from the value. */
async function comboboxSeveral(driver: Driver, page: Page) {
  const { mounted, heard } = await owned(driver, 'combobox', { options: regions, value: ['hnd'], multiple: true, name: 'regions', listLabel: 'Regions', toggleLabel: 'Show regions', 'aria-label': 'Regions' })
  conforms(page)
  const field = page.one<HTMLInputElement>('[role="combobox"]')
  const chips = () => page.all('.chip').map(chip => chip.getAttribute('data-value'))
  assert.equal(page.one('[role="listbox"]').getAttribute('aria-multiselectable'), 'true')
  assert.ok(page.one('.input-group').classList.contains('input-group-wrap'))
  assert.deepEqual(chips(), ['hnd'], 'the value is drawn from the first render')
  assert.equal(field.value, '')

  await driver.act(() => page.type(field, 'frank'))
  await driver.act(() => page.key(field, 'Enter'))
  assert.deepEqual(heard, [['hnd', 'fra']], 'the chosen value comes out')
  assert.deepEqual(chips(), ['hnd', 'fra'], 'the framework writes its chip')
  assert.equal(page.one('.chip[data-value="fra"]').firstChild?.textContent?.trim(), 'Frankfurt', 'a chip says the label, without the description')
  assert.deepEqual(page.all<HTMLInputElement>('.chip input[type="hidden"]').map(input => input.value), ['hnd', 'fra'])
  assert.equal(field.value, '')

  await driver.act(() => page.click(page.one('.chip[data-value="hnd"] .chip-remove')))
  assert.deepEqual(heard.at(-1), ['fra'], 'a chip removed takes its value away')
  assert.deepEqual(chips(), ['fra'])

  await driver.act(() => mounted.set({ value: ['sin'] }))
  assert.deepEqual(chips(), ['sin'], 'a value set by the owner is written')
  assert.deepEqual(page.all('[aria-checked="true"]').map(option => option.getAttribute('data-value')), ['sin'])
  assert.equal(heard.length, 2, 'and says nothing')
  conforms(page)
  await driver.act(() => mounted.unmount())
}

const continents = [
  { value: 'hnd', label: 'Tokyo', group: 'Asia' },
  { value: 'fra', label: 'Frankfurt', group: 'Europe' },
  { value: 'sin', label: 'Singapore', group: 'Asia' },
]

/** Each group is a role="group" labelled by its caption, and holds the options of that group in their order. */
function assertGroups(page: Page, captions: string[], values: string[][]) {
  const groups = page.all('.listbox-group')
  assert.deepEqual(groups.map(group => group.getAttribute('role')), captions.map(() => 'group'))
  assert.deepEqual(groups.map(group => page.document.getElementById(group.getAttribute('aria-labelledby') ?? '')?.textContent), captions, 'a group is named by its caption')
  assert.deepEqual(groups.map(group => group.querySelector('.listbox-label')?.textContent), captions, 'the caption stands in its group')
  assert.deepEqual(groups.map(group => [...group.querySelectorAll('[role="option"]')].map(option => option.getAttribute('data-value'))), values, 'options of one group are written together')
}

export const scenarios: Record<string, Scenario> = {
  async combobox(driver, page) {
    const { mounted, heard } = await owned(driver, 'combobox', { options: regions, value: null, listLabel: 'Regions', toggleLabel: 'Show regions', empty: 'No regions match.', 'aria-label': 'Region' })
    conforms(page)
    const field = page.one<HTMLInputElement>('[role="combobox"]')
    assert.equal(field.getAttribute('aria-controls'), page.one('[role="listbox"]').id, 'the field names its list')
    assert.equal(page.all('[role="option"]').length, 3)

    await driver.act(() => page.type(field, 'sing'))
    assert.deepEqual(page.all('[role="option"]').map(option => option.hidden), [true, false, true], 'typing filters')
    await driver.act(() => page.key(field, 'Enter'))
    assert.deepEqual(heard, ['sin'], 'the chosen value comes out')
    assert.equal(field.value, 'Singapore')

    await driver.act(() => page.type(field, 'Singap'))
    assert.deepEqual(heard, ['sin', null], 'typing over the chosen value takes it away')

    await driver.act(() => mounted.set({ value: 'fra' }))
    assert.equal(field.value, 'Frankfurt', 'a value set by the owner is written, without the description')
    assert.deepEqual(page.all('[aria-checked="true"]').map(option => option.getAttribute('data-value')), ['fra'])
    assert.deepEqual(heard, ['sin', null], 'and says nothing')

    // The owner searches itself: the options are the matches, and arrive after the typing.
    await driver.act(() => mounted.set({ filter: false, value: null }))
    await driver.act(() => page.type(field, 'zur'))
    await driver.act(() => mounted.set({ options: [{ value: 'zrh', label: 'Zurich' }] }))
    const [zurich] = page.all('[role="option"]')
    assert.equal(zurich.hidden, false)
    assert.equal(field.getAttribute('aria-activedescendant'), zurich.id, 'options that arrive get an active option')
    await driver.act(() => page.key(field, 'Enter'))
    assert.equal(heard.at(-1), 'zrh')

    await driver.act(() => mounted.unmount())
    assert.equal(page.all('.combobox').length, 0)

    // Options with a group are written under its caption, and filter and choose as any other.
    const grouped = await owned(driver, 'combobox', { options: continents, value: null, listLabel: 'Regions', toggleLabel: 'Show regions', 'aria-label': 'Region' })
    conforms(page)
    assertGroups(page, ['Asia', 'Europe'], [['hnd', 'sin'], ['fra']])
    const search = page.one<HTMLInputElement>('[role="combobox"]')
    await driver.act(() => page.type(search, 'frank'))
    assert.deepEqual(page.all('[role="option"]').map(option => option.hidden), [true, true, false])
    await driver.act(() => page.key(search, 'Enter'))
    assert.deepEqual(grouped.heard, ['fra'])
    await driver.act(() => grouped.mounted.unmount())

    // The query is the text in the field, apart from the value: it comes out as the reader types and
    // chooses, and a query the owner gives is written and filters, as typing does.
    const queries: string[] = []
    const asked = await owned(driver, 'combobox', { options: regions, value: null, query: 'fra', listLabel: 'Regions', toggleLabel: 'Show regions', 'aria-label': 'Region', onQueryChange: (text: string) => queries.push(text) })
    const text = page.one<HTMLInputElement>('[role="combobox"]')
    const hidden = () => page.all('[role="option"]').map(option => option.hidden)
    assert.equal(text.value, 'fra', 'the first query is the field\'s text')
    assert.deepEqual(hidden(), [true, true, false], 'and the options match it')
    await driver.act(() => page.type(text, 'tok'))
    assert.deepEqual(queries, ['tok'], 'typing says the query')
    assert.deepEqual(asked.heard, [], 'and is not a value')
    await driver.act(() => page.key(text, 'Enter'))
    assert.deepEqual(asked.heard, ['hnd'])
    assert.deepEqual(queries, ['tok', 'Tokyo'], 'choosing writes the label, which is the query after, said once the value is')
    await driver.act(() => asked.mounted.set({ query: 'sin' }))
    assert.equal(text.value, 'sin', 'a query the owner gives is written')
    assert.deepEqual(hidden(), [true, false, true], 'and filters')
    assert.deepEqual(queries, ['tok', 'Tokyo'], 'and is not said back')
    await driver.act(() => asked.mounted.unmount())

    await comboboxSeveral(driver, page)
  },

  async listbox(driver, page) {
    const options = [{ value: 'astro', label: 'Astro' }, { value: 'next', label: 'Next.js' }, { value: 'nuxt', label: 'Nuxt', disabled: true }]
    const { mounted, heard } = await owned(driver, 'listbox', { options, value: 'astro', 'aria-label': 'Framework' })
    conforms(page)
    const root = page.one('.listbox')
    const checked = () => page.all('[aria-checked="true"]').map(option => option.getAttribute('data-value'))
    assert.deepEqual(checked(), ['astro'], 'the value is drawn from the first render')

    await driver.act(() => page.click(page.all('[role="option"]')[1]))
    assert.deepEqual(heard, ['next'])
    assert.deepEqual(checked(), ['next'])
    await driver.act(() => page.click(page.all('[role="option"]')[2]))
    assert.deepEqual(heard, ['next'], 'a disabled option cannot be chosen')

    await driver.act(() => { root.focus(); page.key(root, 'ArrowUp'); page.key(root, 'Enter') })
    assert.deepEqual(heard, ['next', 'astro'], 'the keys choose')

    await driver.act(() => mounted.set({ value: 'next' }))
    assert.deepEqual(checked(), ['next'])
    assert.deepEqual(heard, ['next', 'astro'])
    await driver.act(() => mounted.unmount())

    const several = await owned(driver, 'listbox', { options, value: ['astro'], multiple: true, 'aria-label': 'Frameworks' })
    assert.equal(page.one('.listbox').getAttribute('aria-multiselectable'), 'true')
    await driver.act(() => page.click(page.all('[role="option"]')[1]))
    assert.deepEqual(several.heard, [['astro', 'next']])
    await driver.act(() => several.mounted.unmount())

    // Options with a group are written under its caption; the keys walk from one group into the next.
    const grouped = await owned(driver, 'listbox', { options: continents, value: 'sin', 'aria-label': 'Region' })
    conforms(page)
    assertGroups(page, ['Asia', 'Europe'], [['hnd', 'sin'], ['fra']])
    const list = page.one('.listbox')
    await driver.act(() => { list.focus(); page.key(list, 'ArrowDown'); page.key(list, 'Enter') })
    assert.deepEqual(grouped.heard, ['fra'])
    await driver.act(() => grouped.mounted.unmount())
  },

  async calendar(driver, page) {
    const { mounted, heard } = await owned(driver, 'calendar', { value: '2026-11-13', locale: 'en-GB', weekStart: 1 })
    conforms(page)
    const title = () => page.one('.calendar-title').textContent
    const selected = () => page.all<HTMLButtonElement>('[aria-selected="true"]').map(day => day.value)
    const stop = () => page.one<HTMLButtonElement>('.calendar-day[tabindex="0"]')
    assert.equal(title(), 'November 2026', 'the framework names the month')
    assert.equal(page.all('.calendar-day').length, 42)
    assert.equal(page.one('.calendar-grid').getAttribute('aria-labelledby'), page.one('.calendar-title').id)
    assert.deepEqual(selected(), ['2026-11-13'], 'the behavior marks the days the framework wrote')
    assert.equal(stop().value, '2026-11-13')

    await driver.act(() => { stop().focus(); page.key(stop(), 'PageDown') })
    assert.equal(title(), 'December 2026', 'the behavior asked for the month and the framework wrote it')
    assert.equal(stop().value, '2026-12-13')
    assert.equal(page.document.activeElement, stop(), 'focus follows into the new month')

    await driver.act(() => page.click(page.one('button[value="2026-12-24"]')))
    assert.deepEqual(heard, ['2026-12-24'])
    assert.deepEqual(selected(), ['2026-12-24'])
    assert.equal(title(), 'December 2026', 'the value given back does not turn the month')

    await driver.act(() => mounted.set({ value: '2027-02-02' }))
    assert.equal(title(), 'February 2027', 'a value set by the owner shows its month')
    assert.deepEqual(selected(), ['2027-02-02'])
    assert.deepEqual(heard, ['2026-12-24'])

    await driver.act(() => page.click(page.all<HTMLButtonElement>('.calendar-header button')[0]))
    assert.equal(title(), 'January 2027', 'the header buttons turn the month')
    await driver.act(() => mounted.unmount())

    const range = await owned(driver, 'calendar', { value: null, range: true, month: '2026-11', locale: 'en-GB', weekStart: 1 })
    await driver.act(() => page.click(page.one('button[value="2026-11-28"]')))
    await driver.act(() => page.click(page.one('button[value="2026-12-03"]')))
    assert.deepEqual(range.heard, [['2026-11-28', '2026-12-03']], 'a range comes out once both ends are chosen')
    assert.equal(page.all('.calendar-day-range-start, .calendar-day-range, .calendar-day-range-end').length > 2, true)
    await driver.act(() => range.mounted.unmount())
  },

  async command(driver, page) {
    const ran: string[] = []
    const searched: string[] = []
    const items = [
      { label: 'New project', group: 'Suggestions', onSelect: () => ran.push('new') },
      { label: 'Deploy to production', group: 'Suggestions', onSelect: () => ran.push('deploy') },
      { label: 'Settings', group: 'Go to', href: '#settings' },
    ]
    const { mounted, heard } = await owned(driver, 'command', { items, open: false, shortcut: 'k', searchLabel: 'Search commands', listLabel: 'Commands', empty: 'No commands match.', 'aria-label': 'Command palette', onSearch: (text: string) => searched.push(text) }, 'open', 'onOpenChange')
    conforms(page)
    const dialog = page.one<HTMLDialogElement>('dialog.command')
    const field = page.one<HTMLInputElement>('.command-input')
    assert.equal(page.all('.listbox-group').length, 2, 'commands are grouped under their captions')
    assert.equal(field.getAttribute('aria-activedescendant'), page.all('[role="option"]')[0].id, 'the palette starts with an active option')

    await driver.act(() => mounted.set({ open: true }))
    assert.equal(dialog.open, true, 'open opens the dialog')

    await driver.act(() => page.type(field, 'depl'))
    assert.deepEqual(searched, ['depl'])
    assert.deepEqual(page.all('[role="option"]').map(option => option.hidden), [true, false, true])
    await driver.act(() => page.key(field, 'Enter'))
    assert.deepEqual(ran, ['deploy'], 'Enter runs the active command')
    assert.equal(dialog.open, false, 'and the palette closes')
    assert.deepEqual(heard, [false], 'which its owner hears')

    await driver.act(() => page.key(page.document.body, 'k', { metaKey: true }))
    assert.equal(dialog.open, true, 'the shortcut opens it')
    await driver.act(() => mounted.unmount())
  },

  async otp(driver, page) {
    const complete: string[] = []
    const known: unknown[] = []
    const { mounted, heard } = await owned(driver, 'otp', { length: 4, value: '', 'aria-label': 'Verification code', onComplete: (code: string) => { complete.push(code); known.push(heard.at(-1)) } })
    conforms(page)
    const slots = () => page.all<HTMLInputElement>('.otp-slot')
    assert.equal(slots().length, 4)
    assert.equal(slots()[0].getAttribute('autocomplete'), 'one-time-code')

    await driver.act(() => { slots()[0].focus(); page.type(slots()[0], '4') })
    assert.deepEqual(heard, ['4'])
    assert.equal(page.document.activeElement, slots()[1], 'focus moves on')
    await driver.act(() => page.type(slots()[1], '821'))
    assert.deepEqual(slots().map(slot => slot.value), ['4', '8', '2', '1'], 'several characters spread over the slots')
    assert.equal(heard.at(-1), '4821')
    assert.deepEqual(complete, ['4821'], 'the code comes out once every slot is filled')
    assert.deepEqual(known, ['4821'], 'after its last character has come out as the value')

    await driver.act(() => mounted.set({ value: '90' }))
    assert.deepEqual(slots().map(slot => slot.value), ['9', '0', '', ''])
    await driver.act(() => mounted.unmount())
  },

  async splitter(driver, page) {
    const committed: number[] = []
    const known: unknown[] = []
    const { mounted, heard } = await owned(driver, 'splitter', { value: 40, min: 20, max: 80, label: 'Resize the file list', onValueCommit: (size: number) => { committed.push(size); known.push(heard.at(-1)) } })
    conforms(page)
    const root = page.one<HTMLElement>('.splitter')
    const handle = page.one<HTMLElement>('.splitter-handle')
    assert.equal(root.style.getPropertyValue('--splitter-size'), '40%', 'the size is in the first render')
    assert.equal(handle.getAttribute('aria-valuenow'), '40')
    assert.equal(page.all('.splitter-pane').length, 2)

    await driver.act(() => page.key(handle, 'ArrowRight'))
    assert.deepEqual(heard, [45])
    assert.deepEqual(committed, [45])
    await driver.act(() => page.one('.splitter-pane').dispatchEvent(new page.window.Event('change', { bubbles: true })))
    assert.deepEqual(committed, [45], 'a field in a pane that says change is not the handle')
    await driver.act(() => page.key(handle, 'End'))
    assert.deepEqual(heard, [45, 80], 'it stops at max')
    assert.deepEqual(known, [45, 80], 'a size is committed after it has come out as the value')

    await driver.act(() => mounted.set({ value: 30 }))
    assert.equal(root.style.getPropertyValue('--splitter-size'), '30%')
    assert.equal(handle.getAttribute('aria-valuenow'), '30')
    assert.deepEqual(heard, [45, 80])
    await driver.act(() => mounted.unmount())
  },

  async dial(driver, page) {
    const committed: number[] = []
    const known: unknown[] = []
    const { mounted, heard } = await owned(driver, 'dial', { value: 40, label: 'Volume', name: 'volume', ticks: 10, marks: [{ value: 0 }, { value: 100, label: 'Max' }], text: (value: number) => `${value}%`, onValueCommit: (value: number) => { committed.push(value); known.push(heard.at(-1)) } })
    conforms(page)
    const root = page.one<HTMLElement>('.dial')
    const field = page.one<HTMLInputElement>('input[type="hidden"]')
    const shown = () => page.one('.dial-value').textContent
    assert.equal(root.getAttribute('role'), 'slider')
    assert.equal(root.getAttribute('aria-valuenow'), '40', 'the value is in the first render')
    assert.equal(root.getAttribute('aria-valuetext'), '40%')
    assert.equal(root.style.getPropertyValue('--dial-value'), '40')
    assert.equal(shown(), '40%')
    assert.equal(field.name, 'volume')
    assert.equal(field.value, '40')
    assert.deepEqual(page.all('.dial-mark').map(mark => mark.textContent), ['0', 'Max'], 'the marks are rows from data')

    await driver.act(() => page.key(root, 'ArrowUp'))
    assert.deepEqual(heard, [41])
    assert.deepEqual(committed, [41])
    assert.equal(shown(), '41%')
    assert.equal(field.value, '41', 'the field a form submits follows')
    await driver.act(() => page.key(root, 'End'))
    assert.deepEqual(heard, [41, 100], 'it stops at max')
    assert.deepEqual(known, [41, 100], 'a value is committed after it has come out')

    await driver.act(() => mounted.set({ value: 25 }))
    assert.equal(root.getAttribute('aria-valuenow'), '25')
    assert.equal(root.style.getPropertyValue('--dial-value'), '25')
    assert.equal(shown(), '25%')
    assert.equal(field.value, '25')
    assert.deepEqual(heard, [41, 100], 'and says nothing')
    await driver.act(() => mounted.unmount())
  },

  async stepper(driver, page) {
    const { mounted, heard } = await owned(driver, 'stepper', { value: 4, min: 1, max: 6, decrementLabel: 'Fewer seats', incrementLabel: 'More seats', 'aria-label': 'Seats' })
    conforms(page)
    const field = page.one<HTMLInputElement>('.stepper-field')
    const [fewer, more] = page.all<HTMLButtonElement>('.stepper button')
    assert.equal(field.value, '4')

    await driver.act(() => page.click(more))
    assert.deepEqual(heard, [5])
    assert.equal(field.value, '5')
    await driver.act(() => page.type(field, '2'))
    assert.deepEqual(heard, [5, 2], 'typing comes out too')

    await driver.act(() => mounted.set({ value: 6 }))
    assert.equal(field.value, '6')
    assert.equal(more.disabled, true, 'the button toward the limit follows a value set by the owner')
    assert.equal(fewer.disabled, false)
    await driver.act(() => mounted.unmount())
  },

  async compare(driver, page) {
    const { mounted, heard } = await owned(driver, 'compare', { value: 50, label: 'Show more of the graded picture' })
    conforms(page)
    const root = page.one<HTMLElement>('.compare')
    const range = page.one<HTMLInputElement>('.compare-range')
    assert.equal(page.all('.compare-before, .compare-after').length, 2, 'the pictures are the page\'s own markup')
    assert.equal(range.value, '50')

    await driver.act(() => page.type(range, '80'))
    assert.deepEqual(heard, [80])
    assert.equal(root.style.getPropertyValue('--compare-position'), '80%')

    await driver.act(() => mounted.set({ value: 20 }))
    assert.equal(range.value, '20')
    assert.equal(root.style.getPropertyValue('--compare-position'), '20%')
    await driver.act(() => mounted.unmount())
  },

  async signature(driver, page) {
    const { mounted, heard } = await owned(driver, 'signature', { value: [], label: 'Sign the agreement', name: 'signature', typedName: 'signer', required: true })
    conforms(page)
    const pad = page.one<HTMLElement>('.signature-pad')
    // happy-dom has no layout: the drawing is as large as its viewBox, at the corner of the page.
    page.one<HTMLElement>('.signature-ink').getBoundingClientRect = () => ({ left: 0, top: 0, right: 400, bottom: 160, width: 400, height: 160, x: 0, y: 0 }) as DOMRect
    pad.setPointerCapture = () => {}
    const name = page.one<HTMLInputElement>('.signature-name')
    const field = page.one<HTMLInputElement>('.signature-value')
    assert.equal(field.name, 'signature')
    assert.equal(name.name, 'signer')
    assert.equal(name.required, true, 'without a drawing, the typed name signs')
    assert.deepEqual(page.all('.signature-undo, .signature-clear').map(button => button.getAttribute('aria-disabled')), ['true', 'true'])

    const pen = { pointerId: 1, isPrimary: true, button: 0, pointerType: 'pen', pressure: .5 }
    await driver.act(() => {
      page.pointer(pad, 'pointerdown', { ...pen, clientX: 50, clientY: 80 })
      page.pointer(pad, 'pointermove', { ...pen, clientX: 120, clientY: 90 })
      page.pointer(pad, 'pointerup', { ...pen, clientX: 120, clientY: 90 })
    })
    assert.deepEqual(heard, [[[[50, 80, .5]]], [[[50, 80, .5], [120, 90, .5]]]], 'the stroke comes out as it is drawn')
    assert.equal(page.all('.signature-stroke').length, 1)
    assert.match(field.value, /^<svg /, 'the form gets the drawing')
    assert.equal(name.required, false, 'the drawing signs')

    const two = [[[10, 10, .5], [20, 20, .5]], [[30, 30, .5], [40, 40, .5]]]
    await driver.act(() => mounted.set({ value: two }))
    assert.equal(page.all('.signature-stroke').length, 2, 'a value set by the owner is drawn')
    assert.equal(heard.length, 2, 'and says nothing')
    await driver.act(() => page.click(page.one('.signature-undo')))
    assert.deepEqual(heard.at(-1), [two[0]])
    await driver.act(() => page.click(page.one('.signature-clear')))
    assert.deepEqual(heard.at(-1), [])
    assert.equal(page.all('.signature-stroke').length, 0)
    assert.equal(field.value, '')
    assert.equal(name.required, true)
    await driver.act(() => mounted.unmount())

    // The first value is drawn into the first render, before the behavior attaches.
    const drawn = await driver.mount('signature', { value: two, label: 'Signed' })
    assert.equal(page.all('.signature-stroke').length, 2)
    assert.equal(page.one('.signature-undo').getAttribute('aria-disabled'), null)
    await driver.act(() => drawn.unmount())
  },

  async menu(driver, page) {
    const ran: string[] = []
    const items = [
      { label: 'Rename', shortcut: '⌘R', onSelect: () => ran.push('rename') },
      { label: 'Duplicate', onSelect: () => ran.push('duplicate') },
      { label: 'Settings', href: '#settings' },
      { separator: true },
      { label: 'Delete', danger: true, disabled: true, onSelect: () => ran.push('delete') },
    ]
    const mounted = await driver.mount('menu', { items, 'aria-label': 'Project' })
    conforms(page)
    const menu = page.one<HTMLElement>('.menu')
    const trigger = page.one<HTMLButtonElement>('button.btn')
    assert.equal(trigger.getAttribute('popovertarget'), menu.id, 'the trigger names the menu')
    assert.equal(menu.getAttribute('role'), 'menu')
    assert.equal(page.all('.menu-item').length, 4)
    assert.equal(page.all('.menu-separator').length, 1)

    await driver.act(() => menu.showPopover())
    const rows = page.all<HTMLElement>('.menu-item')
    assert.equal(page.document.activeElement, rows[0], 'focus moves to the first item as the menu opens')
    await driver.act(() => page.key(rows[0], 'ArrowDown'))
    assert.equal(page.document.activeElement, rows[1])
    await driver.act(() => page.key(rows[1], 'End'))
    assert.equal(page.document.activeElement, rows[2], 'a disabled item is passed over')
    await driver.act(() => page.click(rows[1]))
    assert.deepEqual(ran, ['duplicate'])
    await driver.act(() => mounted.unmount())

    // A context menu belongs to an element of the page's.
    const context = await driver.mount('context-menu', { items, 'aria-label': 'Project' })
    conforms(page)
    const opened = page.one<HTMLElement>('.menu.menu-context')
    await driver.act(() => page.one('.sheet').dispatchEvent(new page.window.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 120, clientY: 80 })))
    assert.equal(page.isOpen(opened), true, 'a right click on the target opens it')
    assert.equal(opened.style.getPropertyValue('--menu-x'), '120px')
    await driver.act(() => context.unmount())
  },

  async tree(driver, page) {
    const nodes = [
      { label: 'components', open: true, children: [{ label: 'button.css', value: 'components/button.css' }, { label: 'input.css', value: 'components/input.css' }] },
      { label: 'themes', children: [{ label: 'paper.css', value: 'themes/paper.css' }] },
      { label: 'README.md', value: 'README.md' },
    ]
    const { mounted, heard } = await owned(driver, 'tree', { nodes, value: null, 'aria-label': 'Files' })
    conforms(page)
    const rows = () => page.all<HTMLElement>('.tree-item')
    const stop = () => page.one<HTMLElement>('.tree-item[tabindex="0"]')
    assert.equal(rows().length, 6)
    assert.equal(stop(), rows()[0], 'the tree is one tab stop')
    assert.equal(rows()[3].getAttribute('aria-expanded'), 'false', 'a branch starts closed unless it says open')

    await driver.act(() => { stop().focus(); page.key(stop(), 'ArrowDown') })
    assert.equal(stop(), rows()[1])
    await driver.act(() => page.key(stop(), 'Enter'))
    assert.deepEqual(heard, ['components/button.css'], 'a selected row comes out as its value')
    await driver.act(() => page.key(rows()[3], 'ArrowRight'))
    assert.equal(rows()[3].getAttribute('aria-expanded'), 'true', 'the keys fold and unfold')

    await driver.act(() => mounted.set({ value: 'README.md' }))
    assert.deepEqual(page.all('[aria-selected="true"]').map(row => row.textContent?.trim()), ['README.md'])
    assert.deepEqual(heard, ['components/button.css'])
    await driver.act(() => mounted.unmount())

    await treeSeveral(driver, page)
    await treeChecks(driver, page)
    await treeLater(driver, page)
  },

  async wheel(driver, page) {
    const columns = [
      { label: 'Hour', options: ['09', '10', '11'], separator: ':' },
      { label: 'Minute', options: ['00', '30'] },
      { label: 'Period', options: [{ value: 'am', label: 'AM' }, { value: 'pm', label: 'PM' }] },
    ]
    const { mounted } = await owned(driver, 'wheel', { columns, value: ['10', '30', 'pm'], 'aria-label': 'Time' })
    conforms(page)
    const selected = () => page.all('.wheel-option[aria-selected="true"]').map(option => option.textContent?.trim())
    assert.equal(page.all('.wheel-column').length, 3)
    assert.equal(page.all('.wheel-separator').length, 1)
    assert.deepEqual(selected(), ['10', '30', 'PM'], 'the value is drawn from the first render')

    await driver.act(() => mounted.set({ value: ['11', '00', 'am'] }))
    assert.deepEqual(selected(), ['11', '00', 'AM'])
    await driver.act(() => mounted.unmount())
  },

  async tabs(driver, page) {
    const tabs = [
      { value: 'profile', label: 'Profile', content: 'Profile settings' },
      { value: 'billing', label: 'Billing', content: 'Billing settings' },
      { value: 'team', label: 'Team', content: 'Team settings', disabled: true },
    ]
    const { mounted, heard } = await owned(driver, 'tabs', { tabs, value: 'profile', 'aria-label': 'Account' })
    conforms(page)
    const list = page.all<HTMLButtonElement>('[role="tab"]')
    const shown = () => page.all<HTMLElement>('[role="tabpanel"]').filter(panel => !panel.hidden).map(panel => panel.textContent?.trim())
    assert.deepEqual(shown(), ['Profile settings'], 'the selected panel is the one in the first render')
    for (const tab of list) {
      const panel = page.document.getElementById(tab.getAttribute('aria-controls')!)
      assert.equal(panel?.getAttribute('aria-labelledby'), tab.id, 'a tab and its panel name each other')
    }

    await driver.act(() => { list[0].focus(); page.key(list[0], 'ArrowRight') })
    assert.deepEqual(heard, ['billing'])
    assert.deepEqual(shown(), ['Billing settings'])
    assert.equal(page.document.activeElement, list[1])
    await driver.act(() => page.key(list[1], 'ArrowRight'))
    assert.deepEqual(heard, ['billing', 'profile'], 'a disabled tab is passed over')

    await driver.act(() => mounted.set({ value: 'billing' }))
    assert.deepEqual(shown(), ['Billing settings'])
    assert.deepEqual(heard, ['billing', 'profile'])
    await driver.act(() => mounted.unmount())
  },

  async dialog(driver, page) {
    const { mounted, heard } = await owned(driver, 'dialog', { open: false }, 'open', 'onOpenChange')
    conforms(page)
    const dialog = page.one<HTMLDialogElement>('dialog.dialog')
    const trigger = page.one<HTMLButtonElement>('button[command="show-modal"]')
    assert.equal(trigger.getAttribute('commandfor'), dialog.id, 'the trigger names the dialog, and the browser opens it')
    assert.equal(dialog.getAttribute('aria-labelledby'), page.one('.dialog-title').id)
    assert.equal(dialog.open, false)

    await driver.act(() => mounted.set({ open: true }))
    assert.equal(dialog.open, true, 'open opens it')
    await driver.act(() => dialog.close())
    assert.deepEqual(heard, [false], 'a dialog the browser closed says so')
    assert.equal(dialog.open, false)
    await driver.act(() => mounted.unmount())
  },

  async popover(driver, page) {
    const { mounted, heard } = await owned(driver, 'popover', { open: false }, 'open', 'onOpenChange')
    conforms(page)
    const popover = page.one<HTMLElement>('.popover')
    assert.equal(page.one('button.btn').getAttribute('popovertarget'), popover.id, 'the trigger names the popover')
    assert.equal(popover.getAttribute('popover'), 'auto')

    await driver.act(() => mounted.set({ open: true }))
    assert.equal(page.isOpen(popover), true, 'open opens it')
    assert.deepEqual(heard, [], 'and its owner, who said so, is not told')
    await driver.act(() => popover.hidePopover())
    assert.deepEqual(heard, [false], 'a popover the browser closed says so')
    await driver.act(() => mounted.unmount())

    // A hint: the trigger shows it on hover and on focus, and the browser does the rest.
    const hint = await owned(driver, 'popover', { mode: 'hint', open: false }, 'open', 'onOpenChange')
    conforms(page)
    const card = page.one<HTMLElement>('.popover')
    const trigger = page.one('button.btn')
    assert.equal(card.getAttribute('popover'), 'hint')
    assert.equal(trigger.getAttribute('interestfor'), card.id, 'the trigger names the hint with interestfor')
    assert.equal(trigger.hasAttribute('popovertarget'), false, 'and does not open it with a press')
    await driver.act(() => hint.mounted.set({ open: true }))
    assert.equal(page.isOpen(card), true, 'open shows a hint too')
    await driver.act(() => card.hidePopover())
    assert.deepEqual(hint.heard, [false], 'a hint the browser hid says so')
    await driver.act(() => hint.mounted.unmount())
  },

  async tooltip(driver, page) {
    const mounted = await driver.mount('tooltip')
    conforms(page)
    const tooltip = page.one<HTMLElement>('.tooltip')
    assert.equal(tooltip.getAttribute('popover'), 'hint')
    assert.equal(page.one('button.btn').getAttribute('interestfor'), tooltip.id, 'the control names its tooltip, and the browser shows it')
    assert.equal(tooltip.textContent?.trim(), 'Ships the main branch to production')
    await driver.act(() => mounted.unmount())
  },

  async field(driver, page) {
    const mounted = await driver.mount('field', { label: 'Work email', hint: 'We only send receipts.' })
    conforms(page)
    const control = page.one<HTMLInputElement>('.input')
    assert.equal(page.one('label').getAttribute('for'), control.id, 'the label names the control')
    assert.equal(control.getAttribute('aria-describedby'), page.one('.field-hint').id)
    assert.equal(control.getAttribute('aria-invalid'), null)

    await driver.act(() => mounted.set({ error: 'Enter an email address.' }))
    assert.equal(control.getAttribute('aria-invalid'), 'true')
    assert.deepEqual(control.getAttribute('aria-describedby')?.split(' '), [page.one('.field-hint').id, page.one('.field-error').id])
    await driver.act(() => mounted.unmount())
  },

  async tags(driver, page) {
    const { mounted, heard } = await owned(driver, 'tags', { value: ['design'], name: 'labels', 'aria-label': 'Labels' })
    conforms(page)
    const field = page.one<HTMLInputElement>('.input-group-field')
    const chips = () => page.all('.chip').map(chip => chip.getAttribute('data-value'))
    assert.deepEqual(chips(), ['design'], 'the value is drawn from the first render')

    await driver.act(() => { page.type(field, 'research'); page.key(field, 'Enter') })
    assert.deepEqual(heard, [['design', 'research']], 'a typed value comes out')
    assert.deepEqual(chips(), ['design', 'research'], 'the framework writes its chip')
    assert.deepEqual(page.all<HTMLInputElement>('.chip input[type="hidden"]').map(input => `${input.name}=${input.value}`), ['labels=design', 'labels=research'])
    assert.equal(field.value, '')

    await driver.act(() => { field.focus(); page.key(field, 'Backspace') })
    const last = page.one('.chip[data-value="research"] .chip-remove')
    assert.equal(page.document.activeElement, last, 'Backspace reaches the last chip')
    await driver.act(() => page.key(last, 'Backspace'))
    assert.deepEqual(heard.at(-1), ['design'])
    assert.deepEqual(chips(), ['design'])

    await driver.act(() => mounted.set({ value: ['ops', 'design'] }))
    assert.deepEqual(chips(), ['ops', 'design'], 'a value set by the owner is written')
    assert.equal(heard.length, 2, 'and says nothing')
    conforms(page)
    await driver.act(() => mounted.unmount())
    assert.equal(page.all('.tags').length, 0)
  },

  async 'color-picker'(driver, page) {
    const { mounted, heard } = await owned(driver, 'color-picker', { value: 'oklch(62% 0.19 260)', label: 'Accent color', name: 'accent' })
    conforms(page)
    const root = page.one<HTMLElement>('.color-picker')
    const thumb = page.one<HTMLElement>('.color-picker-thumb')
    const hue = page.one<HTMLInputElement>('.color-picker-hue')
    const format = page.one<HTMLSelectElement>('.color-picker-format')
    const text = page.one<HTMLInputElement>('.color-picker-text')
    /** Change a native control as the reader does: its value, then the events it sends. */
    const change = (control: HTMLInputElement | HTMLSelectElement, value: string) => {
      control.value = value
      control.dispatchEvent(new page.window.Event('input', { bubbles: true }) as unknown as Event)
      control.dispatchEvent(new page.window.Event('change', { bubbles: true }) as unknown as Event)
    }
    assert.equal(root.style.getPropertyValue('--color-picker-hue'), '260', 'the value is drawn from the first render')
    assert.equal(thumb.getAttribute('aria-valuetext'), 'Lightness 62%, chroma 0.19')
    assert.equal(text.value, 'oklch(62% 0.19 260)')
    assert.equal(text.name, 'accent')
    assert.equal(format.value, 'oklch')

    await driver.act(() => page.key(thumb, 'ArrowUp'))
    assert.deepEqual(heard, ['oklch(63% 0.19 260)'], 'a key moves the color, and the value comes out once')
    await driver.act(() => change(hue, '30'))
    assert.equal(heard.at(-1), 'oklch(63% 0.19 30)', 'so does the hue')
    await driver.act(() => change(format, 'hex'))
    assert.match(String(heard.at(-1)), /^#[\da-f]{6}$/, 'a format chosen writes the value in it')
    assert.equal(text.value, heard.at(-1))

    const said = heard.length
    await driver.act(() => mounted.set({ value: 'rgb(255 0 0)' }))
    assert.equal(text.value, 'rgb(255 0 0)', 'a value set by the owner is written')
    assert.equal(format.value, 'rgb', 'in its own format')
    assert.equal(heard.length, said, 'and says nothing')

    await driver.act(() => mounted.set({ disabled: true }))
    assert.equal(thumb.getAttribute('aria-disabled'), 'true')
    assert.equal(hue.disabled, true)
    assert.equal(page.key(thumb, 'ArrowUp'), false, 'a disabled field takes no key')
    conforms(page)
    await driver.act(() => mounted.unmount())

    await driver.mount('color-picker-popover', { value: '#3b82f6', label: 'Accent color', alpha: false })
    conforms(page)
    const trigger = page.one<HTMLButtonElement>('button[popovertarget]')
    const popover = page.one<HTMLElement>('.color-picker-popover')
    assert.equal(trigger.getAttribute('popovertarget'), popover.id, 'the page\'s button opens the popover')
    assert.ok(popover.closest('.color-picker') && trigger.closest('.color-picker'), 'both stand in the root, so the button\'s swatch reads the color')
    assert.ok(trigger.querySelector('.color-picker-swatch'))
    assert.equal(page.all('.color-picker-alpha').length, 0, 'without opacity there is no opacity slider')
    assert.equal(page.one<HTMLInputElement>('.color-picker-text').value, '#3b82f6')
  },

  async editable(driver, page) {
    const { mounted, heard } = await owned(driver, 'editable', { value: 'Quarterly report', label: 'Title', required: true })
    conforms(page)
    const root = page.one('.editable')
    const preview = page.one<HTMLButtonElement>('.editable-preview')
    const field = page.one<HTMLInputElement>('.editable-field')
    assert.equal(preview.textContent?.trim(), 'Quarterly report', 'the value is drawn from the first render')
    assert.equal(field.hidden, true)
    assert.equal(field.value, 'Quarterly report')
    assert.ok(preview.getAttribute('aria-labelledby')?.split(' ').every(id => page.document.getElementById(id)), 'the preview is named by the label and itself')

    await driver.act(() => page.click(preview))
    assert.equal(field.hidden, false)
    assert.equal(page.document.activeElement, field)
    await driver.act(() => { page.type(field, 'Annual report'); page.key(field, 'Enter') })
    assert.deepEqual(heard, ['Annual report'], 'the saved value comes out')
    assert.equal(field.hidden, true)
    assert.equal(preview.textContent, 'Annual report')

    await driver.act(() => { page.click(preview); page.type(field, 'Never mind'); page.key(field, 'Escape') })
    assert.deepEqual(heard, ['Annual report'], 'Escape saves nothing')

    await driver.act(() => mounted.set({ value: 'From the server' }))
    assert.equal(preview.textContent, 'From the server', 'a value set by the owner is written')
    assert.deepEqual(heard, ['Annual report'], 'and says nothing')

    await driver.act(() => mounted.set({ busy: true }))
    assert.equal(root.getAttribute('aria-busy'), 'true')
    await driver.act(() => mounted.unmount())

    await driver.mount('editable', { label: 'Description', placeholder: 'Add a description', multiline: true })
    conforms(page)
    assert.equal(page.one('.editable-placeholder').textContent, 'Add a description', 'an empty value shows the placeholder')
    assert.equal(page.one('.editable-field').localName, 'textarea')
  },

  async gantt(driver, page) {
    const committed: unknown[] = []
    const asked: unknown[] = []
    let refuse = false
    const { mounted, heard } = await owned(driver, 'gantt', {
      rows: plan,
      from: 0,
      to: 10,
      now: 4,
      ticks: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
      'aria-label': 'Sprint plan, in days',
      format: (start: number, end: number) => (start === end ? `Day ${start + 1}` : `Days ${start + 1} to ${end}`),
      onValueCommit: (value: unknown) => committed.push(value),
      onBeforeChange: (event: CustomEvent) => {
        asked.push(event.detail)
        if (refuse) event.preventDefault()
      },
    })
    conforms(page)
    const root = page.one<HTMLElement>('.gantt')
    const row = (id: string) => page.one<HTMLElement>(`.gantt-row[data-value="${id}"]`)
    const bar = (id: string) => page.one<HTMLElement>(`.gantt-row[data-value="${id}"] .gantt-bar`)
    const range = (id: string) => [row(id).style.getPropertyValue('--from'), row(id).style.getPropertyValue('--to')]
    assert.ok(root.classList.contains('gantt-now'))
    assert.equal(page.all('.gantt-ticks li').length, 10, 'the scale names its units')
    assert.deepEqual(range('design'), ['2', '6'], 'each bar is placed from the first render')
    assert.equal(bar('design').textContent, 'Days 3 to 6')
    assert.equal(bar('design').getAttribute('aria-valuetext'), 'Days 3 to 6')
    assert.equal(bar('design').getAttribute('aria-labelledby'), row('design').querySelector('.gantt-label')!.id, 'a bar is named by its row')
    assert.equal(row('design').getAttribute('aria-current'), 'true')
    assert.ok(bar('launch').classList.contains('gantt-milestone'), 'a row without an end is a milestone')
    assert.deepEqual(page.all<HTMLElement>('.gantt-bar').map(each => each.tabIndex), [0, -1, -1, -1], 'one stop in the tab order')
    assert.ok(root.nextElementSibling?.matches('.gantt-status[role="status"]'), 'a status region follows the chart')

    await driver.act(() => {
      bar('design').focus()
      page.key(bar('design'), 'ArrowRight')
    })
    const moved = { research: [0, 3], design: [3, 7], build: [4, 8], launch: [8, 8] }
    assert.deepEqual(asked, [{ id: 'design', range: [3, 7], previous: [2, 6] }], 'the page is asked first')
    assert.deepEqual(heard.at(-1), moved, 'the ranges come out')
    assert.deepEqual(committed, [moved], 'and are committed, after the value')
    assert.deepEqual(range('design'), ['3', '7'])
    assert.equal(bar('design').textContent, 'Days 4 to 7', 'the framework writes the bar\'s text')
    assert.equal(page.document.activeElement, bar('design'))

    await driver.act(() => page.key(bar('design'), 'ArrowRight', { shiftKey: true }))
    assert.deepEqual(range('design'), ['3', '8'], 'Shift moves the end')

    refuse = true
    const count = heard.length
    await driver.act(() => page.key(bar('design'), 'ArrowRight'))
    assert.deepEqual(range('design'), ['3', '8'], 'a refused change is not taken')
    assert.equal(heard.length, count)
    refuse = false

    await driver.act(() => page.key(bar('build'), 'ArrowRight'))
    assert.deepEqual(range('build'), ['4', '8'], 'a read-only bar does not move')

    await driver.act(() => page.key(bar('design'), 'ArrowDown'))
    assert.equal(page.document.activeElement, bar('build'), 'the arrows walk the bars')

    await driver.act(() => mounted.set({ value: { ...moved, design: [1, 4], launch: [9, 9] } }))
    assert.deepEqual(range('design'), ['1', '4'], 'ranges set by the owner are written')
    assert.equal(bar('design').textContent, 'Days 2 to 4')
    assert.equal(bar('design').getAttribute('aria-valuenow'), '1')
    assert.equal(row('launch').style.getPropertyValue('--from'), '9')
    assert.equal(heard.length, count, 'and say nothing')
    conforms(page)
    await driver.act(() => mounted.unmount())
    assert.equal(page.all('.gantt').length, 0)
  },

  async sortable(driver, page) {
    const { mounted, heard } = await owned(driver, 'sortable', {})
    conforms(page)
    const order = () => page.all('.sortable-item').map(item => item.getAttribute('data-value'))
    const handle = (value: string) => page.one<HTMLButtonElement>(`.sortable-item[data-value="${value}"] .sortable-handle`)
    assert.deepEqual(order(), ['onboarding', 'billing', 'search'], 'the order of the items')
    assert.equal(handle('billing').getAttribute('aria-label'), 'Move Billing')
    assert.ok(page.one('.sortable').nextElementSibling?.matches('.sortable-status[role="status"]'), 'a status region follows the list')

    await driver.act(async () => {
      handle('billing').focus()
      page.click(handle('billing'), { detail: 0 })
    })
    assert.equal(handle('billing').getAttribute('aria-pressed'), 'true', 'Enter picks the item up')
    await driver.act(async () => {
      page.key(handle('billing'), 'ArrowUp')
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    assert.deepEqual(order(), ['billing', 'onboarding', 'search'], 'the framework moved the item')
    assert.deepEqual(heard.at(-1), ['billing', 'onboarding', 'search'], 'the order comes out')
    assert.equal(page.document.activeElement, handle('billing'), 'the handle keeps focus')
    await driver.act(() => page.click(handle('billing'), { detail: 0 }))
    assert.equal(handle('billing').getAttribute('aria-pressed'), 'false', 'Enter again drops it')

    await driver.act(() => mounted.set({ value: ['search', 'billing', 'onboarding'] }))
    assert.deepEqual(order(), ['search', 'billing', 'onboarding'], 'an order set by the owner is written')
    conforms(page)
    await driver.act(() => mounted.unmount())
    assert.equal(page.all('.sortable').length, 0)
  },

  async toolbar(driver, page) {
    const mounted = await driver.mount('toolbar', {})
    conforms(page)
    const root = page.one('[role="toolbar"]')
    const [bold, italic, link] = page.all<HTMLButtonElement>('.toolbar .btn')
    assert.equal(root.getAttribute('aria-label'), 'Formatting')
    assert.equal(root.getAttribute('focusgroup'), 'toolbar wrap')
    assert.deepEqual([bold, italic, link].map(button => button!.tabIndex), [0, -1, -1], 'one stop in the tab order')
    await driver.act(() => { bold!.focus(); page.key(bold, 'ArrowRight') })
    assert.equal(page.document.activeElement, italic, 'the arrows move between the controls')
    await driver.act(() => page.click(italic))
    assert.equal(italic!.getAttribute('aria-pressed'), 'true', 'a toggle presses')
    await driver.act(() => mounted.set({ vertical: true }))
    assert.equal(root.getAttribute('aria-orientation'), 'vertical')
    await driver.act(() => mounted.unmount())
    assert.equal(page.all('.toolbar').length, 0)
  },

  async tour(driver, page) {
    const ended: boolean[] = []
    const { mounted, heard } = await owned(driver, 'tour', { spotlight: true, onEnd: (completed: boolean) => ended.push(completed) })
    conforms(page)
    const root = page.one<HTMLElement>('.coachmark-tour')
    const steps = page.all<HTMLElement>('.coachmark')
    const start = page.one<HTMLButtonElement>('button[command="--start"]')
    const open = () => steps.filter(step => page.isOpen(step)).map(step => steps.indexOf(step))
    const action = (index: number, value: string) => steps[index]!.querySelector<HTMLButtonElement>(`button[value="${value}"]`)!
    assert.equal(start.getAttribute('commandfor'), root.id, 'the trigger names the tour')
    assert.equal(steps.length, 3, 'a step for each one of the data')
    assert.ok(page.one('.coachmark-spotlight').classList.contains('coachmark-spotlight-dim'))
    assert.deepEqual(steps.map(step => step.querySelector('.coachmark-count')?.textContent), ['1 of 3', '2 of 3', '3 of 3'])
    assert.deepEqual(steps.map(step => step.getAttribute('aria-labelledby')), steps.map(step => step.querySelector('.coachmark-title')!.id), 'each step is named by its title')
    assert.deepEqual(steps.map(step => [...step.querySelectorAll('button')].map(button => button.value)), [['skip', 'next'], ['skip', 'back', 'next'], ['back', 'done']])
    assert.deepEqual(open(), [])

    await driver.act(() => { start.focus(); page.click(start) })
    assert.deepEqual(open(), [0], 'the trigger starts the tour')
    assert.deepEqual(heard, [0], 'the step comes out')
    assert.equal(page.document.activeElement, action(0, 'next'), 'focus moves into the step')
    await driver.act(() => page.click(action(0, 'next')))
    assert.deepEqual(open(), [1], 'a target found by a function')
    assert.deepEqual(heard, [0, 1])
    await driver.act(() => page.key(action(1, 'next'), 'Escape'))
    assert.deepEqual(open(), [])
    assert.deepEqual(heard, [0, 1, null], 'the tour ends: null comes out')
    assert.deepEqual(ended, [false], 'and then that it was left early')
    assert.equal(page.document.activeElement, start, 'focus goes back to the trigger')

    await driver.act(() => mounted.set({ value: 2 }))
    assert.deepEqual(open(), [2], 'a step set by the owner opens, against a target the page holds a reference to')
    assert.deepEqual(heard, [0, 1, null], 'and says nothing')
    await driver.act(() => page.click(action(2, 'done')))
    assert.deepEqual(heard, [0, 1, null, null])
    assert.deepEqual(ended, [false, true], 'Done completes it')
    conforms(page)
    await driver.act(() => mounted.unmount())
    assert.equal(page.all('.coachmark-tour').length, 0)
  },

  async toast(driver, page) {
    const mounted = await driver.mount('toast')
    assert.equal(page.all('.toast').length, 0)
    await driver.act(() => driver.toast({ title: 'Deployed to production', description: 'atlas.dev is live in 14 regions.', status: 'success' }))
    await driver.act(() => driver.toast({ description: 'Saved.', duration: false }))
    conforms(page)
    const toasts = () => page.all<HTMLDialogElement>('dialog.toast')
    const leave = () => driver.act(() => new Promise(resolve => setTimeout(resolve, 350)))
    assert.equal(toasts().length, 2)
    assert.equal(page.one('.toast-region').getAttribute('aria-live'), 'polite')
    assert.equal(toasts()[0].open, true)
    assert.equal(toasts()[0].getAttribute('aria-atomic'), 'true', 'a toast is announced as a whole')
    assert.equal(toasts()[0].classList.contains('toast-timed'), true)
    assert.equal(toasts()[0].classList.contains('toast-success'), true)
    assert.equal(toasts()[0].getAttribute('aria-labelledby'), page.one('.toast-title').id)
    assert.equal(toasts()[1].classList.contains('toast-timed'), false, 'a toast with no duration stays')

    // A dismissed toast leaves through its transition, then it is removed.
    await driver.act(() => toasts()[1].close())
    await leave()
    assert.equal(toasts().length, 1)
    // A timed toast that has run out is removed.
    await driver.act(() => toasts()[0].dispatchEvent(Object.assign(new page.window.Event('animationend', { bubbles: true }), { animationName: 'toast-expire' })))
    assert.equal(toasts().length, 0)

    // An update says something else in the same toast, in its place: no second toast, no second entrance.
    let handle!: ToastHandle
    await driver.act(() => driver.toast('Kept above.'))
    await driver.act(() => { handle = driver.toast({ title: 'Archiving Atlas', duration: false }) })
    const archived = toasts()[1]
    const undone: string[] = []
    await driver.act(() => handle.update({ title: 'Project archived', description: 'Atlas is hidden from the dashboard.', status: 'success', duration: 4000, action: { label: 'Undo', onClick: () => undone.push('undo') } }))
    conforms(page)
    assert.equal(toasts().length, 2)
    assert.equal(toasts()[1], archived, 'the same dialog, in the same place')
    assert.equal(archived.querySelector('.toast-title')?.textContent, 'Project archived')
    assert.equal(archived.querySelector('.toast-description')?.textContent, 'Atlas is hidden from the dashboard.')
    assert.equal(archived.getAttribute('aria-labelledby'), archived.querySelector('.toast-title')?.id)
    assert.deepEqual([...archived.classList].sort(), ['toast', 'toast-success', 'toast-timed'])
    assert.equal(archived.style.getPropertyValue('--toast-duration'), '4000ms')

    // The action is a real button after the words, before the dismiss button: it runs once, then the toast leaves.
    const buttons = [...archived.querySelectorAll('button')]
    assert.deepEqual(buttons.map(button => button.textContent!.trim() || button.getAttribute('aria-label')), ['Undo', 'Dismiss'])
    assert.ok(buttons[0].closest('.toast-action'))
    await driver.act(() => buttons[0].click())
    assert.deepEqual(undone, ['undo'])
    assert.equal(archived.open, false)
    await leave()
    assert.deepEqual(toasts().map(toast => toast.textContent!.trim()), ['Kept above.'])
    // An update to a toast that has gone shows nothing.
    await driver.act(() => handle.update('Too late.'))
    assert.equal(toasts().length, 1)

    // An action that prevents the default keeps its toast.
    await driver.act(() => { handle = driver.toast({ description: 'Upload failed.', action: { label: 'Retry', onClick: (event: Event) => event.preventDefault() } }) })
    await driver.act(() => toasts()[1].querySelector<HTMLButtonElement>('.toast-action button')!.click())
    assert.equal(toasts()[1].open, true)
    // dismiss() closes it from the application, and it leaves the same way.
    await driver.act(() => handle.dismiss())
    assert.equal(toasts()[1].open, false)
    await leave()
    assert.equal(toasts().length, 1)

    // A promise: pending while it runs, with a spinner and no clock, then the same toast says how it ended.
    let finish!: (value: { name: string }) => void
    const work = new Promise<{ name: string }>(resolve => { finish = resolve })
    let returned!: Promise<unknown>
    await driver.act(() => { returned = driver.toast.promise(work, { loading: { title: 'Deploying Atlas' }, success: (value: { name: string }) => ({ title: `${value.name} is live` }), error: 'The deploy failed.' }) })
    assert.equal(returned, work, 'the promise comes back, to await or chain')
    conforms(page)
    const deploy = toasts()[1]
    assert.equal(deploy.getAttribute('aria-busy'), 'true')
    assert.ok(deploy.querySelector('.spinner.toast-icon'), 'a spinner in the place of the icon')
    assert.equal(deploy.querySelector('.spinner')?.getAttribute('aria-hidden'), 'true')
    assert.deepEqual([...deploy.classList], ['toast'], 'no status and no clock while pending')
    await driver.act(async () => { finish({ name: 'atlas.dev' }); await work })
    assert.equal(toasts()[1], deploy, 'the same toast')
    assert.equal(deploy.getAttribute('aria-busy'), null)
    assert.equal(deploy.querySelector('.spinner'), null)
    assert.equal(deploy.querySelector('.toast-title')?.textContent, 'atlas.dev is live')
    assert.deepEqual([...deploy.classList].sort(), ['toast', 'toast-success', 'toast-timed'])

    // A rejected promise turns the toast into a failure, in words from the reason.
    let fail!: (reason: Error) => void
    const failing = new Promise<never>((_, reject) => { fail = reject })
    await driver.act(() => { driver.toast.promise(failing, { loading: 'Saving…', success: 'Saved.', error: (error: Error) => ({ title: 'Not saved', description: error.message }) }).catch(() => {}) })
    const saving = toasts()[2]
    assert.equal(saving.getAttribute('aria-busy'), 'true')
    assert.equal(saving.querySelector('.toast-description')?.textContent, 'Saving…')
    await driver.act(async () => { fail(new Error('The server is offline.')); await failing.catch(() => {}) })
    assert.equal(toasts()[2], saving)
    assert.equal(saving.getAttribute('aria-busy'), null)
    assert.equal(saving.querySelector('.toast-description')?.textContent, 'The server is offline.')
    assert.deepEqual([...saving.classList].sort(), ['toast', 'toast-danger', 'toast-timed'])
    conforms(page)

    // The queue outlives a Toaster: leave it empty for whoever renders the next one.
    await driver.act(() => toasts().forEach(toast => toast.close()))
    await leave()
    assert.equal(toasts().length, 0)
    await driver.act(() => mounted.unmount())
  },
}
