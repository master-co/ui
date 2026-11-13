import { Chart, Filler, LineElement, PointElement, RadarController, RadialLinearScale, Tooltip } from 'chart.js'
import { measures, releases } from './data.js'
import { element, motion, palette, watchTheme } from './theme.js'

// Only what this chart draws: a radar on a radial scale, its filled lines and points, and the tooltip.
Chart.register(RadarController, RadialLinearScale, LineElement, PointElement, Filler, Tooltip)

/**
 * Two releases on six measures. The legend is a row of filter chips around real checkboxes, the table holds every
 * score, and the colors are the categories' marks, read from the theme. Returns the function that destroys the
 * chart and stops every listener.
 */
export function mount(root) {
  const canvas = root.querySelector('canvas')
  const colors = palette(root)
  let chart

  root.querySelector('[data-legend]').append(...releases.map((entry) => element('label', { class: `chip chip-category category-${entry.category}` },
    element('input', { type: 'checkbox', class: 'chip-input', value: entry.id, checked: true }),
    element('span', { class: 'chip-dot' }),
    entry.label)))
  const head = root.querySelector('[data-head]')
  for (const entry of releases) head.append(element('th', { class: 'table-heading table-numeric', scope: 'col' }, entry.label))
  root.querySelector('[data-rows]').append(...measures.map((measure, index) => element('tr', { class: 'table-row' },
    element('th', { class: 'table-cell table-primary', scope: 'row' }, measure),
    ...releases.map((entry) => element('td', { class: 'table-cell table-numeric' }, String(entry.scores[index]))))))

  const still = motion(() => draw())

  function draw() {
    chart?.destroy()
    const font = { family: getComputedStyle(root).fontFamily, size: 12 }
    const surface = colors.token('--color-surface-raised')
    const shown = new Set([...root.querySelectorAll('[data-legend] .chip-input:checked')].map((input) => input.value))
    chart = new Chart(canvas, {
      type: 'radar',
      data: {
        labels: measures,
        datasets: releases.map((entry) => ({
          label: entry.label,
          data: entry.scores,
          hidden: !shown.has(entry.id),
          borderColor: colors.category(entry.category),
          // A wash of the mark, so the two shapes show through each other.
          backgroundColor: colors.category(entry.category, 'mark', 0.14),
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: colors.category(entry.category),
          pointBorderColor: surface,
          pointBorderWidth: 2,
          pointHoverRadius: 5,
          fill: true,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: still.still() ? false : { duration: 400 },
        scales: {
          r: {
            min: 0,
            max: 100,
            angleLines: { color: colors.token('--color-line-hair') },
            grid: { color: colors.token('--color-line-hair') },
            pointLabels: { color: colors.token('--color-text-body'), font },
            ticks: { display: false, stepSize: 25 },
          },
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
            callbacks: { label: (item) => ` ${item.dataset.label}: ${item.parsed.r}` },
          },
        },
      },
    })
  }

  const controller = new AbortController()
  root.addEventListener('change', (event) => {
    const input = event.target
    if (!input.classList.contains('chip-input')) return
    chart.setDatasetVisibility(releases.findIndex((entry) => entry.id === input.value), input.checked)
    chart.update()
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
