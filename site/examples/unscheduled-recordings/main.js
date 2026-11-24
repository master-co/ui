export function mount(root) {
  const form = root.querySelector('form')
  const field = form.querySelector('input')
  const list = root.querySelector('ul')
  const status = root.querySelector('[role="status"]')
  const timeline = root.querySelector('.gantt')
  const start = Date.parse(field.min + 'T00:00:00Z')
  function schedule(event) {
    event.preventDefault()
    if (!form.reportValidity()) return
    const days = (field.valueAsNumber - start) / 86400000
    const row = document.createElement('li')
    row.className = 'gantt-row'
    row.style.setProperty('--from', String(days))
    row.style.setProperty('--to', String(days + 1))
    const title = document.createElement('span')
    title.className = 'gantt-label'
    title.textContent = 'Microphone check · Mira'
    const bar = document.createElement('time')
    bar.className = 'gantt-bar'
    bar.dateTime = field.value
    const dateLabel = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(field.valueAsNumber)
    bar.textContent = String(new Date(field.valueAsNumber).getUTCDate())
    bar.setAttribute('aria-label', dateLabel)
    row.append(title, bar)
    timeline.append(row)
    list.hidden = true
    status.textContent = 'Microphone check scheduled for ' + dateLabel + '. All tasks have dates.'
    row.tabIndex = -1
    row.focus()
  }
  form.addEventListener('submit', schedule)
  return () => form.removeEventListener('submit', schedule)
}
