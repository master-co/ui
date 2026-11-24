import { sortable } from '@master/ui/behaviors/sortable.js'
export function mount(root) {
  const list = root.querySelector('ol')
  const status = root.querySelector('[data-removal-status]')
  const controller = new AbortController()
  const { signal } = controller
  const detach = sortable(list)
  list.addEventListener('input', event => {
    if (!event.target.matches('input')) return
    event.target.closest('li').querySelector('img').alt = event.target.value
  }, { signal })
  list.addEventListener('click', event => {
    const button = event.target.closest('[data-remove]')
    if (!button) return
    const item = button.closest('li')
    const neighbor = item.nextElementSibling || item.previousElementSibling
    const name = item.querySelector('.list-title').textContent
    item.remove()
    const target = neighbor?.querySelector('.sortable-handle') || root.querySelector('h2')
    target.focus()
    status.textContent = name + ' removed. ' + list.children.length + ' remaining.'
  }, { signal })
  return () => { controller.abort(); detach() }
}
