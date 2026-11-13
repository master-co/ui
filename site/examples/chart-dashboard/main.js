import { chart } from '@master/ui/behaviors/chart.js'
import { pages, periods, sources } from './data.js'

/**
 * A dashboard of three charts under one choice of period. The chart behavior writes each chart from the
 * period's numbers, and writes them again when the period changes, so the figures and the charts always show
 * the same slice. Returns the function that stops it.
 */
export function mount(root) {
  const part = (name) => root.querySelector(`[data-traffic="${name}"]`)
  let detach = []

  function draw(name) {
    const period = periods[name]
    part('period').textContent = period.name
    for (const figure of ['visitors', 'signups', 'bounce']) {
      const [value, change, up] = period[figure]
      part(figure).textContent = value
      part(`${figure}-change`).textContent = change
      part(`${figure}-change`).className = `stat-delta ${up ? 'stat-delta-up' : 'stat-delta-down'}`
    }
    for (const stop of detach) stop()
    detach = [
      chart(part('visits'), {
        type: 'area',
        stacked: true,
        label: `Visitors, new and returning, ${period.name.toLowerCase()}`,
        labels: period.labels,
        series: [
          { name: 'Returning', category: 'sky', values: period.returning },
          { name: 'New', category: 'blue', values: period.fresh },
        ],
      }),
      chart(part('sources'), {
        type: 'donut',
        label: `Visitors by source, ${period.name.toLowerCase()}`,
        center: { value: period.visitors[0], label: 'Visitors' },
        series: sources.map((source, index) => ({ ...source, value: period.sources[index] })),
      }),
      chart(part('pages'), {
        type: 'bar',
        horizontal: true,
        values: true,
        ticks: 3,
        label: `Pages by visitors, ${period.name.toLowerCase()}`,
        labels: pages,
        series: [{ name: 'Visitors', values: period.pages }],
      }),
    ]
  }

  const controller = new AbortController()
  root.addEventListener('change', (event) => {
    if (event.target.name === 'traffic-period') draw(event.target.value)
  }, { signal: controller.signal })
  draw(root.querySelector('input[name="traffic-period"]:checked')?.value ?? 'week')

  return () => {
    controller.abort()
    for (const stop of detach) stop()
  }
}
