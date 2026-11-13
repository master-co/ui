# Bar chart

Amounts compared as bars on a baseline: side by side, stacked or across.

Bars compare amounts: a week of days, the quarters of a year. Each stands in the middle of its band on the baseline, and its corners turn at the end away from it. Under the pointer the other bars step back to a tint, at once, and the whole band is what the pointer lands on, so a short bar is as easy to read as a tall one.

**Bar**

```html
<div class="card max-w(440) mx-auto">
  <div class="card-header">
    <h3 class="card-title">Deployments</h3>
    <p class="card-description">311 this week</p>
  </div>
  <figure class="chart" id="deployments" style="--chart-height: 11rem"></figure>
</div>
<script>
addEventListener('DOMContentLoaded', function () {
  MasterUI.chart(document.getElementById('deployments'), {
    type: 'bar',
    label: 'Deployments per day, this week',
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    series: [{ name: 'Deployments', values: [42, 58, 36, 71, 64, 22, 18] }]
  })
})
</script>
```

A value under zero hangs from the baseline, which then stands where zero is. A value of nothing leaves a tick on the baseline, so an empty day is still a day.

**Above and below zero**

```html
<div class="card max-w(440) mx-auto">
  <div class="card-header">
    <h3 class="card-title">Net change</h3>
    <p class="card-description">Accounts gained and lost per month</p>
  </div>
  <figure class="chart" id="net" style="--chart-height: 11rem"></figure>
</div>
<script>
addEventListener('DOMContentLoaded', function () {
  MasterUI.chart(document.getElementById('net'), {
    type: 'bar',
    label: 'Net change in accounts per month',
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
    series: [{ name: 'Net change', values: [12, -8, 20, -15, 6, 0, 18, 9] }]
  })
})
</script>
```

<a id="quiet"></a>

## One bar that matters

`chart-quiet` on the chart turns the bars into a tint and keeps the ink for the point marked `aria-current`: today in a week, the plan a reader is on. Give its index as `current`. `values: true` writes every bar's value at its end, for a few bars whose exact numbers are the point, or for a touch screen, where nothing hovers.

**Quiet, with values**

```html
<div class="card max-w(440) mx-auto">
  <div class="card-header">
    <h3 class="card-title">Build minutes</h3>
    <p class="card-description">Thursday so far</p>
  </div>
  <figure class="chart chart-quiet" id="minutes" style="--chart-height: 10rem"></figure>
</div>
<script>
addEventListener('DOMContentLoaded', function () {
  MasterUI.chart(document.getElementById('minutes'), {
    type: 'bar',
    current: 3,
    values: true,
    label: 'Build minutes per day, this week',
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    series: [{ name: 'Minutes', values: [62, 48, 75, 54, 88, 30, 26] }]
  })
})
</script>
```

<a id="stacked"></a>

## Side by side, or stacked

Several series stand side by side in each band, which compares them with each other. With `stacked` they stand on each other, which compares the totals and shows what each is made of: only the outermost bar of a stack has turned corners, and a gap of the surface parts the bars. The readout lists a stack from its top, as it is seen.

**Side by side**

```html
<div class="card max-w(440) mx-auto">
  <div class="card-header">
    <h3 class="card-title">Plan</h3>
    <p class="card-description">Actual against plan, by quarter</p>
  </div>
  <figure class="chart" id="plan" style="--chart-height: 11rem"></figure>
</div>
<script>
addEventListener('DOMContentLoaded', function () {
  MasterUI.chart(document.getElementById('plan'), {
    type: 'bar',
    label: 'Planned and actual revenue by quarter, in thousands of dollars',
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    series: [
      { name: 'Plan', values: [40, 55, 60, 75] },
      { name: 'Actual', values: [36, 58, 71, 69] }
    ]
  })
})
</script>
```

**Stacked bars**

```html
<div class="card max-w(440) mx-auto">
  <div class="card-header">
    <h3 class="card-title">Tickets</h3>
    <p class="card-description">Opened per day, by priority</p>
  </div>
  <figure class="chart" id="tickets" style="--chart-height: 11rem"></figure>
</div>
<script>
addEventListener('DOMContentLoaded', function () {
  MasterUI.chart(document.getElementById('tickets'), {
    type: 'bar',
    stacked: true,
    label: 'Tickets opened per day by priority',
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    series: [
      { name: 'Low', values: [12, 18, 14, 22, 19, 8, 6] },
      { name: 'Normal', values: [20, 24, 18, 30, 26, 10, 9] },
      { name: 'Urgent', values: [5, 9, 4, 12, 10, 3, 2] }
    ]
  })
})
</script>
```

<a id="across"></a>

## Across

`horizontal` turns the bars across, one row to a name, for a ranking whose names are longer than a column is wide. The names stand beside the rows and the scale under them; a name longer than eighteen letters is cut, and the readout says it whole.

**Across**

```html
<div class="card max-w(520) mx-auto">
  <div class="card-header">
    <h3 class="card-title">Top pages</h3>
    <p class="card-description">Visitors in the last 7 days</p>
  </div>
  <figure class="chart" id="pages" style="--chart-height: 11rem"></figure>
</div>
<script>
addEventListener('DOMContentLoaded', function () {
  MasterUI.chart(document.getElementById('pages'), {
    type: 'bar',
    horizontal: true,
    values: true,
    label: 'Pages by visitors in the last 7 days',
    labels: ['Installation', 'Button', 'Dialog', 'Default theme', 'Command'],
    series: [{ name: 'Visitors', values: [4820, 3112, 2240, 1360, 412] }]
  })
})
</script>
```

<a id="many"></a>

## Many bars, and a line over them

Bands share the width, so a month fits where a week did, and at most a dozen names stand under the plot; every other one gives way when the plot is narrower than 24rem. A series with `type: 'line'` is drawn as a line over the bars, on the same scale: a target, a moving average. Two measures of different scale are two charts, never one chart with a scale on each side.

**Thirty days**

```html
<div class="card max-w(600) mx-auto">
  <div class="card-header">
    <h3 class="card-title">Requests</h3>
    <p class="card-description">Thousands per day in November, with the weekly average</p>
  </div>
  <figure class="chart" id="november"></figure>
</div>
<script>
addEventListener('DOMContentLoaded', function () {
  var requests = [49, 52, 58, 61, 44, 37, 56, 60, 64, 72, 75, 68, 45, 42, 69, 73, 81, 76, 78, 49, 48, 72, 80, 85, 83, 86, 58, 52, 82, 88]
  var days = requests.map(function (value, index) { return 'Nov ' + (index + 1) })
  var average = requests.map(function (value, index) {
    var week = requests.slice(Math.max(0, index - 6), index + 1)
    return Math.round(week.reduce(function (sum, next) { return sum + next }, 0) / week.length)
  })
  MasterUI.chart(document.getElementById('november'), {
    type: 'bar',
    label: 'Requests per day in November, in thousands',
    labels: days,
    series: [
      { name: 'Requests', values: requests },
      { name: 'Weekly average', type: 'line', values: average, category: 'orange' }
    ]
  })
})
</script>
```

<a id="options"></a>

## Options

| Option | Default | |
| --- | --- | --- |
| `label` | none | What the chart shows and in what unit: the plot's accessible name |
| `labels` | `[]` | The names along the scale, or around a radar |
| `series` | `[]` | Each with a `name` and `values`, a `value` for a slice or a ring, or `points` for a scatter; optionally a `category`, a `type` and a ring's `max` |
| `stacked` | `false` | Bars, or areas, stand on each other |
| `horizontal` | `false` | Bars run across |
| `min`, `max`, `ticks` | fit, `4` | The ends of the scale and about how many steps mark it; `xMin`, `xMax` and `xTicks` for a scatter's scale across |
| `axis` | `true` | Whether the scale's figures are written; `false` keeps the hairlines alone, for a small chart in a tile |
| `format`, `tickFormat` | the locale's | How a value and a tick are written; `xFormat` for a scatter's scale across |
| `dots`, `values` | `false` | Mark every point of a line; write every bar's value |
| `current` | none | The index of the point marked `aria-current` |
| `legend`, `toggle` | with two series, `true` | Whether a legend is written, and whether its entries are checkboxes |

The readout, the keys, the legend, the colors and the scale are the same in every form: [Chart](https://ui.master.co/components/chart.md) holds them, with every option, class and custom property.

<a id="related"></a>

## Related

<ComponentLinks kind="charts" slugs={['line', 'area', 'radar']} />

- [breakdown](https://ui.master.co/components/breakdown.md)
- [meter](https://ui.master.co/components/meter.md)
