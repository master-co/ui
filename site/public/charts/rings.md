# Rings

A few readings, each filling a ring of its own toward its whole.

Rings show a few readings that each have a whole of their own: three goals, the quotas of a plan. Each is a ring inside the one before, filled from the top to its share of `max`, 100 unless the chart or the series says otherwise, on a track of its own tint, so the part still to go reads as the same goal, quieter.

**Rings**

```html
<div class="card max-w(480) mx-auto">
  <div class="card-header">
    <h3 class="card-title">Today</h3>
    <p class="card-description">Three goals</p>
  </div>
  <figure class="chart chart-split" id="goals" style="--chart-size: 10rem"></figure>
</div>
<script>
addEventListener('DOMContentLoaded', function () {
  MasterUI.chart(document.getElementById('goals'), {
    type: 'rings',
    label: 'Progress of three goals today, in percent',
    center: { value: '72%', label: 'Move' },
    format: function (value) { return value + '%' },
    series: [
      { name: 'Move', value: 72 },
      { name: 'Exercise', value: 45 },
      { name: 'Stand', value: 90 }
    ]
  })
})
</script>
```

One reading and how near its limit it is, with no others beside it, is a [gauge](https://ui.master.co/components/gauge.md).

<a id="options"></a>

## Options

| Option | Default | |
| --- | --- | --- |
| `label` | none | What the chart shows and in what unit: the plot's accessible name |
| `series` | `[]` | Each with a `name` and `values`, a `value` for a slice or a ring, or `points` for a scatter; optionally a `category`, a `type` and a ring's `max` |
| `min`, `max`, `ticks` | fit, `4` | The ends of the scale and about how many steps mark it; `xMin`, `xMax` and `xTicks` for a scatter's scale across |
| `format`, `tickFormat` | the locale's | How a value and a tick are written; `xFormat` for a scatter's scale across |
| `hole`, `center` | `.7`, none | A donut's hole, and what stands in the middle of a donut or rings |
| `legend`, `toggle` | with two series, `true` | Whether a legend is written, and whether its entries are checkboxes |

The readout, the keys, the legend, the colors and the scale are the same in every form: [Chart](https://ui.master.co/components/chart.md) holds them, with every option, class and custom property.

<a id="related"></a>

## Related

<ComponentLinks kind="charts" slugs={['donut', 'pie']} />

- [gauge](https://ui.master.co/components/gauge.md)
- [progress](https://ui.master.co/components/progress.md)
