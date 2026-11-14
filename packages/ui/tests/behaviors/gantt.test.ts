import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { gantt } from '../../behaviors/gantt.js'

const thrown: unknown[] = []
afterEach(() => assert.deepEqual(thrown.splice(0), [], 'a listener threw'))

const row = (value: string, name: string, from: number, to: number | null, bar = 'role="slider"', extra = '') =>
  `<li class="gantt-row" data-value="${value}" style="--from: ${from}${to === null ? '' : `; --to: ${to}`}"><span class="gantt-label">${name}</span><span class="gantt-bar${to === null ? ' gantt-milestone' : ''}" ${bar}${extra}>Days ${from} to ${to ?? from}</span></li>`

const markup = (direction = 'ltr') => `<ol class="gantt" dir="${direction}" style="--gantt-from: 0; --gantt-to: 10; direction: ${direction}" aria-label="Sprint plan, in days">
  <li class="gantt-row gantt-scale" aria-hidden="true"><ol class="gantt-ticks"><li>1</li><li>2</li></ol></li>
  ${row('research', 'Research', 0, 3)}
  ${row('design', 'Design', 2, 6)}
  ${row('build', 'Build', 4, 8, 'role="slider"', ' aria-readonly="true"')}
  ${row('review', 'Review', 6, 9, 'role="slider"', ' aria-disabled="true"')}
  ${row('launch', 'Launch', 9, null)}
  ${row('retro', 'Retro', 9, 10, '')}
</ol>
<p class="gantt-status" role="status"></p>`

/** The track starts at 100px and a day is 50px wide; a bar is drawn from its row's numbers, as the stylesheet does. */
function draw(root: HTMLElement, direction: string) {
  for (const bar of root.querySelectorAll<HTMLElement>('.gantt-bar')) {
    bar.getBoundingClientRect = () => {
      const row = bar.closest<HTMLElement>('.gantt-row')!
      const from = parseFloat(row.style.getPropertyValue('--from'))
      const to = bar.classList.contains('gantt-milestone') ? from + .24 : parseFloat(row.style.getPropertyValue('--to'))
      const width = (to - from) * 50
      const left = direction === 'rtl' ? 600 - to * 50 : 100 + from * 50
      return { left, right: left + width, width, top: 0, bottom: 28, height: 28, x: left, y: 0 } as DOMRect
    }
  }
}

function setup(direction = 'ltr') {
  const page = dom(markup(direction))
  page.window.addEventListener('error', (event: any) => thrown.push(event.error ?? event.message))
  const root = page.one<HTMLElement>('.gantt')
  draw(root, direction)
  const heard: string[] = []
  for (const type of ['input', 'change']) root.addEventListener(type, () => heard.push(type))
  const bar = (value: string) => page.one<HTMLElement>(`.gantt-row[data-value="${value}"] .gantt-bar`)
  const range = (value: string) => {
    const style = page.one<HTMLElement>(`.gantt-row[data-value="${value}"]`).style
    return [parseFloat(style.getPropertyValue('--from')), parseFloat(style.getPropertyValue('--to'))]
  }
  const status = page.one('.gantt-status')
  const said = async () => {
    await new Promise(resolve => setTimeout(resolve, 450))
    return status.textContent
  }
  /** Press a bar at a point, move to others, and let go. */
  const drag = (value: string, from: number, ...to: number[]) => {
    const target = bar(value)
    page.pointer(target, 'pointerdown', { button: 0, isPrimary: true, pointerId: 1, clientX: from })
    for (const x of to) page.pointer(target, 'pointermove', { pointerId: 1, clientX: x })
  }
  const release = (value: string, x: number) => page.pointer(bar(value), 'pointerup', { pointerId: 1, clientX: x })
  return { ...page, root, heard, bar, range, said, drag, release }
}

test('gantt: a bar marked as a slider gets a name, its limits, its value and one stop in the tab order', () => {
  const { root, bar, all } = setup()
  gantt(root)
  const research = bar('research')
  assert.equal(research.getAttribute('aria-labelledby'), research.previousElementSibling!.id, 'it is named by its label')
  assert.equal(research.getAttribute('aria-valuemin'), '0')
  assert.equal(research.getAttribute('aria-valuemax'), '10')
  assert.equal(research.getAttribute('aria-valuenow'), '0')
  assert.equal(bar('design').getAttribute('aria-valuetext'), '2 to 6')
  assert.deepEqual(all<HTMLElement>('.gantt-bar[role="slider"]').map(each => each.getAttribute('tabindex')), ['0', '-1', '-1', '-1', '-1'])
  assert.equal(bar('retro').hasAttribute('tabindex'), false, 'a bar that is not a slider stays a picture')
  assert.equal(bar('retro').hasAttribute('aria-valuenow'), false)
})

test('gantt: ArrowUp and ArrowDown go to the bar above and below, past a disabled one, and stop at the ends', () => {
  const { root, bar, key, document } = setup()
  gantt(root)
  bar('research').focus()
  assert.equal(key(bar('research'), 'ArrowDown'), true)
  assert.equal(document.activeElement, bar('design'))
  assert.equal(bar('design').tabIndex, 0, 'the bar with focus is the stop in the tab order')
  assert.equal(bar('research').tabIndex, -1)
  key(bar('design'), 'ArrowDown')
  assert.equal(document.activeElement, bar('build'), 'a read-only bar is read')
  key(bar('build'), 'ArrowDown')
  assert.equal(document.activeElement, bar('launch'), 'a disabled one is passed over')
  key(bar('launch'), 'ArrowDown')
  assert.equal(document.activeElement, bar('launch'), 'the last bar is the end')
  key(bar('launch'), 'ArrowUp')
  assert.equal(document.activeElement, bar('build'))
})

test('gantt: a disabled bar a press focused does not take the tab stop, and the arrows go on from its place', () => {
  const { root, bar, key, document } = setup()
  gantt(root)
  bar('review').focus()
  assert.equal(bar('review').tabIndex, -1, 'the stop stays on a bar the keys can land on')
  assert.equal(bar('research').tabIndex, 0)
  key(bar('review'), 'ArrowDown')
  assert.equal(document.activeElement, bar('launch'))
  bar('review').focus()
  key(bar('review'), 'ArrowUp')
  assert.equal(document.activeElement, bar('build'))
})

test('gantt: ArrowLeft and ArrowRight move a bar a step, and its value, text and events follow', () => {
  const { root, bar, key, range, heard } = setup()
  const handle = gantt(root)
  const design = bar('design')
  design.focus()
  assert.equal(key(design, 'ArrowRight'), true)
  assert.deepEqual(range('design'), [3, 7])
  assert.equal(design.getAttribute('aria-valuenow'), '3')
  assert.equal(design.getAttribute('aria-valuetext'), '3 to 7')
  assert.equal(design.textContent, '3 to 7', 'the bar says its new range')
  assert.deepEqual(heard, ['input', 'change'])
  key(design, 'ArrowLeft')
  key(design, 'ArrowLeft')
  assert.deepEqual(range('design'), [1, 5])
  assert.deepEqual(handle.value.design, [1, 5])
})

test('gantt: Shift with an arrow moves the end, Alt the start, and a bar is never shorter than a step', () => {
  const { root, bar, key, range } = setup()
  gantt(root)
  const design = bar('design')
  key(design, 'ArrowRight', { shiftKey: true })
  assert.deepEqual(range('design'), [2, 7])
  key(design, 'ArrowLeft', { altKey: true })
  assert.deepEqual(range('design'), [1, 7])
  key(design, 'End', { altKey: true })
  assert.deepEqual(range('design'), [6, 7], 'the start goes as far as one step before the end')
  assert.equal(key(design, 'ArrowRight', { altKey: true }), true)
  assert.deepEqual(range('design'), [6, 7])
  key(design, 'Home', { shiftKey: true })
  assert.deepEqual(range('design'), [6, 7], 'the end stays a step after the start')
  key(design, 'End', { shiftKey: true })
  assert.deepEqual(range('design'), [6, 10], 'the end goes as far as the scale')
})

test('gantt: Home and End take a bar to the start and the end of the scale, and the arrows stop there', () => {
  const { root, bar, key, range, heard } = setup()
  gantt(root)
  const design = bar('design')
  key(design, 'End')
  assert.deepEqual(range('design'), [6, 10])
  heard.length = 0
  assert.equal(key(design, 'ArrowRight'), true)
  assert.deepEqual(range('design'), [6, 10])
  assert.deepEqual(heard, [], 'nothing changed, nothing is said')
  key(design, 'Home')
  assert.deepEqual(range('design'), [0, 4])
})

test('gantt: a bar stays between its own aria-valuemin and aria-valuemax', () => {
  const { root, bar, key, range } = setup()
  bar('design').setAttribute('aria-valuemin', '1')
  bar('design').setAttribute('aria-valuemax', '7')
  gantt(root)
  key(bar('design'), 'Home')
  assert.deepEqual(range('design'), [1, 5])
  key(bar('design'), 'End')
  assert.deepEqual(range('design'), [3, 7])
})

test('gantt: from right to left the dates run with the reading, so ArrowLeft is later', () => {
  const { root, bar, key, range } = setup('rtl')
  gantt(root)
  key(bar('design'), 'ArrowLeft')
  assert.deepEqual(range('design'), [3, 7])
  key(bar('design'), 'ArrowRight', { shiftKey: true })
  assert.deepEqual(range('design'), [3, 6])
})

test('gantt: a milestone moves as a point and has no end to move', () => {
  const { root, bar, key, all, range } = setup()
  const handle = gantt(root)
  const launch = bar('launch')
  key(launch, 'ArrowLeft')
  assert.equal(all<HTMLElement>('.gantt-row')[5].style.getPropertyValue('--from'), '8')
  assert.equal(all<HTMLElement>('.gantt-row')[5].style.getPropertyValue('--to'), '', 'a milestone is given no end')
  assert.equal(launch.getAttribute('aria-valuetext'), '8')
  assert.deepEqual(handle.value.launch, [8, 8])
  assert.equal(key(launch, 'ArrowLeft', { shiftKey: true }), false)
  assert.deepEqual(range('launch').slice(0, 1), [8])
})

test('gantt: a read-only bar and a disabled one do not move, by key or by pointer', () => {
  const { root, bar, key, range, drag, release, heard } = setup()
  gantt(root)
  assert.equal(key(bar('build'), 'ArrowRight'), false)
  assert.equal(key(bar('review'), 'ArrowRight'), false)
  drag('build', 400, 500)
  release('build', 500)
  drag('review', 500, 600)
  release('review', 600)
  assert.deepEqual(range('build'), [4, 8])
  assert.deepEqual(range('review'), [6, 9])
  assert.deepEqual(heard, [])
})

test('gantt: beforechange asks the page first; refused, the bar stays and the status says so', async () => {
  const { root, bar, key, range, heard, said } = setup()
  gantt(root)
  const asked: unknown[] = []
  root.addEventListener('beforechange', (event: any) => {
    asked.push(event.detail)
    if (event.detail.range[1] > 6) event.preventDefault()
  })
  key(bar('design'), 'ArrowLeft')
  assert.deepEqual(asked, [{ id: 'design', range: [1, 5], previous: [2, 6] }])
  key(bar('design'), 'End')
  assert.deepEqual(range('design'), [1, 5], 'the refused range is not taken')
  assert.deepEqual(heard, ['input', 'change'], 'only the change that was taken is said')
  assert.equal(await said(), 'Design cannot move there. It stays at 1 to 5.')
})

test('gantt: dragging the body of a bar moves it, snapped to steps, with input on the way and change on the drop', () => {
  const { root, bar, range, drag, release, heard } = setup()
  gantt(root)
  // Design is drawn from 200 to 400.
  drag('design', 300, 302)
  assert.deepEqual(heard, [], 'a press that moves a few pixels is not a drag')
  drag('design', 300, 320, 340, 360)
  assert.equal(bar('design').getAttribute('aria-busy'), 'true')
  assert.deepEqual(range('design'), [3, 7], 'sixty pixels is a day and a bit: it snaps to one day')
  assert.equal(bar('design').textContent, '3 to 7', 'the bar says where it would go')
  assert.equal(bar('design').getAttribute('aria-valuetext'), '2 to 6', 'its value is taken on the drop')
  assert.deepEqual(heard, ['input'])
  release('design', 360)
  assert.equal(bar('design').hasAttribute('aria-busy'), false)
  assert.equal(bar('design').getAttribute('aria-valuetext'), '3 to 7')
  assert.deepEqual(heard, ['input', 'change'])
})

test('gantt: dragging an end resizes the bar, and a milestone only moves', () => {
  const { root, bar, range, drag, release, heard, pointer } = setup()
  gantt(root)
  drag('design', 398, 460)
  assert.ok(bar('design').classList.contains('gantt-resize-end'), 'the end that is held is marked')
  release('design', 460)
  assert.deepEqual(range('design'), [2, 7])
  assert.equal(bar('design').classList.contains('gantt-resize-end'), false)
  drag('design', 202, 100)
  assert.ok(bar('design').classList.contains('gantt-resize-start'))
  release('design', 100)
  assert.deepEqual(range('design'), [0, 7])
  drag('design', 102, 600)
  release('design', 600)
  assert.deepEqual(range('design'), [6, 7], 'the start stops a step before the end')
  heard.length = 0
  drag('launch', 552, 500)
  pointer(bar('launch'), 'pointerup', { pointerId: 1, clientX: 500 })
  assert.equal(bar('launch').closest<HTMLElement>('.gantt-row')!.style.getPropertyValue('--from'), '8')
  assert.deepEqual(heard, ['input', 'change'])
})

test('gantt: Escape puts a dragged bar back, says so, and the refused drop goes back too', async () => {
  const { root, bar, range, drag, release, heard, key, document, said } = setup()
  gantt(root)
  drag('design', 300, 400)
  assert.deepEqual(range('design'), [4, 8])
  assert.equal(key(document.body, 'Escape'), true)
  assert.deepEqual(range('design'), [2, 6])
  assert.equal(bar('design').textContent, '2 to 6')
  assert.equal(bar('design').hasAttribute('aria-busy'), false)
  assert.deepEqual(heard, ['input', 'input'], 'the way back is said as an input, and nothing changed')
  release('design', 400)
  assert.deepEqual(range('design'), [2, 6])
  assert.equal(await said(), 'Design is back at 2 to 6.')

  heard.length = 0
  root.addEventListener('beforechange', (event) => event.preventDefault())
  drag('design', 300, 400)
  release('design', 400)
  assert.deepEqual(range('design'), [2, 6], 'a refused drop goes back')
  assert.deepEqual(heard, ['input', 'input'])
  assert.equal(await said(), 'Design cannot move there. It stays at 2 to 6.')
})

test('gantt: from right to left a drag toward the left is later', () => {
  const { root, range, drag, release } = setup('rtl')
  gantt(root)
  // Design is drawn from 300 to 500; its start is on the right.
  drag('design', 400, 300)
  release('design', 300)
  assert.deepEqual(range('design'), [4, 8])
  drag('design', 398, 340)
  release('design', 340)
  assert.deepEqual(range('design'), [5, 8], 'the start is the right end')
})

test('gantt: value is every bar\'s range by id; set, it moves the bars and says nothing', () => {
  const { root, bar, range, heard } = setup()
  const handle = gantt(root)
  assert.deepEqual(handle.value, { research: [0, 3], design: [2, 6], build: [4, 8], review: [6, 9], launch: [9, 9], retro: [9, 10] })
  handle.value = { design: [5, 8], launch: [7, 7], nothing: [1, 2] }
  assert.deepEqual(range('design'), [5, 8])
  assert.equal(bar('design').getAttribute('aria-valuenow'), '5')
  assert.equal(bar('design').getAttribute('aria-valuetext'), '5 to 8')
  assert.deepEqual(handle.value.launch, [7, 7])
  assert.deepEqual(heard, [])
})

test('gantt: format says a range in the page\'s words; with text false the bar\'s text is left alone', () => {
  const { root, bar, key } = setup()
  gantt(root, { format: (start, end) => `Day ${start + 1} to day ${end}`, text: false, step: .5 })
  key(bar('design'), 'ArrowRight')
  assert.equal(bar('design').getAttribute('aria-valuetext'), 'Day 3.5 to day 6.5')
  assert.equal(bar('design').textContent, 'Days 2 to 6', 'a renderer writes the text')
})

test('gantt: attached again with another format, a bar says it; what the page wrote stays', () => {
  const { root, bar } = setup()
  bar('design').setAttribute('aria-valuetext', 'Days 3 to 6')
  gantt(root)
  assert.equal(bar('research').getAttribute('aria-valuetext'), '0 to 3')
  gantt(root, { format: (start, end) => `Day ${start + 1} to day ${end}` })
  assert.equal(bar('research').getAttribute('aria-valuetext'), 'Day 1 to day 3', 'what a behavior wrote is written again')
  assert.equal(bar('design').getAttribute('aria-valuetext'), 'Days 3 to 6', 'what the page wrote stays')
})

test('gantt: detach removes the listeners, and attaching twice listens once', () => {
  const { root, bar, key, range, heard } = setup()
  gantt(root)
  const detach = gantt(root)
  key(bar('design'), 'ArrowRight')
  assert.deepEqual(heard, ['input', 'change'])
  detach()
  assert.equal(key(bar('design'), 'ArrowRight'), false)
  assert.deepEqual(range('design'), [3, 7])
})

test('gantt: detach gives every bar back the tabindex it had, so none is left out of the tab order', () => {
  const { root, all } = setup()
  const detach = gantt(root)
  assert.ok(all('.gantt-bar[tabindex="-1"]').length > 0)
  detach()
  assert.deepEqual(all('.gantt-bar[tabindex]'), [])
})

test('gantt: detached while a bar is carried, the bar goes back where the drag started', () => {
  const { root, bar, range, drag, heard } = setup()
  const detach = gantt(root)
  drag('design', 300, 320, 340, 360)
  assert.deepEqual(range('design'), [3, 7])
  detach()
  assert.deepEqual(range('design'), [2, 6], 'no range is left that no change told')
  assert.equal(bar('design').hasAttribute('aria-busy'), false)
  assert.equal(bar('design').textContent, '2 to 6')
  assert.deepEqual(heard, ['input'], 'and nothing more is said')
})

test('gantt: a row written after the script attached is given what a slider needs', async () => {
  const { root, document, bar } = setup()
  gantt(root)
  const template = document.createElement('template')
  template.innerHTML = row('test', 'Test', 3, 5)
  root.append(template.content)
  await new Promise(resolve => setTimeout(resolve, 0))
  const added = bar('test')
  assert.equal(added.getAttribute('aria-valuenow'), '3')
  assert.equal(added.getAttribute('aria-valuetext'), '3 to 5')
  assert.equal(added.getAttribute('aria-valuemin'), '0')
  assert.equal(added.getAttribute('aria-valuemax'), '10')
  assert.equal(added.getAttribute('tabindex'), '-1', 'the chart stays one stop')
  assert.equal(document.getElementById(added.getAttribute('aria-labelledby')!)?.textContent, 'Test')
  assert.equal(bar('research').getAttribute('tabindex'), '0')
})
