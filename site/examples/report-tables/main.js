import { chartCore, chartForms } from '@master/ui/behaviors/chart-core.js'
import { chartCartesian } from '@master/ui/behaviors/chart-cartesian.js'

chartForms(chartCartesian)
const months = ['March', 'April', 'May']
const sites = [
  { name: 'Pier', category: 'sky', takes: [6, 0, 8], minutes: [22, 0, 30] },
  { name: 'Inlet', category: 'teal', takes: [4, 5, 7], minutes: [16, 24, 28] },
]
export function mount(root) {
  const detach = []
  function heading(label, scope) {
    const cell = document.createElement('th')
    cell.className = scope === 'row' ? 'table-cell' : 'table-heading'
    cell.scope = scope
    cell.textContent = label
    return cell
  }
  for (const plot of root.querySelectorAll('[data-report]')) {
    const key = plot.dataset.report
    const table = plot.parentElement.querySelector('table')
    const series = sites.map(site => ({ name: site.name, category: site.category, values: site[key] }))
    const head = table.createTHead().insertRow()
    head.append(heading('Site', 'col'), ...months.map(month => heading(month, 'col')))
    const body = table.createTBody()
    for (const site of series) {
      const row = body.insertRow()
      row.append(heading(site.name, 'row'))
      for (const value of site.values) {
        const cell = row.insertCell()
        cell.className = 'table-cell table-numeric'
        cell.textContent = String(value)
      }
    }
    detach.push(chartCore(plot, { type: 'bar', label: table.caption.textContent, labels: months, series }))
  }
  return () => { for (const stop of detach) stop() }
}
