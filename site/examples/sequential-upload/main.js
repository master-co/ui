const files = ['pier.wav', 'gulls.wav', 'wind.wav', 'ferry.wav', 'reeds.wav']
export function mount(root) {
  const start = root.querySelector('#batch-start')
  const cancel = root.querySelector('#batch-cancel')
  const active = root.querySelector('#active-file')
  const progress = root.querySelector('progress')
  const status = root.querySelector('#batch-status')
  const name = root.querySelector('#batch-name')
  const percent = root.querySelector('#batch-percent')
  const controller = new AbortController()
  const { signal } = controller
  let timer
  let completed = 0
  function beginFile() {
    name.textContent = files[completed]
    progress.value = 0
    percent.textContent = '0%'
    status.textContent = 'File ' + (completed + 1) + ' of ' + files.length + ': ' + name.textContent
  }
  function finish(message) {
    clearInterval(timer)
    active.hidden = true
    start.disabled = false
    cancel.disabled = true
    status.textContent = message
    if (root.ownerDocument.activeElement === cancel || root.ownerDocument.activeElement === root.ownerDocument.body) start.focus()
  }
  start.addEventListener('click', () => {
    clearInterval(timer)
    completed = 0
    active.hidden = false
    start.disabled = true
    cancel.disabled = false
    cancel.focus()
    beginFile()
    timer = setInterval(() => {
      progress.value += 20
      percent.textContent = progress.value + '%'
      if (progress.value < 100) return
      ++completed
      if (completed === files.length) finish('All ' + completed + ' files completed.')
      else beginFile()
    }, 250)
  }, { signal })
  cancel.addEventListener('click', () => finish('Canceled. ' + completed + ' of ' + files.length + ' files completed.'), { signal })
  return () => { clearInterval(timer); controller.abort() }
}
