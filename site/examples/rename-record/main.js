import { editable } from '@master/ui/behaviors/editable.js'

export function mount(root) {
  const editor = root.querySelector('.editable')
  const field = root.querySelector('input')
  const preview = root.querySelector('button')
  const error = root.querySelector('#rename-error')
  const saved = root.querySelector('#last-saved')
  const control = editable(editor)
  const controller = new AbortController()
  const { signal } = controller
  let rejected = null
  let timer
  function resumeDraft() {
    if (rejected === null || field.hidden) return
    field.value = rejected
    field.setSelectionRange(rejected.length, rejected.length)
    field.setCustomValidity('This name is already in use.')
    field.setAttribute('aria-invalid', 'true')
    rejected = null
  }
  preview.addEventListener('click', resumeDraft, { signal })
  field.addEventListener('input', () => {
    if (field.hidden) return
    field.setCustomValidity('')
    error.textContent = ''
  }, { signal, capture: true })
  field.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      field.setCustomValidity('')
      error.textContent = ''
    }
  }, { signal, capture: true })
  // Leaving an invalid draft cancels this edit. Its error belongs to that draft alone.
  field.addEventListener('blur', () => {
    if (!field.validity.customError) return
    field.setCustomValidity('')
    error.textContent = ''
  }, { signal })
  editor.addEventListener('change', () => {
    const draft = control.value
    editor.setAttribute('aria-busy', 'true')
    error.textContent = 'Saving…'
    // This deterministic response stands in for a service that checks name uniqueness.
    timer = setTimeout(() => {
      editor.removeAttribute('aria-busy')
      if (draft.trim().toLowerCase() === 'harbor') {
        control.value = saved.textContent
        rejected = draft
        error.textContent = 'Harbor is already in use. Choose a different recording name.'
        if (root.ownerDocument.activeElement === preview) { control.edit(); resumeDraft() }
      } else {
        saved.textContent = draft
        error.textContent = 'Saved.'
      }
    }, 250)
  }, { signal })
  return () => { clearTimeout(timer); controller.abort(); control() }
}
