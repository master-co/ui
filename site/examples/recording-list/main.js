const fixtures = [
  { id: 'dawn', title: 'Dawn ferry', place: 'Pier 4' },
  { id: 'gulls', title: 'Gulls at low tide', place: 'Outer harbor' },
  { id: 'wind', title: 'Wind in the reeds', place: 'East inlet' },
]
export function mount(root) {
  const get = id => root.querySelector('#' + id)
  const mode = get('archive-mode')
  const query = get('archive-query')
  const list = get('archive-records')
  const empty = get('archive-empty')
  const undo = root.querySelector('dialog')
  const primary = get('empty-primary')
  const controller = new AbortController()
  const { signal } = controller
  const collections = new Map()
  let timer
  let busy = false
  function collection() {
    if (!collections.has(mode.value)) collections.set(mode.value, { rows: mode.value === 'new' ? [] : [...fixtures], removed: new Set() })
    return collections.get(mode.value)
  }
  function row(record, loading) {
    const item = get('record-row').content.querySelector('.list-row').cloneNode(true)
    const title = item.querySelector('.list-title')
    const description = item.querySelector('.list-description')
    const button = item.querySelector('button')
    button.value = record.id
    button.setAttribute('aria-label', 'Remove ' + record.title)
    if (loading) {
      item.setAttribute('aria-hidden', 'true')
      for (const [line, width] of [[title, '8rem'], [description, '5rem']]) {
        const placeholder = document.createElement('span')
        placeholder.className = 'skeleton skeleton-text'
        placeholder.style.inlineSize = 'min(100%, ' + width + ')'
        line.append(placeholder)
      }
      const avatar = item.querySelector('.avatar')
      avatar.textContent = ''
      avatar.classList.add('skeleton')
    } else {
      title.textContent = record.title
      description.textContent = record.place
    }
    if (loading || mode.value === 'read') {
      button.disabled = true
      button.style.visibility = 'hidden'
    }
    return item
  }
  function draw() {
    const { rows, removed } = collection()
    const active = rows.filter(record => !removed.has(record.id))
    const matches = active.filter(record => record.title.toLowerCase().includes(query.value.trim().toLowerCase()))
    list.setAttribute('aria-busy', String(busy))
    list.replaceChildren(...matches.map(record => row(record, busy)))
    empty.hidden = matches.length > 0 || busy
    const searching = Boolean(query.value.trim())
    get('empty-title').textContent = searching ? 'No matching recordings' : 'No recordings yet'
    get('empty-reason').textContent = mode.value === 'read' ? 'This workspace is read-only.' : mode.value === 'full' && !removed.size ? 'Storage is full.' : 'Start a collection or try another title.'
    primary.hidden = !searching && (mode.value === 'read' || mode.value === 'full' || removed.size > 0)
    primary.textContent = searching ? 'Clear search' : 'Add sample recording'
    get('view-usage').hidden = mode.value !== 'full' || removed.size > 0
    if (matches.length || mode.value !== 'full' || removed.size > 0) get('quota').hidden = true
    undo.open = removed.size > 0
    get('undo-title').textContent = removed.size + (removed.size === 1 ? ' recording removed' : ' recordings removed')
    get('list-status').textContent = busy ? 'Loading recordings…' : matches.length + (matches.length === 1 ? ' recording' : ' recordings')
  }
  list.addEventListener('click', event => {
    const button = event.target.closest('button')
    if (!button || button.disabled) return
    const index = [...list.querySelectorAll('button')].indexOf(button)
    collection().removed.add(button.value)
    draw()
    const left = list.querySelectorAll('button')
    const next = left[Math.min(index, left.length - 1)] || get('undo-removals')
    next.focus()
  }, { signal })
  get('undo-removals').addEventListener('click', () => {
    const removed = collection().removed
    const first = [...removed][0]
    removed.clear()
    draw()
    const restored = list.querySelector('button[value="' + first + '"]') || query
    restored.focus()
  }, { signal })
  primary.addEventListener('click', () => {
    if (query.value.trim()) query.value = ''
    else collection().rows.push({ ...fixtures[0] })
    draw()
    query.focus()
  }, { signal })
  get('view-usage').addEventListener('click', () => { get('quota').hidden = false; get('quota').focus() }, { signal })
  mode.addEventListener('change', () => { clearTimeout(timer); busy = false; query.value = ''; get('quota').hidden = true; draw() }, { signal })
  query.addEventListener('input', draw, { signal })
  get('reload-records').addEventListener('click', () => {
    clearTimeout(timer)
    busy = true
    draw()
    timer = setTimeout(() => { busy = false; draw() }, 700)
  }, { signal })
  draw()
  return () => { clearTimeout(timer); controller.abort() }
}
