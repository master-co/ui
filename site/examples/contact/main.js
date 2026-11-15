/**
 * A contact form with nowhere to send to. The browser checks the fields: `required` and `type="email"` are the
 * rules, and the stylesheet shows a field's error once the reader has tried. This module turns the button on,
 * names each error from its field while it shows, and on a valid submit swaps the form for what was written,
 * with a way back to change it. Nothing leaves the page: sending is the application's.
 * Returns the function that stops it and puts the form back.
 */
export function mount(root) {
  const controller = new AbortController()
  const { signal } = controller
  const ask = root.querySelector('[data-contact-ask]')
  const form = ask.querySelector('.form')
  const send = form.querySelector('.form-actions .btn')
  const result = root.querySelector('[data-contact-result]')
  const title = result.querySelector('[data-contact-result-title]')

  /**
   * A field's error is read with the field only while it shows: its id joins aria-describedby, after the hint,
   * when the browser reports the field, and leaves when the value is valid again.
   */
  const describe = (control, invalid) => {
    const ids = (control.getAttribute('aria-describedby') ?? '').split(' ').filter(id => id && id !== control.dataset.error)
    if (invalid) ids.push(control.dataset.error)
    if (ids.length) control.setAttribute('aria-describedby', ids.join(' '))
    else control.removeAttribute('aria-describedby')
  }
  for (const control of form.querySelectorAll('[data-error]')) {
    control.addEventListener('invalid', () => describe(control, true), { signal })
    for (const type of ['input', 'change', 'blur']) {
      control.addEventListener(type, () => describe(control, !control.validity.valid && control.matches(':user-invalid')), { signal })
    }
  }

  /** `required` is satisfied by a space: a name or a message of spaces alone is refused in the browser's own words. */
  for (const control of [form.elements.name, form.elements.message]) {
    control.addEventListener('input', () => control.setCustomValidity(control.value && !control.value.trim() ? 'Fill in this field.' : ''), { signal })
  }

  const show = (sent) => {
    ask.hidden = sent
    result.hidden = !sent
  }

  // A submit event means every constraint passed; an invalid form never gets here.
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const written = new FormData(form)
    // What was typed is set as text, never as markup.
    for (const slot of result.querySelectorAll('[data-contact-value]')) slot.textContent = String(written.get(slot.dataset.contactValue)).trim()
    show(true)
    title.focus()
  }, { signal })

  result.querySelector('[data-contact-edit]').addEventListener('click', () => {
    show(false)
    form.elements.message.focus()
  }, { signal })

  send.disabled = false

  return () => {
    controller.abort()
    send.disabled = true
    show(false)
  }
}
