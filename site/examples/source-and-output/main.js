export function mount(root) {
  const controller = new AbortController()
  const status = root.querySelector('[role="status"]')
  root.addEventListener('click', async event => {
    const button = event.target.closest('button')
    if (!button) return
    const panel = button.closest('.code-panel')
    const name = panel.querySelector('h3').textContent
    try {
      await navigator.clipboard.writeText(panel.querySelector('code').textContent)
      status.textContent = name + ' copied.'
    } catch {
      status.textContent = 'Select the text under ' + name + ' and copy it manually.'
    }
  }, { signal: controller.signal })
  return () => controller.abort()
}
