export function mount(form) {
  const controller = new AbortController()
  const { signal } = controller
  const summary = form.querySelector('#request-errors')
  const conditional = form.querySelector('#visit-details')
  const result = form.querySelector('output')
  const { project, start, end, entry } = form.elements
  const messages = new Map([[project, 'Enter a project name.'], [start, 'Enter a start date.'], [end, 'Enter an end date.'], [entry, 'Enter the studio entrance code.']])
  let submitted = false
  // The enhanced form can present errors together. Without it the native constraints still run.
  form.noValidate = true
  function update() {
    const visit = form.elements.location.value === 'studio'
    conditional.disabled = !visit
    conditional.hidden = !visit
    end.min = start.value
    const errors = []
    for (const [field, missing] of messages) {
      const invalid = submitted && field.willValidate && !field.validity.valid
      const message = invalid ? (field.validity.rangeUnderflow ? 'End date must be on or after the start date.' : missing) : ''
      form.querySelector('#' + field.id + '-error').textContent = message
      if (invalid) {
        field.setAttribute('aria-invalid', 'true')
        const link = document.createElement('a')
        link.href = '#' + field.id
        link.textContent = message
        const item = document.createElement('li')
        item.append(link)
        errors.push(item)
      } else field.removeAttribute('aria-invalid')
    }
    summary.querySelector('ul').replaceChildren(...errors)
    summary.hidden = errors.length === 0
    return errors.length
  }
  summary.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]')
    if (link) {
      event.preventDefault()
      form.querySelector(link.hash).focus()
    }
  }, { signal })
  form.addEventListener('input', () => { result.value = ''; update() }, { signal })
  form.addEventListener('submit', event => {
    event.preventDefault()
    submitted = true
    if (update()) { summary.focus(); return }
    const values = new FormData(form)
    result.value = 'Ready to review: ' + values.get('project') + ' · ' + values.get('start') + ' to ' + values.get('end') + ' · ' + values.get('location')
  }, { signal })
  update()
  return () => { controller.abort(); form.noValidate = false }
}
