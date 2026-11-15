/**
 * Choosing a new password, with no account to change. The browser checks each field: `required` and
 * `minlength="12"` are the rules, and the second field is held to the first with a custom validity, so one
 * mechanism reports all three. This module turns the button on, names each error from its field while it shows,
 * and on a valid submit clears both passwords and shows the result. The passwords are never logged, stored or
 * put in a URL. Changing the account is the application's.
 * Returns the function that stops it, clears the fields and puts the form back.
 */
export function mount(root) {
  const controller = new AbortController()
  const { signal } = controller
  const ask = root.querySelector('[data-reset-ask]')
  const form = ask.querySelector('.form')
  const { password, confirm } = form.elements
  const send = form.querySelector('.btn')
  const result = root.querySelector('[data-reset-result]')
  const title = result.querySelector('[data-reset-result-title]')
  const fields = [password, confirm]

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
  const reported = (control) => !control.validity.valid && control.matches(':user-invalid')

  /** The second field is valid only while it repeats the first. An empty one is left to `required`. */
  const compare = () => {
    confirm.setCustomValidity(confirm.value && confirm.value !== password.value ? 'The two passwords are not the same.' : '')
    describe(confirm, reported(confirm))
  }

  for (const control of fields) {
    control.addEventListener('invalid', () => describe(control, true), { signal })
    // Either field can end the mismatch, so both compare; an error that no longer holds leaves at once.
    control.addEventListener('input', compare, { signal })
    for (const type of ['input', 'change', 'blur']) control.addEventListener(type, () => describe(control, reported(control)), { signal })
  }

  const show = (done) => {
    ask.hidden = done
    result.hidden = !done
  }

  /** Empties both passwords and everything that was said about them. */
  const clear = () => {
    form.reset()
    confirm.setCustomValidity('')
    for (const control of fields) describe(control, false)
  }

  // A submit event means every constraint passed, the match among them; an invalid form never gets here.
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    clear()
    show(true)
    title.focus()
  }, { signal })

  send.disabled = false

  return () => {
    controller.abort()
    send.disabled = true
    clear()
    show(false)
  }
}
