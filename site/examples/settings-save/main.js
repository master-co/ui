export function mount(root) {
  const form = root.querySelector('form')
  const field = form.elements.archive
  const discard = form.querySelector('[type="button"]')
  const save = form.querySelector('[type="submit"]')
  const status = form.querySelector('[role="status"]')
  const controller = new AbortController()
  const { signal } = controller
  let saved = field.value
  let busy = false
  let timer
  function draw(message) {
    const dirty = saved !== field.value
    save.disabled = busy || !dirty
    discard.disabled = busy || !dirty
    field.readOnly = busy
    status.textContent = message || (dirty ? 'Unsaved changes' : 'All changes saved')
  }
  field.addEventListener('input', () => draw(), { signal })
  discard.addEventListener('click', () => { field.value = saved; draw('Changes discarded.'); field.focus() }, { signal })
  form.addEventListener('submit', event => {
    event.preventDefault()
    if (busy || field.value === saved || !form.reportValidity()) return
    const value = field.value
    const failed = form.elements.response.value === 'fail'
    busy = true
    draw('Saving settings…')
    timer = setTimeout(() => {
      busy = false
      if (!failed) saved = value
      draw(failed ? 'Could not save. Your edits are still here.' : 'Settings saved.')
    }, 350)
  }, { signal })
  return () => { clearTimeout(timer); controller.abort() }
}
