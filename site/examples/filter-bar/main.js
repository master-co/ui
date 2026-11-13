import { filters } from './filters.js'
import { filter, formatDate, sort } from './query.js'
import { deployments, fields } from './deployments.js'

const tones = { ready: ['badge-success', 'Ready'], building: ['badge-info', 'Building'], queued: ['badge-warning', 'Queued'], failed: ['badge-danger', 'Failed'] }
const shown = 6

/**
 * The filter bar on a list of deployments: two conditions applied to start with, the newest matches listed, and
 * a summary that says how many match. Returns the function that stops it.
 */
export function mount(root) {
  const results = root.querySelector('#fb-results')
  const summary = root.querySelector('#fb-summary')
  const more = root.querySelector('#fb-more')
  const row = (id) => root.querySelector(id).content.querySelector('.list-row').cloneNode(true)

  function draw(applied) {
    const found = sort(filter(deployments, applied, fields), 'date', 'descending')
    summary.textContent = applied.length
      ? `${found.length} of ${deployments.length} deployments match ${applied.length === 1 ? 'the filter' : `all ${applied.length} filters`}`
      : `${deployments.length} deployments in the last two weeks`
    results.replaceChildren(...(found.length ? found.slice(0, shown).map((deployment) => {
      const item = row('#fb-row')
      item.querySelector('.list-title').textContent = deployment.project
      item.querySelector('.list-description').textContent = `${deployment.branch} · ${formatDate(deployment.date)}`
      item.querySelector('.list-end > span').textContent = deployment.duration ? `${deployment.duration}s` : '—'
      const [tone, words] = tones[deployment.status]
      const badge = item.querySelector('.badge')
      badge.classList.add(tone)
      badge.textContent = words
      return item
    }) : [row('#fb-none')]))
    more.hidden = found.length <= shown
    more.textContent = `and ${found.length - shown} older ${found.length - shown === 1 ? 'deployment' : 'deployments'}`
  }

  const bar = filters(root, {
    fields,
    applied: [
      { field: 'status', operator: 'is', value: 'ready' },
      { field: 'date', operator: 'after', value: '2026-11-05' },
    ],
    onChange: draw,
  })
  draw(bar.applied)
  return () => bar.destroy()
}
