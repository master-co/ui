export function mount(root) {
  const field = root.querySelector('input')
  const toggle = root.querySelector('button')
  const controller = new AbortController()
  const { signal } = controller
  toggle.addEventListener('mousedown', event => {
    if (event.button === 0 && root.ownerDocument.activeElement === field) event.preventDefault()
  }, { signal })
  toggle.addEventListener('click', () => {
    const { selectionStart, selectionEnd, selectionDirection } = field
    const reveal = field.type === 'password'
    field.type = reveal ? 'text' : 'password'
    toggle.setAttribute('aria-pressed', String(reveal))
    field.setSelectionRange(selectionStart, selectionEnd, selectionDirection)
  }, { signal })
  return () => controller.abort()
}
