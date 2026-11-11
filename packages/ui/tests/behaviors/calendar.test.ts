import { test, mock, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { calendar } from '../../behaviors/calendar.js'

/**
 * The calendar's behavior writes the month into the grid and moves through it. Every test stands on
 * Wednesday 11 November 2026: the clock is mocked, since today is a state the behavior draws. The markup is
 * the contract's example, whose one week the behavior replaces. happy-dom has no real activation, so a test
 * clicks a day where a browser would turn Enter or Space on the button into that click.
 */
const markup = (attributes = '') => `<div class="calendar" ${attributes}>
  <div class="calendar-header">
    <button type="button" class="btn btn-quiet btn-square btn-sm" aria-label="Previous month"></button>
    <h3 class="calendar-title" id="calendar-title" aria-live="polite">Month</h3>
    <button type="button" class="btn btn-quiet btn-square btn-sm" aria-label="Next month"></button>
  </div>
  <div class="calendar-grid" role="grid" aria-labelledby="calendar-title">
    <div class="calendar-week" role="row">
      <span class="calendar-weekday" role="columnheader" aria-label="Monday">Mo</span>
    </div>
    <div class="calendar-week" role="row">
      <button type="button" class="calendar-day" role="gridcell" aria-selected="true">13</button>
    </div>
  </div>
</div>`

beforeEach(() => mock.timers.enable({ apis: ['Date'], now: new Date(2026, 10, 11, 9, 30) }))
afterEach(() => mock.timers.reset())

function setup(options: Record<string, unknown> = {}, attributes = '') {
  const page = dom(markup(attributes))
  const root = page.one('.calendar')
  const heard: unknown[] = []
  root.addEventListener('change', (event: any) => heard.push(event.detail.value))
  const detach = calendar(root, { locale: 'en-US', weekStart: 1, ...options })
  const title = () => page.one('.calendar-title').textContent
  const days = () => page.all('.calendar-day')
  /** A day of the shown month, by its number. */
  const day = (number: number) => {
    const found = page.all('.calendar-day:not(.calendar-day-outside)').find((cell) => cell.textContent === String(number))
    if (!found) throw new Error(`No day ${number} in ${title()}`)
    return found
  }
  /** The one day in the tab order, by its name. */
  const stop = () => {
    const stops = days().filter((cell) => cell.getAttribute('tabindex') === '0')
    assert.equal(stops.length, 1, 'one day is in the tab order')
    return stops[0].getAttribute('aria-label')
  }
  const focus = () => page.document.activeElement?.getAttribute('aria-label')
  const selected = () => days().filter((cell) => cell.getAttribute('aria-selected') === 'true').map((cell) => cell.getAttribute('aria-label'))
  const [previous, next] = page.all('.calendar-header button')
  return { ...page, root, heard, detach, title, days, day, stop, focus, selected, previous, next }
}

test('calendar: it writes the weekday names and the weeks of the month with the contract\'s classes', () => {
  const { all, title, days } = setup()
  assert.equal(title(), 'November 2026')
  const rows = all('.calendar-grid > .calendar-week')
  assert.equal(rows.length, 7, 'the weekday names and six weeks: November 2026 starts on a Sunday')
  assert.ok(rows.every((row) => row.getAttribute('role') === 'row' && row.children.length === 7))
  const weekdays = all('.calendar-weekday')
  assert.deepEqual(weekdays.map((cell) => cell.textContent), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
  assert.deepEqual(weekdays.map((cell) => cell.getAttribute('aria-label')), ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
  assert.ok(weekdays.every((cell) => cell.getAttribute('role') === 'columnheader'))
  assert.equal(days().length, 42)
  assert.ok(days().every((cell) => cell.tagName === 'BUTTON' && cell.getAttribute('type') === 'button' && cell.getAttribute('role') === 'gridcell'))
  assert.deepEqual(days().slice(0, 8).map((cell) => cell.textContent), ['26', '27', '28', '29', '30', '31', '1', '2'])
  assert.deepEqual(days().map((cell) => cell.classList.contains('calendar-day-outside')), [...Array(6).fill(true), ...Array(30).fill(false), ...Array(6).fill(true)])
  assert.ok(days().every((cell) => [...cell.classList].every((name) => name === 'calendar-day' || name === 'calendar-day-outside')))
  assert.equal(days()[6].getAttribute('aria-label'), 'Sunday, November 1, 2026')
})

test('calendar: today is aria-current and Tab enters the grid at today when no day is chosen', () => {
  const { all, stop, selected } = setup()
  assert.deepEqual(all('[aria-current]').map((cell) => [cell.getAttribute('aria-current'), cell.getAttribute('aria-label')]), [['date', 'Wednesday, November 11, 2026']])
  assert.equal(stop(), 'Wednesday, November 11, 2026')
  assert.deepEqual(selected(), [])
})

test('calendar: the chosen day is aria-selected, its month is shown and Tab enters the grid at it', () => {
  const { title, stop, selected, detach, all } = setup({ value: '2027-02-14' })
  assert.equal(title(), 'February 2027')
  assert.deepEqual(selected(), ['Sunday, February 14, 2027'])
  assert.equal(stop(), 'Sunday, February 14, 2027')
  assert.equal(detach.value, '2027-02-14')
  assert.equal(all('[aria-current]').length, 0, 'today is not in February 2027')
})

test('calendar: month shows a month first, and Tab enters it at its first day when it holds neither the chosen day nor today', () => {
  const { title, stop, selected } = setup({ value: '2026-11-13', month: '2026-12' })
  assert.equal(title(), 'December 2026')
  assert.equal(stop(), 'Tuesday, December 1, 2026')
  assert.deepEqual(selected(), [])
  assert.equal(setup({ value: '2026-11-13', month: '2026-11' }).stop(), 'Friday, November 13, 2026')
  assert.equal(setup({ month: '2026-11' }).stop(), 'Wednesday, November 11, 2026')
})

test('calendar: ArrowLeft and ArrowRight move focus to the day before and the day after', () => {
  const { day, key, focus, stop } = setup()
  assert.equal(key(day(11), 'ArrowRight'), true, 'a key the behavior handles is prevented')
  assert.equal(focus(), 'Thursday, November 12, 2026')
  assert.equal(stop(), 'Thursday, November 12, 2026')
  assert.equal(key(day(12), 'ArrowLeft'), true)
  assert.equal(key(day(11), 'ArrowLeft'), true)
  assert.equal(focus(), 'Tuesday, November 10, 2026')
})

test('calendar: in right-to-left text ArrowLeft goes to the day after and ArrowRight to the day before', () => {
  const { day, key, focus } = setup({}, 'style="direction: rtl"')
  key(day(11), 'ArrowLeft')
  assert.equal(focus(), 'Thursday, November 12, 2026')
  key(day(12), 'ArrowRight')
  key(day(11), 'ArrowRight')
  assert.equal(focus(), 'Tuesday, November 10, 2026')
})

test('calendar: ArrowUp and ArrowDown move focus to the same weekday of the week before and after', () => {
  const { day, key, focus } = setup()
  assert.equal(key(day(11), 'ArrowDown'), true)
  assert.equal(focus(), 'Wednesday, November 18, 2026')
  assert.equal(key(day(18), 'ArrowUp'), true)
  assert.equal(key(day(11), 'ArrowUp'), true)
  assert.equal(focus(), 'Wednesday, November 4, 2026')
})

test('calendar: Home and End move focus to the first and the last day of the week', () => {
  const { day, key, focus } = setup()
  assert.equal(key(day(11), 'Home'), true)
  assert.equal(focus(), 'Monday, November 9, 2026')
  assert.equal(key(day(9), 'End'), true)
  assert.equal(focus(), 'Sunday, November 15, 2026')
  const sunday = setup({ weekStart: 0 })
  sunday.key(sunday.day(11), 'Home')
  assert.equal(sunday.focus(), 'Sunday, November 8, 2026')
  sunday.key(sunday.day(8), 'End')
  assert.equal(sunday.focus(), 'Saturday, November 14, 2026')
})

test('calendar: a move past the edge of the month shows the neighboring month and keeps focus on the new day', () => {
  const { day, key, focus, title, stop, days } = setup({ value: '2026-11-30' })
  key(day(30), 'ArrowRight')
  assert.equal(title(), 'December 2026')
  assert.equal(focus(), 'Tuesday, December 1, 2026')
  assert.equal(stop(), 'Tuesday, December 1, 2026')
  assert.equal(days().length, 35, 'December 2026 takes five weeks')
  key(day(1), 'ArrowUp')
  assert.equal(title(), 'November 2026')
  assert.equal(focus(), 'Tuesday, November 24, 2026')
  key(day(24), 'ArrowDown')
  key(day(1), 'Home')
  assert.equal(title(), 'November 2026', 'the week of 1 December starts on 30 November')
  assert.equal(focus(), 'Monday, November 30, 2026')
})

test('calendar: PageUp and PageDown show the month before and after and move focus to the same day in it', () => {
  const { day, key, focus, title } = setup()
  assert.equal(key(day(11), 'PageDown'), true)
  assert.equal(title(), 'December 2026')
  assert.equal(focus(), 'Friday, December 11, 2026')
  assert.equal(key(day(11), 'PageUp'), true)
  assert.equal(key(day(11), 'PageUp'), true)
  assert.equal(title(), 'October 2026')
  assert.equal(focus(), 'Sunday, October 11, 2026')
})

test('calendar: a month shorter than the day in focus takes its last day, across the turn of a year', () => {
  const { day, key, focus, title } = setup({ value: '2026-12-31' })
  key(day(31), 'PageDown')
  assert.equal(focus(), 'Sunday, January 31, 2027')
  key(day(31), 'PageDown')
  assert.equal(title(), 'February 2027')
  assert.equal(focus(), 'Sunday, February 28, 2027')
  const leap = setup({ value: '2028-01-31' })
  leap.key(leap.day(31), 'PageDown')
  assert.equal(leap.focus(), 'Tuesday, February 29, 2028')
  assert.equal(leap.all('.calendar-day:not(.calendar-day-outside)').length, 29)
})

test('calendar: Shift+PageUp and Shift+PageDown show the same month of the year before and after', () => {
  const { day, key, focus, title } = setup()
  assert.equal(key(day(11), 'PageDown', { shiftKey: true }), true)
  assert.equal(title(), 'November 2027')
  assert.equal(focus(), 'Thursday, November 11, 2027')
  assert.equal(key(day(11), 'PageUp', { shiftKey: true }), true)
  assert.equal(key(day(11), 'PageUp', { shiftKey: true }), true)
  assert.equal(title(), 'November 2025')
  assert.equal(focus(), 'Tuesday, November 11, 2025')
  const leap = setup({ value: '2028-02-29' })
  leap.key(leap.day(29), 'PageDown', { shiftKey: true })
  assert.equal(leap.focus(), 'Wednesday, February 28, 2029')
})

test('calendar: Enter and Space are left to the button, whose click chooses the day', () => {
  const { day, key, click, heard, selected, stop, detach } = setup()
  assert.equal(detach.value, null)
  assert.equal(key(day(13), 'Enter'), false, 'the button turns Enter into a click')
  assert.equal(key(day(13), ' '), false, 'the button turns Space into a click')
  click(day(13))
  assert.deepEqual(selected(), ['Friday, November 13, 2026'])
  assert.equal(stop(), 'Friday, November 13, 2026')
  assert.deepEqual(heard, ['2026-11-13'])
  assert.equal(detach.value, '2026-11-13')
  click(day(20))
  assert.deepEqual(selected(), ['Friday, November 20, 2026'])
  assert.deepEqual(heard, ['2026-11-13', '2026-11-20'])
})

test('calendar: the change event bubbles from the root', () => {
  const { day, click, root, document } = setup()
  const targets: unknown[] = []
  document.addEventListener('change', (event: any) => targets.push(event.target))
  click(day(13))
  assert.deepEqual(targets, [root])
})

test('calendar: a key the grid has no use for is left alone', () => {
  const { day, key, focus, previous } = setup()
  day(11).focus()
  for (const name of ['Tab', 'Escape', 'a']) assert.equal(key(day(11), name), false)
  assert.equal(key(day(11), 'ArrowRight', { ctrlKey: true }), false)
  assert.equal(key(day(11), 'ArrowRight', { shiftKey: true }), false)
  assert.equal(key(day(11), 'Home', { metaKey: true }), false)
  assert.equal(key(previous, 'ArrowRight'), false, 'the keys belong to the days')
  assert.equal(focus(), 'Wednesday, November 11, 2026')
})

test('calendar: choosing a day of a neighboring month shows that month and keeps focus on the day', () => {
  const { days, click, title, heard, focus, selected } = setup()
  const outside = days()[5]
  assert.equal(outside.getAttribute('aria-label'), 'Saturday, October 31, 2026')
  outside.focus()
  assert.equal(title(), 'November 2026', 'focus alone does not turn the month under the pointer')
  click(outside)
  assert.equal(title(), 'October 2026')
  assert.deepEqual(heard, ['2026-10-31'])
  assert.deepEqual(selected(), ['Saturday, October 31, 2026'])
  assert.equal(focus(), 'Saturday, October 31, 2026')
})

test('calendar: a day that takes focus becomes the day in the tab order', () => {
  const { day, stop } = setup()
  day(20).focus()
  assert.equal(stop(), 'Friday, November 20, 2026')
})

test('calendar: the first and the last button of the header show the month before and after', () => {
  const { click, previous, next, title, stop, document } = setup()
  next.focus()
  click(next)
  assert.equal(title(), 'December 2026')
  assert.equal(stop(), 'Friday, December 11, 2026')
  assert.equal(document.activeElement, next, 'focus stays on the button')
  click(previous)
  click(previous)
  assert.equal(title(), 'October 2026')
  assert.equal(stop(), 'Sunday, October 11, 2026')
})

test('calendar: a range takes two days and marks its ends and the days between', () => {
  const { day, click, heard, selected, detach, all } = setup({ range: true })
  const classes = (name: string) => all(`.${name}`).map((cell) => cell.textContent)
  click(day(18))
  assert.deepEqual(heard, [], 'a range is not chosen until it has both ends')
  assert.deepEqual(detach.value, ['2026-11-18', null])
  assert.deepEqual(selected(), ['Wednesday, November 18, 2026'])
  assert.deepEqual([classes('calendar-day-range-start'), classes('calendar-day-range-end'), classes('calendar-day-range')], [['18'], ['18'], []], 'one day is a range of one day')
  click(day(12))
  assert.deepEqual(heard, [['2026-11-12', '2026-11-18']], 'the earlier day is the start, whichever was chosen first')
  assert.deepEqual(detach.value, ['2026-11-12', '2026-11-18'])
  assert.equal(selected().length, 7)
  assert.deepEqual(classes('calendar-day-range-start'), ['12'])
  assert.deepEqual(classes('calendar-day-range-end'), ['18'])
  assert.deepEqual(classes('calendar-day-range'), ['13', '14', '15', '16', '17'])
  click(day(25))
  assert.deepEqual(detach.value, ['2026-11-25', null], 'a third day starts a new range')
  assert.deepEqual(selected(), ['Wednesday, November 25, 2026'])
  assert.deepEqual(classes('calendar-day-range'), [])
  click(day(25))
  assert.deepEqual(heard[1], ['2026-11-25', '2026-11-25'])
  assert.deepEqual([classes('calendar-day-range-start'), classes('calendar-day-range-end')], [['25'], ['25']])
})

test('calendar: a range given as a value is drawn across the months it spans', () => {
  const { selected, title, key, day, all, detach, stop } = setup({ range: true, value: ['2026-12-03', '2026-11-27'] })
  assert.deepEqual(detach.value, ['2026-11-27', '2026-12-03'])
  assert.equal(title(), 'November 2026')
  assert.equal(stop(), 'Friday, November 27, 2026')
  assert.equal(selected().length, 7, '27 November to 3 December, the days of December shown to complete the week')
  assert.deepEqual(all('.calendar-day-range-end').map((cell) => cell.getAttribute('aria-label')), ['Thursday, December 3, 2026'])
  key(day(27), 'PageDown')
  assert.equal(title(), 'December 2026')
  assert.deepEqual(all('.calendar-day-range').map((cell) => cell.textContent), ['30', '1', '2'], 'the grid of December starts on 30 November')
  assert.deepEqual(all('.calendar-day-range-start').map((cell) => cell.textContent), [])
})

test('calendar: days before min and after max are disabled and the keys stop at them', () => {
  const { day, key, focus, days, click, heard, title, previous, next } = setup({ min: '2026-11-09', max: '2026-12-02' })
  assert.deepEqual(days().filter((cell) => !cell.disabled).map((cell) => cell.textContent), [...Array.from({ length: 22 }, (_, index) => String(index + 9)), '1', '2'])
  key(day(11), 'ArrowUp')
  assert.equal(focus(), 'Monday, November 9, 2026', 'a move past min lands on min')
  assert.equal(key(day(9), 'ArrowLeft'), true)
  assert.equal(focus(), 'Monday, November 9, 2026')
  key(day(9), 'PageUp')
  assert.equal(title(), 'November 2026')
  key(day(9), 'PageDown', { shiftKey: true })
  assert.equal(focus(), 'Wednesday, December 2, 2026', 'a move past max lands on max')
  click(day(3))
  assert.deepEqual(heard, [], 'a disabled day cannot be chosen')
  assert.equal(next.disabled, true, 'no day of January can be chosen')
  assert.equal(previous.disabled, false)
  click(previous)
  assert.equal(title(), 'November 2026')
  assert.equal(previous.disabled, true, 'no day of October can be chosen')
  assert.equal(next.disabled, false)
})

test('calendar: focus on a month button that reaches its limit moves to the grid', () => {
  const { click, next, focus, title } = setup({ max: '2026-12-20' })
  next.focus()
  click(next)
  assert.equal(title(), 'December 2026')
  assert.equal(next.disabled, true)
  assert.equal(focus(), 'Friday, December 11, 2026')
})

test('calendar: the keys pass over the days that disabled() refuses', () => {
  const weekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6
  const { day, key, focus, click, heard } = setup({ value: '2026-11-13', disabled: weekend })
  assert.equal(day(14).disabled, true)
  assert.equal(day(16).disabled, false)
  key(day(13), 'ArrowRight')
  assert.equal(focus(), 'Monday, November 16, 2026')
  key(day(16), 'ArrowLeft')
  assert.equal(focus(), 'Friday, November 13, 2026')
  key(day(13), 'End')
  assert.equal(focus(), 'Friday, November 13, 2026', 'the last day of the week that can be chosen')
  key(day(13), 'PageUp')
  assert.equal(focus(), 'Tuesday, October 13, 2026')
  key(day(13), 'PageDown')
  key(day(13), 'PageDown')
  assert.equal(focus(), 'Monday, December 14, 2026', '13 December is a Sunday')
  click(day(19))
  assert.deepEqual(heard, [])
})

test('calendar: the keys do not move when no day in their direction can be chosen', () => {
  const { day, key, focus } = setup({ disabled: (date: Date) => date > new Date(2026, 10, 11, 23) })
  assert.equal(key(day(11), 'ArrowRight'), true)
  assert.equal(key(day(11), 'ArrowDown'), true)
  assert.equal(key(day(11), 'PageDown'), true)
  assert.equal(focus(), null, 'focus was never moved')
  key(day(11), 'ArrowLeft')
  assert.equal(focus(), 'Tuesday, November 10, 2026')
})

test('calendar: a day in the tab order is one that can be chosen', () => {
  assert.equal(setup({ min: '2026-11-20' }).stop(), 'Friday, November 20, 2026')
  assert.equal(setup({ max: '2026-10-20' }).title(), 'October 2026')
  assert.equal(setup({ max: '2026-10-20' }).stop(), 'Tuesday, October 20, 2026')
  assert.equal(setup({ disabled: (date: Date) => date.getDate() === 11 }).stop(), 'Thursday, November 12, 2026')
  assert.equal(setup({ month: '2026-12', disabled: (date: Date) => date.getDate() < 5 }).stop(), 'Saturday, December 5, 2026')
})

test('calendar: weekStart sets the first column, and the locale sets it when the option is absent', () => {
  const sunday = setup({ weekStart: 0 })
  assert.deepEqual(sunday.all('.calendar-weekday').map((cell) => cell.textContent), ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
  assert.equal(sunday.days().length, 35, 'a week that starts on Sunday holds 1 November in its first column')
  assert.equal(sunday.days()[0].textContent, '1')
  assert.equal(setup({ weekStart: undefined, locale: 'en-US' }).all('.calendar-weekday')[0].textContent, 'Sun')
  assert.equal(setup({ weekStart: undefined, locale: 'en-GB' }).all('.calendar-weekday')[0].textContent, 'Mon')
  assert.equal(setup({ weekStart: 6 }).all('.calendar-weekday')[0].textContent, 'Sat')
})

test('calendar: the names follow the locale, which is the lang of the page when the option is absent', () => {
  const french = setup({ locale: 'fr' })
  assert.equal(french.title(), 'novembre 2026')
  assert.equal(french.all('.calendar-weekday')[0].getAttribute('aria-label'), 'lundi')
  assert.equal(french.day(13).getAttribute('aria-label'), 'vendredi 13 novembre 2026')
  const german = setup({ locale: undefined, weekStart: undefined }, 'lang="de"')
  assert.equal(german.title(), 'November 2026')
  assert.deepEqual(german.all('.calendar-weekday').map((cell) => cell.textContent), ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'])
  assert.equal(setup({ locale: undefined }, 'lang="not a language"').all('.calendar-weekday').length, 7, 'a lang that is no language falls back to the browser\'s')
})

test('calendar: a value that is no date is ignored', () => {
  assert.equal(setup({ value: '2026-02-30' }).detach.value, null)
  assert.equal(setup({ value: '13 November' }).detach.value, null)
  assert.equal(setup({ value: '2026-11' }).title(), 'November 2026')
  assert.deepEqual(setup({ range: true, value: ['2026-11-13', 'soon'] }).detach.value, ['2026-11-13', null])
})

test('calendar: every day of a month is written once where clocks change, at night or at midnight', () => {
  const zone = process.env.TZ
  try {
    for (const [name, month, length] of [['America/New_York', '2026-03', 31], ['America/New_York', '2026-11', 30], ['Asia/Beirut', '2026-03', 31], ['Europe/London', '2026-10', 31], ['America/Santiago', '2026-09', 30]] as const) {
      process.env.TZ = name
      const { all, day, key, focus, title } = setup({ month, value: `${month}-01` })
      assert.deepEqual(all('.calendar-day:not(.calendar-day-outside)').map((cell) => cell.textContent), Array.from({ length }, (_, index) => String(index + 1)), `${name} ${month}`)
      const last = new Set<string>()
      for (let number = 1; number < length; number++) {
        key(day(number), 'ArrowRight')
        last.add(focus())
      }
      assert.equal(last.size, length - 1, `${name} ${month}: each ArrowRight lands on a new day`)
      key(day(length), 'ArrowRight')
      assert.notEqual(title(), setup({ month }).title(), 'and the last one on the month after')
    }
  } finally {
    if (zone === undefined) delete process.env.TZ
    else process.env.TZ = zone
  }
})

test('calendar: detach removes the listeners and enables the month buttons, and leaves the month it drew', () => {
  const { detach, day, key, click, heard, next, previous, title, days } = setup({ min: '2026-11-01' })
  assert.equal(previous.disabled, true)
  detach()
  assert.equal(previous.disabled, false)
  assert.equal(key(day(11), 'ArrowRight'), false)
  click(day(13))
  click(next)
  assert.deepEqual(heard, [])
  assert.equal(title(), 'November 2026')
  assert.equal(days().length, 42)
})

test('calendar: attaching twice detaches the first', () => {
  const { root, day, click, heard, title, days } = setup()
  const second = calendar(root, { locale: 'en-US', weekStart: 1, value: '2026-12-24' })
  assert.equal(title(), 'December 2026')
  assert.equal(days().length, 35)
  click(day(25))
  assert.deepEqual(heard, ['2026-12-25'], 'one behavior answers')
  assert.equal(second.value, '2026-12-25')
})

test('calendar: a root without a grid is left alone', () => {
  const { one } = dom('<div class="calendar"></div>')
  const detach = calendar(one('.calendar'), { value: '2026-11-13' })
  assert.equal(detach.value, '2026-11-13')
  detach()
})
