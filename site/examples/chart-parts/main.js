import { ArcElement, Chart, DoughnutController, PieController, Tooltip } from 'chart.js'
import { goals, storage } from './data.js'
import { element, motion, palette, watchTheme } from './theme.js'

// Only what these charts draw: arcs, as a pie, a doughnut and rings, and the tooltip.
Chart.register(ArcElement, PieController, DoughnutController, Tooltip)

const number = new Intl.NumberFormat('en-US')
const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 })

/** A legend chip around a real checkbox, its dot in the category. */
const chip = (entry) => element('label', { class: `chip chip-category category-${entry.category}` },
  element('input', { type: 'checkbox', class: 'chip-input', value: entry.id, checked: true }),
  element('span', { class: 'chip-dot' }),
  entry.label)

/**
 * The parts of a whole, as a doughnut or a pie, and three goals as concentric rings. Each has a legend of filter
 * chips and a table of its numbers; the colors are the categories' marks, read from the theme. Returns the
 * function that destroys both charts and stops every listener.
 */
export function mount(root) {
  const colors = palette(root)
  const total = storage.reduce((sum, entry) => sum + entry.value, 0)
  let type = root.querySelector('input[name="storage-type"]:checked')?.value ?? 'doughnut'
  const charts = {}

  root.querySelector('[data-legend="storage"]').append(...storage.map(chip))
  root.querySelector('[data-legend="goals"]').append(...goals.map(chip))
  root.querySelector('[data-rows="storage"]').append(...storage.map((entry) => element('tr', { class: 'table-row' },
    element('th', { class: 'table-cell table-primary', scope: 'row' }, entry.label),
    element('td', { class: 'table-cell table-numeric' }, number.format(entry.value)),
    element('td', { class: 'table-cell table-numeric' }, percent.format(entry.value / total)))))
  root.querySelector('[data-rows="goals"]').append(...goals.map((entry) => element('tr', { class: 'table-row' },
    element('th', { class: 'table-cell table-primary', scope: 'row' }, entry.label),
    element('td', { class: 'table-cell table-numeric' }, number.format(entry.done)),
    element('td', { class: 'table-cell table-numeric' }, number.format(entry.target)))))

  const still = motion(() => draw())

  function tooltip(label) {
    const font = { family: getComputedStyle(root).fontFamily, size: 12 }
    return {
      backgroundColor: colors.token('--color-surface-inverse'),
      titleColor: colors.token('--color-text-inverse'),
      bodyColor: colors.token('--color-text-inverse'),
      bodyFont: font,
      padding: 10,
      cornerRadius: 8,
      boxPadding: 4,
      usePointStyle: true,
      callbacks: { title: () => '', label },
    }
  }

  function draw() {
    for (const chart of Object.values(charts)) chart.destroy()
    const surface = colors.token('--color-surface-raised')
    const animation = still.still() ? false : { duration: 400 }

    // The whole: one slice for each kind, parted by a ring of the surface.
    const hidden = new Set([...root.querySelectorAll('[data-legend="storage"] .chip-input:not(:checked)')].map((input) => input.value))
    charts.storage = new Chart(root.querySelector('[data-chart="storage"]'), {
      type,
      data: {
        labels: storage.map((entry) => entry.label),
        datasets: [{ data: storage.map((entry) => entry.value), backgroundColor: storage.map((entry) => colors.category(entry.category)), borderColor: surface, borderWidth: 2, borderRadius: type === 'doughnut' ? 4 : 0, hoverOffset: 4 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation,
        cutout: type === 'doughnut' ? '62%' : 0,
        plugins: { legend: { display: false }, tooltip: tooltip((item) => ` ${item.label}: ${number.format(item.parsed)} GB, ${percent.format(item.parsed / total)}`) },
      },
    })
    storage.forEach((entry, index) => { if (hidden.has(entry.id)) charts.storage.toggleDataVisibility(index) })
    if (hidden.size) charts.storage.update('none')

    // The goals: a ring for each, outermost first, filled in its mark on a track of its own surface.
    const shown = new Set([...root.querySelectorAll('[data-legend="goals"] .chip-input:checked')].map((input) => input.value))
    charts.goals = new Chart(root.querySelector('[data-chart="goals"]'), {
      type: 'doughnut',
      data: {
        labels: ['Done', 'To go'],
        datasets: goals.map((entry) => ({
          label: entry.label,
          data: [entry.done, Math.max(0, entry.target - entry.done)],
          backgroundColor: [colors.category(entry.category), colors.category(entry.category, 'surface')],
          // Each ring stands apart from the next by a ring of the surface, and its ends are round.
          borderColor: surface,
          borderWidth: 3,
          borderRadius: 999,
          weight: 1,
          hidden: !shown.has(entry.id),
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation,
        cutout: '42%',
        plugins: {
          legend: { display: false },
          tooltip: tooltip((item) => {
            const goal = goals[item.datasetIndex]
            return ` ${goal.label}: ${number.format(goal.done)} of ${number.format(goal.target)}`
          }),
        },
      },
    })
  }

  const controller = new AbortController()
  root.addEventListener('change', (event) => {
    const input = event.target
    if (input.name === 'storage-type') {
      type = input.value
      draw()
    } else if (input.closest('[data-legend="storage"]')) {
      charts.storage.toggleDataVisibility(storage.findIndex((entry) => entry.id === input.value))
      charts.storage.update()
    } else if (input.closest('[data-legend="goals"]')) {
      charts.goals.setDatasetVisibility(goals.findIndex((entry) => entry.id === input.value), input.checked)
      charts.goals.update()
    }
  }, { signal: controller.signal })
  const stopTheme = watchTheme(() => draw())

  draw()
  return () => {
    controller.abort()
    stopTheme()
    still.stop()
    for (const chart of Object.values(charts)) chart.destroy()
    colors.remove()
  }
}
