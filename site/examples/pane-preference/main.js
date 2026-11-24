import { splitter } from '@master/ui/behaviors/splitter.js'

export function mount(root) {
  const layout = root.querySelector('.splitter')
  const handle = layout.querySelector('.splitter-handle')
  const output = root.querySelector('output')
  const control = splitter(layout)
  const initial = control.value
  const key = 'master-ui:recording-list-width'
  const controller = new AbortController()
  const { signal } = controller
  let pointer = null

  // An embedded example can have no storage. The handle still works for this visit.
  let storage
  try {
    storage = window.localStorage
    const saved = storage.getItem(key)
    if (saved !== null && saved.trim() !== '' && Number.isFinite(Number(saved))) control.value = Number(saved)
  } catch { storage = null }
  let committed = control.value

  function announce() {
    output.value = 'File list width: ' + Math.round(control.value) + '%'
  }
  function save() {
    if (control.value === committed) return
    committed = control.value
    try { storage?.setItem(key, String(committed)) } catch { storage = null }
    announce()
  }
  handle.addEventListener('pointerdown', event => {
    if (event.button === 0 && pointer === null) pointer = event.pointerId
  }, { signal })
  // A key commits immediately. A drag waits for a release from its own pointer.
  handle.addEventListener('change', () => { if (pointer === null) save() }, { signal })
  handle.addEventListener('pointerup', event => {
    if (event.pointerId !== pointer) return
    pointer = null
    save()
  }, { signal })
  function cancel(event) {
    if (event.pointerId !== pointer) return
    pointer = null
    control.value = committed
    announce()
  }
  handle.addEventListener('pointercancel', cancel, { signal })
  handle.addEventListener('lostpointercapture', cancel, { signal })
  root.querySelector('button').addEventListener('click', () => {
    control.value = initial
    committed = initial
    try { storage?.removeItem(key) } catch { storage = null }
    announce()
  }, { signal })
  announce()
  return () => { controller.abort(); control() }
}
