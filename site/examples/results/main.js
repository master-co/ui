import { formatDate, paginate, search, sort } from '../filter-bar/query.js'
import { resources, types } from './data.js'

const size = 6
const labels = new Map(types)
const orders = { updated: ['updated', 'descending'], name: ['title', 'ascending'] }

/**
 * The results page on local data. The form is the state: every draw reads the search, the types, the sort and
 * the view from its named fields, as a server reads them from the URL the same form submits. The script adds
 * what a round trip would otherwise do (it answers as the reader types and keeps the page number) and moves
 * the one set of conditions between the sidebar and the drawer. Returns the function that stops it.
 */
export function mount(root) {
  const $ = (selector) => root.querySelector(selector)
  const part = (name) => root.querySelector(`[data-results="${name}"]`)
  const controller = new AbortController()
  const { signal } = controller

  const form = $('#rs-form')
  const drawer = $('#rs-filters')
  const conditions = part('conditions')
  const [previous, next] = [$('#rs-pages').firstElementChild, $('#rs-pages').lastElementChild]
  let page = 1

  /** What the form would send: `q`, every checked `type`, `sort` and `view`. */
  const query = () => new URLSearchParams(new FormData(form))
  /** The address of a page of the same query, for a pagination link. */
  const address = (number) => {
    const given = query()
    if (!given.get('q')) given.delete('q')
    given.set('page', number)
    return `?${given}`
  }
  const say = (words) => { $('#rs-status').textContent = words }

  function results(rows, view) {
    if (!rows.length) return $('#rs-empty').content.firstElementChild.cloneNode(true)
    const list = $(`#rs-${view}`).content.firstElementChild.cloneNode(true)
    const item = list.firstElementChild
    list.replaceChildren(...rows.map((record) => {
      const copy = item.cloneNode(true)
      copy.querySelector('.card-link, .list-title').textContent = record.title
      copy.querySelector('.card-description, .list-description').textContent = record.summary
      copy.querySelector('.badge').textContent = labels.get(record.type)
      copy.querySelector('time').dateTime = record.updated
      copy.querySelector('time').textContent = formatDate(record.updated)
      return copy
    }))
    return list
  }

  function pages(result) {
    const aim = (link, number, possible) => {
      if (possible) link.setAttribute('href', address(number))
      else link.removeAttribute('href')
      if (possible) link.removeAttribute('aria-disabled')
      else link.setAttribute('aria-disabled', 'true')
    }
    aim(previous.querySelector('a'), result.page - 1, result.page > 1)
    aim(next.querySelector('a'), result.page + 1, result.page < result.pages)
    const numbers = Array.from({ length: result.pages }, (_, index) => {
      const item = $('#rs-page').content.querySelector('li').cloneNode(true)
      const link = item.querySelector('a')
      link.setAttribute('href', address(index + 1))
      link.setAttribute('aria-label', `Page ${index + 1}`)
      link.textContent = String(index + 1)
      if (index + 1 === result.page) link.setAttribute('aria-current', 'page')
      return item
    })
    $('#rs-pages').replaceChildren(previous, ...numbers, next)
  }

  /** Write the results, the counts and the pages from the form. */
  function draw() {
    const given = query()
    const chosen = given.getAll('type')
    const found = search(resources, given.get('q') ?? '', ['title', 'summary'])
    const rows = sort(found.filter((record) => !chosen.length || chosen.includes(record.type)), ...orders[given.get('sort')])
    const result = paginate(rows, page, size)
    page = result.page

    const narrowed = chosen.length > 0 || Boolean(given.get('q')?.trim())
    $('#rs-count').textContent = !rows.length ? 'No resources match' : rows.length < resources.length ? `${rows.length} of ${resources.length} resources` : `${resources.length} resources`
    part('clear').hidden = !narrowed
    // Beside each type, how many of what the search found are of it.
    for (const count of conditions.querySelectorAll('[data-count]')) count.textContent = String(found.filter((record) => record.type === count.dataset.count).length)
    part('applied').hidden = chosen.length === 0
    part('applied').firstElementChild.textContent = String(chosen.length)
    part('applied').lastElementChild.textContent = `, ${chosen.length} applied`
    part('drawer-done').textContent = `Show ${rows.length} ${rows.length === 1 ? 'result' : 'results'}`

    $('#rs-results').replaceChildren(results(result.rows, given.get('view')))
    part('foot').hidden = result.pages === 1
    $('#rs-range').textContent = `${result.from}–${result.to} of ${result.total}`
    pages(result)
    return result
  }

  /** Empty the search and the types, or the types alone, and start from the first page. */
  function clear({ text = true } = {}) {
    if (text) form.elements.q.value = ''
    for (const box of form.elements.type) box.checked = false
    page = 1
    draw()
  }

  // One set of conditions stands where the width puts it: in the sidebar while the Filters button is not
  // displayed, which the stylesheet decides at 56rem of main region, and in the drawer otherwise. The same
  // checkboxes move, so nothing is copied and no choice can be lost; each names its form, so it is submitted
  // from either place.
  function place() {
    const wide = getComputedStyle(part('open')).display === 'none'
    const home = wide ? part('sidebar') : part('drawer')
    if (conditions.parentElement === home) return
    const active = root.ownerDocument.activeElement
    const held = conditions.contains(active) ? active : null
    // Focus on the drawer's own buttons would go back to the Filters button, which is no longer displayed.
    const stranded = wide && drawer.open && drawer.contains(active) && !held
    if (home.moveBefore) home.moveBefore(conditions, null)
    else home.append(conditions)
    part('sidebar').hidden = !wide
    if (wide && drawer.open) drawer.close()
    ;(held ?? (stranded ? conditions.querySelector('input') : null))?.focus()
  }
  part('open').hidden = false
  place()
  const observer = new ResizeObserver(place)
  observer.observe($('#rs-main'))

  // A field of the form changed, wherever it stands. Only the view keeps the page.
  root.addEventListener('input', (event) => {
    if (event.target.form !== form) return
    if (event.target.name !== 'view') page = 1
    say('')
    draw()
  }, { signal })

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    page = 1
    draw()
  }, { signal })

  part('clear').addEventListener('click', () => { clear(); form.elements.q.focus() }, { signal })
  part('drawer-clear').addEventListener('click', () => clear({ text: false }), { signal })

  $('#rs-results').addEventListener('click', (event) => {
    // A resource's own page is not part of the example.
    if (event.target.closest('a')) event.preventDefault()
    if (event.target.closest('[data-results="reset"]')) { clear(); form.elements.q.focus() }
  }, { signal })

  $('#rs-pages').addEventListener('click', (event) => {
    const link = event.target.closest('a')
    if (!link) return
    event.preventDefault()
    if (!link.hasAttribute('href')) return
    page = Number(new URLSearchParams(link.search).get('page'))
    const result = draw()
    // The link pressed may have lost its address: focus stays on the current page's, without pulling the view back
    // down to it, and the new page is shown from its first result.
    $('#rs-pages [aria-current="page"]').focus({ preventScroll: true })
    $('#rs-results-title').parentElement.scrollIntoView({ block: 'start' })
    say(`Page ${result.page} of ${result.pages}, resources ${result.from} to ${result.to}`)
  }, { signal })

  draw()
  return () => {
    controller.abort()
    observer.disconnect()
    if (drawer.open) drawer.close()
    part('sidebar').append(conditions)
    part('sidebar').hidden = false
    part('open').hidden = true
  }
}
