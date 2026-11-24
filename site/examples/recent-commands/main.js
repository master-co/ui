import { command } from '@master/ui/behaviors/command.js'

export function mount(root) {
  const dialog = root.querySelector('dialog')
  const clear = root.querySelector('#clear-history')
  const field = dialog.querySelector('input')
  const feedback = root.querySelector('#command-feedback')
  const detach = command(dialog, { shortcut: '' })
  const controller = new AbortController()
  const { signal } = controller
  clear.addEventListener('click', () => {
    root.querySelector('#history-group').remove()
    clear.hidden = true
    field.focus()
    feedback.textContent = 'Recent commands cleared.'
  }, { signal })
  dialog.addEventListener('click', event => {
    const option = event.target.closest('[role="option"]')
    if (option) feedback.textContent = 'Ran: ' + option.textContent
  }, { signal })
  return () => { controller.abort(); detach() }
}
