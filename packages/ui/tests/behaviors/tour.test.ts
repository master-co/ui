import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { tour } from '../../behaviors/tour.js'

const thrown: unknown[] = []
afterEach(() => assert.deepEqual(thrown.splice(0), [], 'a listener threw'))

const markup = `<button type="button" id="start" commandfor="deploys-tour" command="--start">Take the tour</button>
<div class="toolbar" role="toolbar" aria-label="Deployments">
  <button type="button" class="btn" id="search">Search</button>
  <button type="button" class="btn" id="filter">Filter</button>
  <button type="button" class="btn" id="share">Share</button>
</div>
<div class="coachmark-tour" id="deploys-tour">
  <div class="coachmark-spotlight coachmark-spotlight-dim" popover="manual"></div>
  <div class="coachmark" id="step-search" popover="manual" role="dialog" aria-labelledby="step-search-title" data-target="#search">
    <p class="coachmark-count">1 of 3</p>
    <h2 class="coachmark-title" id="step-search-title">Search every deployment</h2>
    <div class="coachmark-actions">
      <button type="button" class="btn btn-sm btn-quiet" value="skip">Skip</button>
      <button type="button" class="btn btn-sm" value="next" id="next-1" autofocus>Next</button>
    </div>
  </div>
  <div class="coachmark" id="step-filter" popover="manual" role="dialog" aria-labelledby="step-filter-title" data-target="#filter">
    <p class="coachmark-count">2 of 3</p>
    <h2 class="coachmark-title" id="step-filter-title">Filter the list</h2>
    <div class="coachmark-actions">
      <button type="button" class="btn btn-sm btn-quiet" value="skip" id="skip-2">Skip</button>
      <button type="button" class="btn btn-sm btn-quiet" value="back" id="back-2">Back</button>
      <button type="button" class="btn btn-sm" value="next" id="next-2" autofocus>Next</button>
    </div>
  </div>
  <div class="coachmark" id="step-share" popover="manual" role="dialog" aria-labelledby="step-share-title" data-target="#share">
    <p class="coachmark-count">3 of 3</p>
    <h2 class="coachmark-title" id="step-share-title">Share a deployment</h2>
    <div class="coachmark-actions">
      <button type="button" class="btn btn-sm btn-quiet" value="back" id="back-3">Back</button>
      <button type="button" class="btn btn-sm" value="done" id="done-3" autofocus>Done</button>
    </div>
  </div>
</div>`

function setup(html = markup) {
  const page = dom(html)
  page.window.addEventListener('error', (event: any) => thrown.push(event.error ?? event.message))
  // What each popover was last opened against: the source showPopover() was given.
  const sources = new Map<Element, Element | undefined>()
  const opened: string[] = []
  const element = page.window.HTMLElement.prototype as any
  const show = element.showPopover
  element.showPopover = function (options?: { source?: Element }) {
    sources.set(this, options?.source)
    opened.push(this.id || this.className)
    return show.call(this)
  }
  const root = page.one<HTMLElement>('.coachmark-tour')
  const spotlight = page.document.querySelector('.coachmark-spotlight') as HTMLElement
  const heard: { type: string, detail: any }[] = []
  for (const type of ['change', 'end']) root.addEventListener(type, (event: any) => heard.push({ type, detail: event.detail }))
  const focused = () => (page.document.activeElement as HTMLElement | null)?.id
  const open = () => page.all<HTMLElement>('.coachmark').filter(step => page.isOpen(step)).map(step => step.id)
  const command = (target: Element, name: string, source?: Element) => target.dispatchEvent(Object.assign(new page.window.Event('command'), { command: name, source }))
  const wait = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))
  return { ...page, root, spotlight, sources, opened, heard, focused, open, command, wait }
}

test('tour: the start button opens the first step against its target, the spotlight first, and focus moves into it', () => {
  const { root, spotlight, one, click, sources, opened, heard, focused, open, isOpen } = setup()
  const handle = tour(root)
  assert.equal(handle.value, null, 'not running')
  one<HTMLElement>('#start').focus()
  // happy-dom has no invoker commands: the behavior hears the click itself.
  click(one('#start'))
  assert.deepEqual(open(), ['step-search'])
  assert.equal(handle.value, 0)
  assert.equal(sources.get(one('#step-search')), one('#search'), 'the step is anchored to its target')
  assert.equal(isOpen(spotlight), true)
  assert.equal(sources.get(spotlight), one('#search'), 'the spotlight stands over the same target')
  assert.deepEqual(opened, ['coachmark-spotlight coachmark-spotlight-dim', 'step-search'], 'the spotlight opens first, under the card')
  assert.equal(focused(), 'next-1', 'the action with autofocus takes focus')
  assert.deepEqual(heard, [{ type: 'change', detail: { value: 0 } }])
})

test('tour: the command event of invoker commands starts it, from the button that sent it', () => {
  const { root, one, command, focused, open, key } = setup()
  tour(root)
  command(root, '--other')
  assert.deepEqual(open(), [], 'another command is not the tour\'s')
  command(root, '--start', one('#start'))
  assert.deepEqual(open(), ['step-search'])
  key(one('#next-1'), 'Escape')
  assert.equal(focused(), 'start', 'focus goes back to the button that started it')
})

test('tour: Escape in a popover inside the step, or one a control inside has handled, is not the tour\'s', () => {
  const html = markup.replace('<button type="button" class="btn btn-sm" value="next" id="next-1" autofocus>Next</button>', '<button type="button" class="btn btn-sm" value="next" id="next-1" autofocus>Next</button><div popover class="menu" id="more"><button type="button" class="menu-item" id="more-item">More</button></div>')
  const { root, one, command, key, open } = setup(html)
  tour(root)
  command(root, '--start', one('#start'))
  assert.equal(key(one('#more-item'), 'Escape'), false)
  assert.deepEqual(open(), ['step-search'], 'the tour goes on')
  one('#next-1').addEventListener('keydown', (event: KeyboardEvent) => event.preventDefault())
  key(one('#next-1'), 'Escape')
  assert.deepEqual(open(), ['step-search'])
})

test('tour: focus goes back to where the tour started without scrolling the page there', () => {
  const { root, one, command, key } = setup()
  tour(root)
  const start = one<HTMLElement>('#start')
  const asked: unknown[] = []
  const focus = start.focus.bind(start)
  start.focus = (options?: FocusOptions) => { asked.push(options); focus(options) }
  command(root, '--start', start)
  key(one('#next-1'), 'Escape')
  assert.deepEqual(asked, [{ preventScroll: true }])
})

test('tour: Next, Back and Done move through the steps, each a change, and Done ends it complete', () => {
  const { root, one, click, heard, focused, open, sources, spotlight } = setup()
  const handle = tour(root)
  one<HTMLElement>('#start').focus()
  click(one('#start'))
  click(one('#next-1'))
  assert.deepEqual(open(), ['step-filter'], 'one step is open at a time')
  assert.equal(handle.value, 1)
  assert.equal(focused(), 'next-2')
  assert.equal(sources.get(spotlight), one('#filter'), 'the spotlight moves to the next target')
  click(one('#back-2'))
  assert.deepEqual(open(), ['step-search'])
  click(one('#next-1'))
  click(one('#next-2'))
  assert.deepEqual(open(), ['step-share'])
  click(one('#done-3'))
  assert.deepEqual(open(), [])
  assert.equal(handle.value, null)
  assert.equal(focused(), 'start', 'focus goes back to where it was when the tour started')
  assert.deepEqual(heard.map(each => each.type === 'end' ? each.detail : each.detail.value), [0, 1, 0, 1, 2, null, { completed: true }])
})

test('tour: Next on the last step completes the tour too', () => {
  const { root, one, click, heard } = setup(markup.replace('value="done" id="done-3"', 'value="next" id="done-3"'))
  const handle = tour(root)
  handle.value = 2
  click(one('#done-3'))
  assert.equal(handle.value, null)
  assert.deepEqual(heard.at(-1), { type: 'end', detail: { completed: true } })
})

test('tour: Skip and Escape end it early, skipped, and give focus back', () => {
  const { root, one, click, key, heard, focused, open, spotlight, isOpen } = setup()
  tour(root)
  one<HTMLElement>('#start').focus()
  click(one('#start'))
  click(one('#next-1'))
  click(one('#skip-2'))
  assert.deepEqual(open(), [])
  assert.equal(isOpen(spotlight), false, 'the spotlight closes with it')
  assert.equal(focused(), 'start')
  assert.deepEqual(heard.slice(-2), [{ type: 'change', detail: { value: null } }, { type: 'end', detail: { completed: false } }])

  click(one('#start'))
  assert.equal(key(one('#next-1'), 'Escape'), true, 'Escape in a step is the tour\'s')
  assert.deepEqual(open(), [])
  assert.equal(focused(), 'start')
  assert.deepEqual(heard.at(-1), { type: 'end', detail: { completed: false } })
  assert.equal(key(one('#search'), 'Escape'), false, 'Escape elsewhere is left alone')
})

test('tour: Tab is left to the browser; a step keeps no focus', () => {
  const { root, one, click, key } = setup()
  tour(root)
  click(one('#start'))
  assert.equal(key(one('#next-1'), 'Tab'), false)
  assert.equal(key(one('#next-1'), 'Tab', { shiftKey: true }), false)
})

test('tour: focus stays where the reader moved it in the page when the tour ends', () => {
  const { root, one, click, focused } = setup()
  const handle = tour(root)
  one<HTMLElement>('#start').focus()
  click(one('#start'))
  one<HTMLElement>('#share').focus()
  handle.value = null
  assert.equal(focused(), 'share')
})

test('tour: a disabled action does nothing', () => {
  const { root, one, click, open } = setup(markup.replace('value="next" id="next-1" autofocus', 'value="next" id="next-1" aria-disabled="true"'))
  tour(root)
  click(one('#start'))
  click(one('#next-1'))
  assert.deepEqual(open(), ['step-search'])
})

test('tour: a step without a target is the element right before it, and one without an autofocus action takes focus itself', () => {
  const { root, one, open, sources, focused } = setup(`<div class="coachmark-tour" id="t">
    <button type="button" id="plan">Plan</button>
    <div class="coachmark" id="step-plan" popover="manual" role="dialog" aria-labelledby="plan-title">
      <h2 class="coachmark-title" id="plan-title">Choose a plan</h2>
    </div>
  </div>`)
  const handle = tour(root)
  handle.value = 0
  assert.deepEqual(open(), ['step-plan'])
  assert.equal(sources.get(one('#step-plan')), one('#plan'))
  assert.equal(focused(), 'step-plan')
  assert.equal(one('#step-plan').getAttribute('tabindex'), '-1')
})

test('tour: the target option finds the targets', () => {
  const { root, one, open, sources } = setup()
  const handle = tour(root, { target: (_step, index) => [one('#share'), one('#search'), null][index] })
  handle.value = 0
  assert.equal(sources.get(one('#step-search')), one('#share'))
  handle.value = 1
  assert.deepEqual(open(), ['step-filter'])
  assert.equal(sources.get(one('#step-filter')), one('#search'))
})

test('tour: setting value opens that step and says nothing; null ends it and says nothing', () => {
  const { root, one, heard, open, focused } = setup()
  const handle = tour(root)
  one<HTMLElement>('#start').focus()
  handle.value = 1
  assert.deepEqual(open(), ['step-filter'])
  assert.equal(focused(), 'next-2')
  handle.value = 1
  handle.value = 7
  assert.deepEqual(open(), ['step-filter'], 'the same value, or one past the steps, changes nothing')
  handle.value = null
  assert.deepEqual(open(), [])
  assert.equal(focused(), 'start')
  assert.deepEqual(heard, [])
})

test('tour: a step waits for its target to appear, then opens', async () => {
  const { root, one, click, document, open, wait, heard, focused, sources } = setup(markup.replace('data-target="#filter"', 'data-target="#filters-panel"'))
  const handle = tour(root, { wait: 1000 })
  click(one('#start'))
  click(one('#next-1'))
  assert.equal(handle.value, 1, 'the tour is on the step')
  assert.deepEqual(open(), [], 'and waits, with nothing open')
  const panel = document.createElement('div')
  panel.id = 'filters-panel'
  one('.toolbar').after(panel)
  await wait()
  assert.deepEqual(open(), ['step-filter'], 'it opens as the target appears')
  assert.equal(sources.get(one('#step-filter')), panel)
  assert.equal(focused(), 'next-2')
  assert.deepEqual(heard.map(each => each.detail.value), [0, 1])
})

test('tour: a hidden target is waited for until it is shown', async () => {
  const { root, one, open, wait } = setup(markup.replace('id="filter"', 'id="filter" hidden'))
  const handle = tour(root, { wait: 1000 })
  handle.value = 1
  assert.deepEqual(open(), [])
  one<HTMLElement>('#filter').hidden = false
  await wait()
  assert.deepEqual(open(), ['step-filter'])
})

test('tour: a step whose target never appears is passed over after the wait, and past the last step the tour is complete', async () => {
  const { root, one, click, open, wait, heard } = setup(markup.replace('data-target="#filter"', 'data-target="#nowhere"').replace('data-target="#share"', 'data-target="#gone"'))
  const handle = tour(root, { wait: 20 })
  click(one('#start'))
  click(one('#next-1'))
  assert.deepEqual(open(), [])
  await wait(30)
  assert.equal(handle.value, 2, 'the step was passed over')
  assert.deepEqual(open(), [], 'the next waits too')
  await wait(30)
  assert.equal(handle.value, null)
  assert.deepEqual(heard.map(each => each.type === 'end' ? each.detail : each.detail.value), [0, 1, 2, null, { completed: true }])
})

test('tour: Back passes over a step whose target is gone, without waiting', () => {
  const { root, one, click, open, document } = setup()
  const handle = tour(root)
  handle.value = 2
  one('#filter').remove()
  click(one('#back-3'))
  assert.deepEqual(open(), ['step-search'])
  assert.equal(handle.value, 0)
  one('#search').remove()
  handle.value = 2
  click(one('#back-3'))
  assert.deepEqual(open(), ['step-share'], 'with no step to go back to, it stays')
  assert.ok(document)
})

test('tour: a step with data-advance moves on when the reader does it on the target, once the page has answered', async () => {
  const { root, one, click, open, wait, heard, focused } = setup(markup.replace('data-target="#filter"', 'data-target="#filter" data-advance="click"'))
  const handle = tour(root)
  handle.value = 1
  click(one('#search'))
  await wait()
  assert.deepEqual(open(), ['step-filter'], 'another element\'s click is not the action')
  click(one('#filter'))
  assert.deepEqual(open(), ['step-filter'], 'the page answers first')
  await wait()
  assert.deepEqual(open(), ['step-share'])
  assert.equal(focused(), 'done-3')
  assert.deepEqual(heard.map(each => each.detail.value), [2])
})

test('tour: a step closed by something else ends the tour where it stands', () => {
  const { root, one, click, heard, open } = setup()
  tour(root)
  click(one('#start'))
  one<HTMLElement>('#step-search').hidePopover()
  assert.deepEqual(open(), [])
  assert.deepEqual(heard.at(-1), { type: 'end', detail: { completed: false } })
})

test('tour: detach closes what is open and removes the listeners', async () => {
  const { root, one, click, open, spotlight, isOpen, wait } = setup(markup.replace('data-target="#filter"', 'data-target="#later"'))
  const detach = tour(root, { wait: 10 })
  click(one('#start'))
  click(one('#next-1'))
  detach()
  assert.deepEqual(open(), [])
  assert.equal(isOpen(spotlight), false)
  await wait(20)
  click(one('#start'))
  assert.deepEqual(open(), [], 'nothing starts it, nor did the wait run on')
})

test('tour: attaching twice keeps one tour', () => {
  const { root, one, click, heard } = setup()
  tour(root)
  tour(root)
  click(one('#start'))
  assert.equal(heard.length, 1)
})

test('tour: Escape held with another key is not the tour\'s, as a panel leaves it', () => {
  const { root, one, click, key, open } = setup()
  tour(root)
  click(one('#start'))
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey']) {
    assert.equal(key(one('#next-1'), 'Escape', { [modifier]: true }), false, `${modifier} with Escape is left alone`)
  }
  assert.deepEqual(open(), ['step-search'])
})

test('tour: detach takes away the tabindex it gave a step to take focus, and leaves one the page wrote', () => {
  const html = `<div class="coachmark-tour" id="t">
    <button type="button" id="plan">Plan</button>
    <div class="coachmark" id="step-plan" popover="manual" role="dialog" aria-label="Plan"><p>Choose a plan</p></div>
    <button type="button" id="seat">Seat</button>
    <div class="coachmark" id="step-seat" popover="manual" role="dialog" aria-label="Seat" tabindex="-1"><p>Pick a seat</p></div>
  </div>`
  const { root, one } = setup(html)
  const handle = tour(root)
  handle.value = 0
  handle.value = 1
  assert.equal(one('#step-plan').getAttribute('tabindex'), '-1')
  handle()
  assert.equal(one('#step-plan').hasAttribute('tabindex'), false, 'what the script added goes')
  assert.equal(one('#step-seat').getAttribute('tabindex'), '-1', 'what the page wrote stays')
})
