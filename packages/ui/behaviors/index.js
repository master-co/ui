/**
 * Behaviors: the reference scripts of the patterns that have no native element.
 *
 * Each one is a function of the pattern's name that takes the root element and returns a function that
 * removes everything it added. Import the one a page needs, or call `attach()` to find every pattern in a
 * document, or under an element, and attach its behavior.
 *
 * A context menu belongs to a target that only the page knows: attach it with `contextMenu(target, menu)`.
 * A gantt is found too, and only its bars marked `role="slider"` move. A chart is found and worked as the page
 * wrote it; call `chart(root, { series })` to have it written from data.
 * `chart` has every form of the chart; `chartCore`, `chartForms` and a form such as `chartCartesian` are for a page
 * that carries only the forms it draws.
 *
 * Where a pattern has a value that no native control holds, the function its behavior returns has a `value`:
 * read it for what is chosen, set it to choose from outside. Setting it dispatches nothing.
 */
import { avatar } from './avatar.js'
import { calendar, calendarMonth, calendarPeriods } from './calendar.js'
import { carousel } from './carousel.js'
import { chart, chartForms, chartLayout, chartMarkup } from './chart.js'
import { chartCore } from './chart-core.js'
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
import { colorPicker, colorPickerFormat, colorPickerState } from './color-picker.js'
import { combobox } from './combobox.js'
import { command } from './command.js'
import { compare } from './compare.js'
import { editable } from './editable.js'
import { gradient, gradientCss } from './gradient.js'
import { dial } from './dial.js'
import { follow } from './follow.js'
import { gantt } from './gantt.js'
import { drawer } from './drawer.js'
import { cropper, cropperFit } from './cropper.js'
import { listbox } from './listbox.js'
import { contextMenu, menu } from './menu.js'
import { schedule, scheduleLayout } from './schedule.js'
import { otp } from './otp.js'
import { signature, signaturePath, signatureSvg } from './signature.js'
import { panel } from './panel.js'
import { player } from './player.js'
import { sortable } from './sortable.js'
import { range } from './range.js'
import { splitter } from './splitter.js'
import { stepper } from './stepper.js'
import { tabs } from './tabs.js'
import { tags } from './tags.js'
import { toolbar } from './toolbar.js'
import { tour } from './tour.js'
import { transcript } from './transcript.js'
import { tree } from './tree.js'
import { wheel } from './wheel.js'

export { avatar, calendar, calendarMonth, calendarPeriods, carousel, chart, chartCore, chartForms, chartLayout, chartMarkup, chartCartesian, chartScatter, chartPie, chartRings, chartRadar, chartWaterfall, chartRange, chartSlope, chartBump, chartMarimekko, chartHistogram, chartBox, chartHeatmap, chartFunnel, chartWaffle, chartTreemap, chartSunburst, colorPicker, colorPickerFormat, colorPickerState, combobox, command, compare, contextMenu, cropper, cropperFit, dial, drawer, editable, follow, gradient, gradientCss, gantt, listbox, menu, otp, panel, player, range, schedule, scheduleLayout, signature, signaturePath, signatureSvg, sortable, splitter, stepper, tabs, tags, toolbar, tour, transcript, tree, wheel }

/**
 * Each pattern's root class and the behavior that drives it.
 * @type {[selector: string, behavior: (root: any) => () => void][]}
 */
const patterns = [
  ['.combobox', combobox],
  ['.command', command],
  ['.calendar', calendar],
  ['.otp', otp],
  ['.splitter', splitter],
  ['.tree', tree],
  ['.tabs[role="tablist"]', tabs],
  ['.menu', menu],
  ['.stepper', stepper],
  ['.wheel', wheel],
  ['.compare', compare],
  ['.dial', dial],
  ['.signature', signature],
  ['.cropper', cropper],
  ['.scroll-area[role="log"]', follow],
  ['.listbox', listbox],
  ['.tags', tags],
  ['.editable', editable],
  ['.sortable', sortable],
  ['.gantt', gantt],
  ['.chart', chart],
  ['.toolbar[role="toolbar"]', toolbar],
  ['.coachmark-tour', tour],
  ['.color-picker', colorPicker],
  ['.panel', panel],
  ['.dialog-swipe', drawer],
  ['.player', player],
  ['.transcript', transcript],
  ['.avatar', avatar],
  ['.carousel-view', carousel],
  ['.schedule-view', schedule],
  ['.gradient', gradient],
  ['.range', range],
]

/**
 * Find every pattern in a document, or in an element and under it, and attach its behavior.
 * @param {Document | Element} [root] Where to look. The document by default.
 * @returns {() => void} Detaches every behavior it attached.
 */
export function attach(root = document) {
  /** @type {(() => void)[]} */
  const detach = []
  for (const [selector, behavior] of patterns) {
    const found = [...root.querySelectorAll(selector)]
    if ('matches' in root && root.matches(selector)) found.unshift(root)
    for (const element of found) {
      // A combobox and a command palette drive their own list.
      if (behavior === listbox && element.closest('.combobox, .command')) continue
      // A gradient drives the color picker of its stop in hand and the dial of its angle.
      if ((behavior === colorPicker || behavior === dial) && element.closest('.gradient')) continue
      detach.push(behavior(element))
    }
  }
  return () => detach.forEach((each) => each())
}
