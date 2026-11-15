/**
 * Asking for a reset link, with no mail to send. The browser checks the address: `required` and `type="email"`
 * are the rules. This module turns the button on, names the error from its field while it shows, and on a valid
 * submit swaps the form for the result, which reads the same whether or not an account has that address.
 * Nothing leaves the page: sending the link is the application's.
 * Returns the function that stops it and puts the form back.
 */
export function mount(root) {
  const controller = new AbortController()
  const { signal } = controller
  const ask = root.querySelector('[data-reset-ask]')
  const form = ask.querySelector('.form')
  const email = form.elements.email
  const send = form.querySelector('.btn')
  const result = root.querySelector('[data-reset-result]')
  const title = result.querySelector('[data-reset-result-title]')

  /** The error is read with the field only while it shows: its id joins aria-describedby, and leaves with it. */
  const describe = (invalid) => {
    if (invalid) email.setAttribute('aria-describedby', email.dataset.error)
    else email.removeAttribute('aria-describedby')
  }
  email.addEventListener('invalid', () => describe(true), { signal })
  for (const type of ['input', 'change', 'blur']) {
    email.addEventListener(type, () => describe(!email.validity.valid && email.matches(':user-invalid')), { signal })
  }

  const show = (sent) => {
    ask.hidden = sent
    result.hidden = !sent
  }

  // A submit event means the address passed; an invalid form never gets here.
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    // The address is set as text, never as markup.
    result.querySelector('[data-reset-email]').textContent = email.value.trim()
    show(true)
    title.focus()
  }, { signal })

  result.querySelector('[data-reset-again]').addEventListener('click', () => {
    show(false)
    email.focus()
    email.select()
  }, { signal })

  send.disabled = false

  return () => {
    controller.abort()
    send.disabled = true
    show(false)
  }
}
