export function mount(root) {
  const review = root.querySelector('#consent-review')
  const scope = root.querySelector('#consent-scope')
  const status = root.querySelector('[role="status"]')
  const controller = new AbortController()
  const { signal } = controller
  review.addEventListener('click', () => {
    scope.hidden = false
    review.hidden = true
    root.querySelector('#consent-workspace').focus()
  }, { signal })
  root.querySelector('#consent-back').addEventListener('click', () => {
    scope.hidden = true
    review.hidden = false
    review.focus()
  }, { signal })
  root.querySelector('#consent-allow').addEventListener('click', () => {
    const workspace = scope.querySelector('dd').textContent
    const permissions = [...scope.querySelectorAll('li')].map(item => item.textContent)
    status.textContent = 'Connected: ' + workspace + ' · ' + permissions.join(', ')
    scope.hidden = true
    root.querySelector('h2').focus()
  }, { signal })
  return () => controller.abort()
}
