---
name: master-ui-charts
description: Draw, extend and review the Master UI chart, the SVG unit in packages/ui that draws lines, areas, bars, a pie, a donut, rings, a radar and a scatter. Use when changing chart.css, chart.json or behaviors/chart.js, when adding a chart type or an option, when writing a chart into a page, a block or an example, when choosing between a chart and a smaller component such as a stat or a sparkline, and when reviewing a chart's scale, marks, colors, readout, keys or legend.
license: MIT
metadata:
  author: master-co
  version: "0.1.0"
---

# Master UI charts

The chart is one component with three parts that change together: `packages/ui/components/chart.css` draws, `packages/ui/components/chart.json` promises, and `packages/ui/behaviors/chart.js` lays out (`chartLayout`), writes markup (`chartMarkup`) and works a chart (`chart`). The framework components in `packages/ui/frameworks` render the same layout. This skill holds the decisions that are the chart's own.

The site documents it in three places. `/charts` is a section of its own with one page to a form (`site/content/charts/<type>`, listed as `charts` in `site/components/catalog.ts`, each with a cover in `site/components/cover/art/charts`), grouped by what a reader has to see. `/components/chart` holds what every form shares: how it is drawn, the readout, the keys, the legend, the colors, every option and the contract. `/guide/charts` says which form to choose and when an engine is the better tool.

It does not repeat what others own:

- General principles of showing data, such as honest baselines, missing values and when a number is enough: [data visualization](../master-design/references/foundations/data-visualization.md) in `$master-design`.
- Selectors, tokens, contracts, behaviors and framework components: `$master-ui-components`. Every rule there binds the chart.
- The component page and the guide: `$master-ui-writing`. Covers: `$master-ui-covers`.

## Which form

The job of the data picks the form, and sometimes the answer is not a chart.

| The reader has to see | Use |
| --- | --- |
| How values go on over an ordered scale | `line`; `area` for one or two series |
| Amounts compared with each other | `bar`; `horizontal` when the names are long |
| What totals are made of, over time or across groups | `bar` or `area` with `stacked` |
| What one whole is made of, in five parts at most | `donut` or `pie`; along one bar, a `breakdown` |
| A few readings, each with a whole of its own | `rings` |
| Two or three things on five to eight shared measures | `radar` |
| Two measures against each other | `scatter` |
| One figure and how it moved | `stat` |
| Which way a series went, in a sentence or a row | `sparkline` |
| One reading and how near its limit it is | `gauge`, `meter` |
| A pattern across many small values | `heatmap` |
| Exact numbers compared in columns | `table` |

One scale to a chart. Two measures of different size are two charts on the same steps, never a scale on each side. Past a few hundred marks, or with a zoom, a brush, streaming values, a map or a candlestick, the answer is a charting engine; `/guide/charts` says how one takes the theme.

## Geometry: nothing is measured

A chart fits any width with no script on resize. Keep it that way.

- **The plot is an `<svg>` with no `viewBox`.** It is as wide as its room and `--chart-height` tall. Whatever stands on a scale is written with percentages of it: a hairline, a tick, a bar (`<rect x y width height>`), a dot (`<circle cx cy>`), a hit band. Lengths that must stay true in pixels stay CSS lengths: a bar's corner radius, a dot's `r`, a stroke, a gap.
- **Paths go in `chart-canvas`**, a nested `<svg viewBox="0 0 100 100" preserveAspectRatio="none">` that stretches to the plot. A path cannot take percentages, so it is written once in that box and its stroke keeps its width with `vector-effect: non-scaling-stroke`. Never put text or a circle in a stretched canvas: they stretch with it.
- **A radial chart keeps its shape.** Its canvas is `viewBox="-50 -50 100 100"`, centered on 0, with no `preserveAspectRatio`, and its points stand inside it. A pie, a donut and rings are a square `--chart-size` wide. A radar's square stands in the middle of a plot of full width, so names around it are placed in CSS from `--chart-x` and `--chart-y` of the square and `--chart-side`, never in canvas units.
- **Room for labels is counted, not measured.** `chartLayout` counts the widest figure beside the plot in digits (`gutter`, `tail`) and the stylesheet turns that into `ch`. Labels thin out with a container query on `chart-body`.
- **The readout is placed by the stylesheet.** A point carries `--chart-x`, `--chart-y` and `--chart-reach`; the behavior copies them to `chart-tip`, and the stylesheet stands the readout on the side with more room and slides it along its own size so it never leaves the plot. A behavior never computes a position in pixels.
- **A behavior may read the pointer only through the document.** Each point has a `chart-hit` larger than its marks, so `event.target.closest('.chart-point')` says which point; no rectangle is read.

A scale runs between round numbers. `scale()` picks the round step (1, 2, 5, and 2.5 only where it is whole) that marks the scale in the number of steps asked for, four by default, and of two equally near takes the finer. Bars and areas include zero; a scatter fits its points. Ticks are written in full under 10,000 and compact once the scale reaches it, one style to a scale.

## Marks

| Mark | Decision |
| --- | --- |
| Line | `--chart-stroke`, 2px, round joins and ends. `smooth` is a monotone cubic that never passes a value; a `null` parts the line |
| Area | A wash of the series' color that fades out downward with a mask; ink is thinned first so its wash is as quiet as a category's. Stacked layers are opaque tints, with no fade |
| Bar | Stands in the middle of its band, at most 16% of the plot wide. Corners turn only at the end away from the baseline, by `clip-path`, so the radius is true at any width. A zero leaves a tick |
| Stack | Only the outermost bar is turned; the others are square with a gap of `--chart-gap`, cut by the same clip, not drawn as a border |
| Dot | `--chart-dot`, with a 2px ring of `--chart-surface` so it reads where lines cross. A line's dots show only for the point under the pointer unless `dots` |
| Slice | A constant gap along its whole edge and turned corners, computed in `sector()`; a pie's edges meet at a point the gap's width from the center |
| Ring | A track in a tint of its own color and an arc from the top with round ends, shortened by the cap so the drawn length is the value |
| Radar | A hairline web, each series an outline with a 14% wash, so two show through each other |
| Grid | Hairlines across, `--color-line-hair`, the baseline one step firmer; no lines down except in a scatter and under bars that run across |

Text never wears a series' color: names and values take the text tokens and a mark of the color stands beside them.

## Color

- A chart of one series is ink, `--chart-color`. It takes a color only when the page gives the series a `category`.
- Several series, and the parts of a whole, take categories in the fixed order in `palette` in `chart.js`: blue, orange, teal, violet, amber, pink, green, sky. The order was checked for separation under protanopia and deuteranopia in both schemes; do not reorder it or add a ninth without checking again. Past eight it repeats, so the page folds the rest into "Other".
- Color follows the thing, not its place: a hidden series does not repaint the others, and a series the product already colors names its `category`.
- A status color never stands for a series.
- A mark reads `var(--category-mark, var(--chart-color))` from a `category-<name>` class on itself. The stylesheet writes no color.

## The point, the readout and the keys

- **A chart is a list.** The plot is `role="list"` with a name; each step of the scale, slice, ring or dot is a `chart-point` with `role="listitem"` and a sentence for a name ("Thu: Tokyo 71, Osaka 49"). This is the table view: no hidden table is written, and the chart reads with no script. Grid, ticks and the readout are `aria-hidden`.
- **What marks a point is CSS.** `:hover` (gated) and `:focus` on the point show its hairline and dots and step the other bars and slices back. The behavior sets no state for it; a finger's point takes the focus, which marks it the same way.
- **The readout is filled from the document.** A mark carries `data-name` and `data-value`, a point `data-label`; the behavior builds `chart-tip` from them with `textContent`. So it works on a chart a server or a framework wrote, with no data given twice. In a donut or rings the readout takes the middle instead of floating.
- **One stop in the tab order.** A roving `tabindex` on the points; arrows, Home, End and Escape as the contract's `keyboard` list says. A `MutationObserver` keeps one stop and refills an open readout when a renderer writes the points again.
- **The legend is checkboxes.** Its value is the names of the hidden series. Hiding a series lays the chart out again, so the scale fits what is left and slices close up; with `draw` the behavior hands the names to the renderer.

## Adding a type or an option

1. Decide the job it does that no existing form does. A variant of a form is an option, not a type.
2. Lay it out in `chartLayout` as data that is ready to write: percentages for what stands on the plot, a `d` for the canvas, a sentence for each point. If it needs a pixel, the design is wrong; find the CSS length or the custom property that carries it.
3. Write it in `plotMarkup` through `element()`, which escapes. Never write `class="` followed by an expression in a template: the site's preview checker reads the bundled script.
4. Draw it in `chart.css` with tokens and the category roles; add each class and property to `chart.json` in the same change.
5. Render it in the React, Svelte and Vue components, which follow `plotMarkup` element for element, and extend the `chart` scenario.
6. Add cases to `tests/behaviors/chart.test.ts`: the layout's numbers, the contract check in `chartMarkup`, and an empty series.
7. Give a new type a page: `site/content/charts/<type>/{metadata.ts,content.mdx}` with its previews and the options that matter to it, an entry in `charts` in `site/components/catalog.ts`, a cover in `site/components/cover/art/charts/<type>.astro` drawn from `chartLayout()` in steps of ink, and a row in the Forms table of `/components/chart`, in the table of `/guide/charts` and in the public skill's `references/charts.md`. A new option goes on the pages of the forms it changes and in the options table of `/components/chart`.

## Verification

Run what `$master-ui-components` lists. For a chart also:

- Read the numbers in the layout, not the picture: assert paths, percentages and sentences in the test.
- Look at it in light and dark, in the Paper preview on `/guide/theming`, at 320px and at a wide width, and with every series hidden but one.
- Measure in the browser that a bar's corner radius, a dot and a stroke are the same in a narrow and a wide plot, and that the plot's box does not change when the readout opens.
- Hover, then use Tab and the arrow keys, then toggle the legend. A transition does not advance in a hidden tab: take a screenshot before judging motion.
- Check `prefers-reduced-motion`, and read the forced-colors rules; say which of forced colors, a touch device, Safari and Firefox were not run.
