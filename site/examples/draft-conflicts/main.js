const fields = [
  { key: 'title', label: 'Title', original: 'Harbor recording', mine: 'Pier at dawn', latest: 'East pier at dawn' },
  { key: 'credit', label: 'Credit', original: 'Field team', mine: 'Mira Chen', latest: 'Mira Chen and Kai Lin' },
]
export function mount(root) {
  const form = root.querySelector('form')
  const status = form.querySelector('[role="status"]')
  const save = form.querySelector('button')
  for (const field of fields) {
    const section = root.querySelector('template').content.firstElementChild.cloneNode(true)
    const title = section.querySelector('h3')
    title.id = 'conflict-' + field.key
    title.textContent = field.label
    section.setAttribute('aria-labelledby', title.id)
    section.querySelector('[role="radiogroup"]').setAttribute('aria-label', 'Version to keep for ' + field.label)
    section.querySelectorAll('input').forEach(input => { input.name = field.key })
    const [mine, latest] = section.querySelectorAll('.card p')
    mine.textContent = field.mine
    latest.textContent = field.latest
    section.querySelector('.accordion-content').textContent = field.original
    root.querySelector('#conflict-fields').append(section)
  }
  function update() {
    const remaining = fields.filter(field => !form.elements[field.key].value).length
    save.disabled = remaining > 0
    status.textContent = remaining + (remaining === 1 ? ' field unresolved' : ' fields unresolved')
  }
  function submit(event) {
    event.preventDefault()
    if (fields.some(field => !form.elements[field.key].value)) return
    status.textContent = fields.map(field => field.label + ': ' + field[form.elements[field.key].value]).join(' · ')
  }
  form.addEventListener('change', update)
  form.addEventListener('submit', submit)
  return () => { form.removeEventListener('change', update); form.removeEventListener('submit', submit) }
}
