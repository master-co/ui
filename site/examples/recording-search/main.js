import { combobox } from '@master/ui/behaviors/combobox.js'

const stations = [['tainan', '台南'], ['taipei', '台北'], ['taichung', '台中']]
export function mount(root) {
  const field = root.querySelector('input')
  const list = root.querySelector('[role="listbox"]')
  const status = root.querySelector('#station-status')
  const detach = combobox(root.querySelector('.combobox'), { filter: false })
  const controller = new AbortController()
  const { signal } = controller
  let revision = 0
  let composing = false
  let lastQuery = null
  const timers = new Set()
  function later(fn, delay) {
    const timer = setTimeout(() => { timers.delete(timer); fn() }, delay)
    timers.add(timer)
  }
  function request() {
    const query = field.value.trim()
    if (lastQuery === query || composing) return
    const mine = ++revision
    lastQuery = query
    list.replaceChildren()
    if (!query) { status.textContent = 'Type 台 to search.'; return }
    status.textContent = 'Searching for ' + query
    // A short query takes longer so both response orders can be reproduced.
    later(() => {
      if (mine !== revision) return
      const matches = stations.filter(([, name]) => name.includes(query))
      for (const [key, name] of matches) {
        const option = document.createElement('div')
        option.className = 'listbox-option'
        option.id = 'station-' + key
        option.dataset.value = key
        option.setAttribute('role', 'option')
        option.setAttribute('aria-checked', 'false')
        option.textContent = name
        list.append(option)
      }
      status.textContent = matches.length + (matches.length === 1 ? ' match for ' : ' matches for ') + query
    }, query.length === 1 ? 600 : 100)
  }
  field.addEventListener('compositionstart', () => {
    composing = true
    lastQuery = null
    ++revision
    list.replaceChildren()
    status.textContent = 'Composing…'
  }, { signal })
  field.addEventListener('compositionend', () => { composing = false; request() }, { signal })
  field.addEventListener('input', event => {
    if (event instanceof InputEvent && !event.isComposing) request()
  }, { signal })
  field.addEventListener('change', () => {
    if (!list.querySelector('[aria-checked="true"]')) return
    ++revision
    lastQuery = null
    status.textContent = 'Selected ' + field.value
  }, { signal })
  function type(value, isComposing = false) {
    field.value = value
    field.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing }))
  }
  root.querySelector('#replay-ime').addEventListener('click', () => {
    field.focus()
    field.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    type('ㄊ', true)
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }))
    type('台北', true)
    field.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '台北' }))
    type('台北')
  }, { signal })
  root.querySelector('#replay-order').addEventListener('click', () => {
    field.focus()
    lastQuery = null
    type('台')
    type('台北')
  }, { signal })
  return () => { for (const timer of timers) clearTimeout(timer); controller.abort(); detach() }
}
