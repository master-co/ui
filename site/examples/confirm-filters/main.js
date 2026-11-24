const bookings = [['Pier survey', 'Confirmed'], ['Ferry arrival', 'Pending'], ['East inlet', 'Confirmed']]
export function mount(root) {
  const trigger = root.querySelector('#draft-trigger')
  const popover = root.querySelector('[popover]')
  const dialog = root.querySelector('dialog')
  const form = root.querySelector('form')
  const field = form.elements.status
  const controller = new AbortController()
  const { signal } = controller
  let applied = 'All'
  let showing = false
  let narrow
  function results() {
    const matches = bookings.filter(([, status]) => applied === 'All' || status === applied)
    root.querySelector('ul').replaceChildren(...matches.map(([name, status]) => {
      const item = document.createElement('li')
      item.textContent = name + ' · ' + status
      return item
    }))
    root.querySelector('[role="status"]').textContent = matches.length + (matches.length === 1 ? ' request · ' : ' requests · ') + applied
  }
  function show() {
    if (narrow) dialog.showModal()
    else popover.showPopover({ source: trigger })
  }
  function hide() {
    if (dialog.open) dialog.close()
    if (popover.matches(':popover-open')) popover.hidePopover()
  }
  function finish() {
    showing = false
    hide()
    field.value = applied
    trigger.setAttribute('aria-expanded', 'false')
    trigger.focus()
  }
  function place() {
    const next = root.getBoundingClientRect().width < 480
    if (next === narrow) return
    const focused = form.contains(document.activeElement) ? document.activeElement : field
    if (showing) hide()
    narrow = next
    const destination = narrow ? dialog.querySelector('.dialog-body') : popover
    destination.append(form)
    trigger.setAttribute('aria-controls', narrow ? dialog.id : popover.id)
    if (showing) { show(); focused.focus() }
  }
  trigger.addEventListener('click', () => {
    if (showing) { finish(); return }
    field.value = applied
    showing = true
    trigger.setAttribute('aria-expanded', 'true')
    show()
    field.focus()
  }, { signal })
  form.addEventListener('submit', event => { event.preventDefault(); applied = field.value; results(); finish() }, { signal })
  form.querySelector('[type="button"]').addEventListener('click', finish, { signal })
  dialog.addEventListener('cancel', event => { event.preventDefault(); finish() }, { signal })
  popover.addEventListener('toggle', () => {
    if (showing && !narrow && !popover.matches(':popover-open')) {
      showing = false
      field.value = applied
      trigger.setAttribute('aria-expanded', 'false')
    }
  }, { signal })
  const observer = new ResizeObserver(place)
  observer.observe(root)
  place()
  results()
  return () => { controller.abort(); observer.disconnect(); hide() }
}
