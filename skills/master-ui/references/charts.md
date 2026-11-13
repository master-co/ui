# Charts

`chart` draws lines, areas, bars, a pie, a donut, rings, a radar and a scatter as one SVG that fits the width it is given. Read its contract first: `npx master-ui contract chart`, or `https://ui.master.co/components/chart.md`.

## Is it a chart

Start from what the reader has to see. When a figure says it, do not draw it.

| The reader has to see | Use |
| --- | --- |
| How values go on over time | `chart` with `type: 'line'`, or `'area'` for one or two series |
| What rose and fell between two moments | `chart` with `type: 'slope'`; two values of each thing in a list, `'dumbbell'` |
| How ranks changed | `chart` with `type: 'bump'` |
| Amounts compared with each other | `chart` with `type: 'bar'`; `horizontal: true` when the names are long |
| How one figure became another | `chart` with `type: 'waterfall'` |
| Spans between two values | `chart` with `type: 'range'` |
| What totals are made of, over time or across groups | `chart` with `stacked: true`, on bars or areas; `type: 'marimekko'` when the groups differ in size |
| What one whole is made of | `chart` with `type: 'donut'` or `'pie'` for five parts at most, `'waffle'` to the percent, `'treemap'` for many parts, `'sunburst'` for two levels; along one bar, `breakdown` |
| How much of a flow reaches each stage | `chart` with `type: 'funnel'` |
| A few readings, each with a whole of its own | `chart` with `type: 'rings'` |
| Two or three things on five to eight shared measures | `chart` with `type: 'radar'` |
| How readings are spread | `chart` with `type: 'histogram'`; several groups at once, `'box'` |
| A pattern across two named scales | `chart` with `type: 'heatmap'` |
| Two measures against each other | `chart` with `type: 'scatter'`; a `size` on each point for a third |
| One figure and how it moved | `stat` |
| Which way a series went, in a sentence or a row | `sparkline` |
| One reading and how near its limit it is | `gauge`, `meter` |
| A pattern across many small values, with no scales | `heatmap` |
| Exact numbers compared in columns | `table` |

One scale to a chart: two measures of different size are two charts, never a scale on each side. Thousands of points, a zoom, a brush, streaming values, a map, a network, a candlestick, a Sankey diagram or a violin need a charting engine, not this component.

## Write one

Do not write the SVG by hand. Three things write the same chart from the same options:

- **In a framework**, the component: `npx master-ui add chart` copies it into `ui/`. Its props are the options below; its value is the names of the hidden series.
- **In a page with a script**, the behavior, on an element with the class `chart`:

  ```js
  import { chart } from '@master/ui/behaviors/chart.js'

  chart(document.querySelector('.chart'), {
    type: 'line',
    label: 'Latency by region, in milliseconds',
    labels: ['Jan', 'Feb', 'Mar', 'Apr'],
    series: [
      { name: 'Tokyo', values: [42, 44, 41, 47] },
      { name: 'Frankfurt', values: [61, 58, 63, 66] },
    ],
  })
  ```

- **On a server**, `chartMarkup(options)` from the same module returns the markup that goes inside the element; it escapes every word. The chart then reads with no script, and `chart(element)` with no series, or `attach()`, adds the readout and the keys.

Calling `chart()` again on the same element replaces the chart, and the function it returns stops it.

`chart.js` has every form. For the smallest script, import `chartCore` and `chartForms` from `@master/ui/behaviors/chart-core.js` and only the forms the page draws, such as `chartCartesian` from `@master/ui/behaviors/chart-cartesian.js` for lines, areas and bars; call `chartForms(chartCartesian)` once, then `chartCore(element, options)`.

## The data

| Form | A series holds |
| --- | --- |
| `line`, `area`, `bar`, `radar`, `slope`, `bump`, `marimekko`, `dumbbell`, `heatmap` | `name` and `values`, one for each of the chart's `labels`; `null` leaves a gap in a line. A heatmap's series is a row |
| `line`, `area`, `bar` with what a value may be | also `low` and `high`, one of each to a label: a band around a line, a whisker on a bar |
| `waterfall` | one series: `values` whose first is the opening figure and the rest steps up or down |
| `range` | `name` and `ranges`, a `[low, high]` pair for each label |
| `histogram`, `box` | `name` and `values`, the raw readings; the chart bins or sums them. In a box plot each series is a group |
| `pie`, `donut`, `rings`, `funnel`, `waffle`, `treemap` | `name` and one `value`; a ring may give its own `max`; a funnel's series are its stages in order |
| `sunburst` | `name` and `children`, each `{ name, value }` |
| `scatter` | `name` and `points`, each `{ x, y }` with an optional `size` and `label` |

- `label` is required in practice: it is the plot's accessible name. Write a sentence that says what is measured and in what unit.
- `format` and `tickFormat` take a number and return a string. Give `locale` when a server writes the chart, so both sides agree.
- A series with `type: 'line'` in a bar chart is drawn as a line over the bars, on the same scale.
- `stacked: 'percent'` makes every stack a whole; `stacked: 'stream'` centers stacked areas on a middle line. `mark: 'lollipop'` draws bars as stems with a dot.
- A waterfall's `total` names a closing bar at the sum. A histogram's `bins` asks for about that many bins. A bump chart ranks the highest value first unless `ascending`. A box plot's `words` names its five figures in the page's language.
- `current` marks one point with `aria-current`; with the class `chart-quiet` on the chart, its bars alone are ink.
- A chart fills the width it is given. In a row of things give it a width or let it grow; set its height with `--chart-height`, and a pie's, a donut's or rings' width with `--chart-size`.

## Color

- A chart of one series is ink. Leave it so unless the product already gives that thing a color.
- Several series, and the parts of a whole, take a category each in this order: blue, orange, teal, violet, amber, pink, green, sky. Do not pass colors, and do not reorder the list to change one.
- When a color follows a thing across the product, name the series' `category` (`{ name: 'Tokyo', category: 'blue', … }`), so it matches that thing's `badge-category` or `chip-category`.
- More than eight series repeat the order: fold the rest into "Other" or draw a second chart.
- A status color (`success`, `warning`, `danger`) never stands for a series. Say a status in words beside the chart. A waterfall alone draws its steps up and down in the status inks, with the sign written beside each value.
- A heatmap, a funnel, a box plot, a histogram and a treemap are one ink in steps: do not give their series a palette. A treemap's tile takes a `category` only where the product already colors that part.

## What must stay true

- Each point is a list item named with its values; do not hide the plot from assistive technology or replace it with an image.
- A chart of two series or more keeps its legend. Its entries are checkboxes; `toggle: false` makes it a plain list.
- The readout is a convenience. Where exact numbers are the point, set `values: true` on a few bars or put a `table` beside the chart.
- Change how a chart looks through its custom properties and the theme's tokens, as [customizing](customizing.md) says, not by editing the markup it writes.
