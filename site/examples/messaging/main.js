/**
 * A conversation on local data. The composer sends on Enter and keeps Shift+Enter for a new line, adds what is
 * written, and any files attached, to the end of the thread as the reader's own turns, and keeps the newest turn
 * in view. Sending, ordering and keeping the thread in step with others are the application's: here a sent turn
 * stays "Sent". The voice message plays on a timer that stands in for its audio. Returns the function that stops it.
 */
const PLAY = 'M8 5.6v12.8a1 1 0 0 0 1.5.86l10.2-6.4a1 1 0 0 0 0-1.72L9.5 4.74A1 1 0 0 0 8 5.6'
const PAUSE = 'M6.5 6.25C6.5 5.56 7.06 5 7.75 5H9c.69 0 1.25.56 1.25 1.25v11.5c0 .69-.56 1.25-1.25 1.25H7.75c-.69 0-1.25-.56-1.25-1.25zM13.75 6.25c0-.69.56-1.25 1.25-1.25h1.25c.69 0 1.25.56 1.25 1.25v11.5c0 .69-.56 1.25-1.25 1.25H15c-.69 0-1.25-.56-1.25-1.25z'

const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds) % 60).padStart(2, '0')}`
const size = (bytes) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`
/**
 * The conversation's own clock: a sent message is a minute after the one before it, so the times read in order
 * with the demo's morning instead of the reader's.
 */
let minutes = 9 * 60 + 31
const now = () => {
  minutes += 1
  return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export function mount(root) {
  const controller = new AbortController()
  const { signal } = controller
  const doc = root.ownerDocument
  const thread = root.querySelector('[data-messages]')
  const scroller = thread.closest('.scroll-area')
  const form = root.querySelector('[data-composer]')
  const field = form.querySelector('.composer-field')
  const send = form.querySelector('button[aria-label="Send"]')
  const picker = form.querySelector('[data-files]')
  /** @type {File[]} */
  let files = []

  const make = (tag, attributes = {}, ...children) => {
    const element = doc.createElement(tag)
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value)
    element.append(...children)
    return element
  }

  // The thread opens on its newest turn.
  scroller.scrollTop = scroller.scrollHeight

  const ready = () => { send.disabled = !field.value.trim() && !files.length }

  /** The chips of the files waiting to go with the message, each with a button that takes it back. */
  function chips() {
    form.querySelector('.composer-attachments')?.remove()
    if (files.length) {
      form.prepend(make('div', { class: 'composer-attachments' }, ...files.map((file, index) => make('span', { class: 'chip' },
        make('span', { class: 'chip-label' }, file.name),
        make('button', { type: 'button', class: 'chip-remove', 'aria-label': `Remove ${file.name}`, 'data-index': String(index) })))))
    }
    ready()
  }

  /** A turn of the reader's, at the end of the thread. */
  function turn(content, label) {
    const time = now()
    const item = make('li', { class: 'message message-sent' }, content, make('span', { class: 'message-meta' }, 'Sent · ', make('time', {}, time)))
    content.prepend(make('span', { class: 'sr-only' }, `You, ${time}${label}`))
    thread.append(item)
    // The newest turn is shown at once, as the thread's end, wherever the reader had scrolled to.
    scroller.scrollTop = scroller.scrollHeight
  }

  function submit() {
    const text = field.value.trim()
    if (!text && !files.length) return
    for (const file of files) {
      turn(make('div', { class: 'file max-w(320)' },
        make('span', { class: 'file-page', 'aria-hidden': 'true' }, (file.name.split('.').pop() || 'file').slice(0, 4)),
        make('span', { class: 'file-body' }, make('span', { class: 'file-name' }, file.name), make('span', { class: 'file-meta' }, size(file.size)))), ' attached: ')
    }
    // What is written is text: it is set as text, never as markup.
    // Lines stay lines: each is a text node, with a <br> between them.
    if (text) turn(make('div', { class: 'message-bubble' }, ...text.split('\n').flatMap((line, index) => index ? [make('br'), line] : [line])), ': ')
    field.value = ''
    files = []
    picker.value = ''
    chips()
    field.focus()
  }

  form.addEventListener('submit', (event) => { event.preventDefault(); submit() }, { signal })
  field.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault()
      submit()
    }
  }, { signal })
  field.addEventListener('input', ready, { signal })
  form.querySelector('[data-attach]').addEventListener('click', () => picker.click(), { signal })
  picker.addEventListener('change', () => {
    files = [...files, ...picker.files]
    chips()
    field.focus()
  }, { signal })
  form.addEventListener('click', (event) => {
    const remove = event.target.closest('.chip-remove')
    if (!remove) return
    files.splice(Number(remove.dataset.index), 1)
    chips()
    field.focus()
  }, { signal })

  // The voice message: a timer stands in for the audio, and the bars fill as it plays.
  const voice = root.querySelector('#messaging-voice')
  const waveform = voice.querySelector('.waveform')
  const seek = voice.querySelector('.waveform-seek')
  const time = voice.querySelector('.waveform-time')
  const play = voice.querySelector('.btn')
  const length = Number(seek.max)
  let start = 0
  let frame = 0
  const show = (at) => {
    seek.value = String(at)
    seek.setAttribute('aria-valuetext', `${clock(at)} of ${clock(length)}`)
    waveform.style.setProperty('--waveform-progress', String(at / length))
    time.textContent = clock(at > 0 ? at : length)
  }
  const playing = (on) => {
    play.setAttribute('aria-label', on ? 'Pause' : 'Play')
    play.querySelector('path').setAttribute('d', on ? PAUSE : PLAY)
  }
  const stop = () => { cancelAnimationFrame(frame); frame = 0; playing(false) }
  const tick = (moment) => {
    const at = Math.min((moment - start) / 1000, length)
    show(at)
    if (at < length) frame = requestAnimationFrame(tick)
    else { stop(); show(0) }
  }
  play.addEventListener('click', () => {
    if (frame) return stop()
    start = performance.now() - Number(seek.value) * 1000
    frame = requestAnimationFrame(tick)
    playing(true)
  }, { signal })
  seek.addEventListener('input', () => {
    start = performance.now() - Number(seek.value) * 1000
    show(Number(seek.value))
  }, { signal })

  ready()
  return () => {
    controller.abort()
    stop()
  }
}
