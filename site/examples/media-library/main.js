const art = [['lighthouse', 'Lighthouse'], ['harbor', 'Harbor'], ['dawn', 'Dawn'], ['pines', 'Pines']]
export function mount(root) {
  const dialog = root.querySelector('dialog')
  const search = dialog.querySelector('input[type="search"]')
  const grid = dialog.querySelector('.auto-grid')
  const add = root.querySelector('#library-add')
  const collection = new Set(['lighthouse'])
  const draft = new Set()
  const controller = new AbortController()
  const { signal } = controller
  function counts() {
    root.querySelector('#library-count').textContent = draft.size + ' to add · ' + (collection.size + draft.size) + ' after adding'
    add.disabled = !draft.size
  }
  function draw() {
    grid.replaceChildren()
    for (const [id, name] of art.filter(([, title]) => title.toLowerCase().includes(search.value.trim().toLowerCase()))) {
      const tile = root.querySelector('template').content.firstElementChild.cloneNode(true)
      const box = tile.querySelector('input')
      box.value = id
      box.disabled = collection.has(id)
      box.checked = box.disabled || draft.has(id)
      tile.querySelector('img').src = '/demo/' + id + '.svg'
      tile.querySelector('.choice-title').textContent = name
      tile.querySelector('.choice-description').textContent = box.disabled ? 'Already added' : ''
      grid.append(tile)
    }
    root.querySelector('#library-empty').hidden = grid.childElementCount > 0
    counts()
  }
  root.querySelector('#library-open').addEventListener('click', () => {
    draft.clear()
    search.value = ''
    draw()
    dialog.showModal()
    search.focus()
  }, { signal })
  search.addEventListener('input', draw, { signal })
  grid.addEventListener('change', event => {
    const box = event.target
    if (box.checked) draft.add(box.value)
    else draft.delete(box.value)
    counts()
  }, { signal })
  add.addEventListener('click', () => {
    for (const id of draft) collection.add(id)
    root.querySelector('#library-collection').textContent = 'Collection: ' + art.filter(([id]) => collection.has(id)).map(([, name]) => name).join(', ')
    dialog.close()
  }, { signal })
  root.querySelector('#library-cancel').addEventListener('click', () => dialog.close(), { signal })
  return () => controller.abort()
}
