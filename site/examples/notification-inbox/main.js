/**
 * An inbox of notifications on the page. The rows are markup the server wrote, so the list reads in full
 * without this script; the script reads which rows are unread into one list of its own and draws everything
 * from it: the rows that show, the count, whether "Mark all as read" can be pressed and the empty result.
 * Marking a row read is kept for this visit only: saving it, and anything arriving, is the application's.
 * Returns the function that stops it and puts every row back as it was.
 */
export function mount(root) {
  const controller = new AbortController()
  const { signal } = controller
  const list = root.querySelector('[data-inbox-list]')
  const empty = root.querySelector('[data-inbox-empty]')
  const count = root.querySelector('[data-inbox-count]')
  const status = root.querySelector('[data-inbox-status]')
  const readAll = root.querySelector('[data-inbox-read-all]')
  const filters = [...root.querySelectorAll('[name="inbox-filter"]')]
  /** The one state: every notification, whether it is unread, and a copy of its row as it arrived. */
  const items = [...list.children].map(row => ({
    row,
    arrived: row.cloneNode(true),
    title: row.querySelector('.list-title').textContent.trim(),
    unread: row.hasAttribute('data-unread'),
  }))
  let filter = 'all'

  const unread = () => items.filter(item => item.unread).length
  const shown = () => items.filter(item => filter === 'all' || item.unread)
  const left = () => unread() ? `${unread()} unread.` : 'Nothing is unread.'
  const say = (message) => { status.textContent = message }
  const current = () => filters.find(input => input.checked)

  /** Draws the inbox from the state. A row that has been read loses its badge and its button for good. */
  function render() {
    for (const { row, unread } of items) {
      if (unread) continue
      row.removeAttribute('data-unread')
      row.querySelector('[data-inbox-unread]')?.remove()
      row.querySelector('.list-end')?.remove()
    }
    const rows = shown().map(item => item.row)
    list.replaceChildren(...rows)
    empty.hidden = rows.length > 0
    count.textContent = unread() ? `${unread()} unread` : 'All read'
    readAll.disabled = !unread()
  }

  function read(item) {
    // Focus goes to the next unread notification, then to the one before, then to the filter.
    const rows = [...list.children]
    const here = rows.indexOf(item.row)
    const others = rows.filter(row => row !== item.row && row.querySelector('[data-inbox-read]'))
    const next = others.find(row => rows.indexOf(row) > here) ?? others.findLast(row => rows.indexOf(row) < here)
    item.unread = false
    render()
    say(`“${item.title}” marked as read. ${left()}`)
    ;(next?.querySelector('[data-inbox-read]') ?? current()).focus()
  }

  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-inbox-read]')
    const item = button && items.find(item => item.row === button.closest('.list-row'))
    if (item) read(item)
  }, { signal })

  readAll.addEventListener('click', () => {
    for (const item of items) item.unread = false
    // The button is disabled once nothing is unread, so focus leaves it first.
    current().focus()
    render()
    say('All notifications marked as read.')
  }, { signal })

  root.addEventListener('change', (event) => {
    if (event.target.name !== 'inbox-filter') return
    filter = event.target.value
    render()
    const total = shown().length
    say(filter === 'unread' ? left() : `${total} ${total === 1 ? 'notification' : 'notifications'}. ${left()}`)
  }, { signal })

  root.querySelector('[data-inbox-show-all]').addEventListener('click', () => {
    filters[0].checked = true
    filter = 'all'
    render()
    filters[0].focus()
  }, { signal })

  const controls = [...filters, readAll, ...root.querySelectorAll('[data-inbox-read]')]
  for (const control of controls) control.disabled = false
  render()

  return () => {
    controller.abort()
    filters[0].checked = true
    list.replaceChildren(...items.map(item => item.arrived))
    empty.hidden = true
    count.textContent = `${items.filter(item => item.arrived.hasAttribute('data-unread')).length} unread`
    readAll.disabled = true
    for (const input of filters) input.disabled = true
    say('')
  }
}
