<script lang="ts">
import type { ChartConfig, ChartSeries } from '@master/ui/behaviors/chart.js'

export type { ChartConfig, ChartSeries }
</script>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { chart, chartLayout, type ChartLayout, type ChartMark, type ChartType } from '@master/ui/behaviors/chart.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

// A legend and its checkboxes are the chart's to decide when they are left out: absent is not false.
const { type, label, labels, series, stacked, horizontal, curve, min, max, ticks, format, tickFormat, xMin, xMax, xTicks, xFormat, dots, values, current, legend = undefined, toggle = undefined, legendLabel, hole, center, locale } = defineProps<{
  /** `bar` by default. */
  type?: ChartType
  /** What the chart shows and in what unit: the plot's accessible name. */
  label?: string
  /** The names along the scale of a line, an area or a bar, or around a radar. */
  labels?: string[]
  series?: ChartSeries[]
  /** Bars, or areas, stand on each other instead of side by side. */
  stacked?: boolean
  /** Bars run across, one row to a label. */
  horizontal?: boolean
  /** How a line goes from point to point. `smooth` never overshoots a value. */
  curve?: 'smooth' | 'linear' | 'step'
  /** Where the scale starts and ends. 0, or the lowest value below it, to a round number above the highest by default. */
  min?: number
  max?: number
  /** About how many steps the scale is marked in. 4 by default. */
  ticks?: number
  /** How a value is written beside its name. */
  format?: (value: number) => string
  /** How a tick is written. Compact once the scale reaches 10,000 by default. */
  tickFormat?: (value: number) => string
  /** A scatter's scale across, as `min`, `max`, `ticks` and `tickFormat`. */
  xMin?: number
  xMax?: number
  xTicks?: number
  xFormat?: (value: number) => string
  /** A line's points are always marked, not only the one under the pointer. */
  dots?: boolean
  /** Every bar's value is written at its end. */
  values?: boolean
  /** The index of the point that is the point of the chart: it is marked `aria-current`. */
  current?: number
  /** Whether a legend is written. With two series or more by default. */
  legend?: boolean
  /** Whether the legend's entries are checkboxes that show and hide a series. True by default. */
  toggle?: boolean
  /** The legend's accessible name. `Series` by default. */
  legendLabel?: string
  /** A donut's hole, as a share of its radius. .7 by default. */
  hole?: number
  /** What stands in a donut's hole or within rings. */
  center?: { value: string, label?: string }
  /** A BCP 47 tag for the numbers. `en-US` by default. */
  locale?: string
}>()
/** The names of the hidden series, as the legend's unchecked boxes say: `v-model`. None by default. */
const model = defineModel<string[]>()

/*
 * A chart: lines, areas, bars, a pie, a donut, rings, a radar or a scatter, in one SVG. Vue writes it from
 * `chartLayout()`, the same layout the behavior writes, so it is in the first HTML; the behavior shows the
 * readout of the point under the pointer or the keys, and says which series the legend hides.
 *
 * The points are written in one of two places: in the canvas of a radial chart, on the plot of any other. The
 * first is the stop in the tab order of the first render; the behavior moves it from there.
 */
const first = model.value ?? []
const hidden = shallowRef<string[]>(first)
const layout = computed(() => chartLayout({ type, label, labels, series, stacked, horizontal, curve, min, max, ticks, format, tickFormat, xMin, xMax, xTicks, xFormat, dots, values, current, legend, toggle, legendLabel, hole, center, locale, hidden: hidden.value }))
const root = useTemplateRef<HTMLElement>('root')
useBehavior(root, chart, () => ({ hidden: first, draw: (next: string[]) => { hidden.value = next } }), model)
/** A share of the plot, as short as the behavior writes it. */
const share = (number: number) => Number(number.toFixed(4))
const classes = (item: ChartMark | ChartLayout['paths'][number]) => (item.category ? `${item.classes} category-${item.category}` : item.classes)
const named = (mark: ChartMark) => (mark.name === undefined ? undefined : mark.value ?? '')
/** A name around a radar is moved to its place in the square; any other tick has no style. */
const place = (at: [number, number] | null) => (at ? { style: `--chart-x: ${at[0]}; --chart-y: ${at[1]}` } : undefined)
</script>

<template>
  <figure class="chart" ref="root" v-bind="$attrs">
    <div class="chart-body" :style="`--chart-gutter: ${layout.gutter}; --chart-tail: ${layout.tail}`">
      <svg :class="layout.classes" role="list" :aria-label="layout.label || undefined">
        <g aria-hidden="true">
          <line v-for="(line, index) in layout.grid" :key="index" class="chart-grid" :class="{ 'chart-grid-base': line.base }" :x1="line.x1" :y1="line.y1" :x2="line.x2" :y2="line.y2" />
          <text v-for="(tick, index) in layout.ticks" :key="index" :class="tick.classes" :x="tick.x" :y="tick.y" v-bind="place(tick.at)">{{ tick.text }}</text>
        </g>
        <svg class="chart-canvas" :viewBox="layout.viewBox" :preserveAspectRatio="layout.stretch ? 'none' : undefined" :aria-hidden="layout.stretch ? 'true' : undefined" :role="layout.stretch ? undefined : 'presentation'">
          <path v-for="(path, index) in layout.paths" :key="index" :class="classes(path)" :d="path.d" />
          <template v-if="layout.radial">
            <g v-for="point in layout.points" :key="point.index" class="chart-point" role="listitem" :aria-label="point.text" :aria-current="point.current ? 'true' : undefined" :data-label="point.label" :tabindex="point.index ? -1 : 0" :style="`--chart-x: ${share(point.x)}; --chart-y: ${share(point.y)}; --chart-reach: ${share(point.reach)}; --chart-index: ${point.index}`">
              <path v-if="point.hit && 'd' in point.hit" class="chart-hit" :d="point.hit.d" />
              <circle v-else-if="point.hit && 'r' in point.hit" class="chart-hit" :cx="point.hit.cx" :cy="point.hit.cy" :r="point.hit.r" />
              <rect v-else-if="point.hit" class="chart-hit" :x="point.hit.x" :y="point.hit.y" :width="point.hit.width" :height="point.hit.height" />
              <line v-if="point.cursor" class="chart-cursor" :x1="point.cursor.x1" :y1="point.cursor.y1" :x2="point.cursor.x2" :y2="point.cursor.y2" />
              <template v-for="(mark, at) in point.marks" :key="at">
                <rect v-if="mark.kind === 'bar'" :class="classes(mark)" :x="mark.x" :y="mark.y" :width="mark.width" :height="mark.height" :data-name="mark.name" :data-value="named(mark)" />
                <circle v-else-if="mark.kind === 'dot'" :class="classes(mark)" :cx="mark.cx" :cy="mark.cy" :r="mark.r || undefined" :data-name="mark.name" :data-value="named(mark)" />
                <path v-else :class="classes(mark)" :d="mark.d" :stroke-width="mark.stroke || undefined" :pathLength="mark.kind === 'arc' ? 1 : undefined" :data-name="mark.name" :data-value="named(mark)" />
              </template>
            </g>
          </template>
        </svg>
        <template v-if="!layout.radial">
          <g v-for="point in layout.points" :key="point.index" class="chart-point" role="listitem" :aria-label="point.text" :aria-current="point.current ? 'true' : undefined" :data-label="point.label" :tabindex="point.index ? -1 : 0" :style="`--chart-x: ${share(point.x)}; --chart-y: ${share(point.y)}; --chart-reach: ${share(point.reach)}; --chart-index: ${point.index}`">
            <path v-if="point.hit && 'd' in point.hit" class="chart-hit" :d="point.hit.d" />
            <circle v-else-if="point.hit && 'r' in point.hit" class="chart-hit" :cx="point.hit.cx" :cy="point.hit.cy" :r="point.hit.r" />
            <rect v-else-if="point.hit" class="chart-hit" :x="point.hit.x" :y="point.hit.y" :width="point.hit.width" :height="point.hit.height" />
            <line v-if="point.cursor" class="chart-cursor" :x1="point.cursor.x1" :y1="point.cursor.y1" :x2="point.cursor.x2" :y2="point.cursor.y2" />
            <template v-for="(mark, at) in point.marks" :key="at">
              <rect v-if="mark.kind === 'bar'" :class="classes(mark)" :x="mark.x" :y="mark.y" :width="mark.width" :height="mark.height" :data-name="mark.name" :data-value="named(mark)" />
              <circle v-else-if="mark.kind === 'dot'" :class="classes(mark)" :cx="mark.cx" :cy="mark.cy" :r="mark.r || undefined" :data-name="mark.name" :data-value="named(mark)" />
              <path v-else :class="classes(mark)" :d="mark.d" :stroke-width="mark.stroke || undefined" :pathLength="mark.kind === 'arc' ? 1 : undefined" :data-name="mark.name" :data-value="named(mark)" />
            </template>
          </g>
        </template>
        <g v-if="layout.values.length" aria-hidden="true">
          <text v-for="(written, index) in layout.values" :key="index" :class="written.classes" :x="written.x" :y="written.y">{{ written.text }}</text>
        </g>
      </svg>
      <div v-if="layout.center" class="chart-center">
        <p v-if="layout.center.value" class="chart-center-value">{{ layout.center.value }}</p>
        <p v-if="layout.center.label" class="chart-center-label">{{ layout.center.label }}</p>
      </div>
      <div class="chart-tip" aria-hidden="true" hidden></div>
    </div>
    <div v-if="layout.legend.length && layout.toggle" class="chart-legend" role="group" :aria-label="layout.legendLabel">
      <label v-for="key in layout.legend" :key="key.name" class="chart-key" :class="key.category && `category-${key.category}`"><input type="checkbox" class="chart-key-input" :value="key.name" :checked="!key.hidden" /><span :class="key.mark"></span>{{ key.name }}<span v-if="key.value !== undefined" class="chart-key-value">{{ key.value }}</span></label>
    </div>
    <ul v-else-if="layout.legend.length" class="chart-legend" :aria-label="layout.legendLabel">
      <li v-for="key in layout.legend" :key="key.name" class="chart-key" :class="key.category && `category-${key.category}`"><span :class="key.mark"></span>{{ key.name }}<span v-if="key.value !== undefined" class="chart-key-value">{{ key.value }}</span></li>
    </ul>
  </figure>
</template>
