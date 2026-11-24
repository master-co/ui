// The IDs are opaque cursor tokens. Their spelling and the number of records are immaterial to the links.
const catalog = [
  ['drift', 'Coast at dawn', '2026-05-14', 'shore'],
  ['ferry', 'Coast ferry', '2026-05-10', 'shore'],
  ['gulls', 'Coast birds', '2026-05-21', 'shore'],
  ['inlet', 'Coast inlet', '2026-05-08', 'shore'],
  ['bells', 'Town bells', '2026-05-11', 'town'],
  ['pier', 'Coast pier', '2026-05-19', 'shore'],
]
const url = new URL(location.href)
const params = url.searchParams
const scope = document.querySelector('#scope')
const order = document.querySelector('#order')
const batches = document.querySelector('#batches')
const tbody = document.querySelector('tbody')
function link(parent, label, edits) {
  const next = new URL(url)
  for (const [key, value] of Object.entries(edits)) {
    if (value === null) next.searchParams.delete(key)
    else next.searchParams.set(key, value)
  }
  const a = document.createElement('a')
  a.className = 'btn btn-sm btn-quiet'
  a.textContent = label
  a.href = next.href
  parent.append(a)
  return a
}
function row(name, date) {
  const tr = tbody.insertRow()
  const th = document.createElement('th')
  th.scope = 'row'
  th.className = 'table-cell'
  th.textContent = name
  tr.append(th)
  const cell = tr.insertCell()
  cell.className = 'table-cell'
  cell.textContent = date
}
if (params.has('folio')) {
  // A three-folio excerpt keeps the source numbers visible when a single notebook is shared.
  const folios = new Map([[12344, catalog[1]], [12345, catalog[0]], [12346, catalog[3]]])
  const folio = Number(params.get('folio'))
  scope.textContent = 'From the numbered field notebooks'
  document.querySelector('caption').textContent = 'Folio ' + folio
  const entry = folios.get(folio)
  if (entry) row(entry[1], entry[2])
  batches.setAttribute('aria-label', 'Archive folios')
  for (const n of folios.keys()) {
    const a = link(batches, String(n), { folio: String(n) })
    a.setAttribute('aria-label', 'Folio ' + n)
    if (n === folio) a.setAttribute('aria-current', 'page')
  }
} else {
  const query = params.get('q') || ''
  const collection = params.get('collection') || ''
  const byDate = params.get('sort') === 'recent'
  const matches = catalog.filter(([, name, , place]) => name.toLowerCase().includes(query.toLowerCase()) && (!collection || place === collection))
  matches.sort((a, b) => byDate ? b[2].localeCompare(a[2]) : a[1].localeCompare(b[1], 'en'))
  const after = params.get('after')
  const start = after ? matches.findIndex(entry => entry[0] === after) + 1 : 0
  const page = matches.slice(start, start + 2)
  scope.textContent = [collection || 'All collections', query && 'Search: ' + query].filter(Boolean).join(' · ')
  order.hidden = false
  link(order, 'Title A–Z', { sort: 'name', after: null })
  link(order, 'Newest first', { sort: 'recent', after: null })
  document.querySelectorAll('thead th')[byDate ? 1 : 0].setAttribute('aria-sort', byDate ? 'descending' : 'ascending')
  for (const [, name, date] of page) row(name, date)
  document.querySelector('caption').textContent = page.length ? 'Recordings ' + (start + 1) + '–' + (start + page.length) : 'No matching recordings'
  if (start) link(batches, 'Previous recordings', { after: matches[Math.max(0, start - 2) - 1]?.[0] ?? null })
  if (start + page.length < matches.length) link(batches, 'Next recordings', { after: page.at(-1)[0] })
}
