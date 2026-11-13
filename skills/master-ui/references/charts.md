# Charts

`chart` draws lines, areas, bars, a pie, a donut, rings, a radar and a scatter as one SVG that fits the width it is given. Read its contract first: `npx master-ui contract chart`, or `https://ui.master.co/components/chart.md`.

## Is it a chart

Start from what the reader has to see. When a figure says it, do not draw it.

| The reader has to see | Use |
| --- | --- |
| How values go on over time | `chart` with `type: 'line'`, or `'area'` for one or two series |
| Amounts compared with each other | `chart` with `type: 'bar'`; `horizontal: true` when the names are long |
| What totals are made of, over time or across groups | `chart` with `stacked: true`, on bars or areas |
| What one whole is made of, in five parts at most | `chart` with `type: 'donut'` or `'pie'`; along one bar, `breakdown` |
| A few readings, each with a whole of its own | `chart` with `type: 'rings'` |
| Two or three things on five to eight shared measures | `chart` with `type: 'radar'` |
| Two measures against each other | `chart` with `type: 'scatter'` |
| One figure and how it moved | `stat` |
| Which way a series went, in a sentence or a row | `sparkline` |
| One reading and how near its limit it is | `gauge`, `meter` |
| A pattern across many small values | `heatmap` |
| Exact numbers compared in columns | `table` |

One scale to a chart: two measures of different size are two charts, never a scale on each side. Thousands of points, a zoom, a brush, streaming values, a map or a candlestick need a charting engine, not this component.

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

## The data

| Form | A series holds |
| --- | --- |
| `line`, `area`, `bar`, `radar` | `name` and `values`, one for each of the chart's `labels`; `null` leaves a gap in a line |
| `pie`, `donut`, `rings` | `name` and one `value`; a ring may give its own `max` |
| `scatter` | `name` and `points`, each `{ x, y }` with an optional `label` |

- `label` is required in practice: it is the plot's accessible name. Write a sentence that says what is measured and in what unit.
- `format` and `tickFormat` take a number and return a string. Give `locale` when a server writes the chart, so both sides agree.
- A series with `type: 'line'` in a bar chart is drawn as a line over the bars, on the same scale.
- `current` marks one point with `aria-current`; with the class `chart-quiet` on the chart, its bars alone are ink.
- A chart fills the width it is given. In a row of things give it a width or let it grow; set its height with `--chart-height`, and a pie's, a donut's or rings' width with `--chart-size`.

## Color

- A chart of one series is ink. Leave it so unless the product already gives that thing a color.
- Several series, and the parts of a whole, take a category each in this order: blue, orange, teal, violet, amber, pink, green, sky. Do not pass colors, and do not reorder the list to change one.
- When a color follows a thing across the product, name the series' `category` (`{ name: 'Tokyo', category: 'blue', … }`), so it matches that thing's `badge-category` or `chip-category`.
- More than eight series repeat the order: fold the rest into "Other" or draw a second chart.
- A status color (`success`, `warning`, `danger`) never stands for a series. Say a status in words beside the chart.

## What must stay true

- Each point is a list item named with its values; do not hide the plot from assistive technology or replace it with an image.
- A chart of two series or more keeps its legend. Its entries are checkboxes; `toggle: false` makes it a plain list.
- The readout is a convenience. Where exact numbers are the point, set `values: true` on a few bars or put a `table` beside the chart.
- Change how a chart looks through its custom properties and the theme's tokens, as [customizing](customizing.md) says, not by editing the markup it writes.
