export function mount(root) {
  const form = root.querySelector('form')
  const email = form.elements.email
  const list = root.querySelector('ul')
  const status = root.querySelector('[role="status"]')
  const controller = new AbortController()
  const { signal } = controller
  let sequence = 0
  function add(address, role) {
    const item = document.createElement('li')
    item.className = 'list-row'
    item.dataset.email = address
    const body = document.createElement('div')
    body.className = 'list-body'
    const title = document.createElement('p')
    title.className = 'list-title'
    title.textContent = address
    const detail = document.createElement('p')
    detail.className = 'list-description'
    detail.textContent = role
    body.append(title, detail)
    const trigger = document.createElement('button')
    trigger.className = 'btn btn-sm'
    trigger.type = 'button'
    trigger.textContent = 'Actions'
    trigger.setAttribute('aria-label', 'Actions for ' + address)
    const menu = document.createElement('div')
    menu.className = 'menu'
    menu.popover = 'auto'
    menu.id = 'invite-actions-' + ++sequence
    trigger.setAttribute('popovertarget', menu.id)
    for (const action of ['Resend', 'Withdraw']) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'menu-item'
      button.textContent = action
      button.dataset.action = action
      button.setAttribute('aria-label', action + ' invitation to ' + address)
      menu.append(button)
    }
    item.append(body, trigger, menu)
    list.append(item)
  }
  add('mira@example.org', 'Editor')
  add('kai@example.org', 'Viewer')
  email.addEventListener('input', () => email.setCustomValidity(''), { signal })
  form.addEventListener('submit', event => {
    event.preventDefault()
    const address = email.value.trim()
    if ([...list.children].some(item => item.dataset.email.toLowerCase() === address.toLowerCase())) {
      email.setCustomValidity('An invitation is already pending for this address.')
      email.reportValidity()
      return
    }
    add(address, form.elements.role.value)
    status.textContent = 'Invitation created for ' + address
    form.reset()
    email.focus()
  }, { signal })
  list.addEventListener('click', event => {
    const button = event.target.closest('[data-action]')
    if (!button) return
    const item = button.closest('li')
    const address = item.dataset.email
    item.querySelector('[popover]').hidePopover()
    if (button.dataset.action === 'Withdraw') {
      const next = item.nextElementSibling || item.previousElementSibling
      item.remove()
      const target = next?.querySelector('button') || email
      target.focus()
      status.textContent = 'Invitation withdrawn for ' + address
    } else {
      item.querySelector('button').focus()
      status.textContent = 'Invitation resent to ' + address
    }
  }, { signal })
  return () => controller.abort()
}
