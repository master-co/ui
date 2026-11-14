import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { stub, type MediaState } from './media.ts'
import { transcript } from '../../behaviors/transcript.js'

/**
 * The transcript's behavior marks the cue the media is at, follows it inside its own list, and plays from a
 * cue that is chosen. happy-dom plays nothing and lays nothing out: the media is stubbed, and a test that
 * needs to know what is in view gives the list and its cues their boxes.
 */
const lines = [
  [0.3, 'This is a short recording.'],
  [4.7, 'Each line is a cue.'],
  [8.7, 'The line being spoken is marked.'],
  [13.1, 'Lines you have heard turn quiet.'],
]
const cueMarkup = lines.map(([start, text]) => `<li class="transcript-cue" data-start="${start}"><button type="button" class="transcript-time">0:0${Math.floor(start as number)}</button><p class="transcript-text">${text}</p></li>`).join('\n')
const markup = (cues = cueMarkup, controls = 'episode') => `<audio id="episode" src="episode.m4a" controls></audio>
<div class="player" id="episode-player" role="group" aria-label="Episode"><audio class="player-media" src="episode.m4a" controls></audio></div>
<section class="transcript" aria-label="Transcript" aria-controls="${controls}">
  <ol class="transcript-list scroll-area">${cues}</ol>
  <button type="button" class="btn btn-sm btn-pill transcript-return" hidden>Back to current</button>
</section>`

let errors: unknown[] = []
afterEach(() => assert.deepEqual(errors, [], 'a listener threw'))

function setup(state: Partial<MediaState> = {}, options: { cues?: string, controls?: string } = {}) {
  const page = dom(markup(options.cues, options.controls))
  errors = page.errors
  const root = page.one<HTMLElement>('.transcript')
  const list = page.one<HTMLElement>('.transcript-list')
  const media = page.one<HTMLMediaElement>(options.controls === 'episode-player' ? '.player-media' : '#episode')
  const control = stub(media, { duration: 25, ...state })
  const current = () => page.all('.transcript-cue[aria-current="true"]').map(cue => cue.querySelector('.transcript-text')?.textContent)
  const stops = () => page.all<HTMLButtonElement>('.transcript-time').map(button => button.getAttribute('tabindex'))
  return { ...page, root, list, media, control, current, stops, back: page.one<HTMLButtonElement>('.transcript-return') }
}

/** Lay the list out: 100px tall and scrolled by `scroll`, each cue 40px under the one before it. */
function layout(list: any, scroll: { top: number }) {
  const scrolled: { top: number, behavior: string }[] = []
  list.getBoundingClientRect = () => ({ top: 0, bottom: 100, height: 100, left: 0, right: 300, width: 300 })
  Object.defineProperty(list, 'clientHeight', { configurable: true, get: () => 100 })
  Object.defineProperty(list, 'scrollTop', { configurable: true, get: () => scroll.top })
  list.scrollTo = (to: { top: number, behavior: string }) => { scrolled.push(to); scroll.top = to.top }
  list.querySelectorAll('.transcript-cue').forEach((cue: any, index: number) => {
    cue.getBoundingClientRect = () => ({ top: index * 40 - scroll.top, bottom: index * 40 + 36 - scroll.top, height: 36, left: 0, right: 300, width: 300 })
  })
  return scrolled
}

test('transcript: the cue the media is at is current, and stays current through the pause before the next', () => {
  const { root, control, current } = setup()
  transcript(root)
  assert.deepEqual(current(), [], 'before the first cue begins, none is current')
  control.advance(1)
  assert.deepEqual(current(), ['This is a short recording.'])
  control.advance(4.5)
  assert.deepEqual(current(), ['This is a short recording.'], 'between two cues the place is kept')
  control.advance(9)
  assert.deepEqual(current(), ['The line being spoken is marked.'])
  control.advance(2)
  assert.deepEqual(current(), ['This is a short recording.'], 'seeking back moves it back')
})

test('transcript: a press on a cue, or on its time, plays from where it begins', () => {
  const { root, all, media, current, click } = setup()
  transcript(root)
  click(all('.transcript-text')[2])
  assert.equal(media.currentTime, 8.7)
  assert.deepEqual(current(), ['The line being spoken is marked.'])
  all<HTMLButtonElement>('.transcript-time')[1].click()
  assert.equal(media.currentTime, 4.7)
})

test('transcript: a reader selecting the words of a cue does not seek', () => {
  const { root, all, media, click, document } = setup()
  transcript(root)
  const words = all('.transcript-text')[3]
  document.getSelection = () => ({ isCollapsed: false, anchorNode: words.firstChild }) as any
  click(words)
  assert.equal(media.currentTime, 0)
})

test('transcript: the times are one tab stop, the current cue\'s, and the arrows, Home and End move between them', () => {
  const { root, all, key, control, stops, document } = setup()
  transcript(root)
  assert.deepEqual(stops(), ['0', '-1', '-1', '-1'], 'with no current cue, the first')
  control.advance(9)
  assert.deepEqual(stops(), ['-1', '-1', '0', '-1'])
  const times = all<HTMLButtonElement>('.transcript-time')
  times[2].focus()
  assert.equal(key(times[2], 'ArrowDown'), true)
  assert.equal(document.activeElement, times[3])
  assert.deepEqual(stops(), ['-1', '-1', '-1', '0'], 'the stop is where focus is')
  assert.equal(key(times[3], 'ArrowDown'), true)
  assert.equal(document.activeElement, times[3], 'the last stays the last')
  assert.equal(key(times[3], 'Home'), true)
  assert.equal(document.activeElement, times[0])
  assert.equal(key(times[0], 'ArrowUp'), true)
  assert.equal(document.activeElement, times[0])
  assert.equal(key(times[0], 'End'), true)
  assert.equal(document.activeElement, times[3])
  assert.equal(key(times[3], 'ArrowUp'), true)
  assert.equal(document.activeElement, times[2])
  control.advance(14)
  assert.deepEqual(stops(), ['-1', '-1', '0', '-1'], 'while focus is in the list, playing does not move the stop')
  const observer = new (document.defaultView as any).MutationObserver(() => {})
  observer.observe(root, { attributes: true, subtree: true, attributeFilter: ['tabindex'] })
  control.advance(14.5)
  control.advance(15)
  assert.equal(observer.takeRecords().length, 0, 'a timeupdate that moves nothing writes no tabindex')
  observer.disconnect()
  assert.equal(key(times[2], 'Enter'), false, 'Enter is the button\'s')
  assert.equal(key(times[2], 'ArrowDown', { altKey: true }), false)
})

test('transcript: the list follows the current cue, putting it in its middle', () => {
  const { root, list, control } = setup()
  const scroll = { top: 0 }
  const scrolled = layout(list, scroll)
  transcript(root)
  control.advance(14)
  assert.deepEqual(scrolled.at(-1), { top: 120 - 32, behavior: 'smooth' }, 'the fourth cue, 120px down, stands in the middle of 100px')
})

test('transcript: scrolled away by the reader, the list stops following and offers a way back', () => {
  const { root, list, control, back, document, all } = setup()
  const scroll = { top: 0 }
  const scrolled = layout(list, scroll)
  transcript(root)
  control.advance(1)
  const followed = scrolled.length
  // The reader turns the wheel and the current cue leaves the view.
  list.dispatchEvent(new (document.defaultView as any).Event('wheel'))
  scroll.top = 80
  list.dispatchEvent(new (document.defaultView as any).Event('scroll'))
  assert.equal(back.hidden, false)
  control.advance(5)
  assert.equal(scrolled.length, followed, 'the list does not follow while the reader is away')
  back.click()
  assert.equal(back.hidden, true)
  assert.equal(scrolled.length, followed + 1, 'the way back follows again')
  assert.equal(document.activeElement, all('.transcript-time')[1], 'and focus goes to the current cue, not to a hidden button')
})

test('transcript: a scroll the reader did not ask for, or that keeps the current cue in view, does not stop the following', () => {
  const { root, list, control, back, document } = setup()
  const scroll = { top: 0 }
  layout(list, scroll)
  transcript(root)
  control.advance(1)
  scroll.top = 80
  list.dispatchEvent(new (document.defaultView as any).Event('scroll'))
  assert.equal(back.hidden, true, 'the behavior\'s own scroll')
  scroll.top = 10
  list.dispatchEvent(new (document.defaultView as any).Event('wheel'))
  list.dispatchEvent(new (document.defaultView as any).Event('scroll'))
  assert.equal(back.hidden, true, 'the current cue is still in view')
})

test('transcript: choosing a cue while away brings the following back', () => {
  const { root, list, back, document, all, control } = setup()
  const scroll = { top: 0 }
  layout(list, scroll)
  transcript(root)
  control.advance(1)
  list.dispatchEvent(new (document.defaultView as any).Event('wheel'))
  scroll.top = 200
  list.dispatchEvent(new (document.defaultView as any).Event('scroll'))
  assert.equal(back.hidden, false)
  all<HTMLButtonElement>('.transcript-time')[2].click()
  assert.equal(back.hidden, true, 'a chosen cue is followed')
})

test('transcript: it finds the media inside a player that aria-controls names', () => {
  const { root, media, current, control } = setup({}, { controls: 'episode-player' })
  transcript(root)
  control.advance(5)
  assert.deepEqual(current(), ['Each line is a cue.'])
  assert.equal(media.classList.contains('player-media'), true)
})

test('transcript: an empty list is written from the media\'s captions track, and detach removes what it wrote', () => {
  const tracks = [
    { kind: 'metadata', mode: 'disabled', cues: [] },
    { kind: 'subtitles', mode: 'disabled', cues: [
      { startTime: 0.3, endTime: 4.2, text: '<v.loud Ana>Welcome &amp; hello.</v>' },
      { startTime: 64.5, endTime: 70, text: 'A line <i>with</i> tags.' },
    ] },
  ]
  const { root, all, control } = setup({ tracks }, { cues: '' })
  const detach = transcript(root)
  assert.equal(control.state.tracks[1].mode, 'hidden', 'the track loads its cues and shows nothing')
  assert.deepEqual(all('.transcript-cue').map(cue => cue.getAttribute('data-start')), ['0.3', '64.5'])
  assert.deepEqual(all('.transcript-time').map(time => time.textContent), ['0:00', '1:04'])
  assert.deepEqual(all('.transcript-speaker').map(speaker => speaker.textContent), ['Ana'])
  assert.deepEqual(all('.transcript-text').map(text => text.textContent), ['AnaWelcome & hello.', 'A line with tags.'])
  detach()
  assert.equal(all('.transcript-cue').length, 0)
  assert.equal(control.state.tracks[1].mode, 'disabled')
})

test('transcript: draw false leaves an empty list to a renderer, and the cues it writes later are followed', () => {
  const tracks = [{ kind: 'captions', mode: 'disabled', cues: [{ startTime: 1, endTime: 2, text: 'From the track' }] }]
  const { root, list, all, control, current } = setup({ tracks }, { cues: '' })
  transcript(root, { draw: false })
  assert.equal(all('.transcript-cue').length, 0)
  assert.equal(control.state.tracks[0].mode, 'disabled')
  list.innerHTML = cueMarkup
  control.advance(5)
  assert.deepEqual(current(), ['Each line is a cue.'])
})

test('transcript: a media written after the transcript, or named later, is the one it follows', () => {
  const { root, document, current, control: episode } = setup({}, { controls: 'later' })
  transcript(root)
  const later = document.createElement('video')
  later.id = 'later'
  document.body.append(later)
  const control = stub(later, { duration: 25 })
  control.advance(9)
  assert.deepEqual(current(), ['The line being spoken is marked.'])
  root.setAttribute('aria-controls', 'episode')
  episode.advance(5)
  assert.deepEqual(current(), ['Each line is a cue.'])
  control.advance(14)
  assert.deepEqual(current(), ['Each line is a cue.'], 'the media it no longer names is not followed')
})

test('transcript: detach removes the listeners and the marks', () => {
  const { root, all, control, current, media, stops } = setup()
  const detach = transcript(root)
  control.advance(5)
  detach()
  assert.deepEqual(current(), [])
  assert.deepEqual(stops(), [null, null, null, null])
  all<HTMLButtonElement>('.transcript-time')[2].click()
  assert.equal(media.currentTime, 5)
  control.advance(9)
  assert.deepEqual(current(), [])
})
