# Pie chart

What one whole is made of, as slices of a circle.

A pie and a donut show what a whole is made of. Each slice is its share of the sum, kept a constant gap from its neighbors, with its corners turned. Keep a whole to five parts or fewer and fold the rest into "Other": a sixth sliver is not read.

**Pie**

```html
<div class="card max-w(480) mx-auto">
  <div class="card-header">
    <h3 class="card-title">Browsers</h3>
    <p class="card-description">Share of sessions this month</p>
  </div>
  <figure class="chart chart-split" id="browsers" style="--chart-size: 10rem"></figure>
</div>
<script>
addEventListener('DOMContentLoaded', function () {
  MasterUI.chart(document.getElementById('browsers'), {
    type: 'pie',
    label: 'Share of sessions by browser, in percent',
    format: function (value) { return value + '%' },
    series: [
      { name: 'Chrome', value: 58 },
      { name: 'Safari', value: 24 },
      { name: 'Firefox', value: 9 },
      { name: 'Edge', value: 6 },
      { name: 'Other', value: 3 }
    ]
  })
})
</script>
```

<a id="legend"></a>

## The legend beside it

`chart-split` on the chart stands the legend beside the pie as a column, with each slice's share at its end, and puts it under the pie when there is no room.

A `pie` is the same with no hole. `--chart-size` is the width of either, 12rem by default, and `hole` is the hole's share of a donut's radius, .7 by default.

<a id="pie-or-donut"></a>

## Pie or donut

A [donut](https://ui.master.co/charts/donut.md) keeps its middle for one figure; a pie gives the slices the whole circle. Parts read along one bar are a [breakdown](https://ui.master.co/components/breakdown.md).

<a id="options"></a>

## Options

| Option | Default | |
| --- | --- | --- |
| `label` | none | What the chart shows and in what unit: the plot's accessible name |
| `series` | `[]` | Each with a `name` and `values`, a `value` for a slice or a ring, or `points` for a scatter; optionally a `category`, a `type` and a ring's `max` |
| `format`, `tickFormat` | the locale's | How a value and a tick are written; `xFormat` for a scatter's scale across |
| `legend`, `toggle` | with two series, `true` | Whether a legend is written, and whether its entries are checkboxes |

The readout, the keys, the legend, the colors and the scale are the same in every form: [Chart](https://ui.master.co/components/chart.md) holds them, with every option, class and custom property.

<a id="related"></a>

## Related

<ComponentLinks kind="charts" slugs={['donut', 'rings']} />

- [breakdown](https://ui.master.co/components/breakdown.md)
