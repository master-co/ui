const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
export function mount(root) {
  const body = root.querySelector('tbody')
  const add = root.querySelector('#items-add')
  const status = root.querySelector('[role="status"]')
  const controller = new AbortController()
  const { signal } = controller
  let nextId = 1
  function append(name, cents, quantity) {
    const row = root.querySelector('template').content.querySelector('tr').cloneNode(true)
    row.dataset.id = String(nextId++)
    row.dataset.cents = String(cents)
    row.querySelector('[data-name]').value = name
    row.querySelector('[data-count]').value = String(quantity)
    row.querySelector('[data-unit]').textContent = money.format(cents / 100)
    body.append(row)
    return row
  }
  function draw() {
    let total = 0
    let valid = true
    for (const row of body.rows) {
      const name = row.querySelector('[data-name]')
      const label = name.value.trim() || 'Item ' + row.dataset.id
      const count = row.querySelector('[data-count]')
      name.setAttribute('aria-label', 'Description for ' + label)
      count.setAttribute('aria-label', 'Quantity for ' + label)
      const cents = Number(row.dataset.cents) * count.valueAsNumber
      const good = count.validity.valid
      row.querySelector('[data-subtotal]').textContent = good ? money.format(cents / 100) : 'Enter a whole quantity'
      if (good) total += cents
      else valid = false
      for (const button of row.querySelectorAll('button')) {
        const action = button.dataset.act
        button.setAttribute('aria-label', action === 'remove' ? 'Remove ' + label : 'Move ' + label + ' ' + action)
        button.disabled = action === 'up' && !row.previousElementSibling || action === 'down' && !row.nextElementSibling
      }
    }
    root.querySelector('output').value = valid ? money.format(total / 100) : 'Check quantities'
  }
  append('Recorder rental', 2900, 2)
  append('Wind screen', 650, 1)
  draw()
  body.addEventListener('input', draw, { signal })
  body.addEventListener('click', event => {
    const button = event.target.closest('[data-act]')
    if (!button || button.disabled) return
    const row = button.closest('tr')
    const neighbor = row.nextElementSibling || row.previousElementSibling
    const label = row.querySelector('[data-name]').value || 'Item ' + row.dataset.id
    if (button.dataset.act === 'remove') {
      row.remove()
      const target = neighbor?.querySelector('[data-name]') || add
      target.focus()
      status.textContent = label + ' removed.'
    } else {
      if (button.dataset.act === 'up') body.insertBefore(row, row.previousElementSibling)
      else body.insertBefore(row.nextElementSibling, row)
      row.querySelector('[data-name]').focus()
      status.textContent = label + ' moved to row ' + (row.sectionRowIndex + 1)
    }
    draw()
  }, { signal })
  add.addEventListener('click', () => {
    const row = append('', 1000, 1)
    draw()
    row.querySelector('[data-name]').focus()
    status.textContent = 'New item at $10.00 per unit.'
  }, { signal })
  return () => controller.abort()
}
