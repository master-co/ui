import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { calendar, calendarMonth, combobox, command, compare, listbox, otp, splitter, stepper, tree, wheel } from '../../behaviors/index.js'

/** happy-dom catches what a listener throws and reports it on the window; a test must not pass over it. */
const thrown: unknown[] = []
afterEach(() => assert.deepEqual(thrown.splice(0), [], 'a listener threw'))

/**
 * What a renderer other than the page's own markup needs from a behavior: a value it can read and set, an
 * `input` a framework hears, a list it may write itself, and a calendar whose grid it draws. These are the
 * seams the framework components stand on, so they are tested here once, without a framework.
 */
function setup(html: string) {
  const page = dom(html)
  page.window.addEventListener('error', (event: any) => thrown.push(event.error ?? event.message))
  const heard: string[] = []
  for (const type of ['input', 'change']) page.document.body.addEventListener(type, () => heard.push(type))
  /** Let a MutationObserver's callback run. */
  const settle = () => new Promise(resolve => setTimeout(resolve, 0))
  return { ...page, heard, settle }
}

const comboboxMarkup = `<div class="combobox">
  <div class="input-group">
    <input class="input-group-field" role="combobox" aria-expanded="false" aria-controls="region-list" aria-autocomplete="list" autocomplete="off" aria-label="Region">
    <button type="button" class="combobox-toggle" tabindex="-1" aria-label="Show regions"></button>
  </div>
  <div id="region-list" popover="manual" class="listbox" role="listbox" aria-label="Regions">
    <div class="listbox-option" role="option" data-value="hnd" aria-checked="false">Tokyo <span class="listbox-end">Japan</span></div>
    <div class="listbox-option" role="option" data-value="sin" aria-checked="false">Singapore</div>
    <div class="listbox-option" role="option" aria-checked="false">Frankfurt</div>
    <div class="listbox-empty">No regions match.</div>
  </div>
</div>`

test('combobox: value is the chosen option\'s data-value, or its text, and null while nothing is chosen', () => {
  const { one, all, key, type } = setup(comboboxMarkup)
  const field = one<HTMLInputElement>('[role="combobox"]')
  const handle = combobox(one('.combobox'))
  assert.equal(handle.value, null)
  type(field, 'tok')
  key(field, 'Enter')
  assert.equal(handle.value, 'hnd')
  assert.equal(field.value, 'Tokyo', 'the field holds the option\'s text, without its hint')
  type(field, 'fra')
  key(field, 'Enter')
  assert.equal(handle.value, 'Frankfurt', 'an option without data-value stands for its text')
  type(field, 'something else')
  assert.equal(handle.value, null, 'typing over the chosen value takes it away')
  assert.equal(all('[aria-checked="true"]').length, 0)
})

test('combobox: setting value checks the option, writes its text and says nothing', () => {
  const { one, all, heard } = setup(comboboxMarkup)
  const field = one<HTMLInputElement>('[role="combobox"]')
  const handle = combobox(one('.combobox'))
  handle.value = 'sin'
  assert.equal(field.value, 'Singapore')
  assert.deepEqual(all('[aria-checked="true"]').map(option => option.getAttribute('data-value')), ['sin'])
  handle.value = 'no such region'
  assert.equal(all('[aria-checked="true"]').length, 0, 'a value no option stands for checks none')
  assert.equal(field.value, 'Singapore', 'and leaves the text, which the options may yet arrive for')
  handle.value = null
  assert.equal(field.value, '')
  assert.deepEqual(heard, [], 'a value set from outside dispatches nothing')
})

test('combobox: a choice is written through the prototype\'s setter, so a shadowed value still hears it', () => {
  const { one, key, type, window } = setup(comboboxMarkup)
  const field = one<HTMLInputElement>('[role="combobox"]')
  // What React does to an input it renders: its own `value` on the element, to notice what it wrote.
  const native = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!
  let seen = field.value
  Object.defineProperty(field, 'value', {
    configurable: true,
    get() { return native.get!.call(this) },
    set(next: string) { seen = String(next); native.set!.call(this, next) },
  })
  const changes: string[] = []
  field.addEventListener('input', () => { if (field.value !== seen) { seen = field.value; changes.push(seen) } })
  combobox(one('.combobox'))
  type(field, 'sing')
  changes.length = 0
  key(field, 'Enter')
  assert.deepEqual(changes, ['Singapore'], 'the listener saw a value it had not been told of')
})

test('combobox: with filter false it hides nothing, and options written later get an active option', async () => {
  const { one, all, type, document, settle, isOpen } = setup(comboboxMarkup)
  const field = one<HTMLInputElement>('[role="combobox"]')
  const list = one('[role="listbox"]')
  combobox(one('.combobox'), { filter: false })
  type(field, 'zzz')
  assert.equal(all('[role="option"][hidden]').length, 0, 'no option is hidden')
  assert.ok(isOpen(list))
  // The page answers the typing: it replaces the options.
  for (const option of all('[role="option"]')) option.remove()
  await settle()
  assert.equal(field.getAttribute('aria-activedescendant'), null, 'no option, no active option')
  const option = document.createElement('div')
  option.className = 'listbox-option'
  option.setAttribute('role', 'option')
  option.textContent = 'Zurich'
  list.prepend(option)
  await settle()
  assert.equal(option.getAttribute('aria-selected'), 'true', 'the first option that arrived is active')
  assert.equal(field.getAttribute('aria-activedescendant'), option.id)
})

test('command: with filter false it hides nothing, and keeps an active option as the options change', async () => {
  const { one, all, type, document, settle } = setup(`<dialog id="palette" class="dialog command" aria-label="Command palette">
  <label class="command-search"><input class="command-input" type="search" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-label="Search commands"></label>
  <div class="listbox command-list" id="palette-list" role="listbox" aria-label="Commands">
    <div class="listbox-option" role="option" id="cmd-new">New project</div>
    <div class="listbox-option" role="option" id="cmd-deploy">Deploy to production</div>
  </div>
</dialog>`)
  const field = one<HTMLInputElement>('.command-input')
  command(one('.command'), { filter: false, shortcut: false })
  type(field, 'zzz')
  assert.equal(all('[role="option"][hidden]').length, 0)
  one('#cmd-new').remove()
  await settle()
  assert.equal(field.getAttribute('aria-activedescendant'), 'cmd-deploy', 'the active option left, the first one took its place')
  const option = document.createElement('div')
  option.className = 'listbox-option'
  option.setAttribute('role', 'option')
  option.id = 'cmd-invite'
  option.textContent = 'Invite a member'
  one('.command-list').append(option)
  await settle()
  assert.equal(field.getAttribute('aria-activedescendant'), 'cmd-deploy', 'an option that is still there stays active')
})

const listboxMarkup = (attributes = '') => `<div class="listbox" role="listbox" aria-label="Framework" tabindex="0" ${attributes}>
  <div class="listbox-option" role="option" data-value="astro" aria-checked="true">Astro</div>
  <div class="listbox-option" role="option" data-value="next" aria-checked="false">Next.js</div>
  <div class="listbox-option" role="option" aria-checked="false">SvelteKit</div>
</div>`

test('listbox: value reads and sets the chosen option, one or several, and setting it says nothing', () => {
  const single = setup(listboxMarkup())
  const one = listbox(single.one('.listbox'))
  assert.equal(one.value, 'astro')
  one.value = 'SvelteKit'
  assert.equal(one.value, 'SvelteKit')
  assert.deepEqual(single.all('[aria-checked="true"]').length, 1)
  one.value = null
  assert.equal(one.value, null)
  assert.deepEqual(single.heard, [])

  const several = setup(listboxMarkup('aria-multiselectable="true"'))
  const many = listbox(several.one('.listbox'))
  assert.deepEqual(many.value, ['astro'])
  many.value = ['next', 'SvelteKit']
  assert.deepEqual(many.value, ['next', 'SvelteKit'])
  several.click(several.all('[role="option"]')[0])
  assert.deepEqual(many.value, ['astro', 'next', 'SvelteKit'])
})

test('otp: value reads and fills the slots, keeps only what a slot allows, and setting it says nothing', () => {
  const { one, all, heard } = setup(`<fieldset class="otp" aria-label="Verification code">
  <input class="otp-slot" inputmode="numeric" pattern="[0-9]" maxlength="1" aria-label="Digit 1">
  <input class="otp-slot" inputmode="numeric" pattern="[0-9]" maxlength="1" aria-label="Digit 2">
  <input class="otp-slot" inputmode="numeric" pattern="[0-9]" maxlength="1" aria-label="Digit 3">
</fieldset>`)
  const handle = otp(one('.otp'))
  assert.equal(handle.value, '')
  handle.value = '4a82'
  assert.deepEqual(all<HTMLInputElement>('.otp-slot').map(slot => slot.value), ['4', '8', '2'])
  assert.equal(handle.value, '482')
  handle.value = '7'
  assert.deepEqual(all<HTMLInputElement>('.otp-slot').map(slot => slot.value), ['7', '', ''])
  assert.deepEqual(heard, [])
})

test('splitter: value reads and sets the size within its limits, and setting it says nothing', () => {
  const { one, heard } = setup(`<div class="splitter" style="--splitter-size: 36%">
  <div class="splitter-pane">Files</div>
  <div class="splitter-handle" role="separator" tabindex="0" aria-label="Resize" aria-valuenow="36" aria-valuemin="15" aria-valuemax="85"></div>
  <div class="splitter-pane">Editor</div>
</div>`)
  const root = one<HTMLElement>('.splitter')
  const handle = splitter(root)
  assert.equal(handle.value, 36)
  handle.value = 62.5
  assert.equal(handle.value, 62.5)
  assert.equal(root.style.getPropertyValue('--splitter-size'), '62.5%')
  assert.equal(one('.splitter-handle').getAttribute('aria-valuenow'), '63')
  handle.value = 99
  assert.equal(handle.value, 85, 'it stops at aria-valuemax')
  assert.deepEqual(heard, [])
})

test('tree: value reads and sets the selected row, and setting it says nothing', () => {
  const { one, all, click, heard } = setup(`<ul class="tree" role="tree" aria-label="Files">
  <li role="none"><div class="tree-item" role="treeitem" data-value="src/a">a.css</div></li>
  <li role="none"><div class="tree-item" role="treeitem">README.md</div></li>
</ul>`)
  const handle = tree(one('.tree'))
  assert.equal(handle.value, null)
  click(all('.tree-item')[0])
  assert.equal(handle.value, 'src/a')
  heard.length = 0
  handle.value = 'README.md'
  assert.deepEqual(all('[aria-selected="true"]').map(item => item.textContent), ['README.md'])
  handle.value = null
  assert.equal(all('[aria-selected="true"]').length, 0)
  assert.deepEqual(heard, [])
})

test('wheel: value reads and sets each column\'s option, and setting it says nothing', () => {
  const { one, all, heard } = setup(`<div class="wheel" role="group" aria-label="Time">
  <div class="wheel-column" role="listbox" aria-label="Hour" tabindex="0">
    <div class="wheel-option" role="option" aria-selected="true">09</div>
    <div class="wheel-option" role="option" aria-selected="false">10</div>
  </div>
  <div class="wheel-column" role="listbox" aria-label="Period" tabindex="0">
    <div class="wheel-option" role="option" data-value="am" aria-selected="false">AM</div>
    <div class="wheel-option" role="option" data-value="pm" aria-selected="true">PM</div>
  </div>
</div>`)
  for (const column of all<any>('.wheel-column')) column.scrollTo = () => {}
  const handle = wheel(one('.wheel'))
  assert.deepEqual(handle.value, ['09', 'pm'])
  handle.value = ['10', 'am']
  assert.deepEqual(handle.value, ['10', 'am'])
  assert.deepEqual(all('[aria-selected="true"]').map(option => option.textContent), ['10', 'AM'])
  handle.value = ['11', 'am']
  assert.deepEqual(handle.value, ['10', 'am'], 'a value a column does not have leaves that column as it is')
  assert.deepEqual(heard, [])
})

const calendarMarkup = `<div class="calendar" lang="en-GB">
  <div class="calendar-header">
    <button type="button" class="btn" aria-label="Previous month"></button>
    <h3 class="calendar-title" id="calendar-title" aria-live="polite"></h3>
    <button type="button" class="btn" aria-label="Next month"></button>
  </div>
  <div class="calendar-grid" role="grid" aria-labelledby="calendar-title"></div>
</div>`

test('calendarMonth: a month as data, with the days that complete its weeks', () => {
  const view = calendarMonth('2026-11', { locale: 'en-GB', weekStart: 1 })
  assert.equal(view.month, '2026-11')
  assert.equal(view.title, 'November 2026')
  assert.deepEqual(view.weekdays.map(weekday => weekday.name), ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
  assert.equal(view.weeks.length, 6, 'November 2026 starts on a Sunday, so it spans six weeks from Monday')
  assert.deepEqual(view.weeks[0][0], { date: '2026-10-26', text: '26', label: 'Monday, 26 October 2026', outside: true })
  assert.deepEqual(view.weeks[0][6], { date: '2026-11-01', text: '1', label: 'Sunday, 1 November 2026', outside: false })
  assert.equal(view.weeks.flat().filter(day => !day.outside).length, 30)
  assert.equal(calendarMonth('2026-11-13', { locale: 'en-GB' }).month, '2026-11', 'a day stands for its month')
  assert.match(calendarMonth().month, /^\d{4}-\d{2}$/, 'this month by default')
})

test('calendar: the days it writes carry their date as value', () => {
  const { one, all } = setup(calendarMarkup)
  calendar(one('.calendar'), { value: '2026-11-13' })
  const days = all<HTMLButtonElement>('.calendar-day')
  assert.equal(days.length, 42)
  assert.equal(one<HTMLButtonElement>('[aria-selected="true"]').value, '2026-11-13')
  assert.equal(days[0].value, '2026-10-26')
})

test('calendar: setting value chooses and shows its month; the same value given back moves nothing', () => {
  const { one, all, key, heard } = setup(calendarMarkup)
  const handle = calendar(one('.calendar'), { value: '2026-11-13', range: true })
  handle.value = ['2026-11-28', '2026-12-03']
  assert.deepEqual(handle.value, ['2026-11-28', '2026-12-03'])
  assert.equal(one('.calendar-title').textContent, 'November 2026', 'the month of the first day')
  key(one('[tabindex="0"]'), 'PageDown')
  assert.equal(one('.calendar-title').textContent, 'December 2026')
  handle.value = ['2026-11-28', '2026-12-03']
  assert.equal(one('.calendar-title').textContent, 'December 2026', 'a round trip of the value does not turn the month back')
  handle.value = null
  assert.equal(handle.value, null)
  assert.equal(all('[aria-selected="true"]').length, 0)
  assert.deepEqual(heard, [])
})

test('calendar: with draw it writes no day, asks for the month and marks the days once they are written', async () => {
  const { one, all, key, click, document, settle } = setup(calendarMarkup)
  const root = one('.calendar')
  const grid = one('.calendar-grid')
  const asked: string[] = []
  /** A renderer: what a framework component does with the month it is given. */
  const render = (month: string) => {
    const view = calendarMonth(month, { locale: 'en-GB', weekStart: 1 })
    one('.calendar-title').textContent = view.title
    grid.innerHTML = view.weeks.map(week => `<div class="calendar-week" role="row">${week.map(day => `<button type="button" class="calendar-day${day.outside ? ' calendar-day-outside' : ''}" role="gridcell" tabindex="-1" value="${day.date}" aria-label="${day.label}">${day.text}</button>`).join('')}</div>`).join('')
  }
  render('2026-11')
  const written = grid.innerHTML
  const changes: unknown[] = []
  root.addEventListener('change', (event: any) => changes.push(event.detail.value))
  const handle = calendar(root, { value: '2026-11-13', draw: month => { asked.push(month); render(month) } })
  assert.deepEqual(asked, [], 'the grid already holds the month, so nothing is asked for')
  assert.equal(grid.innerHTML.replace(/ (aria-selected|aria-current|tabindex|disabled)="[^"]*"/g, ''), written.replace(/ tabindex="[^"]*"/g, ''), 'it wrote no element')
  assert.equal(one<HTMLButtonElement>('[aria-selected="true"]').value, '2026-11-13', 'it marked the days that were there')
  assert.equal(one<HTMLButtonElement>('[tabindex="0"]').value, '2026-11-13')

  one<HTMLButtonElement>('[tabindex="0"]').focus()
  key(one('[tabindex="0"]'), 'PageDown')
  assert.deepEqual(asked, ['2026-12'])
  await settle()
  assert.equal(one('.calendar-title').textContent, 'December 2026', 'the renderer names the month')
  assert.equal(one<HTMLButtonElement>('[tabindex="0"]').value, '2026-12-13')
  assert.equal(document.activeElement, one('[tabindex="0"]'), 'focus follows into the month that was written')

  click(one('button[value="2026-12-24"]'))
  assert.deepEqual(changes, ['2026-12-24'])
  assert.equal(handle.value, '2026-12-24')
  assert.equal(all('[aria-selected="true"]').length, 1)

  handle.value = '2027-02-02'
  assert.deepEqual(asked, ['2026-12', '2027-02'], 'a value set from outside asks for its month')
  await settle()
  assert.equal(one<HTMLButtonElement>('[aria-selected="true"]').value, '2027-02-02')

  // A renderer may write the same month again, as a framework does when anything it reads changes.
  render('2027-02')
  await settle()
  assert.equal(one<HTMLButtonElement>('[aria-selected="true"]').value, '2027-02-02', 'days written again are marked again')
  handle()
  render('2027-02')
  await settle()
  assert.equal(all('[aria-selected="true"]').length, 0, 'once detached it marks nothing')
})

test('stepper: value reads and writes the field, the buttons follow, and setting it says nothing', () => {
  const { one, all, heard } = setup(`<div class="input-group stepper">
  <button type="button" class="btn btn-square" value="-1" tabindex="-1" aria-label="Fewer seats"></button>
  <input class="input-group-field stepper-field" type="number" min="1" max="12" value="4" aria-label="Seats">
  <button type="button" class="btn btn-square" value="1" tabindex="-1" aria-label="More seats"></button>
</div>`)
  const handle = stepper(one('.stepper'))
  assert.equal(handle.value, 4)
  handle.value = 12
  assert.equal(one<HTMLInputElement>('.stepper-field').value, '12')
  assert.deepEqual(all<HTMLButtonElement>('button').map(button => button.disabled), [false, true], 'the button toward the limit is disabled')
  handle.value = null
  assert.equal(handle.value, null)
  assert.deepEqual(all<HTMLButtonElement>('button').map(button => button.disabled), [false, false])
  assert.deepEqual(heard, [])
})

test('compare: value reads and moves the range input, and setting it says nothing', () => {
  const { one, heard } = setup(`<figure class="compare">
  <img class="compare-before" src="/a.jpg" alt="Before" width="800" height="500">
  <img class="compare-after" src="/b.jpg" alt="After">
  <input type="range" class="compare-range" min="0" max="100" value="50" aria-label="Show more of the graded picture">
</figure>`)
  const root = one<HTMLElement>('.compare')
  const handle = compare(root)
  assert.equal(handle.value, 50)
  handle.value = 80
  assert.equal(one<HTMLInputElement>('.compare-range').value, '80')
  assert.equal(root.style.getPropertyValue('--compare-position'), '80%')
  assert.deepEqual(heard, [])
})
