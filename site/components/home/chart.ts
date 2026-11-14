import { chartForms, chartMarkup } from '@master/ui/behaviors/chart-core.js'
import { chartCartesian } from '@master/ui/behaviors/chart-cartesian.js'

/** The homepage specimens use Cartesian charts in their server-rendered markup. */
chartForms(chartCartesian)

export { chartMarkup }
