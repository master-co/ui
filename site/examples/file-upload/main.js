/**
 * Choosing files and following each one through an upload, with nothing uploaded. The dropzone's own input takes
 * a click and a drop; this module lists what was chosen, checks each file's type and size, and runs a progress
 * that a timer stands in for: every upload takes the same two seconds, so the example reads the same each time.
 * It never reads a file's content. A check here is feedback for the reader; the server still decides.
 * Returns the function that stops the timer and empties the list.
 */
const LIMIT = 10 * 1024 * 1024
const TYPES = ['image/png', 'image/jpeg', 'application/pdf']
const EXTENSIONS = ['png', 'jpg', 'jpeg', 'pdf']

/** What the list opens with: one file of each kind a reader will meet. */
const SAMPLES = [
  { name: 'atlas-logo.png', bytes: 188416, state: 'queued' },
  { name: 'brand-guidelines.pdf', bytes: 2516582, state: 'done' },
  { name: 'launch-hero.jpg', bytes: 7130317, state: 'failed' },
]

/** The buttons a file shows in each state. A refused file can only be removed: the fix is to choose another. */
const ACTIONS = {
  queued: ['remove'],
  uploading: ['cancel'],
  done: ['remove'],
  failed: ['retry', 'remove'],
  canceled: ['retry', 'remove'],
  refused: ['remove'],
}
const NAMES = { retry: 'Retry', cancel: 'Cancel upload of', remove: 'Remove' }

const size = (bytes) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`
const extension = (name) => name.includes('.') ? name.split('.').pop().toLowerCase() : ''
const files = (count) => `${count} ${count === 1 ? 'file' : 'files'}`

/** Why a file cannot be uploaded, or nothing. A browser that reports no type is judged by the name. */
function refusal(file) {
  const known = file.type ? TYPES.includes(file.type) : EXTENSIONS.includes(extension(file.name))
  if (!known) return 'Not a PNG, JPEG or PDF'
  if (file.size > LIMIT) return `${size(file.size)} · Over 10 MB`
  return ''
}

export function mount(root) {
  const controller = new AbortController()
  const { signal } = controller
  const doc = root.ownerDocument
  const input = root.querySelector('.dropzone-input')
  const refused = root.querySelector('[data-upload-refused]')
  const refusedTitle = root.querySelector('[data-upload-refused-title]')
  const queue = root.querySelector('[data-upload-queue]')
  const list = root.querySelector('[data-upload-list]')
  const summary = root.querySelector('[data-upload-summary]')
  const start = root.querySelector('[data-upload-start]')
  const status = root.querySelector('[data-upload-status]')
  const template = root.querySelector('[data-upload-file]')
  /** Every file in the list, in the order it was added. Two files of one name are two entries. */
  let items = []
  let timer = 0

  const count = (state) => items.filter(item => item.state === state).length
  const say = (message) => { status.textContent = message }

  const facts = (item) => ({
    queued: `${size(item.bytes)} · Ready`,
    uploading: `${size(item.bytes)} · Uploading ${item.progress}%`,
    done: `${size(item.bytes)} · Uploaded`,
    failed: `${size(item.bytes)} · Connection lost`,
    canceled: `${size(item.bytes)} · Canceled`,
    refused: item.reason,
  })[item.state]

  /** Draws one file from its state: its facts, its bar and its buttons. Focus stays in the row it was in. */
  function paint(item) {
    const held = item.element.contains(doc.activeElement)
    item.element.classList.toggle('file-failed', item.state === 'failed' || item.state === 'refused')
    item.meta.textContent = facts(item)
    if (item.state === 'uploading') {
      item.bar.value = item.progress
      if (!item.bar.isConnected) item.element.prepend(item.bar)
    } else item.bar.remove()
    const buttons = ACTIONS[item.state].map(action => item.buttons[action])
    if (buttons.length !== item.end.children.length || buttons.some((button, index) => button !== item.end.children[index])) item.end.replaceChildren(...buttons)
    if (held && !item.element.contains(doc.activeElement)) buttons[0].focus()
  }

  /** Everything that is counted: whether there is a list, what it adds up to, and whether the clock runs. */
  function overview() {
    queue.hidden = !items.length
    start.disabled = !count('queued')
    summary.textContent = `${count('done')} of ${files(items.length)} uploaded`
    refused.hidden = !count('refused')
    refusedTitle.textContent = `${files(count('refused'))} cannot be uploaded`
    if (count('uploading') && !timer) timer = setInterval(tick, 100)
    if (!count('uploading') && timer) timer = clearInterval(timer) ?? 0
  }

  function add({ name, bytes, state, reason = '' }) {
    const element = template.content.firstElementChild.cloneNode(true)
    const item = {
      name, bytes, state, reason, progress: 0, element,
      bar: element.querySelector('.file-progress'),
      meta: element.querySelector('.file-meta'),
      end: element.querySelector('.file-end'),
      buttons: Object.fromEntries([...element.querySelectorAll('[data-action]')].map(button => [button.dataset.action, button])),
    }
    // A file's name is the reader's text: it is set as text, never as markup.
    element.querySelector('.file-name').textContent = name
    element.querySelector('.file-page').textContent = extension(name).slice(0, 4) || 'file'
    item.bar.setAttribute('aria-label', `Upload of ${name}`)
    for (const [action, button] of Object.entries(item.buttons)) button.setAttribute('aria-label', `${NAMES[action]} ${name}`)
    items.push(item)
    list.append(element)
    paint(item)
  }

  function upload(item) {
    item.state = 'uploading'
    item.progress = 0
    paint(item)
  }

  /** One step of every upload under way. Each step is the same size, so every run ends at the same moment. */
  function tick() {
    for (const item of items.filter(item => item.state === 'uploading')) {
      item.progress += 5
      if (item.progress >= 100) {
        item.state = 'done'
        say(`${item.name} uploaded.`)
      }
      paint(item)
    }
    overview()
  }

  function remove(item) {
    // Focus goes to the file that takes this one's place, then to the one before, then to where files are chosen.
    const neighbor = item.element.nextElementSibling ?? item.element.previousElementSibling
    const held = item.element.contains(doc.activeElement)
    items = items.filter(other => other !== item)
    item.element.remove()
    overview()
    say(`${item.name} removed.`)
    if (held) (neighbor?.querySelector('.btn') ?? input).focus()
  }

  input.addEventListener('change', () => {
    const chosen = [...input.files]
    for (const file of chosen) {
      const reason = refusal(file)
      add({ name: file.name, bytes: file.size, state: reason ? 'refused' : 'queued', reason })
    }
    // The input is emptied, so choosing the same file again is a change.
    input.value = ''
    overview()
    const marked = chosen.filter(refusal).length
    say(`${files(chosen.length)} added${marked ? `, ${marked} cannot be uploaded` : ''}.`)
  }, { signal })

  start.addEventListener('click', () => {
    const waiting = items.filter(item => item.state === 'queued')
    waiting.forEach(upload)
    overview()
    say(`Uploading ${files(waiting.length)}.`)
    // The button is disabled now; focus moves to the first upload it started.
    waiting[0]?.buttons.cancel.focus()
  }, { signal })

  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]')
    const item = button && items.find(item => item.element === button.closest('.file'))
    if (!item) return
    if (button.dataset.action === 'remove') return remove(item)
    if (button.dataset.action === 'retry') {
      upload(item)
      say(`Uploading ${item.name}.`)
    } else {
      item.state = 'canceled'
      paint(item)
      say(`Upload of ${item.name} canceled.`)
    }
    overview()
  }, { signal })

  SAMPLES.forEach(add)
  overview()

  return () => {
    controller.abort()
    clearInterval(timer)
    items = []
    list.replaceChildren()
    queue.hidden = true
    refused.hidden = true
    start.disabled = true
    say('')
  }
}
