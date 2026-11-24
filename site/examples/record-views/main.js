const bookings = [
  { id: 'pier-18', name: 'Pier survey', fee: 45, status: 'Confirmed' },
  { id: 'ferry-19', name: 'Ferry arrival', fee: 75, status: 'Pending' },
  { id: 'reeds-20', name: 'East inlet', fee: 30, status: 'Confirmed' },
]
export function mount(root) {
  const selected = new Set()
  const controller = new AbortController()
  const { signal } = controller
  const table = root.querySelector('tbody')
  const list = root.querySelector('.list')
  const dialog = root.querySelector('dialog')
  function element(tag, classes, text) {
    const node = document.createElement(tag)
    node.className = classes
    if (text) node.textContent = text
    return node
  }
  function controls(record, view) {
    const check = element('input', 'checkbox')
    check.type = 'checkbox'
    check.value = record.id
    check.setAttribute('aria-label', 'Select ' + record.name)
    const details = element('button', 'btn btn-quiet btn-sm', record.name)
    details.type = 'button'
    details.dataset.open = record.id
    const more = element('button', 'btn btn-quiet btn-sm', 'Actions')
    more.type = 'button'
    more.setAttribute('aria-label', 'Actions for ' + record.name)
    const menu = element('div', 'popover')
    menu.id = view + '-actions-' + record.id
    menu.popover = 'auto'
    more.setAttribute('popovertarget', menu.id)
    const action = element('button', 'btn btn-sm', 'View booking details')
    action.type = 'button'
    action.dataset.open = record.id
    menu.append(action)
    return { check, details, more, menu }
  }
  for (const record of bookings) {
    const wide = controls(record, 'table')
    const tr = table.insertRow()
    tr.insertCell().append(wide.check)
    const name = element('th', 'table-cell')
    name.scope = 'row'
    name.append(wide.details)
    tr.append(name)
    const fee = tr.insertCell()
    fee.className = 'table-cell table-numeric'
    fee.textContent = record.fee.toFixed(2)
    tr.insertCell().textContent = record.status
    tr.insertCell().append(wide.more, wide.menu)
    for (const cell of tr.cells) cell.classList.add('table-cell')

    const narrow = controls(record, 'list')
    const item = element('li', 'list-row')
    const body = element('div', 'list-body')
    const title = document.createElement('div')
    title.append(narrow.details)
    body.append(title, element('p', 'list-description', '$' + record.fee.toFixed(2) + ' · ' + record.status))
    item.append(narrow.check, body, narrow.more, narrow.menu)
    list.append(item)
  }
  root.addEventListener('change', event => {
    const box = event.target.closest('.checkbox')
    if (!box) return
    if (box.checked) selected.add(box.value)
    else selected.delete(box.value)
    for (const other of root.querySelectorAll('.checkbox')) other.checked = selected.has(other.value)
    root.querySelector('[role="status"]').textContent = selected.size + ' selected'
  }, { signal })
  root.addEventListener('click', event => {
    const opener = event.target.closest('[data-open]')
    if (!opener) return
    const record = bookings.find(item => item.id === opener.dataset.open)
    opener.closest('[popover]')?.hidePopover()
    dialog.querySelector('h3').textContent = record.name
    dialog.querySelector('p').textContent = record.id + ' · $' + record.fee.toFixed(2) + ' USD · ' + record.status
    dialog.showModal()
  }, { signal })
  return () => controller.abort()
}
