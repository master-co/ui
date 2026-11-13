# Line chart

Values that go on from one to the next, as a line from point to point.

A line follows values that go on from one to the next: latency over months, a price over days. With no bars in the chart it runs from one edge of the plot to the other. Under the pointer a hairline marks the step and a dot marks each series' value on it.

**Line**

```html
<div class="card max-w(560) mx-auto">
  <div class="card-header">
    <h3 class="card-title">Latency</h3>
    <p class="card-description">Median by region, in milliseconds</p>
  </div>
  <figure class="chart" id="latency"></figure>
</div>
<script>
addEventListener('DOMContentLoaded', function () {
  MasterUI.chart(document.getElementById('latency'), {
    type: 'line',
    label: 'Median latency per month by region, in milliseconds',
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    series: [
      { name: 'Tokyo', values: [42, 44, 41, 47, 52, 49, 46, 44, 48, 53, 51, 47] },
      { name: 'Frankfurt', values: [61, 58, 63, 66, 62, 59, 57, 60, 64, 69, 66, 61] },
      { name: 'Virginia', values: [78, 74, 71, 75, 80, 86, 83, 79, 76, 81, 85, 82] }
    ]
  })
})
</script>
```

<a id="curve"></a>

## The curve

`curve` says how a line goes from point to point. `smooth`, the default, is a curve that never passes a value: it does not rise above a peak or dip under a trough the data does not have. `linear` draws straight segments, and `step` holds each value until the next, for a quantity that changes at once: seats on a plan, a price.

**Step**

```html
<div class="card max-w(560) mx-auto">
  <div class="card-header">
    <h3 class="card-title">Seats</h3>
    <p class="card-description">On the plan, this year</p>
  </div>
  <figure class="chart" id="seats" style="--chart-height: 11rem"></figure>
</div>
<script>
addEventListener('DOMContentLoaded', function () {
  MasterUI.chart(document.getElementById('seats'), {
    type: 'line',
    curve: 'step',
    label: 'Seats on the plan per month',
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    series: [{ name: 'Seats', values: [12, 12, 12, 20, 20, 20, 20, 32, 32, 32, 40, 40] }],
    max: 40
  })
})
</script>
```

<a id="gaps"></a>

## Gaps and dots

A value of `null` leaves a gap in the line, and its point says only the series that have a value. `dots: true` marks every point of a line, not only the one under the pointer; keep it for a line of a few points.

**A gap, with dots**

```html
<div class="card max-w(560) mx-auto">
  <div class="card-header">
    <h3 class="card-title">Uptime</h3>
    <p class="card-description">Percent per month; no reading in May</p>
  </div>
  <figure class="chart" id="uptime" style="--chart-height: 11rem"></figure>
</div>
<script>
addEventListener('DOMContentLoaded', function () {
  MasterUI.chart(document.getElementById('uptime'), {
    type: 'line',
    curve: 'linear',
    dots: true,
    min: 99,
    max: 100,
    label: 'Uptime per month, in percent',
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
    series: [{ name: 'Uptime', values: [99.92, 99.97, 99.81, 99.95, null, 99.64, 99.9, 99.98] }],
    format: function (value) { return value + '%' }
  })
})
</script>
```

<a id="over-bars"></a>

## A line over bars

A series with `type: 'line'` in a [bar chart](https://ui.master.co/charts/bar.md#many) is drawn as a line over the bars, on the same scale: a target, a moving average.

<a id="options"></a>

## Options

| Option | Default | |
| --- | --- | --- |
| `label` | none | What the chart shows and in what unit: the plot's accessible name |
| `labels` | `[]` | The names along the scale, or around a radar |
| `series` | `[]` | Each with a `name` and `values`, a `value` for a slice or a ring, or `points` for a scatter; optionally a `category`, a `type` and a ring's `max` |
| `curve` | `'smooth'` | `smooth`, `linear` or `step` |
| `min`, `max`, `ticks` | fit, `4` | The ends of the scale and about how many steps mark it; `xMin`, `xMax` and `xTicks` for a scatter's scale across |
| `format`, `tickFormat` | the locale's | How a value and a tick are written; `xFormat` for a scatter's scale across |
| `dots`, `values` | `false` | Mark every point of a line; write every bar's value |
| `legend`, `toggle` | with two series, `true` | Whether a legend is written, and whether its entries are checkboxes |

The readout, the keys, the legend, the colors and the scale are the same in every form: [Chart](https://ui.master.co/components/chart.md) holds them, with every option, class and custom property.

<a id="related"></a>

## Related

<ComponentLinks kind="charts" slugs={['area', 'bar', 'scatter']} />

- [sparkline](https://ui.master.co/components/sparkline.md)
