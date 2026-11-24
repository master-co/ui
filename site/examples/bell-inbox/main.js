export function mount(root) {
  const updates = ['Pier survey confirmed', 'Ferry recording ready', 'Wind study shared']
  const unread = new Set(updates)
  const trigger = root.querySelector('#bell-trigger')
  const panel = root.querySelector('[popover]')
  const list = panel.querySelector('ul')
  const all = root.querySelector('#bell-all')
  const history = root.querySelector('section')
  const controller = new AbortController()
  const { signal } = controller
  function draw() {
    trigger.querySelector('.badge').textContent = String(unread.size)
    trigger.setAttribute('aria-label', 'Notifications, ' + unread.size + ' unread')
    list.replaceChildren(...[...unread].map(name => {
      const item = document.createElement('li')
      item.className = 'list-row'
      const text = document.createElement('span')
      text.className = 'list-body'
      text.textContent = name
      const read = document.createElement('button')
      read.type = 'button'
      read.className = 'btn btn-sm'
      read.value = name
      read.textContent = 'Mark read'
      read.setAttribute('aria-label', 'Mark ' + name + ' as read')
      item.append(text, read)
      return item
    }))
    panel.querySelector('[role="status"]').textContent = unread.size ? '' : 'All caught up.'
  }
  list.addEventListener('click', event => {
    const button = event.target.closest('button')
    if (!button) return
    const index = [...list.querySelectorAll('button')].indexOf(button)
    unread.delete(button.value)
    draw()
    const remaining = list.querySelectorAll('button')
    const next = remaining[Math.min(index, remaining.length - 1)] || all
    next.focus()
  }, { signal })
  all.addEventListener('click', () => {
    const ordered = history.querySelector('ol')
    ordered.replaceChildren(...updates.map(name => {
      const item = document.createElement('li')
      item.textContent = name + (unread.has(name) ? ' · Unread' : ' · Read')
      return item
    }))
    panel.hidePopover()
    history.hidden = false
    history.querySelector('h3').focus()
  }, { signal })
  draw()
  return () => controller.abort()
}
