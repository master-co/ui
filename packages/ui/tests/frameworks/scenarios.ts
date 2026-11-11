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
  /** Show a toast with the framework's own `toast()`. */
  toast(message: Record<string, unknown>): void
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

  async toast(driver, page) {
    const mounted = await driver.mount('toast')
    assert.equal(page.all('.toast').length, 0)
    await driver.act(() => driver.toast({ title: 'Deployed to production', description: 'atlas.dev is live in 14 regions.', status: 'success' }))
    await driver.act(() => driver.toast({ description: 'Saved.', duration: false }))
    conforms(page)
    const toasts = () => page.all<HTMLDialogElement>('dialog.toast')
    assert.equal(toasts().length, 2)
    assert.equal(page.one('.toast-region').getAttribute('aria-live'), 'polite')
    assert.equal(toasts()[0].open, true)
    assert.equal(toasts()[0].classList.contains('toast-timed'), true)
    assert.equal(toasts()[0].classList.contains('toast-success'), true)
    assert.equal(toasts()[0].getAttribute('aria-labelledby'), page.one('.toast-title').id)
    assert.equal(toasts()[1].classList.contains('toast-timed'), false, 'a toast with no duration stays')

    // A dismissed toast leaves through its transition, then it is removed.
    await driver.act(() => toasts()[1].close())
    await driver.act(() => new Promise(resolve => setTimeout(resolve, 350)))
    assert.equal(toasts().length, 1)
    // A timed toast that has run out is removed.
    await driver.act(() => toasts()[0].dispatchEvent(Object.assign(new page.window.Event('animationend', { bubbles: true }), { animationName: 'toast-expire' })))
    assert.equal(toasts().length, 0)
    await driver.act(() => mounted.unmount())
  },
}
