<script lang="ts" module>
  import type { HTMLAttributes } from 'svelte/elements'
  import type { ChartConfig, ChartSeries } from '@master/ui/behaviors/chart.js'

  export type { ChartConfig, ChartSeries }

  export interface ChartProps extends HTMLAttributes<HTMLElement>, Omit<ChartConfig, 'hidden'> {
    /** The names of the hidden series, as the legend's unchecked boxes say. Bind it, or leave it out: none. */
    value?: string[]
    onValueChange?: (value: string[]) => void
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { chart, chartLayout, type ChartLayout, type ChartMark } from '@master/ui/behaviors/chart.js'
  import { behavior } from './behavior.svelte.js'

  let { type, label, labels, series, stacked, horizontal, mark, curve, min, max, ticks, axis, format, tickFormat, xMin, xMax, xTicks, xFormat, dots, values, current, legend, toggle, legendLabel, hole, center, total, bins, ascending, words, locale, value = $bindable(), onValueChange, class: className, ...root }: ChartProps = $props()
  const first = untrack(() => value ?? [])
  let hidden = $state.raw(first)
  const layout = $derived(chartLayout({ type, label, labels, series, stacked, horizontal, mark, curve, min, max, ticks, axis, format, tickFormat, xMin, xMax, xTicks, xFormat, dots, values, current, legend, toggle, legendLabel, hole, center, total, bins, ascending, words, locale, hidden }))
  const attach = behavior(chart, () => ({ hidden: first, draw: (next: string[]) => { hidden = next } }), {
    value: () => value,
    change: (next) => { value = next; onValueChange?.(next) },
  })
  const classes = (item: ChartMark | ChartLayout['paths'][number]) => (item.category ? `${item.classes} category-${item.category}` : item.classes)
  /** What only a mark knows, a share of its color or a bubble's size, goes on as a custom property. */
  const known = (item: { tone?: number, size?: number }) => [item.tone === undefined ? '' : `--chart-tone: ${item.tone}%`, item.size === undefined ? '' : `--chart-dot: ${item.size}px`].filter(Boolean).join('; ') || undefined
</script>

<!--
  @component
  A chart, in every form the chart behavior lays out, in one SVG. Svelte writes it from
  `chartLayout()`, the same layout the behavior writes, so it is in the first HTML; the behavior shows the
  readout of the point under the pointer or the keys, and says which series the legend hides.
-->
{#snippet points()}
  {#each layout.points as point (point.index)}
    <!-- The first point is the stop in the tab order of the first render; the behavior moves it from there. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <g class="chart-point" role="listitem" aria-label={point.text} aria-current={point.current ? 'true' : undefined} data-label={point.label} tabindex={point.index ? -1 : 0} style="--chart-x: {point.x}; --chart-y: {point.y}; --chart-reach: {point.reach}; --chart-index: {point.index}">
      {#if point.hit && 'd' in point.hit}
        <path class="chart-hit" d={point.hit.d} />
      {:else if point.hit && 'r' in point.hit}
        <circle class="chart-hit" cx={point.hit.cx} cy={point.hit.cy} r={point.hit.r} />
      {:else if point.hit}
        <rect class="chart-hit" x={point.hit.x} y={point.hit.y} width={point.hit.width} height={point.hit.height} />
      {/if}
      {#if point.cursor}<line class="chart-cursor" x1={point.cursor.x1} y1={point.cursor.y1} x2={point.cursor.x2} y2={point.cursor.y2} />{/if}
      {#each point.marks as item, at (at)}
        {#if item.kind === 'bar'}
          <rect class={classes(item)} x={item.x} y={item.y} width={item.width} height={item.height} style={known(item)} data-name={item.name} data-value={item.name === undefined ? undefined : item.value ?? ''} />
        {:else if item.kind === 'dot'}
          <circle class={classes(item)} cx={item.cx} cy={item.cy} r={item.r || undefined} style={known(item)} data-name={item.name} data-value={item.name === undefined ? undefined : item.value ?? ''} />
        {:else if item.kind === 'line'}
          <line class={classes(item)} x1={item.x1} y1={item.y1} x2={item.x2} y2={item.y2} data-name={item.name} data-value={item.name === undefined ? undefined : item.value ?? ''} />
        {:else}
          <path class={classes(item)} d={item.d} stroke-width={item.stroke || undefined} pathLength={item.kind === 'arc' ? 1 : undefined} style={known(item)} data-name={item.name} data-value={item.name === undefined ? undefined : item.value ?? ''} />
        {/if}
      {/each}
    </g>
  {/each}
{/snippet}

{#snippet entry(key: ChartLayout['legend'][number])}
  <span class={key.mark}></span>{key.name}{#if key.value !== undefined}<span class="chart-key-value">{key.value}</span>{/if}
{/snippet}

<figure class={['chart', className]} {@attach attach} {...root}>
  <div class="chart-body" style="--chart-gutter: {layout.gutter}; --chart-tail: {layout.tail}">
    <svg class={layout.classes} role="list" aria-label={layout.label || undefined}>
      <g aria-hidden="true">
        {#each layout.grid as line, index (index)}<line class={['chart-grid', line.base && 'chart-grid-base']} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />{/each}
        {#each layout.ticks as tick, index (index)}<text class={tick.classes} x={tick.x} y={tick.y} style={tick.at ? `--chart-x: ${tick.at[0]}; --chart-y: ${tick.at[1]}` : undefined}>{tick.text}</text>{/each}
      </g>
      <svg class="chart-canvas" viewBox={layout.viewBox} preserveAspectRatio={layout.stretch ? 'none' : undefined} role={layout.radial ? 'presentation' : undefined} aria-hidden={layout.radial ? undefined : 'true'}>
        {#each layout.paths as path, index (index)}<path class={classes(path)} d={path.d} style={known(path)} />{/each}
        {#if layout.radial}{@render points()}{/if}
      </svg>
      {#if !layout.radial}{@render points()}{/if}
      {#if layout.values.length}
        <g aria-hidden="true">
          {#each layout.values as written, index (index)}<text class={written.classes} x={written.x} y={written.y}>{written.text}</text>{/each}
        </g>
      {/if}
    </svg>
    {#if layout.center}
      <div class="chart-center">
        {#if layout.center.value}<p class="chart-center-value">{layout.center.value}</p>{/if}
        {#if layout.center.label}<p class="chart-center-label">{layout.center.label}</p>{/if}
      </div>
    {/if}
    <div class="chart-tip" aria-hidden="true" hidden></div>
  </div>
  {#if layout.legend.length && layout.toggle}
    <div class="chart-legend" role="group" aria-label={layout.legendLabel}>
      {#each layout.legend as key (key.name)}
        <label class={['chart-key', key.category && `category-${key.category}`]}><input type="checkbox" class="chart-key-input" value={key.name} checked={!key.hidden} />{@render entry(key)}</label>
      {/each}
    </div>
  {:else if layout.legend.length}
    <ul class="chart-legend" aria-label={layout.legendLabel}>
      {#each layout.legend as key (key.name)}<li class={['chart-key', key.category && `category-${key.category}`]}>{@render entry(key)}</li>{/each}
    </ul>
  {/if}
</figure>
