import { BarController, BarElement, CategoryScale, Chart, LinearScale, LineController, LineElement, PointElement, Tooltip } from 'chart.js'
import { months, series } from './data.js'
import { element, motion, palette, watchTheme } from './theme.js'

// Only what this chart draws: lines and bars on a category and a linear scale, and the tooltip.
Chart.register(LineController, LineElement, PointElement, BarController, BarElement, CategoryScale, LinearScale, Tooltip)

const number = new Intl.NumberFormat('en-US')

/**
 * Lines or bars of several series. The legend is a row of filter chips around real checkboxes, the table under
 * the chart holds every number, and the colors are the categories' marks, read from the theme. Returns the
 * function that destroys the chart and stops every listener.
 */
export function mount(root) {
  const canvas = root.querySelector('canvas')
  const legend = root.querySelector('[data-legend]')
  const shown = new Set(series.map((entry) => entry.id))
  const colors = palette(root)
  let type = root.querySelector('input[name="series-type"]:checked')?.value ?? 'line'
  let chart

  // The legend: one chip for each region, its dot in the region's category.
  for (const entry of series) {
    legend.append(element('label', { class: `chip chip-category category-${entry.category}` },
      element('input', { type: 'checkbox', class: 'chip-input', value: entry.id, checked: true }),
      element('span', { class: 'chip-dot' }),
      entry.label))
  }

  // The table: every number the chart draws, so no value is only in a tooltip.
  const head = root.querySelector('[data-head]')
  for (const entry of series) head.append(element('th', { class: 'table-heading table-numeric', scope: 'col' }, entry.label))
  root.querySelector('[data-rows]').append(...months.map((month, index) => element('tr', { class: 'table-row' },
    element('th', { class: 'table-cell table-primary', scope: 'row' }, month),
    ...series.map((entry) => element('td', { class: 'table-cell table-numeric' }, number.format(entry.values[index]))))))

  const still = motion(() => draw())

  function options() {
    const text = colors.token('--color-text-muted')
    const grid = colors.token('--color-line-hair')
    const font = { family: getComputedStyle(root).fontFamily, size: 12 }
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: still.still() ? false : { duration: 400 },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false }, border: { color: colors.token('--color-line-divider') }, ticks: { color: text, font } },
        y: { beginAtZero: true, grid: { color: grid }, border: { display: false }, ticks: { color: text, font, maxTicksLimit: 5, callback: (value) => number.format(value) } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.token('--color-surface-inverse'),
          titleColor: colors.token('--color-text-inverse'),
          bodyColor: colors.token('--color-text-inverse'),
          titleFont: { ...font, weight: '500' },
          bodyFont: font,
          padding: 10,
          cornerRadius: 8,
          boxPadding: 4,
          usePointStyle: true,
          callbacks: { label: (item) => ` ${item.dataset.label}: ${number.format(item.parsed.y)}k` },
        },
      },
    }
  }

  function datasets() {
    const surface = colors.token('--color-surface-raised')
    return series.map((entry) => {
      const mark = colors.category(entry.category)
      return {
        label: entry.label,
        data: entry.values,
        hidden: !shown.has(entry.id),
        borderColor: type === 'line' ? mark : surface,
        backgroundColor: mark,
        // Lines: 2px, with a point only under the pointer. Bars: round at the end that is not on the axis,
        // and a ring of the surface between neighbors.
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBorderColor: surface,
        pointHoverBorderWidth: 2,
        pointStyle: 'circle',
        tension: 0.3,
        borderRadius: 4,
        borderSkipped: 'start',
        categoryPercentage: 0.72,
        barPercentage: 0.94,
      }
    })
  }

  /** Draw from the current type, the shown regions and the theme's colors. */
  function draw() {
    chart?.destroy()
    chart = new Chart(canvas, { type, data: { labels: months, datasets: datasets() }, options: options() })
  }

  const controller = new AbortController()
  root.addEventListener('change', (event) => {
    const input = event.target
    if (input.name === 'series-type') {
      type = input.value
      draw()
    } else if (input.classList.contains('chip-input')) {
      if (input.checked) shown.add(input.value)
      else shown.delete(input.value)
      chart.setDatasetVisibility(series.findIndex((entry) => entry.id === input.value), input.checked)
      chart.update()
    }
  }, { signal: controller.signal })
  const stopTheme = watchTheme(() => draw())

  draw()
  return () => {
    controller.abort()
    stopTheme()
    still.stop()
    chart?.destroy()
    colors.remove()
  }
}
