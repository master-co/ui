export function mount(root) {
  const states = {
    pending: ['Awaiting confirmation', 'Check this reference before starting another payment.', 'Check status'],
    confirmed: ['Payment confirmed', 'The receipt is available.', 'View receipt'],
    expired: ['Request expired', 'This reference is closed. Start a new request to continue.', 'Start a new request'],
  }
  const button = root.querySelector('#payment-action')
  const response = root.querySelector('select')
  const label = root.querySelector('#payment-ref')
  const receipt = root.querySelector('#payment-receipt')
  let reference = 417
  let state = 'pending'
  function render() {
    const [title, message, action] = states[state]
    root.querySelector('#payment-state').textContent = title
    root.querySelector('#payment-message').textContent = message
    button.textContent = action
    response.disabled = state !== 'pending'
    label.textContent = 'HB-' + String(reference).padStart(5, '0')
  }
  function act() {
    if (state === 'confirmed') {
      receipt.hidden = false
      receipt.textContent = 'Receipt for ' + label.textContent + ': $29.00 USD received.'
      receipt.focus()
      return
    }
    if (state === 'expired') {
      ++reference
      response.value = 'pending'
    }
    state = response.value
    render()
  }
  button.addEventListener('click', act)
  return () => button.removeEventListener('click', act)
}
