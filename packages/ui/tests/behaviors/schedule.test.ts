import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { dom } from './dom.ts'
import { schedule, scheduleLayout } from '../../behaviors/schedule.js'

const base = { locale: 'en-US', weekStart: 1, today: '2026-11-13' }
/** Intl puts thin and narrow spaces around a range's dash and before AM and PM; compare words, not spaces. */
const words = (text: string | null | undefined) => text?.replace(/\s/g, ' ')

test('scheduleLayout: floating clock times keep their labels through a host daylight-saving gap', () => {
  const script = `
    import { scheduleLayout } from ${JSON.stringify(new URL('../../behaviors/schedule.js', import.meta.url).href)}
    const date = '2026-03-08'
    const layout = scheduleLayout({ date, view: 'day' }, {
      locale: 'en-US', today: date,
      events: [{ id: 'talk', title: 'Talk', start: date + 'T02:30', end: date + 'T03:30' }],
    })
    const { time, label, start, end } = layout.days[0].items[0]
    console.log(JSON.stringify({ time, label, start, end, rail: layout.rail }))
  `
  const inZone = (TZ: string) => JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf8', env: { ...process.env, TZ },
  }))
  const utc = inZone('UTC')
  assert.equal(words(utc.time), '2:30 AM – 3:30 AM')
  assert.match(words(utc.label)!, /2:30 AM – 3:30 AM/)
  assert.deepEqual([utc.start, utc.end], [2.5, 3.5])
  assert.deepEqual(inZone('America/New_York'), utc)
})

test('scheduleLayout: a month is the weeks that hold its days, from the chosen first day of the week', () => {
  const monday = scheduleLayout({ date: '2026-11-13', view: 'month' }, base)
  assert.equal(monday.title, 'November 2026')
  assert.equal(monday.weekdays[0].short, 'Mon')
  assert.equal(monday.weeks[0].days[0].date, '2026-10-26', 'the first week starts on the Monday before the 1st')
  assert.equal(monday.weeks[0].days[0].outside, true)
  assert.equal(monday.weeks.at(-1)!.days.at(-1)!.date, '2026-12-06')
  assert.equal(monday.weeks.flatMap(week => week.days).find(day => day.today)?.date, '2026-11-13')

  const sunday = scheduleLayout({ date: '2026-11-13', view: 'month' }, { ...base, weekStart: 0 })
  assert.equal(sunday.weekdays[0].short, 'Sun')
  assert.equal(sunday.weeks[0].days[0].date, '2026-11-01', 'November 2026 begins on a Sunday')
})

test('scheduleLayout: a leap February, and turning across a year', () => {
  const leap = scheduleLayout({ date: '2028-02-10', view: 'month' }, base)
  const days = leap.weeks.flatMap(week => week.days).filter(day => !day.outside)
  assert.equal(days.length, 29)
  assert.equal(days.at(-1)!.date, '2028-02-29')
  const january = scheduleLayout({ date: '2026-01-31', view: 'month' }, base)
  assert.equal(january.next, '2026-02-28', 'a month on keeps to the last day of a shorter month')
  assert.equal(scheduleLayout({ date: '2026-12-31', view: 'day' }, base).next, '2027-01-01')
  assert.equal(scheduleLayout({ date: '2027-01-03', view: 'week' }, base).previous, '2026-12-27')
})

test('scheduleLayout: an all-day end is exclusive, and an event across weeks is a piece in each, marked as going on', () => {
  const layout = scheduleLayout({ date: '2026-11-13', view: 'month' }, {
    ...base,
    events: [
      { id: 'one', title: 'Holiday', start: '2026-11-13', end: '2026-11-14', allDay: true },
      { id: 'trip', title: 'Offsite', start: '2026-11-07', end: '2026-11-11', allDay: true, category: 'teal' },
    ],
  })
  const all = layout.weeks.flatMap(week => week.days.flatMap(day => day.items.map(item => ({ day: day.date, item }))))
  const holiday = all.filter(entry => entry.item.id === 'one')
  assert.equal(holiday.length, 1)
  assert.equal(holiday[0].item.span, 1, 'the 14th is not part of it')
  const trip = all.filter(entry => entry.item.id === 'trip')
  assert.deepEqual(trip.map(entry => [entry.day, entry.item.span, entry.item.continued, entry.item.continues]), [
    ['2026-11-07', 2, false, true],
    ['2026-11-09', 2, true, false],
  ])
  assert.match(trip[0].item.classes, /schedule-event-lane/)
  assert.match(trip[0].item.classes, /schedule-event-continues/)
  assert.match(trip[0].item.classes, /schedule-event-category category-teal/)
  assert.equal(words(trip[0].item.label), 'Offsite, November 7 – 10, 2026', 'the accessible name says when, with the exclusive end taken back')
})

test('scheduleLayout: a month shows its lanes and counts the rest behind a day\'s more button', () => {
  const events = Array.from({ length: 5 }, (_, index) => ({ id: `e${index}`, title: `Talk ${index}`, start: `2026-11-12T${String(9 + index).padStart(2, '0')}:00`, end: `2026-11-12T${String(10 + index).padStart(2, '0')}:00` }))
  const layout = scheduleLayout({ date: '2026-11-12', view: 'month' }, { ...base, events })
  const thursday = layout.weeks.flatMap(week => week.days).find(day => day.date === '2026-11-12')!
  assert.equal(thursday.count, 5)
  assert.equal(thursday.items.length, 3, 'three lanes by default')
  assert.equal(thursday.hidden, 2)
  assert.equal(thursday.all.length, 5, 'the more button lists all of them')
  assert.equal(thursday.items[0].plain, true, 'a short event in a month is a dot and words')
  assert.equal(words(thursday.items[0].time), '9:00 AM')
  assert.equal(thursday.summary, 'Thursday, November 12, 2026, 5 events')
  assert.ok(layout.weeks.every(week => week.lanes === 3), 'every week keeps the same lanes')
})

test('scheduleLayout: a week lays out overlapping events side by side, and splits one past midnight', () => {
  const layout = scheduleLayout({ date: '2026-11-11', view: 'week' }, {
    ...base,
    events: [
      { id: 'a', title: 'Review', start: '2026-11-11T10:00', end: '2026-11-11T11:30' },
      { id: 'b', title: 'Lunch', start: '2026-11-11T11:00', end: '2026-11-11T12:00' },
      { id: 'c', title: 'Sync', start: '2026-11-11T13:00', end: '2026-11-11T13:30' },
      { id: 'night', title: 'Deploy window', start: '2026-11-12T22:00', end: '2026-11-13T02:00' },
      { id: 'conf', title: 'Conference', start: '2026-11-12', end: '2026-11-14', allDay: true },
    ],
  })
  assert.equal(words(layout.title), 'Nov 9 – 15, 2026')
  assert.equal(layout.days.length, 7)
  const wednesday = layout.days.find(day => day.date === '2026-11-11')!
  assert.deepEqual(wednesday.items.map(item => [item.id, item.start, item.end, item.lane, item.lanes]), [
    ['a', 10, 11.5, 0, 2],
    ['b', 11, 12, 1, 2],
    ['c', 13, 13.5, 0, 1],
  ])
  const thursday = layout.days.find(day => day.date === '2026-11-12')!.items.find(item => item.id === 'night')!
  const friday = layout.days.find(day => day.date === '2026-11-13')!.items.find(item => item.id === 'night')!
  assert.deepEqual([thursday.start, thursday.end, thursday.continued, thursday.continues], [22, 24, false, true])
  assert.deepEqual([friday.start, friday.end, friday.continued, friday.continues], [0, 2, true, false])
  assert.equal(layout.from, 0, 'the hours reach the earliest event')
  assert.equal(layout.to, 24)
  assert.equal(layout.rail.length, 25)
  assert.deepEqual(layout.allDay.map(item => [item.id, item.column, item.span, item.lane]), [['conf', 4, 2, 0]])
})

test('scheduleLayout: a day keeps its hours, an empty agenda says so, and the agenda lists days in order', () => {
  const empty = scheduleLayout({ date: '2026-11-13', view: 'day' }, base)
  assert.equal(empty.title, 'Friday, November 13, 2026')
  assert.deepEqual([empty.from, empty.to], [8, 18])
  assert.equal(words(empty.rail[0]), '8 AM')
  assert.deepEqual(scheduleLayout({ view: 'agenda', date: '2026-11-13' }, base).agenda, [])

  const agenda = scheduleLayout({ date: '2026-11-13', view: 'agenda' }, {
    ...base,
    events: [
      { id: 'late', title: 'Retro', start: '2026-11-20T16:00', end: '2026-11-20T17:00' },
      { id: 'early', title: 'Kickoff', start: '2026-11-03T09:00', end: '2026-11-03T09:30' },
      { id: 'all', title: 'Holiday', start: '2026-11-20', end: '2026-11-21', allDay: true },
    ],
  })
  assert.deepEqual(agenda.agenda.map(day => [day.date, day.items.map(item => item.id)]), [
    ['2026-11-03', ['early']],
    ['2026-11-20', ['all', 'late']],
  ])
  assert.equal(agenda.agenda[1].items[0].time, 'All day')
})

test('scheduleLayout: dates are counted with the calendar across a daylight-saving change', () => {
  const layout = scheduleLayout({ date: '2026-03-08', view: 'week' }, { ...base, events: [{ id: 'x', title: 'Trip', start: '2026-03-07', end: '2026-03-10', allDay: true }] })
  assert.deepEqual(layout.days.map(day => day.date), ['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07', '2026-03-08'])
  assert.equal(layout.allDay[0].span, 2)
  assert.equal(layout.allDay[0].continues, true)
})

const view = `<section class="schedule-view" id="team">
  <div class="schedule-view-header">
    <button type="button" class="btn btn-sm schedule-view-today">Today</button>
    <button type="button" class="btn btn-sm btn-square btn-quiet schedule-view-previous" aria-label="Previous"></button>
    <button type="button" class="btn btn-sm btn-square btn-quiet schedule-view-next" aria-label="Next"></button>
    <h2 class="schedule-view-title" aria-live="polite"></h2>
    <div class="segmented schedule-view-switch">
      <label class="segmented-item"><input class="segmented-input" type="radio" name="view" value="week">Week</label>
      <label class="segmented-item"><input class="segmented-input" type="radio" name="view" value="month">Month</label>
      <label class="segmented-item"><input class="segmented-input" type="radio" name="view" value="agenda">Agenda</label>
    </div>
  </div>
  <div class="schedule-view-body"></div>
</section>`

const events = [{ id: 'standup', title: 'Standup', start: '2026-11-13T09:00', end: '2026-11-13T09:15' }]

test('schedule: writes the month, names it, and moves by a month', () => {
  const page = dom(view)
  const heard: string[] = []
  for (const type of ['input', 'change']) page.document.body.addEventListener(type, () => heard.push(type))
  const handle = schedule(page.one('.schedule-view'), { ...base, events })
  assert.deepEqual(handle.value, { date: '2026-11-13', view: 'month' })
  assert.equal(page.one('.schedule-view-title').textContent, 'November 2026')
  assert.equal(page.all('.schedule-week').length, 6)
  assert.equal(page.one<HTMLInputElement>('input[value="month"]').checked, true)
  assert.equal(page.one('.schedule-date[aria-current="date"] .schedule-date-number').textContent, '13')
  const standup = page.one<HTMLButtonElement>('.schedule-event')
  assert.equal(standup.value, 'standup', 'an event without a link is a button the page listens to')
  assert.equal(words(standup.getAttribute('aria-label')), 'Standup, Friday, November 13, 2026, 9:00 AM – 9:15 AM')

  page.click(page.one('.schedule-view-next'))
  assert.deepEqual(handle.value, { date: '2026-12-13', view: 'month' })
  assert.equal(page.one('.schedule-view-title').textContent, 'December 2026')
  assert.deepEqual(heard, ['input', 'change'])
  page.click(page.one('.schedule-view-today'))
  assert.equal(handle.value.date, '2026-11-13')
  assert.deepEqual(page.errors, [])
})

test('schedule: the switch chooses the view, and a day\'s number opens the day with focus on its name', () => {
  const page = dom(view)
  const handle = schedule(page.one('.schedule-view'), { ...base, events })
  const week = page.one<HTMLInputElement>('input[value="week"]')
  week.checked = true
  week.dispatchEvent(new page.window.Event('change', { bubbles: true }))
  assert.equal(handle.value.view, 'week')
  assert.equal(page.all('.schedule-day').length, 7)
  assert.equal(words(page.one('.schedule-view-title').textContent), 'Nov 9 – 15, 2026')

  handle.value = { date: '2026-11-13', view: 'month' }
  page.click(page.all<HTMLButtonElement>('.schedule-date-number').find(button => button.value === '2026-11-20'))
  assert.deepEqual(handle.value, { date: '2026-11-20', view: 'day' })
  assert.equal(page.all('.schedule-day').length, 1)
  assert.equal(page.document.activeElement, page.one('.schedule-view-title'))
  assert.equal(page.one<HTMLInputElement>('input[value="month"]').checked, false, 'no radio stands for the day view')
})

test('schedule: a value set from outside is shown and says nothing; a renderer may write it instead', () => {
  const page = dom(view)
  const heard: string[] = []
  page.document.body.addEventListener('change', () => heard.push('change'))
  const drawn: unknown[] = []
  const handle = schedule(page.one('.schedule-view'), { ...base, draw: next => drawn.push(next) })
  assert.deepEqual(drawn, [{ date: '2026-11-13', view: 'month' }])
  assert.equal(page.one('.schedule-view-body').children.length, 0, 'the renderer writes the body')
  handle.value = { date: '2026-11-13', view: 'agenda' }
  assert.deepEqual(drawn.at(-1), { date: '2026-11-13', view: 'agenda' })
  assert.equal(page.one<HTMLInputElement>('input[value="agenda"]').checked, true)
  assert.deepEqual(heard, [])
})

test('schedule: detach removes the listeners, and attaching twice is safe', () => {
  const page = dom(view)
  const root = page.one('.schedule-view')
  const first = schedule(root, base)
  schedule(root, base)()
  page.click(page.one('.schedule-view-next'))
  assert.equal(first.value.date, '2026-11-13')
})

test('schedule: detach takes away the tabindex it gave the title to take focus, and leaves one the page wrote', () => {
  const open = (page: ReturnType<typeof dom>) => page.click(page.all<HTMLButtonElement>('.schedule-date-number').find(button => button.value === '2026-11-20'))
  {
    const page = dom(view)
    const title = page.one<HTMLElement>('.schedule-view-title')
    const detach = schedule(page.one('.schedule-view'), { ...base, events })
    open(page)
    assert.equal(title.getAttribute('tabindex'), '-1')
    page.one<HTMLElement>('.schedule-view-next').focus()
    detach()
    assert.equal(title.hasAttribute('tabindex'), false, 'what the script added goes')
  }
  {
    const page = dom(view)
    const root = page.one('.schedule-view')
    const title = page.one<HTMLElement>('.schedule-view-title')
    schedule(root, { ...base, events })
    open(page)
    schedule(root, { ...base, events })
    assert.equal(title.getAttribute('tabindex'), '-1', 'attached again while the title has focus, it keeps it')
    assert.equal(page.document.activeElement, title)
  }
  {
    const page = dom(view.replace('aria-live="polite"', 'aria-live="polite" tabindex="-1"'))
    const detach = schedule(page.one('.schedule-view'), { ...base, events })
    open(page)
    page.one<HTMLElement>('.schedule-view-next').focus()
    detach()
    assert.equal(page.one('.schedule-view-title').getAttribute('tabindex'), '-1', 'the page\'s own stays')
  }
})
