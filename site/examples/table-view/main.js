import { filters } from '../filter-bar/filters.js'
import { filter, formatDate, paginate, search, sort } from '../filter-bar/query.js'
import { sets } from './data.js'

const size = 8
const tones = {
  ready: 'badge-success', building: 'badge-info', queued: 'badge-warning', failed: 'badge-danger',
  active: 'badge-success', invited: 'badge-info', away: '',
}
const numbers = new Intl.NumberFormat('en-US')
const bytes = (megabytes) => megabytes < 1 ? `${numbers.format(Math.round(megabytes * 1000))} KB` : `${numbers.format(megabytes)} MB`

/**
 * The table view on local data. Search, the filter bar, the sort and the page decide which rows show; the
 * selection is kept to the rows that match, so the count in the footer, the pages and the rows always agree.
 * Projects, people and files are three sets with their own fields and rows. Returns the function that stops it.
 */
export function mount(root) {
  const $ = (selector) => root.querySelector(selector)
  const copy = (id, selector) => $(id).content.querySelector(selector).cloneNode(true)
  const controller = new AbortController()
  const { signal } = controller

  // The rows are the page's to change: deleting one changes the set it is in.
  const data = Object.fromEntries(Object.entries(sets).map(([name, set]) => [name, { ...set, rows: [...set.rows] }]))
  const state = { set: 'projects', search: '', page: 1, sort: data.projects.sorts[0], applied: [], selected: new Map(Object.keys(data).map((name) => [name, new Set()])) }
  const set = () => data[state.set]
  const plural = (count) => set().noun[count === 1 ? 0 : 1]
  const say = (words) => { $('#tv-status').textContent = words }

  /** The rows that match, in order: what every count and every page is read from. */
  function matching() {
    return sort(filter(search(set().rows, state.search, set().search), state.applied, set().fields), state.sort[0], state.sort[1])
  }

  function fill(row, record) {
    const part = (name) => row.querySelector(`[data-part="${name}"]`)
    const field = (key) => set().fields.find((each) => each.key === key)
    const label = (key) => field(key).options.find(([value]) => value === record[key])[1]
    if (state.set === 'projects') {
      part('name').textContent = record.name
      part('domain').textContent = record.domain
      part('status').classList.add(tones[record.status])
      part('status').textContent = label('status')
      part('region').textContent = label('region')
      part('deployments').textContent = numbers.format(record.deployments)
      part('deployed').textContent = formatDate(record.deployed)
    } else if (state.set === 'people') {
      part('initials').textContent = record.name.split(' ').map((word) => word[0]).slice(0, 2).join('')
      part('name').textContent = record.name
      part('email').textContent = record.email
      part('role').textContent = label('role')
      if (tones[record.status]) part('status').classList.add(tones[record.status])
      part('status').textContent = label('status')
      part('projects').textContent = record.projects
      part('active').textContent = record.status === 'invited' ? 'Not yet' : formatDate(record.active)
    } else {
      part('name').textContent = record.name
      part('type').textContent = label('type')
      part('size').textContent = bytes(record.size)
      part('modified').textContent = formatDate(record.modified)
      part('owner').textContent = record.owner
    }
    const select = part('select')
    select.checked = state.selected.get(state.set).has(record.id)
    select.value = record.id
    select.setAttribute('aria-label', `Select ${record.name}`)
    if (select.checked) row.setAttribute('aria-selected', 'true')
    // Each row's actions are a menu named for its row, with an id of its own.
    const actions = copy('#tv-actions', 'div')
    const menu = actions.querySelector('.menu')
    menu.id = `tv-menu-${record.id}`
    const button = actions.querySelector('button')
    button.setAttribute('popovertarget', menu.id)
    button.setAttribute('aria-label', `Actions for ${record.name}`)
    menu.querySelector('[data-part="delete"]').value = record.id
    part('actions').replaceChildren(...actions.children)
  }

  function head() {
    const row = copy(`#tv-head-${state.set}`, 'tr')
    for (const heading of row.querySelectorAll('[data-sort]')) {
      if (heading.dataset.sort === state.sort[0]) heading.setAttribute('aria-sort', state.sort[1])
    }
    $('#tv-head').replaceChildren(row)
  }

  function pages(result) {
    const list = []
    const add = (id, setup) => { const item = copy(id, 'li'); setup(item.querySelector('button')); list.push(item) }
    add('#tv-previous', (button) => { button.value = String(result.page - 1); button.disabled = result.page === 1 })
    // Every page when there are few; the first, the last and the neighbors of the current one when there are many.
    const shown = [...new Set([1, result.page - 1, result.page, result.page + 1, result.pages])].filter((page) => page >= 1 && page <= result.pages).sort((a, b) => a - b)
    for (const [index, page] of shown.entries()) {
      if (index && page - shown[index - 1] > 1) list.push(copy('#tv-gap', 'li'))
      add('#tv-page', (button) => {
        button.value = String(page)
        button.textContent = String(page)
        button.setAttribute('aria-label', `Page ${page}`)
        if (page === result.page) button.setAttribute('aria-current', 'page')
      })
    }
    add('#tv-next', (button) => { button.value = String(result.page + 1); button.disabled = result.page === result.pages })
    $('#tv-pages').replaceChildren(...list)
  }

  /** Write the table, its counts and its pages from the state. */
  function draw() {
    const rows = matching()
    const selected = state.selected.get(state.set)
    // A row that no longer matches leaves the selection, so the count never includes what cannot be seen.
    for (const id of selected) if (!rows.some((row) => row.id === id)) selected.delete(id)
    const result = paginate(rows, state.page, size)
    state.page = result.page
    const many = set().noun[1]

    $('#tv-summary').textContent = rows.length === set().rows.length
      ? `${set().rows.length} ${plural(set().rows.length)}`
      : `${rows.length} of ${set().rows.length} ${many} match`
    head()
    const all = $('#tv-head [data-part="all"]')
    all.checked = rows.length > 0 && selected.size === rows.length
    all.indeterminate = selected.size > 0 && selected.size < rows.length
    all.disabled = rows.length === 0
    all.setAttribute('aria-label', `Select all ${rows.length} ${plural(rows.length)}`)

    if (result.rows.length) {
      $('#tv-body').replaceChildren(...result.rows.map((record) => {
        const row = copy(`#tv-row-${state.set}`, 'tr')
        fill(row, record)
        return row
      }))
    } else {
      const empty = copy('#tv-empty', 'tr')
      empty.querySelector('[data-part="title"]').textContent = `No ${many} match`
      $('#tv-body').replaceChildren(empty)
    }

    $('#tv-count').textContent = selected.size ? `${selected.size} of ${rows.length} selected` : `No ${many} selected`
    $('#tv-selected').hidden = selected.size === 0
    $('#tv-range').textContent = rows.length ? `${result.from}–${result.to} of ${rows.length}` : `0 of ${set().rows.length}`
    pages(result)
  }

  // The filter bar of whichever set is shown; a new set brings its own fields and starts with none applied.
  const bar = filters(root, { fields: set().fields, onChange: (applied) => { state.applied = applied; state.page = 1; draw() } })

  function show(name) {
    state.set = name
    state.search = ''
    state.page = 1
    state.applied = []
    state.sort = set().sorts[0]
    const [one, many] = set().noun
    $('#tv-search').value = ''
    $('#tv-search').placeholder = `Search ${many}`
    $('#tv-search').setAttribute('aria-label', `Search ${many}`)
    $('#tv-action span').textContent = set().action
    $('#tv-filters-title').textContent = `Filter ${many}`
    $('#tv-filters-hint').textContent = `A${/^[aeiou]/.test(one) ? 'n' : ''} ${one} shows when it meets every condition.`
    $('#tv-sort').replaceChildren(...set().sorts.map(([key, direction, words]) => {
      const option = new Option(words, `${key} ${direction}`)
      option.className = 'select-option'
      return option
    }))
    bar.setFields(set().fields)
    draw()
  }

  root.querySelector('[name="tv-set"]').closest('.segmented').addEventListener('change', (event) => show(event.target.value), { signal })

  $('#tv-search').addEventListener('input', (event) => {
    state.search = event.target.value
    state.page = 1
    draw()
  }, { signal })

  $('#tv-sort').addEventListener('change', (event) => {
    state.sort = event.target.value.split(' ')
    state.page = 1
    draw()
  }, { signal })

  $('#tv-pages').addEventListener('click', (event) => {
    const button = event.target.closest('button')
    if (!button || button.disabled) return
    state.page = Number(button.value)
    draw()
    // The button pressed may be gone or disabled: focus stays on the current page's.
    $(`#tv-pages [aria-current="page"]`)?.focus()
    say(`Page ${state.page} of ${Math.max(1, Math.ceil(matching().length / size))}`)
  }, { signal })

  root.addEventListener('change', (event) => {
    const input = event.target
    const selected = state.selected.get(state.set)
    if (input.matches('#tv-body [data-part="select"]')) {
      if (input.checked) selected.add(input.value)
      else selected.delete(input.value)
      draw()
      $(`#tv-body [data-part="select"][value="${CSS.escape(input.value)}"]`)?.focus()
    } else if (input.matches('#tv-head [data-part="all"]')) {
      // All: every row that matches, on every page. None: clear them.
      if (input.checked) for (const row of matching()) selected.add(row.id)
      else selected.clear()
      draw()
      $('#tv-head [data-part="all"]').focus()
    }
  }, { signal })

  function remove(ids) {
    const before = set().rows.length
    set().rows = set().rows.filter((row) => !ids.includes(row.id))
    for (const id of ids) state.selected.get(state.set).delete(id)
    const removed = before - set().rows.length
    draw()
    say(`${removed} ${plural(removed)} deleted`)
    ;($('#tv-head [data-part="all"]:not(:disabled)') ?? $('#tv-search')).focus()
  }

  $('#tv-delete').addEventListener('click', () => remove([...state.selected.get(state.set)]), { signal })
  $('#tv-deselect').addEventListener('click', () => {
    state.selected.get(state.set).clear()
    draw()
    $('#tv-head [data-part="all"]').focus()
  }, { signal })

  $('#tv-body').addEventListener('click', (event) => {
    const target = event.target
    if (target.closest('[data-part="open"]')) event.preventDefault()
    const deleting = target.closest('[data-part="delete"]')
    if (deleting) {
      deleting.closest('[popover]').hidePopover()
      remove([deleting.value])
    }
    if (target.closest('[data-part="reset"]')) {
      state.search = ''
      $('#tv-search').value = ''
      bar.setFields(set().fields)
      state.applied = []
      draw()
      $('#tv-search').focus()
    }
  }, { signal })

  show('projects')
  return () => {
    controller.abort()
    bar.destroy()
  }
}
