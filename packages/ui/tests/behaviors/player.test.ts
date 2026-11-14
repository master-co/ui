import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { stub, type MediaState } from './media.ts'
import { player } from '../../behaviors/player.js'

/**
 * The player's behavior listens to its media and mirrors it into the controls, and every control asks the
 * media to change. happy-dom plays nothing, so the media is stubbed: it keeps a browser's state and sends a
 * browser's events when that state changes.
 */
const icons = '<svg class="icon player-off"></svg><svg class="icon player-on"></svg>'
const markup = (kind: 'audio' | 'video' = 'audio', extra = '') => `<div class="player${kind === 'video' ? ' player-video' : ''}" role="group" aria-label="Episode 12">
  <${kind} class="player-media" src="episode.m4a" controls></${kind}>
  <div class="player-controls">
    <button type="button" class="player-button player-play" aria-label="Play" aria-pressed="false">${icons}</button>
    <span class="player-elapsed">0:00</span>
    <input type="range" class="slider player-seek" min="0" max="0" step="any" value="0" aria-label="Seek">
    <span class="player-duration">0:00</span>
    <button type="button" class="player-button player-mute" aria-label="Mute" aria-pressed="false">${icons}</button>
    <input type="range" class="slider player-volume" min="0" max="1" step="0.05" value="1" aria-label="Volume">
    <button type="button" class="player-button player-speed" popovertarget="speeds" aria-label="Playback speed">1×</button>
    <div id="speeds" popover class="menu menu-top">
      <label class="menu-item"><input class="menu-input" type="radio" name="speed" value="0.5">0.5×</label>
      <label class="menu-item"><input class="menu-input" type="radio" name="speed" value="1" checked>1×</label>
      <label class="menu-item"><input class="menu-input" type="radio" name="speed" value="1.5">1.5×</label>
    </div>
    <button type="button" class="player-button player-captions" aria-label="Captions" aria-pressed="false"></button>
    <button type="button" class="player-button player-pip" aria-label="Picture in picture" aria-pressed="false"></button>
    <button type="button" class="player-button player-fullscreen" aria-label="Full screen" aria-pressed="false">${icons}</button>
  </div>
</div>${extra}`

/** What a listener threw in the page of the test that just ran: happy-dom reports it on the window. */
let errors: unknown[] = []
afterEach(() => assert.deepEqual(errors, [], 'a listener threw'))

function setup(kind: 'audio' | 'video' = 'audio', state: Partial<MediaState> = {}) {
  const page = dom(markup(kind))
  errors = page.errors
  const root = page.one<HTMLElement>('.player')
  const media = page.one<HTMLMediaElement>('.player-media')
  const control = stub(media, { duration: NaN, ...state })
  const part = <T = HTMLElement>(name: string) => page.one<T>(`.player-${name}`)
  return { ...page, root, media, control, part, pressed: (name: string) => part(name).getAttribute('aria-pressed') }
}

test('player: attaching takes the media\'s controls away, and detaching gives them back', () => {
  const { root, media } = setup()
  const detach = player(root)
  assert.equal(media.hasAttribute('controls'), false, 'the player\'s row is shown')
  detach()
  assert.equal(media.hasAttribute('controls'), true, 'the browser\'s controls are back')
})

test('player: the controls mirror the media as it is when the behavior attaches', () => {
  const { root, part, pressed, control } = setup('audio', { duration: 754, currentTime: 65, volume: .6, buffered: [[0, 377]] })
  player(root)
  assert.equal(pressed('play'), 'false')
  assert.equal(pressed('mute'), 'false')
  assert.equal(part('elapsed').textContent, '1:05')
  assert.equal(part('duration').textContent, '12:34')
  assert.equal(part<HTMLInputElement>('seek').max, '754')
  assert.equal(part<HTMLInputElement>('seek').value, '65')
  assert.equal(part('seek').getAttribute('aria-valuetext'), '1 minute 5 seconds of 12 minutes 34 seconds')
  assert.equal(part<HTMLInputElement>('volume').value, '0.6')
  assert.equal(root.style.getPropertyValue('--player-buffered'), '0.5')
  assert.equal(root.style.getPropertyValue('--player-idle'), '0')
  assert.equal(part('speed').textContent, '1×')
  control.load(3725)
  assert.equal(part('duration').textContent, '1:02:05', 'an hour long, the clock has hours')
  assert.equal(part('elapsed').textContent, '0:01:05')
})

test('player: an audio player hides what belongs to a picture', () => {
  const { root, part } = setup('audio')
  player(root)
  assert.equal(part('captions').hidden, true)
  assert.equal(part('pip').hidden, true)
  assert.equal(part('fullscreen').hidden, true)
})

test('player: the play button plays and pauses, and is pressed while the media plays', () => {
  const { root, part, pressed, control } = setup()
  player(root)
  part('play').click()
  assert.equal(pressed('play'), 'true')
  assert.deepEqual(control.played, ['play'])
  part('play').click()
  assert.equal(pressed('play'), 'false')
  // The media may be played from elsewhere: the controls follow it.
  ;(root.querySelector('.player-media') as HTMLMediaElement).play()
  assert.equal(pressed('play'), 'true')
})

test('player: Space and K play and pause; Space on a button is the button\'s', () => {
  const { root, key, part, pressed } = setup('audio', { duration: 60 })
  player(root)
  assert.equal(key(part('seek'), ' '), true)
  assert.equal(pressed('play'), 'true')
  assert.equal(key(part('mute'), ' '), false, 'Space presses the focused button')
  assert.equal(pressed('play'), 'true')
  assert.equal(key(part('mute'), 'k'), true)
  assert.equal(pressed('play'), 'false')
  assert.equal(key(part('seek'), 'K'), true)
  assert.equal(pressed('play'), 'true')
})

test('player: a toggle key held down toggles once; a seek key held down goes on seeking', () => {
  const { root, key, part, pressed, media } = setup('audio', { duration: 60 })
  player(root)
  key(part('seek'), 'k')
  assert.equal(pressed('play'), 'true')
  assert.equal(key(part('seek'), 'k', { repeat: true }), true, 'the repeat is taken')
  assert.equal(key(part('seek'), ' ', { repeat: true }), true)
  assert.equal(pressed('play'), 'true', 'and plays on')
  key(part('seek'), 'm')
  key(part('seek'), 'm', { repeat: true })
  assert.equal(pressed('mute'), 'true')
  key(part('seek'), 'l')
  key(part('seek'), 'l', { repeat: true })
  assert.equal(media.currentTime, 20)
})

test('player: the arrows seek 5 seconds, and J and L 10, within the recording', () => {
  const { root, key, part, media } = setup('audio', { duration: 60, currentTime: 30 })
  player(root)
  assert.equal(key(part('seek'), 'ArrowRight'), true)
  assert.equal(media.currentTime, 35)
  assert.equal(key(part('play'), 'ArrowLeft'), true)
  assert.equal(media.currentTime, 30)
  assert.equal(key(part('seek'), 'ArrowUp'), true, 'on the seek track ArrowUp seeks too')
  assert.equal(media.currentTime, 35)
  assert.equal(key(part('seek'), 'ArrowDown'), true)
  assert.equal(media.currentTime, 30)
  assert.equal(key(part('play'), 'l'), true)
  assert.equal(media.currentTime, 40)
  assert.equal(key(part('play'), 'J'), true)
  assert.equal(media.currentTime, 30)
  key(part('play'), 'L')
  key(part('play'), 'L')
  key(part('play'), 'L')
  assert.equal(media.currentTime, 60, 'never past the end')
  assert.equal(part('elapsed').textContent, '1:00')
  for (let count = 0; count < 8; count++) key(part('play'), 'j')
  assert.equal(media.currentTime, 0, 'never before the start')
})

test('player: in a right-to-left player ArrowLeft seeks forward', () => {
  const { root, key, part, media } = setup('audio', { duration: 60, currentTime: 30 })
  root.style.direction = 'rtl'
  player(root)
  key(part('seek'), 'ArrowLeft')
  assert.equal(media.currentTime, 35)
  key(part('seek'), 'ArrowRight')
  assert.equal(media.currentTime, 30)
})

test('player: Home and End go to the start and the end', () => {
  const { root, key, part, media } = setup('audio', { duration: 60, currentTime: 30 })
  player(root)
  assert.equal(key(part('play'), 'End'), true)
  assert.equal(media.currentTime, 60)
  assert.equal(key(part('seek'), 'Home'), true)
  assert.equal(media.currentTime, 0)
})

test('player: ArrowUp and ArrowDown set the volume a tenth at a time, and leave the volume slider its own keys', () => {
  const { root, key, part, media } = setup('audio', { volume: .5, muted: true })
  player(root)
  assert.equal(key(part('play'), 'ArrowUp'), true)
  assert.equal(media.volume, .6)
  assert.equal(media.muted, false, 'turning it up unmutes it')
  assert.equal(key(part('play'), 'ArrowDown'), true)
  assert.equal(media.volume, .5)
  for (const name of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']) {
    assert.equal(key(part('volume'), name), false, `${name} on the volume slider is the slider's`)
  }
  assert.equal(media.volume, .5)
  for (let count = 0; count < 8; count++) key(part('play'), 'ArrowDown')
  assert.equal(media.volume, 0, 'never below silence')
})

test('player: M and the mute button mute and unmute, and the slider sets the volume', () => {
  const { root, key, part, pressed, media, type } = setup('audio', { volume: .8 })
  player(root)
  assert.equal(key(part('play'), 'm'), true)
  assert.equal(media.muted, true)
  assert.equal(pressed('mute'), 'true')
  assert.equal(part('volume').getAttribute('aria-valuetext'), '80%, muted')
  part('mute').click()
  assert.equal(media.muted, false)
  assert.equal(pressed('mute'), 'false')
  type(part('volume'), '0.3')
  assert.equal(media.volume, .3)
  type(part('volume'), '0')
  part('mute').click()
  part('mute').click()
  assert.equal(media.volume, .5, 'unmuting a silent player gives it a volume to be heard at')
})

test('player: the speed menu sets the rate, and the rate is drawn on the button and the radios', () => {
  const { root, all, part, media } = setup()
  player(root)
  const [slow, , fast] = all<HTMLInputElement>('.menu-input')
  fast.checked = true
  fast.dispatchEvent(new (fast.ownerDocument.defaultView as any).Event('change', { bubbles: true }))
  assert.equal(media.playbackRate, 1.5)
  assert.equal(part('speed').textContent, '1.5×')
  media.playbackRate = .5
  assert.equal(slow.checked, true)
  assert.equal(part('speed').textContent, '0.5×')
})

test('player: a key inside the speed menu, or held with a modifier, is not the player\'s', () => {
  const { root, key, all, part, pressed } = setup('audio', { duration: 60 })
  player(root)
  assert.equal(key(all('.menu-input')[0], 'k'), false)
  assert.equal(key(all('.menu-input')[0], 'ArrowDown'), false)
  assert.equal(key(part('play'), 'k', { metaKey: true }), false)
  assert.equal(key(part('play'), 'ArrowRight', { ctrlKey: true }), false)
  assert.equal(key(part('play'), 'x'), false)
  assert.equal(pressed('play'), 'false')
})

test('player: dragging the seek track seeks, and the media does not move the thumb under the finger', () => {
  const { root, part, media, control, pointer, type } = setup('audio', { duration: 60 })
  player(root)
  const seek = part<HTMLInputElement>('seek')
  pointer(seek, 'pointerdown')
  type(seek, '42')
  assert.equal(media.currentTime, 42)
  assert.equal(part('elapsed').textContent, '0:42')
  control.advance(43)
  type(seek, '20')
  control.advance(21)
  assert.equal(seek.value, '20', 'the thumb stays where the finger is')
  seek.dispatchEvent(new (seek.ownerDocument.defaultView as any).Event('change', { bubbles: true }))
  control.advance(22)
  assert.equal(seek.value, '22')
})

test('player: a drag of the seek track that the browser cancels lets the media move the thumb again', () => {
  const { root, part, control, pointer, type } = setup('audio', { duration: 60 })
  player(root)
  const seek = part<HTMLInputElement>('seek')
  pointer(seek, 'pointerdown')
  type(seek, '42')
  pointer(seek, 'pointercancel')
  control.advance(43)
  assert.equal(seek.value, '43')
})

test('player: a video with a captions track shows the captions button, and C and the button turn them on and off', () => {
  const { root, key, part, pressed, control } = setup('video', { tracks: [{ kind: 'captions', mode: 'disabled', cues: [] }] })
  player(root)
  assert.equal(part('captions').hidden, false)
  part('captions').click()
  assert.equal(control.state.tracks[0].mode, 'showing')
  assert.equal(pressed('captions'), 'true')
  assert.equal(key(part('play'), 'c'), true)
  assert.equal(control.state.tracks[0].mode, 'hidden', 'off is hidden, so a transcript keeps the cues')
  assert.equal(pressed('captions'), 'false')
})

test('player: a video without a captions track hides the button and leaves C alone', () => {
  const { root, key, part } = setup('video')
  player(root)
  assert.equal(part('captions').hidden, true)
  assert.equal(key(part('play'), 'c'), false)
})

test('player: full screen is the player\'s, and F enters and leaves it where the browser allows', () => {
  const { root, key, part, pressed, document } = setup('video')
  let screen: Element | null = null
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => screen })
  ;(root as any).requestFullscreen = () => { screen = root; document.dispatchEvent(new (document.defaultView as any).Event('fullscreenchange')); return Promise.resolve() }
  ;(document as any).exitFullscreen = () => { screen = null; document.dispatchEvent(new (document.defaultView as any).Event('fullscreenchange')); return Promise.resolve() }
  player(root)
  assert.equal(part('fullscreen').hidden, false)
  assert.equal(key(part('play'), 'f'), true)
  assert.equal(screen, root)
  assert.equal(pressed('fullscreen'), 'true')
  part('fullscreen').click()
  assert.equal(screen, null)
  assert.equal(pressed('fullscreen'), 'false')
})

test('player: without full screen or picture in picture, their buttons are hidden and F does nothing', () => {
  const { root, key, part } = setup('video')
  player(root)
  assert.equal(part('fullscreen').hidden, true)
  assert.equal(part('pip').hidden, true)
  assert.equal(key(part('play'), 'f'), false)
})

test('player: picture in picture is pressed while the video is in its window', () => {
  const { root, part, pressed, document, media } = setup('video')
  let window_: Element | null = null
  Object.defineProperty(document, 'pictureInPictureEnabled', { configurable: true, value: true })
  Object.defineProperty(document, 'pictureInPictureElement', { configurable: true, get: () => window_ })
  ;(media as any).requestPictureInPicture = () => { window_ = media; media.dispatchEvent(new (document.defaultView as any).Event('enterpictureinpicture')); return Promise.resolve() }
  ;(document as any).exitPictureInPicture = () => { window_ = null; media.dispatchEvent(new (document.defaultView as any).Event('leavepictureinpicture')); return Promise.resolve() }
  player(root)
  assert.equal(part('pip').hidden, false)
  part('pip').click()
  assert.equal(pressed('pip'), 'true')
  part('pip').click()
  assert.equal(pressed('pip'), 'false')
})

test('player: a click on the picture plays and pauses it; a tap on faded controls only brings them back', async () => {
  const { root, media, pressed, click, pointer } = setup('video')
  player(root, { idle: 5 })
  click(media)
  assert.equal(pressed('play'), 'true')
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.equal(root.style.getPropertyValue('--player-idle'), '1', 'still, the controls fade')
  pointer(media, 'pointerdown', { pointerType: 'touch' })
  assert.equal(root.style.getPropertyValue('--player-idle'), '0')
  click(media)
  assert.equal(pressed('play'), 'true', 'the tap showed the controls and did not pause')
  pointer(media, 'pointerdown', { pointerType: 'touch' })
  click(media)
  assert.equal(pressed('play'), 'false')
})

test('player: the pointer moving wakes the controls, and leaving lets them fade', () => {
  const { root, pointer } = setup('video')
  player(root)
  pointer(root, 'pointerleave', { pointerType: 'mouse' })
  assert.equal(root.style.getPropertyValue('--player-idle'), '1')
  pointer(root, 'pointermove', { pointerType: 'mouse' })
  assert.equal(root.style.getPropertyValue('--player-idle'), '0')
})

test('player: value is the current time, and setting it seeks', () => {
  const { root, media, part } = setup('audio', { duration: 60, currentTime: 12 })
  const handle = player(root)
  assert.equal(handle.value, 12)
  handle.value = 48
  assert.equal(media.currentTime, 48)
  assert.equal(part('elapsed').textContent, '0:48')
  handle.value = NaN
  assert.equal(media.currentTime, 48)
})

test('player: valueText and rateText say the time and the speed in the page\'s words', () => {
  const { root, part } = setup('audio', { duration: 90, currentTime: 30 })
  player(root, { valueText: (time, duration) => `${time} / ${duration}`, rateText: rate => `x${rate}` })
  assert.equal(part('seek').getAttribute('aria-valuetext'), '30 / 90')
  assert.equal(part('speed').textContent, 'x1')
})

test('player: detach removes the keys, the listeners and the properties it set', () => {
  const { root, key, part, pressed, media } = setup('video', { duration: 60 })
  const detach = player(root)
  detach()
  assert.equal(key(part('play'), 'k'), false)
  part('play').click()
  assert.equal(pressed('play'), 'false')
  assert.equal(media.hasAttribute('tabindex'), false)
  assert.equal(root.style.getPropertyValue('--player-idle'), '')
  assert.equal(root.style.getPropertyValue('--player-buffered'), '')
})

test('player: attaching twice to one player answers each key once', () => {
  const { root, key, part, media } = setup('audio', { duration: 60 })
  player(root)
  player(root)
  key(part('play'), 'l')
  assert.equal(media.currentTime, 10)
})

test('player: what is asked four times a second, and on every move, is written only when it changes', () => {
  const { root, part, control, pointer } = setup('video', { duration: 60, currentTime: 10.1, buffered: [[0, 30]] })
  player(root)
  const writes: string[] = []
  new MutationObserver(records => records.forEach(record => writes.push(`${(record.target as Element).className.split(' ').at(-1)} ${record.attributeName}`)))
    .observe(root, { attributes: true, subtree: true })
  // A quarter of a second on: the second, the words, the buffered share and the idle state are what they were.
  control.advance(10.35)
  pointer(root, 'pointermove', { pointerType: 'mouse' })
  pointer(root, 'pointermove', { pointerType: 'mouse' })
  assert.deepEqual(writes.filter(each => !each.endsWith(' value')), [], 'no attribute and no property is written again')
  assert.equal(part('seek').getAttribute('aria-valuetext'), '10 seconds of 1 minute')
  control.advance(11.2)
  assert.equal(part('seek').getAttribute('aria-valuetext'), '11 seconds of 1 minute', 'a new second is said')
})

test('player: setting value to the time the media is at changes nothing', () => {
  const { root, media } = setup('audio', { duration: 60, currentTime: 12 })
  const handle = player(root)
  const heard: string[] = []
  for (const type of ['seeking', 'seeked']) media.addEventListener(type, () => heard.push(type))
  handle.value = 12
  assert.deepEqual(heard, [], 'the media is not asked to seek')
  handle.value = 20
  assert.deepEqual(heard, ['seeking', 'seeked'])
})
