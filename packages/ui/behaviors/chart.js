/**
 * Chart: numbers drawn as one SVG, in every form the library has.
 *
 * This is `chart-core.js` with every form taken: lines, areas and bars, a scatter, a pie and a donut, rings, a
 * radar, a waterfall, ranges and dumbbells, a slope, a bump, a marimekko, a histogram, a box plot, a heatmap, a
 * funnel, a waffle, a treemap and a sunburst. `chart()` writes a chart into an element with the class `chart`
 * and works it; `chartLayout()` returns the drawing as data and `chartMarkup()` as markup, for a server.
 *
 * A page that should carry only the forms it draws imports `chartCore` and `chartForms` from `chart-core.js`
 * and the forms' own modules instead:
 *
 *   import { chartCore, chartForms } from '@master/ui/behaviors/chart-core.js'
 *   import { chartCartesian } from '@master/ui/behaviors/chart-cartesian.js'
 *
 *   chartForms(chartCartesian)
 *   chartCore(element, { type: 'line', … })
 */
import { chartCore, chartForms, chartLayout, chartMarkup } from './chart-core.js'
import { chartCartesian } from './chart-cartesian.js'
import { chartScatter } from './chart-scatter.js'
import { chartPie } from './chart-pie.js'
import { chartRings } from './chart-rings.js'
import { chartRadar } from './chart-radar.js'
import { chartWaterfall } from './chart-waterfall.js'
import { chartRange } from './chart-range.js'
import { chartSlope } from './chart-slope.js'
import { chartBump } from './chart-bump.js'
import { chartMarimekko } from './chart-marimekko.js'
import { chartHistogram } from './chart-histogram.js'
import { chartBox } from './chart-box.js'
import { chartHeatmap } from './chart-heatmap.js'
import { chartFunnel } from './chart-funnel.js'
import { chartWaffle } from './chart-waffle.js'
import { chartTreemap } from './chart-treemap.js'
import { chartSunburst } from './chart-sunburst.js'

chartForms(chartCartesian, chartScatter, chartPie, chartRings, chartRadar, chartWaterfall, chartRange, chartSlope, chartBump, chartMarimekko, chartHistogram, chartBox, chartHeatmap, chartFunnel, chartWaffle, chartTreemap, chartSunburst)

/** @typedef {import('./chart-core.js').ChartType} ChartType */
/** @typedef {import('./chart-core.js').ChartSeries} ChartSeries */
/** @typedef {import('./chart-core.js').ChartConfig} ChartConfig */
/** @typedef {import('./chart-core.js').ChartMark} ChartMark */
/** @typedef {import('./chart-core.js').ChartPoint} ChartPoint */
/** @typedef {import('./chart-core.js').ChartLayout} ChartLayout */
/** @typedef {import('./chart-core.js').ChartOptions} ChartOptions */

/** Work a chart, with every form. The same function as `chartCore`. */
export const chart = chartCore

export { chartForms, chartLayout, chartMarkup }
